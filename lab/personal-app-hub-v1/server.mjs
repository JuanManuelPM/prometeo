
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const kinds=Object.freeze({
  whatsapp_notification:"message.received",android_notification:"notification.received",
  gmail_export:"email.imported",calendar_export:"calendar.event_imported",
  pinterest_bookmark:"content.saved",youtube_link:"content.saved"
});
function reply(res,status,body){
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(JSON.stringify(body));
}
function parseEvent(x,storeBodies){
  if(!x||typeof x!=="object"||Array.isArray(x))throw Error("INVALID_OBJECT");
  if(!Object.hasOwn(kinds,x.source))throw Error("INVALID_SOURCE");
  if(typeof x.external_id!=="string"||!x.external_id.trim()||x.external_id.length>160)throw Error("INVALID_ID");
  for(const [k,max] of [["actor_id",160],["title",200],["text",4000]]){
    if(x[k]!==undefined&&(typeof x[k]!=="string"||x[k].length>max))throw Error("INVALID_"+k.toUpperCase());
  }
  if(x.occurred_at!==undefined&&(typeof x.occurred_at!=="string"||!Number.isFinite(Date.parse(x.occurred_at))))throw Error("INVALID_TIME");
  return {
    schema:"prometeo.app-event/v1",id:x.source+":"+x.external_id.trim(),source:x.source,kind:kinds[x.source],
    actor_id:x.actor_id||null,occurred_at:x.occurred_at?new Date(x.occurred_at).toISOString():new Date().toISOString(),
    title:storeBodies?(x.title||null):null,text:storeBodies?(x.text||null):null,
    body_retained:!!storeBodies,provenance:"authorized_ingest_not_provider_verified",received_at:new Date().toISOString()
  };
}
function proposed(events){
  return events.filter(x=>x.kind==="message.received"||x.kind==="calendar.event_imported")
    .map(x=>({event_id:x.id,action:"review",state:"PROPOSED_ONLY",external_write_executed:false}));
}
function safeEvent(x){
  const {actor_id,...rest}=x;
  return {...rest,actor_display:actor_id?"••••"+actor_id.slice(-4):null};
}
export function createApp({dataDir=path.join(os.homedir(),".local/share/prometeo/personal-app-hub-v1"),storeBodies=false}={}){
  fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
  fs.chmodSync(dataDir,0o700);
  const keyFile=path.join(dataDir,"api-key");
  if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,crypto.randomBytes(32).toString("hex"),{flag:"wx",mode:0o600});
  const key=fs.readFileSync(keyFile,"utf8").trim();
  const file=path.join(dataDir,"events.jsonl");
  const events=fs.existsSync(file)?fs.readFileSync(file,"utf8").split("\n").filter(Boolean).map(x=>JSON.parse(x)):[];
  if(events.some(x=>x.schema!=="prometeo.app-event/v1"))throw Error("INVALID_EVENT_STORE");
  const ids=new Set(events.map(x=>x.id));
  const server=http.createServer(async(req,res)=>{
    const host=req.headers.host||"";
    if(!/^127\.0\.0\.1:\d+$/.test(host))return reply(res,403,{error:"LOOPBACK_ONLY"});
    if(req.headers.origin&&req.headers.origin!=="http://"+host)return reply(res,403,{error:"ORIGIN_DENIED"});
    const route=new URL(req.url,"http://"+host).pathname;
    if(req.method==="GET"&&["/","/ui.js","/ui.css"].includes(route)){
      const filename=route==="/"?"index.html":route.slice(1);
      res.writeHead(200,{"content-type":filename.endsWith(".js")?"text/javascript":filename.endsWith(".css")?"text/css":"text/html",
       "content-security-policy":"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'",
       "referrer-policy":"no-referrer","cache-control":"no-store"});
      return res.end(fs.readFileSync(path.join(here,filename)));
    }
    if(!route.startsWith("/api/"))return reply(res,404,{error:"NOT_FOUND"});
    const supplied=req.headers["x-prometeo-key"];
    if(typeof supplied!=="string"||supplied.length!==key.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(key)))
      return reply(res,401,{error:"UNAUTHORIZED"});
    if(req.method==="GET"&&route==="/api/status")return reply(res,200,{mode:"LOCAL_CANDIDATE",events:events.length,provider_sessions:0,external_writes:false,body_storage:storeBodies});
    if(req.method==="GET"&&route==="/api/events")return reply(res,200,{items:events.slice(-1000).reverse().map(safeEvent)});
    if(req.method==="GET"&&route==="/api/proposals")return reply(res,200,{items:proposed(events.slice(-1000)).reverse()});
    if(req.method==="POST"&&route==="/api/events"){
      if(req.headers["content-type"]?.split(";")[0]!=="application/json")return reply(res,415,{error:"JSON_REQUIRED"});
      let size=0,chunks=[];
      try{
        for await(const chunk of req){size+=chunk.length;if(size>32768)throw Error("TOO_LARGE");chunks.push(chunk)}
        const event=parseEvent(JSON.parse(Buffer.concat(chunks).toString("utf8")),storeBodies);
        if(ids.has(event.id))return reply(res,200,{accepted:false,duplicate:true,id:event.id});
        fs.appendFileSync(file,JSON.stringify(event)+"\n",{mode:0o600});
        ids.add(event.id);events.push(event);
        return reply(res,201,{accepted:true,duplicate:false,id:event.id});
      }catch(e){return reply(res,e.message==="TOO_LARGE"?413:e instanceof SyntaxError?400:422,{error:e.message})}
    }
    return reply(res,405,{error:"METHOD_NOT_ALLOWED"});
  });
  return {server,key,dataDir,file};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const app=createApp({storeBodies:process.env.PROMETEO_HUB_STORE_BODIES==="1"});
  const port=Number(process.env.PROMETEO_HUB_PORT||19485);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error("INVALID_PORT");
  app.server.listen(port,"127.0.0.1",()=>console.log("Abrir en esta computadora: http://127.0.0.1:"+port+"/#key="+app.key));
}
