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
  const cleanDisplay=()=>{
    const d=(x.display&&typeof x.display==="object")?x.display:{};
    const profile=["wide","compact","flex"].includes(String(d.profile||""))?String(d.profile):"";
    const position=["top","bottom","side","auto"].includes(String(d.position||""))?String(d.position):"";
    return (profile||position)?{...(profile?{profile}:{}),...(position?{position}:{})}:undefined;
  };
  if(kind==="clock")return {
    style:String(x.style||"time-mass-25-5").slice(0,32),
    focus_minutes:Math.max(5,Math.min(120,Math.round(Number(x.focus_minutes)||25))),
    break_minutes:Math.max(1,Math.min(60,Math.round(Number(x.break_minutes)||5)))
  };
  if(kind==="black")return {};
  if(kind==="youtube")return {};
  if(kind==="page"){
    let u:URL;try{u=new URL(String(x.url||""))}catch{fail("PAGE_URL_INVALID")}
    if(!["http:","https:"].includes(u!.protocol))fail("PAGE_URL_INVALID");
    const c=(x.control&&typeof x.control==="object")?x.control:{},allowed=["previous","next","toggle","reset","refresh"],actions=Array.isArray(c.actions)?c.actions.map(String).filter((a:string)=>allowed.includes(a)).slice(0,8):[];
    let settings_url="";if(c.settings_url){try{const su=new URL(String(c.settings_url),u!.toString());if(["http:","https:"].includes(su.protocol))settings_url=su.toString()}catch{}}
    const display=cleanDisplay(),control=(actions.length||settings_url||c.label)?{...(c.label?{label:String(c.label).slice(0,40)}:{}),...(actions.length?{actions}:{}),...(settings_url?{settings_url}:{})}:undefined;
    return {url:u!.toString(),...(display?{display}:{}),...(control?{control}:{})};
  }
  fail("KIND_INVALID");
}

async function youtubeState(room:any){
  const q=await db.from("tv_youtube_state").select("*").eq("room_id",room.id).maybeSingle();
  if(q.error)throw q.error;
  if(q.data)return q.data;
  const row={room_id:room.id,queue:[],current_index:0,current_video_id:"",updated_at:new Date().toISOString()};
  const ins=await db.from("tv_youtube_state").upsert(row,{onConflict:"room_id"}).select().single();
  if(ins.error)throw ins.error;return ins.data;
}
function normalizedQueue(raw:any){
  const seen=new Set<string>(),out:any[]=[];
  for(const v of (Array.isArray(raw)?raw:[]).slice(0,100)){
    const video_id=ytId(String(v?.video_id||v?.watch_url||v?.url||""));if(!video_id||seen.has(video_id))continue;
    seen.add(video_id);
    out.push({video_id,title:String(v?.title||v?.video_title||"YouTube").slice(0,200),channel_id:String(v?.channel_id||"").slice(0,80),channel_title:String(v?.channel_title||"").slice(0,120),thumbnail:String(v?.thumbnail||`https://i.ytimg.com/vi/${video_id}/mqdefault.jpg`).slice(0,500),watch_url:`https://www.youtube.com/watch?v=${video_id}`});
  }
  return out;
}
function currentFromState(state:any){
  const queue=normalizedQueue(state?.queue);
  let index=Math.max(0,Math.floor(Number(state?.current_index)||0));
  if(index>=queue.length)return {queue,index,video:null};
  return {queue,index,video:queue[index]||null};
}
function hydrateYoutubeBlock(block:any,state:any){
  const cur=currentFromState(state),v:any=cur.video;
  return {...block,title:"YOUTUBE",payload:v?{video_id:v.video_id,url:v.watch_url,video_title:v.title,channel_id:v.channel_id,channel_title:v.channel_title,auto_next:true}:{}}; 
}
async function youtubeLibrary(room:any){
  const [cq,sq,hq,fq]=await Promise.all([
    db.from("tv_youtube_channels").select("channel_id,title,thumbnail,enabled,sort_order,added_at,folder_id").eq("room_id",room.id).eq("enabled",true).order("sort_order").order("added_at"),
    db.from("tv_youtube_state").select("*").eq("room_id",room.id).maybeSingle(),
    db.from("tv_watch_history").select("video_id",{count:"exact",head:true}).eq("room_id",room.id),
    db.from("tv_youtube_folders").select("id,name,sort_order,created_at").eq("room_id",room.id).order("sort_order").order("created_at")
  ]);
  if(cq.error)throw cq.error;if(sq.error)throw sq.error;if(hq.error)throw hq.error;if(fq.error)throw fq.error;
  const state=sq.data||await youtubeState(room);
  return {channels:cq.data||[],folders:fq.data||[],state:{queue:normalizedQueue(state.queue),current_index:Number(state.current_index||0),current_video_id:String(state.current_video_id||"")},watched_count:Number(hq.count||0)};
}

