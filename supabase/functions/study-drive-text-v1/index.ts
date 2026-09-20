import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type,x-study-token,x-study-workspace,x-study-preview",
  "Access-Control-Allow-Methods":"GET,OPTIONS",
  "Cache-Control":"no-store"
};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"content-type":"application/json; charset=utf-8"}});
const db=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
async function sha256(s:string){
  const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function studyAuth(req:Request,c:any){
  const token=req.headers.get("x-study-token")||"";
  const workspace=req.headers.get("x-study-workspace")||"colo-study";
  if(token.length<20)return null;
  const q=await c.from("study_bb_workspaces").select("token_hash").eq("id",workspace).maybeSingle();
  if(q.error||!q.data)return null;
  return (await sha256(token))===q.data.token_hash?{workspace}:null;
}
async function previewAuth(req:Request,c:any,providerItemId:string){
  const token=req.headers.get("x-study-preview")||"";
  if(token.length<20)return null;
  const hash=await sha256(token);
  const q=await c.from("study_drive_preview_capabilities")
    .select("workspace_id,provider_item_id,enabled,expires_at")
    .eq("token_hash",hash)
    .maybeSingle();
  if(q.error||!q.data||!q.data.enabled)return null;
  if(q.data.provider_item_id!==providerItemId)return null;
  if(q.data.expires_at&&Date.parse(q.data.expires_at)<Date.now())return null;
  return {workspace:q.data.workspace_id};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="GET")return json({error:"method_not_allowed"},405);

  const u=new URL(req.url);
  const providerItemId=(u.searchParams.get("provider_item_id")||"").slice(0,300);
  if(!providerItemId)return json({error:"provider_item_id_required"},400);

  const c=db();
  const auth=(await studyAuth(req,c))||(await previewAuth(req,c,providerItemId));
  if(!auth)return json({error:"unauthorized"},401);

  const q=await c.from("study_drive_private_documents")
    .select("provider_item_id,title,mime_type,modified_at,full_text,char_count,metadata,updated_at")
    .eq("workspace_id",auth.workspace)
    .eq("provider_item_id",providerItemId)
    .maybeSingle();

  if(q.error)throw q.error;
  if(!q.data)return json({error:"not_found"},404);
  return json({ok:true,document:q.data});
});