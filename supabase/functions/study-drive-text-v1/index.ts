import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"content-type,x-study-token,x-study-workspace",
  "Access-Control-Allow-Methods":"GET,OPTIONS",
  "Cache-Control":"no-store"
};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"content-type":"application/json; charset=utf-8"}});
const db=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function sha256(s:string){
  const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function auth(req:Request){
  const token=req.headers.get("x-study-token")||"";
  const workspace=req.headers.get("x-study-workspace")||"colo-study";
  if(token.length<20)return null;
  const c=db();
  const q=await c.from("study_bb_workspaces").select("token_hash").eq("id",workspace).maybeSingle();
  if(q.error||!q.data)return null;
  return (await sha256(token))===q.data.token_hash?{workspace,c}:null;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="GET")return json({error:"method_not_allowed"},405);

  const a=await auth(req);
  if(!a)return json({error:"unauthorized"},401);

  const u=new URL(req.url);
  const providerItemId=(u.searchParams.get("provider_item_id")||"").slice(0,300);
  if(!providerItemId)return json({error:"provider_item_id_required"},400);

  const q=await a.c.from("study_drive_private_documents")
    .select("provider_item_id,title,mime_type,modified_at,full_text,char_count,metadata,updated_at")
    .eq("workspace_id",a.workspace)
    .eq("provider_item_id",providerItemId)
    .maybeSingle();

  if(q.error)throw q.error;
  if(!q.data)return json({error:"not_found"},404);

  return json({ok:true,document:q.data});
});
