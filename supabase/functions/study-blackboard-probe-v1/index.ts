import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, x-study-token, x-study-workspace","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,"content-type":"application/json; charset=utf-8"}});
const sb=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
async function sha256(s:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function filesafe(x:any){if(!x||typeof x!=="object")return null;return{mirrored:Number(x.mirrored||0),skipped:Number(x.skipped||0),failed:Number(x.failed||0),candidates:Number(x.candidates||0)}}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"method"},405);
 const token=req.headers.get("x-study-token")||"",workspace=req.headers.get("x-study-workspace")||"colo-study";
 if(token.length<20)return json({error:"unauthorized"},401);
 const db=sb(),q=await db.from("study_bb_workspaces").select("id,token_hash").eq("id",workspace).maybeSingle();
 if(q.error||!q.data||await sha256(token)!==q.data.token_hash)return json({error:"unauthorized"},401);
 let body:any={};try{body=await req.json()}catch{}
 const phase=String(body.phase||"probe").slice(0,80),r=body.result&&typeof body.result==="object"?body.result:{};
 const last=r.lastSync&&typeof r.lastSync==="object"?r.lastSync:null;
 const safe:any={phase,extension:!!body.extension,paired:!!body.paired,version:String(body.version||"").slice(0,40),page:String(body.page||"").slice(0,300)};
 if(Object.keys(r).length)safe.result={ok:r.ok===true,needs_login:r.needs_login===true,state:String(r.state||last?.state||"").slice(0,80),error:String(r.error||last?.error||"").slice(0,300),pages:Number(r.pages||last?.pages||0),courses:Number(r.courses||last?.courses||0),items:Number(r.items||last?.items||0),files:filesafe(r.files||last?.files),paired:r.paired===true,running:r.running===true,last_sync_at:last?.at||null};
 const now=new Date().toISOString();
 const ins=await db.from("study_bb_sync_runs").insert({workspace_id:workspace,source_kind:"browser_bridge_probe",device_id:String(body.device_id||"").slice(0,200)||null,finished_at:now,status:"ok",stats:safe}).select("id").single();
 if(ins.error)return json({error:"insert"},500);
 return json({ok:true,id:ins.data?.id,phase});
});