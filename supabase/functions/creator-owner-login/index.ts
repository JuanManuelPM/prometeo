import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const ANON=Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(SUPABASE_URL,SERVICE,{auth:{persistSession:false}});
const authClient=createClient(SUPABASE_URL,ANON,{auth:{persistSession:false}});
const ALLOWED_ORIGIN="https://juanmanuelpm.github.io";
const cors={"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store"};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...cors,"Content-Type":"application/json"}});

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return json({ok:false,error:"METHOD_NOT_ALLOWED"},405);
  const origin=req.headers.get("origin")||"";
  if(origin!==ALLOWED_ORIGIN)return json({ok:false,error:"ORIGIN_NOT_ALLOWED"},403);
  try{
    const {data:claim,error:ce}=await admin.rpc("creator_claim_owner_login_send",{p_cooldown_seconds:50});
    if(ce)throw ce;
    if(!claim?.allowed)return json({ok:false,error:"RATE_LIMITED",retry_after_seconds:Number(claim?.retry_after_seconds||50)},429);

    const {data:o,error:oe}=await admin.from("prometeo_owner").select("auth_user_id").eq("singleton",true).single();
    if(oe||!o?.auth_user_id)throw oe||new Error("OWNER_NOT_CONFIGURED");
    const {data:u,error:ue}=await admin.auth.admin.getUserById(o.auth_user_id);
    if(ue||!u?.user?.email)throw ue||new Error("OWNER_EMAIL_NOT_FOUND");

    const {data,error}=await authClient.auth.signInWithOtp({
      email:u.user.email,
      options:{shouldCreateUser:false,emailRedirectTo:"https://juanmanuelpm.github.io/prometeo/pages/lab/channels/setup/"}
    });
    if(error){
      const msg=String(error.message||"");
      const retry=/([0-9]+)\s*seconds?/i.exec(msg)?.[1];
      return json({ok:false,error:error.code||"AUTH_SEND_FAILED",message:msg,retry_after_seconds:retry?Number(retry):null},error.status||500);
    }
    return json({ok:true,sent:true,email_hint:u.user.email.replace(/^(.{2}).*(@.*)$/,"$1•••$2"),data_present:!!data});
  }catch(e){
    console.error("creator-owner-login",e);
    return json({ok:false,error:"LOGIN_SEND_FAILED"},500);
  }
});