async function changed(room:any,source:string,clientId:string){
  await db.from("prometeo_tv_events").insert({room_id:room.id,source,client_id:clientId||"legacy",event_type:"schedule.changed",payload:{at:new Date().toISOString()}});
}
async function advanceYoutubeBlock(room:any,blockId:string,expected:string,clientId:string){
  if(!blockId)fail("ID_REQUIRED");
  const q=await db.from("tv_program_blocks").select("*").eq("id",blockId).eq("room_id",room.id).eq("kind","youtube").maybeSingle();
  if(q.error)throw q.error;if(!q.data)fail("BLOCK_NOT_FOUND",404);
  const block=q.data,state=await youtubeState(room),cur=currentFromState(state),current:any=cur.video;
  if(expected&&String(current?.video_id||"")!==expected)return {ok:true,stale:true,block:hydrateYoutubeBlock(block,state)};
  if(!current)return {ok:true,advanced:false,reason:"NO_CURRENT_VIDEO",block:hydrateYoutubeBlock(block,state)};
  const h={room_id:room.id,video_id:current.video_id,channel_id:String(current.channel_id||""),channel_title:String(current.channel_title||""),title:String(current.title||"YouTube"),watched_at:new Date().toISOString()};
  const hq=await db.from("tv_watch_history").upsert(h,{onConflict:"room_id,video_id"});if(hq.error)throw hq.error;
  const nextIndex=cur.index+1,next:any=cur.queue[nextIndex]||null;
  const nextState={room_id:room.id,queue:cur.queue,current_index:nextIndex,current_video_id:String(next?.video_id||""),updated_at:new Date().toISOString()};
  const uq=await db.from("tv_youtube_state").upsert(nextState,{onConflict:"room_id"}).select().single();if(uq.error)throw uq.error;
  await changed(room,"tv",clientId);
  return {ok:true,advanced:true,ended:!next,block:hydrateYoutubeBlock(block,uq.data),next};
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
    const rawBlocks=bq.data||[],ytState=await youtubeState(room);
    const blocks=rawBlocks.map((x:any)=>x.kind==="youtube"?hydrateYoutubeBlock(x,ytState):x);
    const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"America/Argentina/Buenos_Aires",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());
    const get=(t:string)=>Number(parts.find(x=>x.type===t)?.value||0);
    const now_minute=get("hour")*60+get("minute");
    const active_blocks=blocks.filter((x:any)=>now_minute>=Number(x.start_minute)&&now_minute<Number(x.end_minute));
    const revision=blocks.reduce((m:any,x:any)=>String(x.updated_at||"")>m?String(x.updated_at||""):m,"");
    return json(req,{ok:true,timezone:"America/Argentina/Buenos_Aires",now_minute,blocks,active_blocks,revision,runtime_build:"23"});
  }
  if(action==="state"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const q=await db.from("tv_live_state").select("*").eq("room_id",room.id).order("updated_at",{ascending:false}).limit(20);
    if(q.error)throw q.error;
    const states=q.data||[];
    return json(req,{ok:true,state:states[0]||null,states,runtime_build:"23"});
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
  if(action==="youtube_library"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    return json(req,{ok:true,...await youtubeLibrary(room)});
  }
  if(action==="youtube_channel_add"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const channel_id=String(b.channel_id||"").slice(0,80);if(!channel_id)fail("CHANNEL_ID_REQUIRED");
    const folder_id=String(b.folder_id||"")||null;
    if(folder_id){const fq=await db.from("tv_youtube_folders").select("id").eq("room_id",room.id).eq("id",folder_id).maybeSingle();if(fq.error)throw fq.error;if(!fq.data)fail("FOLDER_NOT_FOUND",404)}
    const row={room_id:room.id,channel_id,title:String(b.title||"").slice(0,160),thumbnail:String(b.thumbnail||"").slice(0,500),enabled:true,sort_order:Number(b.sort_order)||0,folder_id,added_at:new Date().toISOString()};
    const q=await db.from("tv_youtube_channels").upsert(row,{onConflict:"room_id,channel_id"}).select().single();if(q.error)throw q.error;
    return json(req,{ok:true,channel:q.data,...await youtubeLibrary(room)});
  }
  if(action==="youtube_folder_create"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const name=String(b.name||"").trim().slice(0,80);if(!name)fail("FOLDER_NAME_REQUIRED");
    const q=await db.from("tv_youtube_folders").insert({room_id:room.id,name,sort_order:Number(b.sort_order)||0}).select("id,name,sort_order,created_at").single();
    if(q.error)throw q.error;return json(req,{ok:true,folder:q.data,...await youtubeLibrary(room)});
  }
  if(action==="youtube_folder_rename"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const id=String(b.folder_id||""),name=String(b.name||"").trim().slice(0,80);if(!id||!name)fail("FOLDER_REQUIRED");
    const q=await db.from("tv_youtube_folders").update({name}).eq("room_id",room.id).eq("id",id).select("id,name,sort_order,created_at").single();if(q.error)throw q.error;
    return json(req,{ok:true,folder:q.data,...await youtubeLibrary(room)});
  }
  if(action==="youtube_folder_set_channels"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const folder_id=String(b.folder_id||"");if(!folder_id)fail("FOLDER_REQUIRED");
    const ids=[...new Set((Array.isArray(b.channel_ids)?b.channel_ids:[]).map((x:any)=>String(x)).filter(Boolean))].slice(0,500);
    const fq=await db.from("tv_youtube_folders").select("id").eq("room_id",room.id).eq("id",folder_id).maybeSingle();
    if(fq.error)throw fq.error;if(!fq.data)fail("FOLDER_NOT_FOUND",404);
    const clear=await db.from("tv_youtube_channels").update({folder_id:null}).eq("room_id",room.id).eq("folder_id",folder_id);
    if(clear.error)throw clear.error;
    if(ids.length){
      const setq=await db.from("tv_youtube_channels").update({folder_id}).eq("room_id",room.id).in("channel_id",ids);
      if(setq.error)throw setq.error;
    }
    return json(req,{ok:true,...await youtubeLibrary(room)});
  }
  if(action==="youtube_folder_delete"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const id=String(b.folder_id||"");if(!id)fail("FOLDER_REQUIRED");
    const uq=await db.from("tv_youtube_channels").update({folder_id:null}).eq("room_id",room.id).eq("folder_id",id);if(uq.error)throw uq.error;
    const q=await db.from("tv_youtube_folders").delete().eq("room_id",room.id).eq("id",id);if(q.error)throw q.error;
    return json(req,{ok:true,...await youtubeLibrary(room)});
  }
  if(action==="youtube_channel_move"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const channel_id=String(b.channel_id||""),folder_id=String(b.folder_id||"")||null;if(!channel_id)fail("CHANNEL_ID_REQUIRED");
    if(folder_id){const fq=await db.from("tv_youtube_folders").select("id").eq("room_id",room.id).eq("id",folder_id).maybeSingle();if(fq.error)throw fq.error;if(!fq.data)fail("FOLDER_NOT_FOUND",404)}
    const q=await db.from("tv_youtube_channels").update({folder_id}).eq("room_id",room.id).eq("channel_id",channel_id);if(q.error)throw q.error;
    return json(req,{ok:true,...await youtubeLibrary(room)});
  }
  if(action==="youtube_channel_remove"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const channel_id=String(b.channel_id||"");if(!channel_id)fail("CHANNEL_ID_REQUIRED");
    const q=await db.from("tv_youtube_channels").delete().eq("room_id",room.id).eq("channel_id",channel_id);if(q.error)throw q.error;
    return json(req,{ok:true,...await youtubeLibrary(room)});
  }
  if(action==="youtube_queue_set"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const queue=normalizedQueue(b.queue),old=await youtubeState(room);
    const keep=String(b.keep_current||"")||String(old.current_video_id||"");
    let index=queue.findIndex((v:any)=>v.video_id===keep);if(index<0)index=0;
    const current:any=queue[index]||null;
    const row={room_id:room.id,queue,current_index:index,current_video_id:String(current?.video_id||""),updated_at:new Date().toISOString()};
    const q=await db.from("tv_youtube_state").upsert(row,{onConflict:"room_id"}).select().single();if(q.error)throw q.error;
    await changed(room,"remote",clientId);
    return json(req,{ok:true,state:q.data});
  }
  if(action==="youtube_play_now"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const state=await youtubeState(room),queue=normalizedQueue(state.queue),incoming:any=normalizedQueue([b.video||b])[0]||null;
    if(!incoming)fail("VIDEO_REQUIRED");
    const existing:any=queue.find((v:any)=>v.video_id===incoming.video_id)||null;
    const chosen:any=existing?{...existing,...incoming}:incoming;
    const nextQueue=[chosen,...queue.filter((v:any)=>v.video_id!==chosen.video_id)];
    const row={room_id:room.id,queue:nextQueue,current_index:0,current_video_id:String(chosen.video_id),updated_at:new Date().toISOString()};
    const q=await db.from("tv_youtube_state").upsert(row,{onConflict:"room_id"}).select().single();if(q.error)throw q.error;
    await changed(room,"remote",clientId);
    await db.from("prometeo_tv_events").insert({room_id:room.id,source:"remote",client_id:clientId||null,event_type:"player.command",payload:{command:"refresh_panel",block_id:"",value:null,at:new Date().toISOString()}});
    return json(req,{ok:true,state:q.data});
  }
  if(action==="youtube_play_index"){
    if(role!=="remote")fail("REMOTE_REQUIRED",403);
    const state=await youtubeState(room),cur=currentFromState(state),max=Math.max(0,cur.queue.length-1),index=Math.max(0,Math.min(max,Math.floor(Number(b.index)||0))),video:any=cur.queue[index]||null;
    const row={room_id:room.id,queue:cur.queue,current_index:index,current_video_id:String(video?.video_id||""),updated_at:new Date().toISOString()};
    const q=await db.from("tv_youtube_state").upsert(row,{onConflict:"room_id"}).select().single();if(q.error)throw q.error;
    await changed(room,"remote",clientId);
    await db.from("prometeo_tv_events").insert({room_id:room.id,source:"remote",client_id:clientId||null,event_type:"player.command",payload:{command:"refresh_panel",block_id:"",value:null,at:new Date().toISOString()}});
    return json(req,{ok:true,state:q.data});
  }
  if(action==="youtube_advance"){
    if(role!=="tv")fail("TV_REQUIRED",403);
    const result:any=await advanceYoutubeBlock(room,String(b.block_id||""),String(b.video_id||""),clientId);
    return json(req,result);
  }
  if(role!=="remote")fail("REMOTE_REQUIRED",403);
  if(action==="command"){
    const command=String(b.command||"");
    if(!["play","pause","toggle","mute","unmute","refresh_panel","reload_when_idle","reload_now","widget_previous","widget_next","widget_toggle","widget_reset"].includes(command))fail("COMMAND_INVALID");
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
