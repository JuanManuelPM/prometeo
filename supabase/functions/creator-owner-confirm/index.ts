import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const ANON=Deno.env.get("SUPABASE_ANON_KEY")!;
const authClient=createClient(SUPABASE_URL,ANON,{auth:{persistSession:false,autoRefreshToken:false}});
const SETUP="https://juanmanuelpm.github.io/prometeo/pages/lab/channels/setup/";
Deno.serve(async(req:Request)=>{
  const u=new globalThis.URL(req.url);
  if(req.method!=="GET")return new Response("method not allowed",{status:405});
  const tokenHash=u.searchParams.get("token_hash")||"";
  if(tokenHash.length<20)return Response.redirect(SETUP+"?login_error=confirm_invalid",302);
  try{
    const {data,error}=await authClient.auth.verifyOtp({token_hash:tokenHash,type:"email"});
    if(error||!data.session)throw error||new Error("SESSION_NOT_CREATED");
    const s=data.session;
    const fragment=new URLSearchParams({access_token:s.access_token,refresh_token:s.refresh_token,expires_in:String(s.expires_in||3600),expires_at:String(s.expires_at||""),token_type:s.token_type||"bearer",type:"magiclink"});
    return Response.redirect(SETUP+"#"+fragment.toString(),302);
  }catch(e){
    console.error("creator-owner-confirm",String((e as any)?.message||e));
    return Response.redirect(SETUP+"?login_error=confirm_failed",302);
  }
});