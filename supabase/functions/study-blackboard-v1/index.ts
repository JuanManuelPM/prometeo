import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type, x-study-token, x-study-workspace, apikey, authorization",
  "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
  "Cache-Control":"no-store"
};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,"content-type":"application/json; charset=utf-8"}});
const sb=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha256(s:string){
  const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function auth(req:Request){
  const token=req.headers.get("x-study-token")||"";
  const workspace=req.headers.get("x-study-workspace")||"colo-study";
  if(!token||token.length<20)return null;
  const db=sb();
  const q=await db.from("study_bb_workspaces").select("id,token_hash").eq("id",workspace).maybeSingle();
  if(q.error||!q.data)return null;
  const h=await sha256(token);
  if(h!==q.data.token_hash)return null;
  return {workspace,db};
}
function unfoldICS(raw:string){return raw.replace(/\r?\n[ \t]/g,"").split(/\r?\n/)}
function icsText(v:string){return v.replace(/\\n/gi,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\").trim()}
function zoneParts(ms:number,timeZone:string){
  const fmt=new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"});
  const p:any={}; for(const x of fmt.formatToParts(new Date(ms)))if(x.type!=="literal")p[x.type]=x.value;
  return {y:+p.year,m:+p.month-1,d:+p.day,h:+p.hour,mi:+p.minute,s:+p.second};
}
function wallClockUTC(y:number,m:number,d:number,h:number,mi:number,s:number,timeZone:string){
  const wall=Date.UTC(y,m,d,h,mi,s); let actual=wall;
  try{
    for(let i=0;i<3;i++){
      const p=zoneParts(actual,timeZone),shown=Date.UTC(p.y,p.m,p.d,p.h,p.mi,p.s),delta=shown-wall;
      if(!delta)break; actual-=delta;
    }
    return new Date(actual).toISOString();
  }catch{return new Date(wall).toISOString()}
}
function parseDate(line:string,defaultZone:string){
  const i=line.indexOf(":"); if(i<0)return {date:null,allDay:false};
  const head=line.slice(0,i),v=line.slice(i+1).trim(),allDay=/VALUE=DATE/i.test(head)||/^\d{8}$/.test(v);
  if(/^\d{8}$/.test(v)){const y=+v.slice(0,4),m=+v.slice(4,6)-1,d=+v.slice(6,8);return {date:new Date(Date.UTC(y,m,d)).toISOString(),allDay:true}}
  const z=v.endsWith("Z"),s=v.replace(/Z$/,"");
  if(/^\d{8}T\d{6}$/.test(s)){
    const y=+s.slice(0,4),m=+s.slice(4,6)-1,d=+s.slice(6,8),hh=+s.slice(9,11),mm=+s.slice(11,13),ss=+s.slice(13,15);
    if(z)return {date:new Date(Date.UTC(y,m,d,hh,mm,ss)).toISOString(),allDay:false};
    const tz=head.match(/TZID=([^;:]+)/i)?.[1]||defaultZone||"UTC";
    return {date:wallClockUTC(y,m,d,hh,mm,ss,tz),allDay:false};
  }
  const dt=new Date(v);return {date:isNaN(dt.getTime())?null:dt.toISOString(),allDay};
}
function parseICS(raw:string){
  const lines=unfoldICS(raw),defaultZone=lines.find(x=>/^TZID:/i.test(x))?.split(":").slice(1).join(":").trim()||"UTC",out:any[]=[];let cur:any=null;
  for(const line of lines){
    if(line==="BEGIN:VEVENT"){cur={raw:{}};continue}
    if(line==="END:VEVENT"){if(cur?.uid)out.push(cur);cur=null;continue}
    if(!cur)continue;
    const p=line.indexOf(":");if(p<0)continue;const keyHead=line.slice(0,p),key=keyHead.split(";")[0].toUpperCase(),value=line.slice(p+1);
    cur.raw[key]=(cur.raw[key]?[].concat(cur.raw[key],value):value);
    if(key==="UID")cur.uid=icsText(value);
    else if(key==="SUMMARY")cur.title=icsText(value);
    else if(key==="DESCRIPTION")cur.description=icsText(value);
    else if(key==="LOCATION")cur.location=icsText(value);
    else if(key==="URL")cur.href=icsText(value);
    else if(key==="DTSTART"){const x=parseDate(line,defaultZone);cur.starts_at=x.date;cur.all_day=x.allDay}
    else if(key==="DTEND"){const x=parseDate(line,defaultZone);cur.ends_at=x.date}
  }
  return out;
}
function courseHint(e:any){
  const s=[e.title,e.description].filter(Boolean).join(" · ");
  const bracket=s.match(/\[([^\]]{3,100})\]/);if(bracket)return bracket[1].trim();
  const dash=(e.title||"").match(/^(.{3,100}?)\s[-–—]\s/);if(dash)return dash[1].trim();return null;
}
async function fingerprint(x:any){const copy={...x};delete copy.raw;delete copy.first_seen_at;delete copy.last_seen_at;delete copy.fingerprint;return (await sha256(JSON.stringify(copy))).slice(0,32)}
async function recordChange(db:any,workspace:string,source_kind:string,entity_type:string,entity_key:string,change_type:string,course_key:string|null,title:string,before:any,after:any){await db.from("study_bb_changes").insert({workspace_id:workspace,source_kind,entity_type,entity_key,change_type,course_key,title,before,after})}
async function syncCalendar(db:any,workspace:string){
  const src=await db.from("study_bb_sources").select("calendar_feed_url,source_id").eq("workspace_id",workspace).eq("source_id","palermo").eq("enabled",true).maybeSingle();
  if(src.error||!src.data?.calendar_feed_url)throw new Error("calendar_source_missing");
  const r=await fetch(src.data.calendar_feed_url,{headers:{"user-agent":"Mozilla/5.0 Prometeo-Study/1.0","accept":"text/calendar,*/*"},redirect:"follow"});
  if(!r.ok)throw new Error(`calendar_http_${r.status}`);const raw=await r.text();if(!raw.includes("BEGIN:VCALENDAR"))throw new Error("calendar_not_ics");
  const events=parseICS(raw);let created=0,updated=0,unchanged=0;
  for(const e of events){
    const row:any={workspace_id:workspace,uid:e.uid,title:e.title||"Evento",description:e.description||null,starts_at:e.starts_at||null,ends_at:e.ends_at||null,all_day:!!e.all_day,location:e.location||null,href:e.href||null,course_hint:courseHint(e),raw:e.raw||{},last_seen_at:new Date().toISOString()};row.fingerprint=await fingerprint(row);
    const prev=await db.from("study_bb_events").select("*").eq("workspace_id",workspace).eq("uid",row.uid).maybeSingle();
    if(!prev.data){created++;await db.from("study_bb_events").insert(row);await recordChange(db,workspace,"calendar","event",row.uid,"created",null,row.title,null,row)}
    else if(prev.data.fingerprint!==row.fingerprint){updated++;await db.from("study_bb_events").update(row).eq("workspace_id",workspace).eq("uid",row.uid);await recordChange(db,workspace,"calendar","event",row.uid,"updated",null,row.title,prev.data,row)}
    else{unchanged++;await db.from("study_bb_events").update({last_seen_at:row.last_seen_at}).eq("workspace_id",workspace).eq("uid",row.uid)}
  }
  await db.from("study_bb_sources").update({last_sync_at:new Date().toISOString(),last_error:null}).eq("workspace_id",workspace).eq("source_id","palermo");return {total:events.length,created,updated,unchanged};
}
async function ingest(db:any,workspace:string,body:any){
  const run=await db.from("study_bb_sync_runs").insert({workspace_id:workspace,source_kind:"browser_bridge",device_id:body.device_id||null}).select("id").single();let coursesCreated=0,coursesUpdated=0,itemsCreated=0,itemsUpdated=0;
  try{
    const courses=Array.isArray(body.courses)?body.courses.slice(0,100):[];
    for(const c0 of courses){const key=String(c0.course_key||c0.id||"").slice(0,240);if(!key)continue;const row:any={workspace_id:workspace,course_key:key,title:String(c0.title||c0.name||key).slice(0,500),code:c0.code?String(c0.code).slice(0,200):null,href:c0.href?String(c0.href).slice(0,2000):null,term:c0.term?String(c0.term).slice(0,300):null,instructor:c0.instructor?String(c0.instructor).slice(0,500):null,raw:c0.raw||{},last_seen_at:new Date().toISOString()};const prev=await db.from("study_bb_courses").select("*").eq("workspace_id",workspace).eq("course_key",key).maybeSingle();if(!prev.data){coursesCreated++;await db.from("study_bb_courses").insert(row);await recordChange(db,workspace,"browser_bridge","course",key,"created",key,row.title,null,row)}else{const changed=prev.data.title!==row.title||prev.data.href!==row.href||prev.data.term!==row.term||prev.data.instructor!==row.instructor;if(changed){coursesUpdated++;await recordChange(db,workspace,"browser_bridge","course",key,"updated",key,row.title,prev.data,row)}await db.from("study_bb_courses").update(row).eq("workspace_id",workspace).eq("course_key",key)}}
    const items=Array.isArray(body.items)?body.items.slice(0,2500):[];
    for(const x0 of items){const key=String(x0.item_key||x0.id||"").slice(0,500);if(!key)continue;const row:any={workspace_id:workspace,item_key:key,course_key:x0.course_key?String(x0.course_key).slice(0,240):null,parent_key:x0.parent_key?String(x0.parent_key).slice(0,500):null,item_type:String(x0.item_type||x0.type||"content").slice(0,80),title:String(x0.title||"").slice(0,1000),body_text:x0.body_text?String(x0.body_text).slice(0,20000):null,href:x0.href?String(x0.href).slice(0,4000):null,file_name:x0.file_name?String(x0.file_name).slice(0,1000):null,mime_type:x0.mime_type?String(x0.mime_type).slice(0,200):null,due_at:x0.due_at||null,modified_at:x0.modified_at||null,source_page:x0.source_page?String(x0.source_page).slice(0,4000):null,raw:x0.raw||{},last_seen_at:new Date().toISOString()};row.fingerprint=await fingerprint(row);const prev=await db.from("study_bb_items").select("*").eq("workspace_id",workspace).eq("item_key",key).maybeSingle();if(!prev.data){itemsCreated++;await db.from("study_bb_items").insert(row);await recordChange(db,workspace,"browser_bridge","item",key,"created",row.course_key,row.title,null,row)}else if(prev.data.fingerprint!==row.fingerprint){itemsUpdated++;await db.from("study_bb_items").update(row).eq("workspace_id",workspace).eq("item_key",key);await recordChange(db,workspace,"browser_bridge","item",key,"updated",row.course_key,row.title,prev.data,row)}else await db.from("study_bb_items").update({last_seen_at:row.last_seen_at}).eq("workspace_id",workspace).eq("item_key",key)}
    const stats={courses:courses.length,items:items.length,coursesCreated,coursesUpdated,itemsCreated,itemsUpdated,pages:Number(body.pages||0)};if(run.data?.id)await db.from("study_bb_sync_runs").update({finished_at:new Date().toISOString(),status:"ok",stats}).eq("id",run.data.id);await db.from("study_bb_sources").update({last_sync_at:new Date().toISOString(),last_error:null}).eq("workspace_id",workspace).eq("source_id","palermo");return stats;
  }catch(e){if(run.data?.id)await db.from("study_bb_sync_runs").update({finished_at:new Date().toISOString(),status:"error",error:String(e)}).eq("id",run.data.id);throw e}
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});const a=await auth(req);if(!a)return json({error:"unauthorized"},401);const {workspace,db}=a,url=new URL(req.url),action=url.searchParams.get("action")||"status";
  try{
    if(req.method==="POST"&&action==="calendar-sync")return json({ok:true,calendar:await syncCalendar(db,workspace)});
    if(req.method==="POST"&&action==="ingest")return json({ok:true,ingest:await ingest(db,workspace,await req.json())});
    if(req.method==="GET"&&action==="data"){
      const now=new Date(),from=new Date(now.getTime()-1000*60*60*24*30).toISOString(),to=new Date(now.getTime()+1000*60*60*24*365).toISOString();const [courses,events,items,changes,runs,source]=await Promise.all([
        db.from("study_bb_courses").select("course_key,title,code,href,term,instructor,last_seen_at").eq("workspace_id",workspace).order("title"),
        db.from("study_bb_events").select("uid,course_hint,title,description,starts_at,ends_at,all_day,location,href,last_seen_at").eq("workspace_id",workspace).gte("starts_at",from).lte("starts_at",to).order("starts_at"),
        db.from("study_bb_items").select("item_key,course_key,parent_key,item_type,title,body_text,href,file_name,mime_type,due_at,modified_at,last_seen_at").eq("workspace_id",workspace).order("last_seen_at",{ascending:false}).limit(1200),
        db.from("study_bb_changes").select("id,source_kind,entity_type,entity_key,change_type,course_key,title,created_at").eq("workspace_id",workspace).order("created_at",{ascending:false}).limit(80),
        db.from("study_bb_sync_runs").select("id,source_kind,device_id,started_at,finished_at,status,stats,error").eq("workspace_id",workspace).order("started_at",{ascending:false}).limit(10),
        db.from("study_bb_sources").select("source_id,kind,base_url,last_sync_at,last_error,metadata").eq("workspace_id",workspace)]);return json({ok:true,courses:courses.data||[],events:events.data||[],items:items.data||[],changes:changes.data||[],runs:runs.data||[],sources:source.data||[]});
    }
    if(req.method==="GET"&&action==="status"){const [courses,items,events,changes,src]=await Promise.all([db.from("study_bb_courses").select("course_key",{count:"exact",head:true}).eq("workspace_id",workspace),db.from("study_bb_items").select("item_key",{count:"exact",head:true}).eq("workspace_id",workspace),db.from("study_bb_events").select("uid",{count:"exact",head:true}).eq("workspace_id",workspace),db.from("study_bb_changes").select("id",{count:"exact",head:true}).eq("workspace_id",workspace),db.from("study_bb_sources").select("source_id,last_sync_at,last_error").eq("workspace_id",workspace)]);return json({ok:true,counts:{courses:courses.count||0,items:items.count||0,events:events.count||0,changes:changes.count||0},sources:src.data||[]})}
    return json({error:"not_found"},404);
  }catch(e){console.error(e);return json({error:String((e as any)?.message||e)},500)}
});