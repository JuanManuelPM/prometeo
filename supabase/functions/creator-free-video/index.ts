import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
const SPACE='https://lightricks-ltx-video-distilled.hf.space';
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...CORS,"Content-Type":"application/json"}});
const fail=(error:string,status=400,extra:any={})=>json({ok:false,error,...extra},status);

async function owner(req:Request){
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer '))throw new Error('AUTH_REQUIRED');
  const c=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data,error}=await c.auth.getUser();
  if(error||!data.user)throw new Error('AUTH_INVALID');
  const {data:o,error:oe}=await db.from('prometeo_owner').select('auth_user_id').eq('singleton',true).maybeSingle();
  if(oe||!o||o.auth_user_id!==data.user.id)throw new Error('NOT_OWNER');
  return data.user.id;
}
async function sha256(bytes:Uint8Array){const d=await crypto.subtle.digest('SHA-256',bytes);return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function parseCompleted(s:string){
  if(/event:\s*error/i.test(s))throw new Error('ZEROGPU_SPACE_ERROR');
  const m=s.match(/event:\s*complete\s*\ndata:\s*(\[[\s\S]*\])\s*$/m)||s.match(/data:\s*(\[[\s\S]*\])\s*$/m);
  if(!m)throw new Error('ZEROGPU_RESULT_MISSING');
  const p=JSON.parse(m[1]);const file=p?.[0]?.video||p?.[0];const url=file?.url||file?.path;
  if(!url)throw new Error('ZEROGPU_VIDEO_URL_MISSING');return{url:String(url),seed:p?.[1]??null};
}
function hasAtom(bytes:Uint8Array,name:string){const n=new TextEncoder().encode(name);outer:for(let i=0;i<=bytes.length-n.length;i++){for(let j=0;j<n.length;j++)if(bytes[i+j]!==n[j])continue outer;return true}return false}
async function generate(prompt:string,duration=2,width=288,height=512,inputImageUrl:string|null=null){
  duration=Math.max(.3,Math.min(4,Number(duration||2)));width=Math.max(256,Math.min(768,Math.round(width/32)*32));height=Math.max(256,Math.min(1024,Math.round(height/32)*32));
  const negative='worst quality, inconsistent motion, blurry, jittery, distorted',mode=inputImageUrl?'image-to-video':'text-to-video',endpoint=inputImageUrl?'image_to_video':'text_to_video';
  const image=inputImageUrl?{url:inputImageUrl,path:inputImageUrl,orig_name:'input-image',meta:{_type:'gradio.FileData'}}:null;
  const payload={data:[prompt,negative,image,null,height,width,mode,duration,9,42,true,1.0,true]};
  const start=await fetch(`${SPACE}/gradio_api/call/${endpoint}`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const first:any=await start.json().catch(()=>({}));if(!start.ok||!first.event_id)throw new Error(`ZEROGPU_SUBMIT_${start.status}`);
  const poll=await fetch(`${SPACE}/gradio_api/call/${endpoint}/${encodeURIComponent(first.event_id)}`,{signal:AbortSignal.timeout(150000),headers:{Accept:'text/event-stream'}});
  const text=await poll.text();if(!poll.ok)throw new Error(`ZEROGPU_POLL_${poll.status}`);const done=parseCompleted(text);
  const fileUrl=done.url.startsWith('http')?done.url:`${SPACE}${done.url.startsWith('/')?'':'/'}${done.url}`;
  const vr=await fetch(fileUrl,{signal:AbortSignal.timeout(45000)});if(!vr.ok)throw new Error(`ZEROGPU_FETCH_${vr.status}`);const bytes=new Uint8Array(await vr.arrayBuffer());
  if(bytes.byteLength<2000)throw new Error('ZEROGPU_VIDEO_TOO_SMALL');if(!hasAtom(bytes,'ftyp')||!hasAtom(bytes,'moov')||!hasAtom(bytes,'mdat'))throw new Error('ZEROGPU_MP4_INVALID');
  return{bytes,mime:vr.headers.get('content-type')||'video/mp4',seed:done.seed,event_id:first.event_id,duration,width,height,mode};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  if(req.method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
  try{
    const ownerId=await owner(req),b:any=await req.json().catch(()=>({})),prompt=String(b.prompt||'').trim();if(!prompt)return fail('PROMPT_REQUIRED');
    const videoId=String(b.video_id||'');if(!videoId)return fail('VIDEO_ID_REQUIRED');
    const {data:v,error:ve}=await db.from('creator_videos').select('id,channel_id,metadata,max_cost_cents').eq('id',videoId).eq('owner_id',ownerId).maybeSingle();if(ve||!v)return fail('VIDEO_NOT_FOUND',404);
    const policy=await db.from('creator_cost_policy').select('mode,hard_max_cost_cents').eq('owner_id',ownerId).maybeSingle();if(policy.data?.mode!=='FREE_ONLY'||Number(policy.data?.hard_max_cost_cents||0)!==0||Number(v.max_cost_cents||0)!==0)return fail('FREE_ONLY_REQUIRED',409);
    let imageAsset:any=null,inputImageUrl:string|null=null;
    if(b.image_asset_id){const {data:a,error}=await db.from('creator_assets').select('id,owner_id,channel_id,video_id,bucket,object_path,mime_type,metadata').eq('id',String(b.image_asset_id)).eq('owner_id',ownerId).eq('kind','IMAGE').maybeSingle();if(error||!a)return fail('IMAGE_ASSET_NOT_FOUND',404);if(a.channel_id&&a.channel_id!==v.channel_id)return fail('IMAGE_CHANNEL_MISMATCH',409);const {data:s,error:se}=await db.storage.from(a.bucket||'creator-assets').createSignedUrl(a.object_path,1800);if(se||!s?.signedUrl)throw se||new Error('IMAGE_SIGN_FAILED');imageAsset=a;inputImageUrl=s.signedUrl}
    const out=await generate(prompt,Number(b.duration||2),Number(b.width||288),Number(b.height||512),inputImageUrl);
    const path=`${ownerId}/${v.channel_id}/${videoId}/${crypto.randomUUID()}-ltx-zerogpu-master.mp4`;
    const up=await db.storage.from('creator-assets').upload(path,out.bytes,{contentType:'video/mp4',upsert:false,cacheControl:'3600'});if(up.error)throw up.error;
    const digest=await sha256(out.bytes);
    const {data:asset,error:ae}=await db.from('creator_assets').insert({owner_id:ownerId,channel_id:v.channel_id,video_id:videoId,kind:'MASTER',bucket:'creator-assets',object_path:path,mime_type:'video/mp4',byte_size:out.bytes.byteLength,duration_ms:Math.round(out.duration*1000),sha256:digest,provider:'huggingface-ltx-zerogpu-anon',provider_asset_id:out.event_id,metadata:{prompt,space:'Lightricks/ltx-video-distilled',model:'LTX-Video-0.9.8-13B-distilled',mode:out.mode,parent_image_asset_id:imageAsset?.id||null,seed:out.seed,width:out.width,height:out.height,cost_cents:0,quota:'anonymous_zerogpu',free_only:true}}).select().single();if(ae)throw ae;
    const {data:maxv,error:mve}=await db.from('creator_video_versions').select('version').eq('owner_id',ownerId).eq('video_id',videoId).order('version',{ascending:false}).limit(1).maybeSingle();if(mve)throw mve;const version=Number(maxv?.version||0)+1;
    await db.from('creator_video_versions').update({selected:false}).eq('owner_id',ownerId).eq('video_id',videoId);
    const {data:vv,error:vve}=await db.from('creator_video_versions').insert({owner_id:ownerId,video_id:videoId,version,master_asset_id:asset.id,scene_manifest:[{kind:'generated_master',provider:'huggingface-ltx-zerogpu-anon',mode:out.mode,parent_image_asset_id:imageAsset?.id||null,duration_ms:Math.round(out.duration*1000),width:out.width,height:out.height}],selected:true}).select().single();if(vve)throw vve;
    const findings=['mp4 atoms ftyp/moov/mdat present',`${out.width}x${out.height}`,`duration target ${out.duration}s`,out.mode];
    await db.from('creator_validation_runs').insert({owner_id:ownerId,video_id:videoId,video_version_id:vv.id,kind:'MEDIA_QA',status:'PASS',score:1,findings,evidence:{provider:'huggingface-ltx-zerogpu-anon',mode:out.mode,parent_image_asset_id:imageAsset?.id||null,byte_size:out.bytes.byteLength,width:out.width,height:out.height,duration_ms:Math.round(out.duration*1000),cost_cents:0}});
    const metadata={...(v.metadata||{}),last_master_asset_id:asset.id,last_master_provider:'huggingface-ltx-zerogpu-anon',last_video_provider:'huggingface-ltx-zerogpu-anon',last_video_mode:out.mode,parent_image_asset_id:imageAsset?.id||null,free_only:true};
    const {error:uve}=await db.from('creator_videos').update({state:'READY',target_duration_ms:Math.round(out.duration*1000),actual_cost_cents:0,max_cost_cents:0,metadata}).eq('id',videoId).eq('owner_id',ownerId);if(uve)throw uve;
    const {data:signed,error:se}=await db.storage.from('creator-assets').createSignedUrl(path,3600);if(se)throw se;
    return json({ok:true,provider:'huggingface-ltx-zerogpu-anon',mode:out.mode,cost_cents:0,video_id:videoId,video_version_id:vv.id,parent_image_asset_id:imageAsset?.id||null,asset:{id:asset.id,mime_type:'video/mp4',byte_size:out.bytes.byteLength,duration_ms:Math.round(out.duration*1000)},signed_url:signed.signedUrl,qa:{status:'PASS',findings},quota:'anonymous ZeroGPU'});
  }catch(e){const m=String((e as any)?.message||e);console.error('creator-free-video',m);const auth=/^(AUTH_|NOT_OWNER)/.test(m);const quota=/quota|GPU token|ZeroGPU|ZEROGPU_SPACE_ERROR|ZEROGPU_POLL_429|ZEROGPU_SUBMIT_429/i.test(m);return fail(quota?'ZEROGPU_ANON_UNAVAILABLE':m,auth?401:quota?429:500,{detail:m});}
});
