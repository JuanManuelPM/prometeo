import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SB=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(SB,SERVICE,{auth:{persistSession:false}});
const ALLOWED=new Set(["https://juanmanuelpm.github.io","http://localhost:8000","http://127.0.0.1:8000"]);

function cors(req:Request){const o=req.headers.get("origin");const ok=!!o&&ALLOWED.has(o);const h:Record<string,string>={"Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin"};if(ok&&o)h["Access-Control-Allow-Origin"]=o;return{ok,h}}
function json(req:Request,x:any,status=200){const{h}=cors(req);return new Response(JSON.stringify(x),{status,headers:{...h,"Content-Type":"application/json; charset=utf-8"}})}
function fail(code:string,status=400):never{const e:any=new Error(code);e.code=code;e.status=status;throw e}
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function roomFor(code:string,role:string,token:string){
  if(!/^TV-[A-Z2-9]{6}$/.test(code)||token.length<30)fail("ROOM_AUTH_FAILED",401);
  if(role!=="tv"&&role!=="remote")fail("ROOM_ROLE_INVALID");
  const q=await db.from("prometeo_tv_rooms").select("*").eq("code",code).maybeSingle();
  if(q.error)throw q.error;if(!q.data)fail("ROOM_NOT_FOUND",404);
  if(new Date(q.data.expires_at).getTime()<Date.now())fail("ROOM_EXPIRED",410);
  const expected=role==="tv"?q.data.tv_token_hash:q.data.remote_token_hash;
  if(await sha(token)!==expected)fail("ROOM_AUTH_FAILED",401);
  return q.data;
}
function ytId(raw:string){
  const s=String(raw||"").trim();
  if(/^[A-Za-z0-9_-]{11}$/.test(s))return s;
  try{
    const u=new URL(s);
    if(u.hostname==="youtu.be")return u.pathname.split("/").filter(Boolean)[0]||"";
    if(u.searchParams.get("v"))return u.searchParams.get("v")||"";
    const m=u.pathname.match(/\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})/);if(m)return m[1];
  }catch{}
  return "";
}
function decodeXml(s:string){return s.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">")}
function tag(block:string,name:string){const m=block.match(new RegExp("<"+name+"[^>]*>([\\s\\S]*?)<\\/"+name+">","i"));return m?decodeXml(m[1].replace(/<!\\[CDATA\\[|\\]\\]>/g,"").trim()):""}
async function channelFeed(channelId:string){
  if(!/^UC[A-Za-z0-9_-]{20,}$/.test(channelId))fail("YOUTUBE_CHANNEL_INVALID");
  const r=await fetch("https://www.youtube.com/feeds/videos.xml?channel_id="+encodeURIComponent(channelId),{signal:AbortSignal.timeout(12000)});
  if(!r.ok)fail("YOUTUBE_FEED_"+r.status,502);
  const xml=await r.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(m=>m[1]).map(e=>({
    video_id:tag(e,"yt:videoId"),
    title:tag(e,"title"),
    published_at:tag(e,"published"),
    channel_id:channelId
  })).filter(x=>x.video_id).slice(0,30);
}
function cleanPayload(kind:string,p:any){
  const x=(p&&typeof p==="object")?p:{};
  if(kind==="clock")return {style:String(x.style||"orbit").slice(0,32)};
  if(kind==="black")return {};
  if(kind==="youtube"){
    const queue=(Array.isArray(x.queue)?x.queue:[]).slice(0,50).map((v:any)=>{
      const video_id=ytId(String(v?.video_id||v?.url||""));if(!video_id)return null;
      return {
        video_id,
        title:String(v?.title||v?.video_title||"YouTube").slice(0,200),
        channel_id:String(v?.channel_id||"").slice(0,80),
        channel_title:String(v?.channel_title||"").slice(0,120),
        thumbnail:String(v?.thumbnail||`https://i.ytimg.com/vi/${video_id}/mqdefault.jpg`).slice(0,500),
        watch_url:`https://www.youtube.com/watch?v=${video_id}`
      };
    }).filter(Boolean);
    let video_id=ytId(String(x.url||x.video_id||""));
    let queue_index=Math.max(0,Math.floor(Number(x.queue_index)||0));
    if(queue.length){
      const explicit=queue.findIndex((v:any)=>v.video_id===video_id);
      if(explicit>=0)queue_index=explicit;
      queue_index=Math.min(queue.length-1,queue_index);
      video_id=queue[queue_index].video_id;
    }
    const current=queue.find((v:any)=>v.video_id===video_id)||null;
    return {
      mode:String(x.mode||"session").slice(0,24),
      queue,
      queue_index:queue.length?queue_index:0,
      video_id,
      url:video_id?`https://www.youtube.com/watch?v=${video_id}`:"",
      channel_id:String(current?.channel_id||x.channel_id||"").slice(0,80),
      channel_title:String(current?.channel_title||x.channel_title||"").slice(0,120),
      video_title:String(current?.title||x.video_title||"").slice(0,200),
      auto_next:x.auto_next!==false
    };
  }
  if(kind==="page"){
    let u:URL;try{u=new URL(String(x.url||""))}catch{fail("PAGE_URL_INVALID")}
    if(!["http:","https:"].includes(u!.protocol))fail("PAGE_URL_INVALID");
    return {url:u!.toString()};
  }
  fail("KIND_INVALID");
}
async function changed(room:any,source:string,clientId:string){
  await db.from("prometeo_tv_events").insert({room_id:room.id,source,client_id:clientId||"legacy",event_type:"schedule.changed",payload:{at:new Date().toISOString()}});
}
async function advanceYoutubeBlock(room:any,blockId:string,expected:string,clientId:string){
  if(!blockId)fail("ID_REQUIRED");
  const q=await db.from("tv_program_blocks").select("*").eq("id",blockId).eq("room_id",room.id).eq("kind","youtube").maybeSingle();
  if(q.error)throw q.error;if(!q.data)fail("BLOCK_NOT_FOUND",404);
  const block=q.data,payload=(block.payload&&typeof block.payload==="object")?block.payload:{};
  const current=String(payload.video_id||"");
  if(expected&&current!==expected)return {ok:true,stale:true,block};
  if(payload.auto_next===false)return {ok:true,advanced:false,reason:"AUTO_NEXT_OFF",block};

  const queue=Array.isArray(payload.queue)?payload.queue:[];
  if(queue.length){
    let idx=Math.max(0,Math.min(queue.length-1,Math.floor(Number(payload.queue_index)||0)));
    const found=queue.findIndex((v:any)=>String(v?.video_id||"")===current);
    if(found>=0)idx=found;
    const currentMeta=queue[idx]||{};
    if(current){
      const h={room_id:room.id,video_id:current,channel_id:String(currentMeta.channel_id||payload.channel_id||""),channel_title:String(currentMeta.channel_title||payload.channel_title||block.title||""),title:String(currentMeta.title||payload.video_title||block.title||""),watched_at:new Date().toISOString()};
      const hq=await db.from("tv_watch_history").upsert(h,{onConflict:"room_id,video_id"});if(hq.error)throw hq.error;
    }
    const nextIndex=idx+1;
    if(nextIndex>=queue.length)return {ok:true,advanced:false,reason:"QUEUE_END",block};
    const next:any=queue[nextIndex];
    const nextPayload={...payload,queue_index:nextIndex,video_id:String(next.video_id||""),url:`https://www.youtube.com/watch?v=${String(next.video_id||"")}`,channel_id:String(next.channel_id||""),channel_title:String(next.channel_title||""),video_title:String(next.title||""),auto_next:true};
    const uq=await db.from("tv_program_blocks").update({payload:nextPayload,updated_at:new Date().toISOString()}).eq("id",blockId).eq("room_id",room.id).select().single();
    if(uq.error)throw uq.error;
    await changed(room,"tv",clientId);
    return {ok:true,advanced:true,block:uq.data,next};
  }

  const channelId=String(payload.channel_id||"");if(!channelId)return {ok:true,advanced:false,reason:"NO_QUEUE",block};
  const feed=await channelFeed(channelId);
  const currentMeta=feed.find((v:any)=>v.video_id===current);
  if(current){
    const h={room_id:room.id,video_id:current,channel_id:channelId,channel_title:String(payload.channel_title||block.title||""),title:String(payload.video_title||currentMeta?.title||block.title||""),watched_at:new Date().toISOString()};
    const hq=await db.from("tv_watch_history").upsert(h,{onConflict:"room_id,video_id"});if(hq.error)throw hq.error;
  }
  const wq=await db.from("tv_watch_history").select("video_id").eq("room_id",room.id);
  if(wq.error)throw wq.error;
  const seen=new Set((wq.data||[]).map((x:any)=>String(x.video_id)));
  const idx=feed.findIndex((v:any)=>v.video_id===current);
  const ordered=idx>=0?[...feed.slice(idx+1),...feed.slice(0,idx)]:feed;
  const next=ordered.find((v:any)=>v.video_id!==current&&!seen.has(v.video_id));
  if(!next)return {ok:true,advanced:false,reason:"NO_UNWATCHED_VIDEO",block};
  const nextPayload={...payload,video_id:next.video_id,url:`https://www.youtube.com/watch?v=${next.video_id}`,channel_id:channelId,video_title:next.title,auto_next:true};
  const uq=await db.from("tv_program_blocks").update({payload:nextPayload,updated_at:new Date().toISOString()}).eq("id",blockId).eq("room_id",room.id).select().single();
  if(uq.error)throw uq.error;
  await changed(room,"tv",clientId);
  return {ok:true,advanced:true,block:uq.data,next};
}
Deno.serve(async(req:Request)=>{try{
  const{ok,h}=cors(req);if(req.method==="OPTIONS")return new Response(null,{status:ok?204:403,headers:h});
  if(!ok)return json(req,{ok:false,error:"ORIGIN_NOT_ALLOWED"},403);
  if(req.method!=="POST")return json(req,{ok:false,error:"METHOD_NOT_ALLOWED"},405);
  const b=await req.json().catch(()=>({}));
  const code=String(b.code||""),role=String(b.role||""),token=String(b.token||""),clientId=String(b.client_id||"").slice(0,100);
  const room=await roomFor(code,role,token);
  const action=String(b.action||"");
  if(action==="list"){
    const bq=await db.from("tv_program_blocks").select("*").eq("room_id",room.id).eq("enabled",true).order("start_minute").order("sort_order");
    if(bq.error)throw bq.error;
    const blocks=bq.data||[];
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
    const get=(t:string)=>Number(parts.find(x=>x.type===t)?.value||0);
    const now_minute=get("hour")*60+get("minute");
    const active_blocks=blocks.filter((x:any)=>now_minute>=Number(x.start_minute)&&now_minute<Number(x.end_minute));
    const revision=blocks.reduce((m:any,x:any)=>String(x.updated_at||"")>m?String(x.updated_at||""):m,"");
    return json(req,{ok:true,timezone:"America/Argentina/Buenos_Aires",now_minute,blocks,active_blocks,revision,runtime_build:"20"});
  }
  if(action==="state"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const q=await db.from("tv_live_state").select("*").eq("room_id",room.id).order("updated_at",{ascending:false}).limit(20);
    if(q.error)throw q.error;
    const states=q.data||[];
    return json(req,{ok:true,state:states[0]||null,states,runtime_build:"20"});
  }
  if(action==="tv_state"){
    if(role!=="tv")fail("TV_REQUIRED",403);
    const row={
      room_id:room.id,
      client_id:clientId||null,
      build:String(b.build||"").slice(0,32),
      active_ids:Array.isArray(b.active_ids)?b.active_ids.slice(0,8):[],
      active_youtube_ids:Array.isArray(b.active_youtube_ids)?b.active_youtube_ids.slice(0,8):[],
      player_state:(b.player_state&&typeof b.player_state==="object")?b.player_state:{},
      update_pending:!!b.update_pending,
      updated_at:new Date().toISOString()
    };
    const q=await db.from("tv_live_state").upsert(row,{onConflict:"room_id,client_id"});if(q.error)throw q.error;
    return json(req,{ok:true});
  }
  if(action==="commands"){
    if(role!=="tv")fail("TV_REQUIRED",403);
    const after=Math.max(0,Number(b.after_id)||0);
    const q=await db.from("prometeo_tv_events").select("id,event_type,payload,created_at").eq("room_id",room.id).eq("source","remote").eq("event_type","player.command").gt("id",after).order("id").limit(50);
    if(q.error)throw q.error;
    return json(req,{ok:true,events:q.data||[]});
  }
  if(action==="watch_history"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const limit=Math.max(1,Math.min(100,Number(b.limit)||30));
    const q=await db.from("tv_watch_history").select("video_id,channel_id,channel_title,title,watched_at").eq("room_id",room.id).order("watched_at",{ascending:false}).limit(limit);
    if(q.error)throw q.error;
    return json(req,{ok:true,history:q.data||[]});
  }
  if(action==="youtube_advance"){
    if(role!=="tv")fail("TV_REQUIRED",403);
    const result:any=await advanceYoutubeBlock(room,String(b.block_id||""),String(b.video_id||""),clientId);
    return json(req,result);
  }
  if(role!=="remote")fail("REMOTE_REQUIRED",403);
  if(action==="command"){
    const command=String(b.command||"");
    if(!["play","pause","toggle","mute","unmute","refresh_panel","reload_when_idle","reload_now"].includes(command))fail("COMMAND_INVALID");
    const payload={command,block_id:String(b.block_id||"").slice(0,80),value:b.value??null,at:new Date().toISOString()};
    const q=await db.from("prometeo_tv_events").insert({room_id:room.id,source:"remote",client_id:clientId||null,event_type:"player.command",payload}).select("id").single();
    if(q.error)throw q.error;
    return json(req,{ok:true,event_id:q.data.id});
  }
  if(action==="save"){
    const id=String(b.id||"");
    const kind=String(b.kind||"");
    const start=Math.max(0,Math.min(1439,Number(b.start_minute)));
    const end=Math.max(1,Math.min(1440,Number(b.end_minute)));
    if(!(end>start))fail("TIME_RANGE_INVALID");
    const row={room_id:room.id,title:String(b.title||"").trim().slice(0,120),kind,start_minute:start,end_minute:end,days:[0,1,2,3,4,5,6],payload:cleanPayload(kind,b.payload),enabled:true,updated_at:new Date().toISOString()};
    let out;
    if(id){
      const q=await db.from("tv_program_blocks").update(row).eq("id",id).eq("room_id",room.id).select().single();if(q.error)throw q.error;out=q.data;
    }else{
      const q=await db.from("tv_program_blocks").insert(row).select().single();if(q.error)throw q.error;out=q.data;
    }
    await changed(room,"remote",clientId);
    return json(req,{ok:true,block:out});
  }
  if(action==="layout_save"){
    const ids=[String(b.block_a||""),String(b.block_b||"")].sort();
    if(!ids[0]||!ids[1]||ids[0]===ids[1])fail("LAYOUT_BLOCKS_INVALID");
    const ratio=Math.max(.1,Math.min(.9,Number(b.ratio)));
    if(!Number.isFinite(ratio))fail("LAYOUT_RATIO_INVALID");
    const own=await db.from("tv_program_blocks").select("id").eq("room_id",room.id).in("id",ids);
    if(own.error)throw own.error;if((own.data||[]).length!==2)fail("LAYOUT_BLOCKS_INVALID",404);
    const row={room_id:room.id,block_a:ids[0],block_b:ids[1],ratio,updated_at:new Date().toISOString()};
    const q=await db.from("tv_program_layouts").upsert(row,{onConflict:"room_id,block_a,block_b"}).select("block_a,block_b,ratio,updated_at").single();
    if(q.error)throw q.error;await changed(room,"remote",clientId);return json(req,{ok:true,layout:q.data});
  }
  if(action==="delete"){
    const id=String(b.id||"");if(!id)fail("ID_REQUIRED");
    const q=await db.from("tv_program_blocks").delete().eq("id",id).eq("room_id",room.id);if(q.error)throw q.error;
    await changed(room,"remote",clientId);
    return json(req,{ok:true});
  }
  return json(req,{ok:false,error:"UNKNOWN_ACTION"},400);
}catch(e:any){console.error("tv-schedule-v1",e);return json(req,{ok:false,error:e?.code||e?.message||"INTERNAL_ERROR"},Number(e?.status||500))}});
