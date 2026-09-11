import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false}});
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Cache-Control":"no-store"};
const json=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:{...CORS,"Content-Type":"application/json"}});
const bad=(m:string,status=400,extra:any={})=>json({ok:false,error:m,...extra},status);
const now=()=>new Date().toISOString();
const pathOf=(u:URL)=>{const m="/creator-media-router";const i=u.pathname.indexOf(m);return (i>=0?u.pathname.slice(i+m.length):u.pathname)||"/"};
async function body(req:Request){try{return await req.json()}catch{return {}}}
async function owner(req:Request){const auth=req.headers.get("Authorization")||"";if(!auth.startsWith("Bearer "))throw new Error("AUTH_REQUIRED");const c=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const {data,error}=await c.auth.getUser();if(error||!data.user)throw new Error("AUTH_INVALID");const {data:o,error:oe}=await db.from("prometeo_owner").select("auth_user_id").eq("singleton",true).maybeSingle();if(oe||!o||o.auth_user_id!==data.user.id)throw new Error("NOT_OWNER");return data.user.id}
async function vaultStore(ownerId:string,kind:string,secret:string){const {data,error}=await db.rpc("creator_vault_store",{p_owner:ownerId,p_kind:kind,p_secret:secret});if(error)throw error;return String(data)}
async function vaultRead(id:string){const {data,error}=await db.rpc("creator_vault_read",{p_secret_id:id});if(error)throw error;return String(data||"")}
async function catalog(){const {data,error}=await db.from("creator_media_provider_catalog").select("*").order("priority");if(error)throw error;return data||[]}
async function connection(ownerId:string,provider:string){const {data,error}=await db.from("creator_provider_connections").select("*").eq("owner_id",ownerId).eq("kind","media").eq("provider",provider).maybeSingle();if(error)throw error;return data}
async function upsertConnection(ownerId:string,provider:string,patch:any){const cur=await connection(ownerId,provider);const row={owner_id:ownerId,kind:"media",provider,connection_key:"default",mode:patch.mode??cur?.mode??"MOCK",vault_secret_id:patch.vault_secret_id??cur?.vault_secret_id??null,vault_aux_secret_id:null,external_account_id:patch.external_account_id??cur?.external_account_id??null,scopes:patch.scopes??cur?.scopes??[],verified_at:patch.verified_at??cur?.verified_at??null,expires_at:null,last_probe:patch.last_probe??cur?.last_probe??{},last_error:patch.last_error===undefined?(cur?.last_error??null):patch.last_error,metadata:{...(cur?.metadata||{}),...(patch.metadata||{})},updated_at:now()};const {data,error}=await db.from("creator_provider_connections").upsert(row,{onConflict:"owner_id,kind,provider"}).select().single();if(error)throw error;return data}
function publicConn(x:any){if(!x)return null;return{provider:x.provider,mode:x.mode,external_account_id:x.external_account_id,verified_at:x.verified_at,last_probe:x.last_probe||{},last_error:x.last_error||null,metadata:x.metadata||{}}}
async function fetchJson(url:string,init:any={}){const r=await fetch(url,{...init,signal:AbortSignal.timeout(18000)});const p=await r.json().catch(()=>({}));return{ok:r.ok,status:r.status,data:p}}
async function probe(provider:string,credentials:any){
  if(provider==="huggingface"||provider==="huggingface_zerogpu"){const token=String(credentials.token||"");if(!token)return{supported:true,ok:false,error:"TOKEN_REQUIRED"};const r=await fetchJson("https://huggingface.co/api/whoami-v2",{headers:{Authorization:`Bearer ${token}`}});return{supported:true,ok:r.ok,status:r.status,account:r.data?.name||null,error:r.ok?null:(r.data?.error||"HF_PROBE_FAILED")}}
  if(provider==="cloudflare"){const token=String(credentials.api_token||""),account=String(credentials.account_id||"");if(!token||!account)return{supported:true,ok:false,error:"ACCOUNT_ID_AND_TOKEN_REQUIRED"};const t=await fetchJson("https://api.cloudflare.com/client/v4/user/tokens/verify",{headers:{Authorization:`Bearer ${token}`}});if(!t.ok)return{supported:true,ok:false,status:t.status,error:"CLOUDFLARE_TOKEN_INVALID"};const a=await fetchJson(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}`,{headers:{Authorization:`Bearer ${token}`}});return{supported:true,ok:a.ok,status:a.status,account_id:account,token_ok:true,account_ok:a.ok,error:a.ok?null:"CLOUDFLARE_ACCOUNT_UNREADABLE"}}
  if(provider==="pollinations"){const key=String(credentials.api_key||"");if(!key)return{supported:true,ok:false,error:"API_KEY_REQUIRED"};const r=await fetchJson("https://gen.pollinations.ai/v1/models",{headers:{Authorization:`Bearer ${key}`}});return{supported:true,ok:r.ok,status:r.status,error:r.ok?null:"POLLINATIONS_KEY_INVALID"}}
  if(provider==="together"){const key=String(credentials.api_key||"");if(!key)return{supported:true,ok:false,error:"API_KEY_REQUIRED"};const r=await fetchJson("https://api.together.xyz/v1/models",{headers:{Authorization:`Bearer ${key}`}});return{supported:true,ok:r.ok,status:r.status,error:r.ok?null:"TOGETHER_KEY_INVALID"}}
  if(provider==="replicate"){const key=String(credentials.api_token||"");if(!key)return{supported:true,ok:false,error:"API_TOKEN_REQUIRED"};const r=await fetchJson("https://api.replicate.com/v1/account",{headers:{Authorization:`Bearer ${key}`}});return{supported:true,ok:r.ok,status:r.status,account:r.data?.username||null,error:r.ok?null:"REPLICATE_KEY_INVALID"}}
  return{supported:false,ok:false,error:"PROBE_NOT_IMPLEMENTED"};
}
async function mergedProviders(ownerId:string){const cats=await catalog();const {data:conns,error}=await db.from("creator_provider_connections").select("*").eq("owner_id",ownerId).eq("kind","media");if(error)throw error;const map=new Map((conns||[]).map((x:any)=>[x.provider,x]));return cats.map((c:any)=>({...c,connection:publicConn(map.get(c.provider))}))}
function secretPayload(provider:string,b:any){if(provider==="cloudflare")return{api_token:String(b.api_token||""),account_id:String(b.account_id||"")};if(provider==="huggingface"||provider==="huggingface_zerogpu")return{token:String(b.token||""),space_url:String(b.space_url||"")};if(provider==="replicate")return{api_token:String(b.api_token||"")};return{api_key:String(b.api_key||b.token||"")}}
async function freeMode(ownerId:string){const {data}=await db.from("creator_cost_policy").select("mode,hard_max_cost_cents").eq("owner_id",ownerId).maybeSingle();return data||{mode:"FREE_ONLY",hard_max_cost_cents:0}}
async function routePlan(ownerId:string,modality:string){const policy=await freeMode(ownerId),providers=await mergedProviders(ownerId);const connected=providers.filter((p:any)=>p.capabilities?.includes(modality)&&p.connection?.mode==="VERIFIED_REAL"&&p.router_allowed_free_only===true);const builtins=modality==="video"?[{provider:"server_fixture",kind:"builtin",cost_cents:0,ready:true},{provider:"browser_renderer",kind:"builtin",cost_cents:0,ready:true}]:[{provider:"browser_canvas",kind:"builtin",cost_cents:0,ready:true}];return{policy,modality,plan:[...connected.map((p:any)=>({provider:p.provider,kind:"external",cost_cents:0,ready:true,free_policy:p.free_policy})),...builtins],paid_candidates:providers.filter((p:any)=>p.capabilities?.includes(modality)&&p.connection?.mode==="VERIFIED_REAL"&&p.router_allowed_free_only!==true).map((p:any)=>({provider:p.provider,blocked_by:"FREE_ONLY",free_policy:p.free_policy}))}}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  try{
    const ownerId=await owner(req),u=new URL(req.url),path=pathOf(u),b=req.method==="GET"?{}:await body(req);
    if(req.method==="GET"&&path==="/providers")return json({ok:true,providers:await mergedProviders(ownerId),policy:await freeMode(ownerId)});
    if(req.method==="GET"&&path==="/route/plan"){const modality=String(u.searchParams.get("modality")||"image");return json({ok:true,...await routePlan(ownerId,modality)})}
    let m=path.match(/^\/providers\/([a-z0-9_\-]+)\/connect$/i);
    if(m&&req.method==="POST"){
      const provider=m[1],cats=await catalog(),cat=cats.find((x:any)=>x.provider===provider);if(!cat)return bad("PROVIDER_NOT_FOUND",404);
      const creds=secretPayload(provider,b);const meaningful=Object.values(creds).some(v=>String(v||"").trim());if(!meaningful)return bad("CREDENTIAL_REQUIRED");
      const sid=await vaultStore(ownerId,`media_${provider}`,JSON.stringify(creds));const pr=await probe(provider,creds);const mode=pr.supported?(pr.ok?"VERIFIED_REAL":"BLOCKED"):"CONFIGURED";
      const c=await upsertConnection(ownerId,provider,{mode,vault_secret_id:sid,external_account_id:String((creds as any).account_id||(creds as any).space_url||pr.account||"")||null,verified_at:pr.ok?now():null,last_probe:pr,last_error:pr.supported&&!pr.ok?pr:null,metadata:{capabilities:cat.capabilities,free_policy:cat.free_policy,router_enabled:false,configured_inside:"channels",secret_echoed:false}});
      return json({ok:mode!=="BLOCKED",connection:publicConn(c),probe:pr},mode==="BLOCKED"?422:200);
    }
    m=path.match(/^\/providers\/([a-z0-9_\-]+)\/probe$/i);
    if(m&&req.method==="POST"){
      const provider=m[1],c=await connection(ownerId,provider);if(!c?.vault_secret_id)return bad("PROVIDER_NOT_CONNECTED",409);const raw=await vaultRead(c.vault_secret_id);let creds:any={};try{creds=JSON.parse(raw)}catch{creds={api_key:raw,token:raw,api_token:raw}}const pr=await probe(provider,creds);const next=await upsertConnection(ownerId,provider,{mode:pr.supported?(pr.ok?"VERIFIED_REAL":"BLOCKED"):c.mode,verified_at:pr.ok?now():c.verified_at,last_probe:pr,last_error:pr.supported&&!pr.ok?pr:null});return json({ok:pr.ok||!pr.supported,probe:pr,connection:publicConn(next)},pr.supported&&!pr.ok?422:200);
    }
    return bad("NOT_FOUND",404,{path});
  }catch(e){const m=String((e as any)?.message||e),status=m.startsWith("AUTH_")||m==="NOT_OWNER"?401:500;console.error("creator_media_router",m);return bad(m,status)}
});
