import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { getHfZeroGpuToken,hfHeaders } from "../_shared/creator_hf_zerogpu.ts";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
const SPACE='https://black-forest-labs-flux-1-schnell.hf.space';
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...CORS,"Content-Type":"application/json"}});
const fail=(error:string,status=400,extra:any={})=>json({ok:false,error,...extra},status);

async function owner(req:Request){
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))throw new Error("AUTH_REQUIRED");
  const c=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data,error}=await c.auth.getUser();
  if(error||!data.user)throw new Error("AUTH_INVALID");
  const {data:o,error:oe}=await db.from("prometeo_owner").select("auth_user_id").eq("singleton",true).maybeSingle();
  if(oe||!o||o.auth_user_id!==data.user.id)throw new Error("NOT_OWNER");
  return data.user.id;
}
async function logProbe(ownerId:string,status:'PASS'|'CAPACITY'|'FAILED',detail:any){try{await db.from('creator_media_probe_log').insert({owner_id:ownerId,provider:'flux_schnell_zerogpu',modality:'image',status,detail});}catch{}}
async function sha256(bytes:Uint8Array){const d=await crypto.subtle.digest("SHA-256",bytes);return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function completedData(s:string){
  if(/event:\s*error/i.test(s)){const q=s.match(/ZeroGPU[^\n]*/i)?.[0]||'';throw new Error(q||"ZEROGPU_SPACE_ERROR")}
  const chunks=s.split(/event:\s*complete\s*\n/);const tail=chunks[chunks.length-1];
  const m=tail.match(/data:\s*(\[[\s\S]*\])\s*$/m)||s.match(/data:\s*(\[[\s\S]*\])\s*$/m);
  if(!m)throw new Error("ZEROGPU_RESULT_MISSING");
  const parsed=JSON.parse(m[1]);const file=parsed?.[0];const url=file?.url||file?.path;if(!url)throw new Error("ZEROGPU_IMAGE_URL_MISSING");return{url:String(url),seed:parsed?.[1]??null};
}
async function generate(prompt:string,width=768,height=1024,token=''){
  width=Math.max(256,Math.min(1024,Math.round(width/32)*32));height=Math.max(256,Math.min(1536,Math.round(height/32)*32));
  const start=await fetch(`${SPACE}/gradio_api/call/infer`,{method:"POST",signal:AbortSignal.timeout(15000),headers:hfHeaders(token,{"Content-Type":"application/json"}),body:JSON.stringify({data:[prompt,0,true,width,height,4]})});
  const first:any=await start.json().catch(()=>({}));if(!start.ok||!first.event_id)throw new Error(`ZEROGPU_SUBMIT_${start.status}`);
  const poll=await fetch(`${SPACE}/gradio_api/call/infer/${encodeURIComponent(first.event_id)}`,{signal:AbortSignal.timeout(90000),headers:hfHeaders(token,{Accept:"text/event-stream"})});
  const text=await poll.text();if(!poll.ok)throw new Error(`ZEROGPU_POLL_${poll.status}`);const done=completedData(text);
  const fileUrl=done.url.startsWith('http')?done.url:`${SPACE}${done.url.startsWith('/')?'':'/'}${done.url}`;
  const image=await fetch(fileUrl,{signal:AbortSignal.timeout(30000),headers:hfHeaders(token)});if(!image.ok)throw new Error(`ZEROGPU_FETCH_${image.status}`);const bytes=new Uint8Array(await image.arrayBuffer());if(bytes.byteLength<1000)throw new Error("ZEROGPU_IMAGE_TOO_SMALL");
  return{bytes,mime:image.headers.get('content-type')||'image/webp',seed:done.seed,event_id:first.event_id};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(req.method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
  let ownerId='';
  try{
    ownerId=await owner(req);const b:any=await req.json().catch(()=>({}));const prompt=String(b.prompt||'').trim();if(!prompt)return fail('PROMPT_REQUIRED');
    const channelId=b.channel_id?String(b.channel_id):null,videoId=b.video_id?String(b.video_id):null;
    if(videoId){const {data:v,error}=await db.from('creator_videos').select('id,channel_id,metadata').eq('id',videoId).eq('owner_id',ownerId).maybeSingle();if(error||!v)return fail('VIDEO_NOT_FOUND',404);if(channelId&&v.channel_id!==channelId)return fail('CHANNEL_VIDEO_MISMATCH',409)}
    const policy=await db.from('creator_cost_policy').select('mode,hard_max_cost_cents').eq('owner_id',ownerId).maybeSingle();if(policy.data?.mode!=='FREE_ONLY'||Number(policy.data?.hard_max_cost_cents||0)!==0)return fail('FREE_ONLY_REQUIRED',409);
    const token=await getHfZeroGpuToken(db,ownerId),out=await generate(prompt,Number(b.width||768),Number(b.height||1024),token),quota=token?'authenticated_zerogpu':'anonymous_zerogpu';
    const ext=out.mime.includes('png')?'png':out.mime.includes('jpeg')?'jpg':'webp',scope=videoId||crypto.randomUUID(),path=`${ownerId}/${channelId||'channel'}/${scope}/${crypto.randomUUID()}-zerogpu.${ext}`;
    const up=await db.storage.from('creator-assets').upload(path,out.bytes,{contentType:out.mime,upsert:false,cacheControl:'3600'});if(up.error)throw up.error;
    const digest=await sha256(out.bytes);const {data:asset,error:ae}=await db.from('creator_assets').insert({owner_id:ownerId,channel_id:channelId,video_id:videoId,kind:'IMAGE',bucket:'creator-assets',object_path:path,mime_type:out.mime,byte_size:out.bytes.byteLength,sha256:digest,provider:'huggingface-zerogpu',provider_asset_id:out.event_id,metadata:{prompt,space:'black-forest-labs/FLUX.1-schnell',model:'FLUX.1-schnell',seed:out.seed,cost_cents:0,quota,free_only:true}}).select().single();if(ae)throw ae;
    if(videoId)await db.from('creator_videos').update({metadata:{...(await db.from('creator_videos').select('metadata').eq('id',videoId).single()).data?.metadata,last_image_asset_id:asset.id,last_image_provider:'huggingface-zerogpu'}}).eq('id',videoId).eq('owner_id',ownerId);
    const {data:signed,error:se}=await db.storage.from('creator-assets').createSignedUrl(path,3600);if(se)throw se;
    await logProbe(ownerId,'PASS',{event_id:out.event_id,bytes:out.bytes.byteLength,cost_cents:0,authenticated:!!token});
    return json({ok:true,provider:'huggingface-zerogpu',cost_cents:0,asset:{id:asset.id,mime_type:asset.mime_type,byte_size:asset.byte_size,provider:asset.provider},signed_url:signed.signedUrl,quota:token?'authenticated ZeroGPU':'anonymous ZeroGPU'});
  }catch(e){const m=String((e as any)?.message||e);console.error('creator-free-image',m);const auth=/^(AUTH_|NOT_OWNER)/.test(m);const capacity=/quota|GPU token|ZeroGPU|ZEROGPU_SPACE_ERROR|ZEROGPU_POLL_429|ZEROGPU_SUBMIT_429|capacity|runs limit/i.test(m);if(ownerId)await logProbe(ownerId,capacity?'CAPACITY':'FAILED',{detail:m,cost_cents:0});return fail(capacity?'ZEROGPU_ANON_UNAVAILABLE':m,auth?401:capacity?429:500,{detail:m});}
});
