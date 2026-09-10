import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Cache-Control": "no-store",
};
function out(data: unknown, status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS,"Content-Type":"application/json"}})}
async function sha256(v:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function load(workId:string,token:string){
  if(!/^[0-9a-f-]{36}$/i.test(workId)||token.length<30) throw new Error("INVALID_CLAIM");
  const {data,error}=await db.from("creator_external_work").select("*").eq("id",workId).maybeSingle();
  if(error||!data) throw new Error("WORK_NOT_FOUND");
  const h=await sha256(token);
  if(!data.claim_token_hash||h!==data.claim_token_hash) throw new Error("INVALID_CLAIM");
  return data;
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  try{
    const u=new globalThis.URL(req.url);
    if(req.method==="GET"&&u.searchParams.get("schema")==="1") return out({schema:"prometeo.creator-external-work/v1",get:"GET ?work_id=<uuid>&token=<opaque>",return:"POST {work_id,token,result}",rule:"Token grants access only to one work packet; it never grants account/API access."});
    if(req.method==="GET"){
      const workId=u.searchParams.get("work_id")||"";const token=u.searchParams.get("token")||"";
      const w=await load(workId,token);
      if(["RETURNED","APPLIED","CANCELLED"].includes(w.status)) return out({ok:true,work:{id:w.id,status:w.status,task:w.task,context_version:w.context_version,result:w.result||null}});
      if(w.status==="OPEN") await db.from("creator_external_work").update({status:"CLAIMED",claimed_at:new Date().toISOString()}).eq("id",w.id).eq("status","OPEN");
      return out({ok:true,schema:"prometeo.creator-work-packet/v1",work:{id:w.id,status:"CLAIMED",task:w.task,context_version:w.context_version,context:w.context},return_contract:{method:"POST",url:`${SB_URL}/functions/v1/creator-work`,body:{work_id:w.id,token:"<same opaque token>",result:{summary:"string",changes:"object",proposals:"array",notes:"array"}}}});
    }
    if(req.method==="POST"){
      const body=await req.json(); const workId=String(body?.work_id||""); const token=String(body?.token||"");
      const w=await load(workId,token);
      if(["RETURNED","APPLIED"].includes(w.status)) return out({ok:true,idempotent:true,work:{id:w.id,status:w.status}});
      if(w.status==="CANCELLED") return out({ok:false,error:"WORK_CANCELLED"},409);
      if(body?.result==null||typeof body.result!=="object"||Array.isArray(body.result)) return out({ok:false,error:"RESULT_OBJECT_REQUIRED"},400);
      const raw=JSON.stringify(body.result); if(raw.length>250000) return out({ok:false,error:"RESULT_TOO_LARGE"},413);
      const {data,error}=await db.from("creator_external_work").update({status:"RETURNED",result:body.result,returned_at:new Date().toISOString()}).eq("id",w.id).in("status",["OPEN","CLAIMED"]).select("id,status,returned_at").single();
      if(error)throw error;
      return out({ok:true,work:data});
    }
    return out({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  }catch(e){const m=String((e as any)?.message||e);return out({ok:false,error:m},m.includes("NOT_FOUND")?404:m.includes("INVALID")?403:500)}
});
