import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(SUPABASE_URL,SERVICE,{auth:{persistSession:false}});
const SETUP="https://juanmanuelpm.github.io/prometeo/pages/lab/channels/setup/";
async function sha256(v:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function makeLink(){
  const {data:o,error:oe}=await admin.from("prometeo_owner").select("auth_user_id").eq("singleton",true).single();
  if(oe||!o?.auth_user_id)throw oe||new Error("OWNER_NOT_CONFIGURED");
  const {data:uinfo,error:ue}=await admin.auth.admin.getUserById(o.auth_user_id);
  const email=uinfo?.user?.email;
  if(ue||!email)throw ue||new Error("OWNER_EMAIL_NOT_FOUND");
  const {data,error}=await admin.auth.admin.generateLink({type:"magiclink",email,options:{redirectTo:SETUP}});
  if(error||!data?.properties?.action_link)throw error||new Error("LINK_NOT_GENERATED");
  return data.properties.action_link;
}
Deno.serve(async(req:Request)=>{
  const requestUrl=new globalThis.URL(req.url);
  if(req.method!=="GET")return new Response("method not allowed",{status:405});
  if(requestUrl.searchParams.get("selftest")==="1"){
    try{const link=await makeLink();return new Response(JSON.stringify({ok:true,generated:true,redirect_target:SETUP,link_host:new globalThis.URL(link).host}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}})}catch(e){return new Response(JSON.stringify({ok:false,message:String((e as any)?.message||e)}),{status:500,headers:{"Content-Type":"application/json"}})}
  }
  if(requestUrl.searchParams.get("stage")==="1"){
    try{const link=await makeLink();const {error}=await admin.from("creator_private_login_links").insert({action_link:link,expires_at:new Date(Date.now()+15*60*1000).toISOString()});if(error)throw error;return new Response(JSON.stringify({ok:true,staged:true}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}})}catch(e){return new Response(JSON.stringify({ok:false,message:String((e as any)?.message||e)}),{status:500,headers:{"Content-Type":"application/json"}})}
  }
  const token=requestUrl.searchParams.get("token")||"";
  if(token.length<32)return Response.redirect(SETUP+"?login_error=bootstrap_invalid",302);
  try{
    const hash=await sha256(token);
    const {data:claimed,error:ce}=await admin.rpc("creator_claim_login_bootstrap",{p_hash:hash});
    if(ce)throw ce;
    if(claimed!==true)return Response.redirect(SETUP+"?login_error=bootstrap_expired",302);
    const link=await makeLink();
    return Response.redirect(link,302);
  }catch(e){
    console.error("creator-owner-bootstrap",String((e as any)?.message||e));
    return Response.redirect(SETUP+"?login_error=bootstrap_failed",302);
  }
});