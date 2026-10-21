
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createApp } from "./server.mjs";
async function launch(dir,body=false){
 const a=createApp({dataDir:dir,storeBodies:body});
 a.server.listen(0,"127.0.0.1");await once(a.server,"listening");
 a.base="http://127.0.0.1:"+a.server.address().port;return a;
}
async function call(a,method,url,json,extra={}){
 const resp=await fetch(a.base+url,{method,headers:{"x-prometeo-key":a.key,...(json?{"content-type":"application/json"}:{}),...extra},body:json?JSON.stringify(json):undefined});
 return {status:resp.status,data:await resp.json()};
}
const evt={source:"whatsapp_notification",external_id:"test-1",actor_id:"+541112345678",title:"Secreto",text:"¿Clase?",occurred_at:"2026-10-20T22:00:00Z"};
test("real HTTP: auth, origin, validation, dedupe, storage, projections and restart",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"apphub-"));let a;
 try{
  a=await launch(dir);
  assert.equal((await call(a,"GET","/api/status",null,{"x-prometeo-key":"wrong"})).status,401);
  assert.equal((await call(a,"GET","/api/status",null,{"origin":"https://bad.example"})).status,403);
  assert.equal((await call(a,"POST","/api/events",{...evt,source:"unknown"})).status,422);
  assert.equal((await call(a,"POST","/api/events",{...evt,external_id:""})).status,422);
  assert.equal((await call(a,"POST","/api/events",{...evt,occurred_at:"INVALID"})).status,422);
  assert.equal((await call(a,"POST","/api/events",evt)).status,201);
  assert.equal((await call(a,"POST","/api/events",evt)).data.duplicate,true);
  const rows=(await call(a,"GET","/api/events")).data.items;
  assert.equal(rows.length,1);assert.equal(rows[0].kind,"message.received");
  assert.equal(rows[0].text,null);assert.equal(rows[0].title,null);
  assert.equal(rows[0].actor_display,"••••5678");assert.equal(rows[0].actor_id,undefined);
  const actions=(await call(a,"GET","/api/proposals")).data.items;
  assert.equal(actions.length,1);assert.equal(actions[0].external_write_executed,false);
  assert.equal((await call(a,"POST","/api/proposals",evt)).status,405);
  assert.equal((await call(a,"GET","/api/status")).data.provider_sessions,0);
  assert.equal(fs.readFileSync(a.file,"utf8").includes("Secreto"),false);
  await new Promise(resolve=>a.server.close(resolve));a=null;
  a=await launch(dir);
  assert.equal((await call(a,"GET","/api/events")).data.items.length,1);
  assert.equal((await call(a,"POST","/api/events",evt)).data.duplicate,true);
 }finally{if(a)await new Promise(resolve=>a.server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
});
test("body persistence requires explicit local opt-in; UI escapes text",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"apphub-opt-"));const a=await launch(dir,true);
 try{
  assert.equal((await call(a,"POST","/api/events",{...evt,text:"<img onerror=alert(1)>"})).status,201);
  assert.equal((await call(a,"GET","/api/events")).data.items[0].text,"<img onerror=alert(1)>");
  const ui=await(await fetch(a.base+"/ui.js")).text();
  assert.match(ui,/textContent/);assert.doesNotMatch(ui,/innerHTML/);
  assert.equal((await call(a,"GET","/api/status")).data.external_writes,false);
 }finally{await new Promise(resolve=>a.server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
});
