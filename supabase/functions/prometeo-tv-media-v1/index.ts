import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
const ALLOWED=new Set(['https://juanmanuelpm.github.io','http://localhost:8000','http://127.0.0.1:8000']);

function cors(req:Request){const o=req.headers.get('origin');const ok=!!o&&ALLOWED.has(o);const h:Record<string,string>={'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};if(ok&&o)h['Access-Control-Allow-Origin']=o;return{ok,h}}
function json(req:Request,x:any,status=200){const{h}=cors(req);return new Response(JSON.stringify(x),{status,headers:{...h,'Content-Type':'application/json; charset=utf-8'}})}
function fail(code:string,status=400):never{const e:any=new Error(code);e.code=code;e.status=status;throw e}
async function sha(s:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function cleanQuery(q:string){return q.replace(/\s+/g,' ').trim().slice(0,160)}
function keyOf(q:string){return q.toLocaleLowerCase('es').normalize('NFKC')}
async function authorize(token:string){if(token.length<30)fail('CAP_REQUIRED',401);const h=await sha(token);const q=await db.from('prometeo_tv_media_caps').select('*').eq('token_hash',h).maybeSingle();if(q.error)throw q.error;if(!q.data||q.data.revoked_at)fail('CAP_INVALID',401);if(new Date(q.data.expires_at).getTime()<Date.now())fail('CAP_EXPIRED',410);if(q.data.last_used_at&&Date.now()-new Date(q.data.last_used_at).getTime()<80)fail('TOO_FAST',429);await db.from('prometeo_tv_media_caps').update({last_used_at:new Date().toISOString(),request_count:Number(q.data.request_count||0)+1}).eq('id',q.data.id);return q.data}
async function ownerId(){const q=await db.from('prometeo_owner').select('auth_user_id').eq('singleton',true).maybeSingle();if(q.error)throw q.error;if(!q.data?.auth_user_id)fail('OWNER_NOT_READY',503);return String(q.data.auth_user_id)}
async function conn(owner:string,kind:string){const q=await db.from('creator_provider_connections').select('*').eq('owner_id',owner).eq('provider','google').eq('kind',kind).eq('connection_key','default').maybeSingle();if(q.error)throw q.error;if(!q.data)fail('GOOGLE_NOT_CONNECTED',409);return q.data}
async function secret(id:string){const q=await db.rpc('creator_vault_read',{p_secret_id:id});if(q.error||!q.data)throw q.error||new Error('SECRET_MISSING');return String(q.data)}
async function googleToken(){const owner=await ownerId(),oauth=await conn(owner,'oauth'),client=await conn(owner,'oauth_client');if(!oauth.vault_secret_id||!client.vault_secret_id||!client.metadata?.client_id)fail('GOOGLE_NOT_CONNECTED',409);const refresh=await secret(oauth.vault_secret_id),clientSecret=await secret(client.vault_secret_id);const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:String(client.metadata.client_id),client_secret:clientSecret,refresh_token:refresh,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});const p:any=await r.json().catch(()=>({}));if(!r.ok||!p.access_token)fail('GOOGLE_REFRESH_FAILED',502);return String(p.access_token)}
async function yt(url:URL,access:string){const r=await fetch(url,{headers:{Authorization:`Bearer ${access}`},signal:AbortSignal.timeout(20000)});const p:any=await r.json().catch(()=>({}));if(!r.ok){const e:any=new Error(`YOUTUBE_${r.status}:${p?.error?.message||'request failed'}`);if(r.status===403&&/insufficient|scope/i.test(String(p?.error?.message||'')))e.code='YOUTUBE_SCOPE_REQUIRED';throw e}return p}
function durationSeconds(iso:string){const m=String(iso||'').match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);if(!m)return 0;return Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0)}
function durationLabel(sec:number){const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.floor(sec%60);return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`}
function isShortLike(title:string,description:string,sec:number){const txt=(title+' '+description).toLowerCase();return (sec>0&&sec<=180)||/(^|\s)#?shorts?(\s|$|[.,!?:;])/i.test(txt)}
async function cacheGet(key:string){const q=await db.from('prometeo_tv_media_cache').select('result,expires_at').eq('query_key',key).maybeSingle();if(q.error)throw q.error;return q.data&&new Date(q.data.expires_at).getTime()>Date.now()?q.data.result:null}
async function cachePut(key:string,text:string,result:any,ttlMs:number){await db.from('prometeo_tv_media_cache').upsert({query_key:key,query_text:text,result,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+ttlMs).toISOString()},{onConflict:'query_key'})}
function chunks<T>(xs:T[],n:number){const out:T[][]=[];for(let i=0;i<xs.length;i+=n)out.push(xs.slice(i,i+n));return out}
async function mapLimit<T,R>(xs:T[],limit:number,fn:(x:T,i:number)=>Promise<R>){const out=new Array<R>(xs.length);let next=0;async function worker(){while(true){const i=next++;if(i>=xs.length)return;out[i]=await fn(xs[i],i)}}await Promise.all(Array.from({length:Math.min(limit,xs.length)},()=>worker()));return out}



function xmlDecode(s:string){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')}
function xmlTag(block:string,name:string){const m=block.match(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>','i'));return m?xmlDecode(m[1].replace(/<!\\[CDATA\\[|\\]\\]>/g,'').trim()):''}
function pickThumb(x:any){const a=x?.thumbnails||x?.thumbnail?.thumbnails||[];return String(a?.[a.length-1]?.url||a?.[0]?.url||'')}
function textRuns(x:any){return String(x?.simpleText||((x?.runs||[]).map((r:any)=>r?.text||'').join(''))||'')}
function initialDataFromHtml(html:string){
  for(const marker of ['var ytInitialData = ','ytInitialData = ','window[\"ytInitialData\"] = ']){
    const i=html.indexOf(marker);if(i<0)continue;
    const start=html.indexOf('{',i+marker.length);if(start<0)continue;
    let depth=0,inString=false,escape=false;
    for(let p=start;p<html.length;p++){
      const ch=html[p];
      if(inString){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch==='"')inString=false;continue}
      if(ch==='"'){inString=true;continue}
      if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){try{return JSON.parse(html.slice(start,p+1))}catch{return null}}}
    }
  }
  return null
}
function collectRenderers(root:any){
  const out:any[]=[];const stack=[root];let guard=0;
  while(stack.length&&guard++<120000){
    const x=stack.pop();if(!x||typeof x!=='object')continue;
    if(x.videoRenderer)out.push({type:'video',data:x.videoRenderer});
    if(x.channelRenderer)out.push({type:'channel',data:x.channelRenderer});
    if(Array.isArray(x)){for(let i=x.length-1;i>=0;i--)stack.push(x[i])}
    else for(const v of Object.values(x))if(v&&typeof v==='object')stack.push(v)
  }
  return out
}
async function publicSearch(q:string){
  const key=keyOf('public-search:v3:'+q);const cached=await cacheGet(key);if(cached)return{...cached,cached:true};
  const u='https://www.youtube.com/results?search_query='+encodeURIComponent(q)+'&hl=es&gl=AR';
  const r=await fetch(u,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/123 Safari/537.36','Accept-Language':'es-AR,es;q=0.9,en;q=0.5'},signal:AbortSignal.timeout(20000)});
  if(!r.ok)fail('YOUTUBE_PUBLIC_SEARCH_'+r.status,502);
  const data=initialDataFromHtml(await r.text());if(!data)fail('YOUTUBE_PUBLIC_PARSE',502);
  const seen=new Set<string>(),results:any[]=[];
  for(const item of collectRenderers(data)){
    if(results.length>=18)break;
    const x=item.data;
    if(item.type==='channel'){
      const channel_id=String(x.channelId||x.navigationEndpoint?.browseEndpoint?.browseId||'');if(!/^UC/.test(channel_id)||seen.has('c:'+channel_id))continue;
      seen.add('c:'+channel_id);
      results.push({type:'channel',channel_id,title:textRuns(x.title)||q,description:textRuns(x.descriptionSnippet),thumbnail:pickThumb(x.thumbnail)})
    }else{
      const video_id=String(x.videoId||'');if(!/^[A-Za-z0-9_-]{11}$/.test(video_id)||seen.has('v:'+video_id))continue;
      const owner=(x.ownerText?.runs||[])[0]||{},channel_id=String(owner?.navigationEndpoint?.browseEndpoint?.browseId||'');
      seen.add('v:'+video_id);
      results.push({type:'video',video_id,title:textRuns(x.title)||q,channel_id,channel_title:String(owner?.text||''),thumbnail:pickThumb(x.thumbnail)||('https://i.ytimg.com/vi/'+video_id+'/mqdefault.jpg'),published_at:textRuns(x.publishedTimeText),watch_url:'https://www.youtube.com/watch?v='+video_id})
    }
  }
  const result={query:q,results};await cachePut(key,q,result,20*60*1000);return{...result,cached:false}
}
async function publicChannelLatestById(channelId:string,label=''){
  const id=String(channelId||'').trim();if(!/^UC[A-Za-z0-9_-]{20,}$/.test(id))fail('CHANNEL_NOT_FOUND',404);
  const key=keyOf('public-channel:v2:'+id);const cached=await cacheGet(key);if(cached)return{...cached,cached:true};
  const r=await fetch('https://www.youtube.com/feeds/videos.xml?channel_id='+encodeURIComponent(id),{headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'es-AR,es;q=0.9'},signal:AbortSignal.timeout(15000)});
  if(!r.ok)fail('YOUTUBE_FEED_'+r.status,502);
  const xml=await r.text(),entries=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(m=>m[1]);
  const feedTitle=xmlTag(xml,'title')||label||'YouTube';
  const videos=entries.map(e=>{const video_id=xmlTag(e,'yt:videoId'),title=xmlTag(e,'title'),published_at=xmlTag(e,'published');return{video_id,title,published_at,thumbnail:'https://i.ytimg.com/vi/'+video_id+'/mqdefault.jpg',duration_seconds:0,duration:'',is_short:/#?shorts?/i.test(title),embeddable:true,channel_id:id,channel_title:label||feedTitle,watch_url:'https://www.youtube.com/watch?v='+video_id,embed_url:'https://www.youtube.com/embed/'+video_id+'?autoplay=1&playsinline=1&rel=0'}}).filter((x:any)=>x.video_id&&!x.is_short).slice(0,10);
  const result={channel:{channel_id:id,title:label||feedTitle,description:'',thumbnail:'',subscriber_count:0,video_count:0},videos,filtered_short_count:entries.length-videos.length};
  await cachePut(key,id,result,20*60*1000);return{...result,cached:false}
}

async function searchAll(q:string){return publicSearch(q)}

async function searchYoutube(q:string){const out=await publicSearch(q),v=(out.results||[]).find((x:any)=>x.type==='video');if(!v)fail('NO_RESULT',404);return{...v,channel:v.channel_title||'',embed_url:'https://www.youtube.com/embed/'+v.video_id+'?autoplay=1&playsinline=1&rel=0'}}

async function subscriptions(access?:string){const key='subscriptions:mine:v1';const cached=await cacheGet(key);if(cached)return{...cached,cached:true};const token=access||await googleToken();const items:any[]=[];let pageToken='';for(let page=0;page<8;page++){const u=new URL('https://www.googleapis.com/youtube/v3/subscriptions');u.searchParams.set('part','snippet,contentDetails');u.searchParams.set('mine','true');u.searchParams.set('maxResults','50');u.searchParams.set('order','alphabetical');if(pageToken)u.searchParams.set('pageToken',pageToken);const p=await yt(u,token);for(const x of p.items||[]){const id=String(x.snippet?.resourceId?.channelId||'');if(!id)continue;items.push({channel_id:id,title:String(x.snippet?.title||''),description:String(x.snippet?.description||''),thumbnail:String(x.snippet?.thumbnails?.medium?.url||x.snippet?.thumbnails?.default?.url||''),subscribed_at:String(x.snippet?.publishedAt||''),new_item_count:Number(x.contentDetails?.newItemCount||0),activity_total:Number(x.contentDetails?.totalItemCount||0)})}pageToken=String(p.nextPageToken||'');if(!pageToken)break}const result={subscriptions:items,total:items.length};await cachePut(key,'mine',result,15*60*1000);return{...result,cached:false}}

async function channelLatestById(channelId:string,label='',access?:string){return publicChannelLatestById(channelId,label)}

async function channelLatest(q:string,access?:string){const out=await publicSearch(q),c=(out.results||[]).find((x:any)=>x.type==='channel');if(!c)fail('CHANNEL_NOT_FOUND',404);return publicChannelLatestById(String(c.channel_id||''),String(c.title||q))}

async function subscriptionFeed(){const access=await googleToken();const lib=await subscriptions(access);const all=(lib.subscriptions||[]) as any[];const selected=all.slice(0,80);if(!selected.length)return{subscriptions:[],channels:[],videos:[],total_subscriptions:0,feed_channel_count:0};const ids=selected.map(x=>x.channel_id);const channelMap=new Map<string,any>();for(const group of chunks(ids,50)){const u=new URL('https://www.googleapis.com/youtube/v3/channels');u.searchParams.set('part','snippet,statistics,contentDetails');u.searchParams.set('id',group.join(','));const p=await yt(u,access);for(const ch of p.items||[])channelMap.set(String(ch.id),ch)}const playlistRows=await mapLimit(selected,10,async sub=>{const ch=channelMap.get(sub.channel_id);const uploads=ch?.contentDetails?.relatedPlaylists?.uploads;if(!uploads)return{sub,items:[]};try{const u=new URL('https://www.googleapis.com/youtube/v3/playlistItems');u.searchParams.set('part','snippet,contentDetails');u.searchParams.set('playlistId',uploads);u.searchParams.set('maxResults','8');const p=await yt(u,access);return{sub,ch,items:p.items||[]}}catch{return{sub,ch,items:[]}}});const raw:any[]=[];for(const row of playlistRows){for(const x of row.items||[]){const video_id=String(x.contentDetails?.videoId||x.snippet?.resourceId?.videoId||'');if(!video_id)continue;raw.push({video_id,channel_id:row.sub.channel_id,channel_title:String(row.ch?.snippet?.title||row.sub.title||''),channel_thumbnail:String(row.ch?.snippet?.thumbnails?.medium?.url||row.sub.thumbnail||''),published_at:String(x.contentDetails?.videoPublishedAt||x.snippet?.publishedAt||''),title:String(x.snippet?.title||''),thumbnail:String(x.snippet?.thumbnails?.medium?.url||x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.default?.url||'')})}}const detailMap=new Map<string,any>();const unique=[...new Set(raw.map(x=>x.video_id))];for(const group of chunks(unique,50)){const u=new URL('https://www.googleapis.com/youtube/v3/videos');u.searchParams.set('part','contentDetails,snippet,status');u.searchParams.set('id',group.join(','));const p=await yt(u,access);for(const v of p.items||[])detailMap.set(String(v.id),v)}const perChannel=new Map<string,number>();const videos=raw.map(x=>{const d=detailMap.get(x.video_id)||{},sec=durationSeconds(String(d.contentDetails?.duration||'')),title=x.title||String(d.snippet?.title||'');return{...x,title,duration_seconds:sec,duration:durationLabel(sec),is_short:isShortLike(title,String(d.snippet?.description||''),sec),embeddable:d.status?.embeddable!==false,watch_url:`https://www.youtube.com/watch?v=${x.video_id}`,embed_url:`https://www.youtube.com/embed/${x.video_id}?autoplay=1&playsinline=1&rel=0`}}).filter(x=>x.embeddable&&!x.is_short).sort((a,b)=>new Date(b.published_at||0).getTime()-new Date(a.published_at||0).getTime()).filter(x=>{const n=perChannel.get(x.channel_id)||0;if(n>=4)return false;perChannel.set(x.channel_id,n+1);return true}).slice(0,80);const channels=selected.map(sub=>{const ch=channelMap.get(sub.channel_id)||{};return{channel_id:sub.channel_id,title:String(ch.snippet?.title||sub.title||''),description:String(ch.snippet?.description||sub.description||''),thumbnail:String(ch.snippet?.thumbnails?.medium?.url||sub.thumbnail||''),subscriber_count:Number(ch.statistics?.subscriberCount||0),video_count:Number(ch.statistics?.videoCount||0)}});return{subscriptions:all,channels,videos,total_subscriptions:all.length,feed_channel_count:selected.length,feed_truncated:selected.length<all.length}}

async function mixedFeed(channels:string[]){const clean=[...new Set(channels.map(cleanQuery).filter(x=>x.length>=2))].slice(0,12);if(!clean.length)return{channels:[],videos:[]};const rows:any[]=[];for(const q of clean){try{const out=await channelLatest(q);rows.push({query:q,...out})}catch(e){rows.push({query:q,error:String((e as any)?.message||e),channel:null,videos:[]})}}const videos=rows.flatMap(row=>(row.videos||[]).map((v:any)=>({...v,channel_query:row.query,channel_title:row.channel?.title||row.query,channel_thumbnail:row.channel?.thumbnail||''}))).sort((a:any,b:any)=>new Date(b.published_at||0).getTime()-new Date(a.published_at||0).getTime()).slice(0,36);return{channels:rows.map(r=>({query:r.query,channel:r.channel,error:r.error||null,filtered_short_count:r.filtered_short_count||0})),videos}}

Deno.serve(async(req:Request)=>{try{const{ok,h}=cors(req);if(req.method==='OPTIONS')return new Response(null,{status:ok?204:403,headers:h});if(!ok)return json(req,{error:'ORIGIN_NOT_ALLOWED'},403);if(req.method!=='POST')return json(req,{error:'METHOD_NOT_ALLOWED'},405);const raw=await req.text();if(raw.length>12000)return json(req,{error:'REQUEST_TOO_LARGE'},413);let b:any={};try{b=JSON.parse(raw)}catch{return json(req,{error:'INVALID_JSON'},400)}await authorize(String(b.token||''));const action=String(b.action||'');if(action==='subscriptions')return json(req,{ok:true,result:await subscriptions()});if(action==='subscription_feed')return json(req,{ok:true,result:await subscriptionFeed()});if(action==='feed'){const channels=Array.isArray(b.channels)?b.channels.map((x:any)=>String(x)):[];return json(req,{ok:true,result:await mixedFeed(channels)})}if(action==='channel_latest_id'){return json(req,{ok:true,result:await channelLatestById(String(b.channel_id||''),String(b.label||''))})}const q=cleanQuery(String(b.q||''));if(q.length<2)return json(req,{error:'QUERY_TOO_SHORT'},400);if(action==='search')return json(req,{ok:true,result:await searchYoutube(q)});if(action==='search_all')return json(req,{ok:true,result:await searchAll(q)});if(action==='channel_latest')return json(req,{ok:true,result:await channelLatest(q)});return json(req,{error:'UNKNOWN_ACTION'},400)}catch(e:any){console.error(e);return json(req,{ok:false,error:e?.code||'INTERNAL_ERROR',message:e?.message||String(e)},Number(e?.status||500))}});
