import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
const COMMONS='https://commons.wikimedia.org/w/api.php';
const UA='PrometeoCreator/1.0 (https://juanmanuelpm.github.io/prometeo/)';
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...CORS,'Content-Type':'application/json'}});
const fail=(error:string,status=400,extra:any={})=>json({ok:false,error,...extra},status);

async function owner(req:Request){const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))throw new Error('AUTH_REQUIRED');const c=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const {data,error}=await c.auth.getUser();if(error||!data.user)throw new Error('AUTH_INVALID');const {data:o,error:oe}=await db.from('prometeo_owner').select('auth_user_id').eq('singleton',true).maybeSingle();if(oe||!o||o.auth_user_id!==data.user.id)throw new Error('NOT_OWNER');return data.user.id}
async function sha256(bytes:Uint8Array){const view=new Uint8Array(bytes);const d=await crypto.subtle.digest('SHA-256',view.buffer);return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function plain(x:any){return String(x?.value||x||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
function allowedLicense(name:string){const n=name.toLowerCase().replace(/\s+/g,' ');if(/noncommercial|\bnc\b|no derivatives|\bnd\b|share alike|\bsa\b/.test(n))return false;return /public domain|cc0|creative commons attribution|cc by(?!-)/.test(n)}
function extFor(mime:string){if(/webm/i.test(mime))return'webm';if(/quicktime/i.test(mime))return'mov';if(/mp4/i.test(mime))return'mp4';if(/png/i.test(mime))return'png';if(/webp/i.test(mime))return'webp';return'jpg'}
function terms(prompt:string){const map:Record<string,string>={manzana:'apple',manzanas:'apple',corta:'cutting',cortar:'cutting',cortando:'cutting',corte:'cutting',alguien:'person',persona:'person',personas:'people',perro:'dog',perros:'dog',gato:'cat',gatos:'cat',auto:'car',coche:'car',ciudad:'city',comida:'food',fruta:'fruit',agua:'water',cocina:'kitchen',mano:'hand',manos:'hands',cuchillo:'knife',abre:'opening',abrir:'opening',corre:'running',correr:'running',camina:'walking',caminar:'walking'};const stop=new Set(['una','un','el','la','los','las','y','que','de','del','a','en','con','por','para','se','su','sus']);const tokens=prompt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]+/g)||[];const mapped=tokens.filter(t=>!stop.has(t)).map(t=>map[t]||t).slice(0,8);return mapped.join(' ').trim()||prompt.slice(0,100)}
function relevance(x:any,query:string,modality:'image'|'video'){
  const ts=query.toLowerCase().split(/\s+/).filter(Boolean),title=String(x.title||'').toLowerCase(),desc=String(x.description||'').toLowerCase();let score=0;
  for(const t of ts){if(title.includes(t))score+=8;if(desc.includes(t))score+=3}
  if(ts.length&&ts.every(t=>(title+' '+desc).includes(t)))score+=10;
  const portrait=x.height>x.width,square=x.height===x.width;
  if(portrait)score+=modality==='video'?10:7;else if(square)score+=3;
  if(modality==='video'){
    const d=Number(x.duration||0);if(d>=1&&d<=60)score+=6;if(d>=2&&d<=30)score+=4;if(d>180)score-=8;if(d>600)score-=10;
  }else{
    const area=Number(x.width||0)*Number(x.height||0);if(area>=400000)score+=3;if(area<90000)score-=4;
  }
  if(/public domain|cc0/i.test(String(x.license||'')))score+=1;
  score+=Math.max(0,5-Math.floor((Number(x.index||20)-1)/4));
  return score;
}
async function commons(params:Record<string,string>){const u=new URL(COMMONS);for(const[k,v]of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':UA,Accept:'application/json'}});const p:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`COMMONS_API_${r.status}`);return p}
async function search(prompt:string,modality:'image'|'video'){
  const query=terms(prompt),q=(modality==='video'?'filetype:video ':'')+query;
  const p=await commons({action:'query',format:'json',generator:'search',gsrsearch:q,gsrnamespace:'6',gsrlimit:'30',prop:'imageinfo',iiprop:'url|mime|mediatype|size|extmetadata',iiurlwidth:'900',iiextmetadatafilter:'LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|ImageDescription'});
  const pages=Object.values(p?.query?.pages||{}) as any[];
  return pages.map(page=>{const ii=page.imageinfo?.[0]||{},m=ii.extmetadata||{},license=plain(m.LicenseShortName);const x:any={pageid:page.pageid,title:page.title,index:page.index,url:ii.url,thumburl:ii.thumburl||null,mime:String(ii.mime||''),mediatype:String(ii.mediatype||''),width:Number(ii.width||0),height:Number(ii.height||0),size:Number(ii.size||0),duration:Number(ii.duration||0),description_url:ii.descriptionurl||'',license,license_url:plain(m.LicenseUrl),artist:plain(m.Artist),credit:plain(m.Credit),attribution_required:plain(m.AttributionRequired).toLowerCase()==='true',description:plain(m.ImageDescription)};x.relevance=relevance(x,query,modality);return x}).filter(x=>allowedLicense(x.license)).filter(x=>modality==='video'?x.mediatype==='VIDEO':x.mime.startsWith('image/')).sort((a,b)=>b.relevance-a.relevance||Number(a.index||999)-Number(b.index||999));
}
async function videoSource(candidate:any){const p=await commons({action:'query',format:'json',prop:'videoinfo',titles:candidate.title,viprop:'url|mime|size|derivatives'});const page=Object.values(p?.query?.pages||{})[0] as any,vi=page?.videoinfo?.[0]||{},der=(vi.derivatives||[]).filter((x:any)=>String(x.type||'').startsWith('video/')).map((x:any)=>({...x,est:Number(x.bandwidth||0)*Math.max(1,Number(vi.duration||candidate.duration||1))/8}));der.sort((a:any,b:any)=>{const ap=Number(a.height>a.width),bp=Number(b.height>b.width);if(bp!==ap)return bp-ap;const ar=Math.abs(Number(a.height||0)-640),br=Math.abs(Number(b.height||0)-640);if(ar!==br)return ar-br;return Number(a.est||1e15)-Number(b.est||1e15)});const chosen=der.find((x:any)=>Number(x.est||0)>0&&Number(x.est)<12_000_000)||der[0];if(!chosen?.src)throw new Error('COMMONS_VIDEO_DERIVATIVE_MISSING');return{url:String(chosen.src),mime:String(chosen.type||vi.mime||'video/webm').split(';')[0],width:Number(chosen.width||vi.width||candidate.width||0),height:Number(chosen.height||vi.height||candidate.height||0),duration:Number(vi.duration||candidate.duration||0),estimated_bytes:Number(chosen.est||0),transcodekey:chosen.transcodekey||null}}
async function download(url:string,max=12_000_000){const r=await fetch(url,{signal:AbortSignal.timeout(60000),headers:{'User-Agent':UA}});if(!r.ok)throw new Error(`COMMONS_FETCH_${r.status}`);const len=Number(r.headers.get('content-length')||0);if(len>max)throw new Error('COMMONS_ASSET_TOO_LARGE');const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.byteLength<500||bytes.byteLength>max)throw new Error('COMMONS_ASSET_SIZE_INVALID');return{bytes,mime:r.headers.get('content-type')||''}}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});if(req.method!=='POST')return fail('METHOD_NOT_ALLOWED',405);
  try{
    const ownerId=await owner(req),b:any=await req.json().catch(()=>({})),prompt=String(b.prompt||'').trim(),modality=String(b.modality||'image')==='video'?'video':'image';if(!prompt)return fail('PROMPT_REQUIRED');
    const {data:policy}=await db.from('creator_cost_policy').select('mode,hard_max_cost_cents').eq('owner_id',ownerId).maybeSingle();if(policy?.mode!=='FREE_ONLY'||Number(policy?.hard_max_cost_cents||0)!==0)return fail('FREE_ONLY_REQUIRED',409);
    const videoId=b.video_id?String(b.video_id):null,channelId=b.channel_id?String(b.channel_id):null;if(videoId){const {data:v,error}=await db.from('creator_videos').select('id,channel_id').eq('id',videoId).eq('owner_id',ownerId).maybeSingle();if(error||!v)return fail('VIDEO_NOT_FOUND',404);if(channelId&&v.channel_id!==channelId)return fail('CHANNEL_VIDEO_MISMATCH',409)}
    const candidates=await search(prompt,modality);if(!candidates.length)return fail('COMMONS_NO_REUSABLE_MATCH',404,{query:terms(prompt)});
    let picked:any=null,source:any=null,last='';for(const c of candidates.slice(0,12)){try{if(modality==='video'){source=await videoSource(c);if(!source.url)continue}else source={url:c.thumburl||c.url,mime:c.mime,width:c.width,height:c.height,duration:0};const got=await download(source.url,12_000_000);picked={candidate:c,source,got};break}catch(e){last=String((e as any)?.message||e)}}if(!picked)return fail('COMMONS_MATCHES_UNUSABLE',422,{detail:last});
    const {candidate:c,source:s,got}=picked,mime=String(got.mime||s.mime||c.mime||'application/octet-stream').split(';')[0],scope=videoId||crypto.randomUUID(),path=`${ownerId}/${channelId||'channel'}/${scope}/${crypto.randomUUID()}-commons.${extFor(mime)}`,up=await db.storage.from('creator-assets').upload(path,got.bytes,{contentType:mime,upsert:false,cacheControl:'3600'});if(up.error)throw up.error;
    const digest=await sha256(got.bytes),kind=modality==='video'?'VIDEO_SCENE':'IMAGE',metadata={prompt,search_query:terms(prompt),relevance_score:c.relevance,source:'Wikimedia Commons',commons_pageid:c.pageid,commons_title:c.title,description_url:c.description_url,description:c.description,license:c.license,license_url:c.license_url,artist:c.artist,credit:c.credit,attribution_required:c.attribution_required,source_url:s.url,width:s.width,height:s.height,duration_seconds:s.duration||0,transcodekey:s.transcodekey||null,cost_cents:0,free_only:true,reusable_source:true};
    const {data:asset,error:ae}=await db.from('creator_assets').insert({owner_id:ownerId,channel_id:channelId,video_id:videoId,kind,bucket:'creator-assets',object_path:path,mime_type:mime,byte_size:got.bytes.byteLength,duration_ms:modality==='video'?Math.round(Number(s.duration||0)*1000):null,sha256:digest,provider:'wikimedia-commons',provider_asset_id:String(c.pageid),metadata}).select().single();if(ae)throw ae;
    if(videoId){const {data:v}=await db.from('creator_videos').select('metadata').eq('id',videoId).eq('owner_id',ownerId).single();await db.from('creator_videos').update({metadata:{...(v?.metadata||{}),last_commons_asset_id:asset.id,last_commons_source:{title:c.title,license:c.license,artist:c.artist,description_url:c.description_url,relevance_score:c.relevance}}}).eq('id',videoId).eq('owner_id',ownerId)}
    const {data:signed,error:se}=await db.storage.from('creator-assets').createSignedUrl(path,3600);if(se)throw se;
    return json({ok:true,provider:'wikimedia-commons',cost_cents:0,modality,asset:{id:asset.id,kind,mime_type:mime,byte_size:got.bytes.byteLength,width:s.width,height:s.height,duration_ms:asset.duration_ms},source:{title:c.title,description:c.description,license:c.license,license_url:c.license_url,artist:c.artist,credit:c.credit,attribution_required:c.attribution_required,description_url:c.description_url,relevance_score:c.relevance},signed_url:signed.signedUrl,query:terms(prompt)});
  }catch(e){const m=String((e as any)?.message||e);console.error('creator-free-commons',m);return fail(m,/^(AUTH_|NOT_OWNER)/.test(m)?401:500)}
});
