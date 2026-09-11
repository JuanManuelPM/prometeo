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
  if(provider==="huggingface"||provider==="huggingface_zerogpu"){const token=String(credentials.token||"");if(!token)return{supported:true,ok:false,error:"TOKEN_REQUIRED"};const r=await fetchJson("https://huggingface.co/api/whoami-v2",{headers:{Authorization:`Bearer ${token}`}});return{supported:true,ok:r.ok,status:r.status,account:r.data?.name||null,error:r.ok?null:(r.data?.error||"HF_PROBE_FAILED"),free_safe:provider==="huggingface_zerogpu"&&!!credentials.space_url}}
  if(provider==="cloudflare"){
    const token=String(credentials.api_token||""),account=String(credentials.account_id||"");if(!token||!account)return{supported:true,ok:false,error:"ACCOUNT_ID_AND_TOKEN_REQUIRED"};
    const h={Authorization:`Bearer ${token}`};const t=await fetchJson("https://api.cloudflare.com/client/v4/user/tokens/verify",{headers:h});if(!t.ok)return{supported:true,ok:false,status:t.status,error:"CLOUDFLARE_TOKEN_INVALID",free_safe:false};
    const a=await fetchJson(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}`,{headers:h});if(!a.ok)return{supported:true,ok:false,status:a.status,error:"CLOUDFLARE_ACCOUNT_UNREADABLE",free_safe:false};
    const s=await fetchJson(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/subscriptions`,{headers:h});let freeSafe=false,guard="BILLING_READ_REQUIRED";
    if(s.ok){const all=Array.isArray(s.data?.result)?s.data.result:[];const workers=all.filter((x:any)=>JSON.stringify(x).toLowerCase().includes("worker"));freeSafe=workers.length===0||workers.every((x:any)=>Number(x.price||0)===0&&["free","partners_free"].includes(String(x.rate_plan?.id||"free")));guard=freeSafe?"WORKERS_FREE_VERIFIED":"WORKERS_PAID_OR_UNKNOWN"}
    return{supported:true,ok:true,status:a.status,account_id:account,token_ok:true,account_ok:true,billing_probe_ok:s.ok,free_safe:freeSafe,guard,error:null};
  }
  if(provider==="pollinations"){const key=String(credentials.api_key||"");if(!key)return{supported:true,ok:false,error:"API_KEY_REQUIRED"};const r=await fetchJson("https://gen.pollinations.ai/v1/models",{headers:{Authorization:`Bearer ${key}`}});return{supported:true,ok:r.ok,status:r.status,error:r.ok?null:"POLLINATIONS_KEY_INVALID",free_safe:false}}
  if(provider==="together"){const key=String(credentials.api_key||"");if(!key)return{supported:true,ok:false,error:"API_KEY_REQUIRED"};const r=await fetchJson("https://api.together.xyz/v1/models",{headers:{Authorization:`Bearer ${key}`}});return{supported:true,ok:r.ok,status:r.status,error:r.ok?null:"TOGETHER_KEY_INVALID",free_safe:false}}
  if(provider==="replicate"){const key=String(credentials.api_token||"");if(!key)return{supported:true,ok:false,error:"API_TOKEN_REQUIRED"};const r=await fetchJson("https://api.replicate.com/v1/account",{headers:{Authorization:`Bearer ${key}`}});return{supported:true,ok:r.ok,status:r.status,account:r.data?.username||null,error:r.ok?null:"REPLICATE_KEY_INVALID",free_safe:false}}
  return{supported:false,ok:false,error:"PROBE_NOT_IMPLEMENTED",free_safe:false};
}
async function mergedProviders(ownerId:string){const cats=await catalog();const {data:conns,error}=await db.from("creator_provider_connections").select("*").eq("owner_id",ownerId).eq("kind","media");if(error)throw error;const map=new Map((conns||[]).map((x:any)=>[x.provider,x]));return cats.map((c:any)=>({...c,connection:publicConn(map.get(c.provider))}))}
function secretPayload(provider:string,b:any){if(provider==="cloudflare")return{api_token:String(b.api_token||""),account_id:String(b.account_id||"")};if(provider==="huggingface"||provider==="huggingface_zerogpu")return{token:String(b.token||""),space_url:String(b.space_url||"")};if(provider==="replicate")return{api_token:String(b.api_token||"")};return{api_key:String(b.api_key||b.token||"")}}
async function freeMode(ownerId:string){const {data}=await db.from("creator_cost_policy").select("mode,hard_max_cost_cents").eq("owner_id",ownerId).maybeSingle();return data||{mode:"FREE_ONLY",hard_max_cost_cents:0}}
function usableFree(p:any,modality:string){return p.capabilities?.includes(modality)&&p.connection?.mode==="VERIFIED_REAL"&&(p.router_allowed_free_only===true||p.connection?.metadata?.free_safe===true)}
async function routePlan(ownerId:string,modality:string){const policy=await freeMode(ownerId),providers=await mergedProviders(ownerId);const connected=providers.filter((p:any)=>usableFree(p,modality));const builtins=modality==="video"?[{provider:"server_fixture",kind:"builtin",cost_cents:0,ready:true},{provider:"browser_renderer",kind:"builtin",cost_cents:0,ready:true}]:[{provider:"browser_canvas",kind:"builtin",cost_cents:0,ready:true}];return{policy,modality,plan:[...connected.map((p:any)=>({provider:p.provider,kind:"external",cost_cents:0,ready:true,free_policy:p.free_policy})),...builtins],paid_candidates:providers.filter((p:any)=>p.capabilities?.includes(modality)&&p.connection?.mode==="VERIFIED_REAL"&&!usableFree(p,modality)).map((p:any)=>({provider:p.provider,blocked_by:"FREE_ONLY",free_policy:p.free_policy}))}}
function decode64(s:string){const bin=atob(s),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function sha256(bytes:Uint8Array){const d=await crypto.subtle.digest("SHA-256",bytes);return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function cloudflareImage(ownerId:string,prompt:string,channelId:string|null,videoId:string|null){
  const c=await connection(ownerId,"cloudflare");if(!c?.vault_secret_id||c.mode!=="VERIFIED_REAL"||c.metadata?.free_safe!==true)throw new Error("CLOUDFLARE_NOT_FREE_SAFE");
  const creds=JSON.parse(await vaultRead(c.vault_secret_id));const account=String(creds.account_id||""),token=String(creds.api_token||"");
  const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/ai/run/@cf/black-forest-labs/flux-1-schnell`,{method:"POST",signal:AbortSignal.timeout(60000),headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({prompt,steps:4,seed:Math.floor(Math.random()*2147483647)})});
  const p:any=await r.json().catch(()=>({}));if(!r.ok||!p?.result?.image)throw new Error(`CLOUDFLARE_IMAGE_${r.status}:${p?.errors?.[0]?.message||"failed"}`);const bytes=decode64(String(p.result.image));if(bytes.byteLength<500)throw new Error("CLOUDFLARE_IMAGE_EMPTY");
  const scope=videoId||crypto.randomUUID(),path=`${ownerId}/${channelId||"channel"}/${scope}/${crypto.randomUUID()}-generated.jpg`;const up=await db.storage.from("creator-assets").upload(path,bytes,{contentType:"image/jpeg",upsert:false,cacheControl:"3600"});if(up.error)throw up.error;
  const digest=await sha256(bytes);const {data:asset,error}=await db.from("creator_assets").insert({owner_id:ownerId,channel_id:channelId,video_id:videoId,kind:"IMAGE",bucket:"creator-assets",object_path:path,mime_type:"image/jpeg",byte_size:bytes.byteLength,sha256:digest,provider:"cloudflare",metadata:{prompt,model:"@cf/black-forest-labs/flux-1-schnell",cost_cents:0,free_guard:"WORKERS_FREE_VERIFIED"}}).select().single();if(error)throw error;
  const {data:signed,error:se}=await db.storage.from("creator-assets").createSignedUrl(path,3600);if(se)throw se;return{asset,signed_url:signed.signedUrl,provider:"cloudflare",cost_cents:0};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  try{
    const ownerId=await owner(req),u=new URL(req.url),path=pathOf(u),b=req.method==="GET"?{}:await body(req);
    if(req.method==="GET"&&path==="/providers")return json({ok:true,providers:await mergedProviders(ownerId),policy:await freeMode(ownerId)});
    if(req.method==="GET"&&path==="/route/plan"){const modality=String(u.searchParams.get("modality")||"image");return json({ok:true,...await routePlan(ownerId,modality)})}
    if(req.method==="POST"&&path==="/generate/image"){
      const prompt=String(b.prompt||"").trim();if(!prompt)return bad("PROMPT_REQUIRED");const plan=await routePlan(ownerId,"image");const external=plan.plan.find((x:any)=>x.kind==="external");if(!external)return bad("NO_FREE_IMAGE_PROVIDER_CONNECTED",409,{plan});if(external.provider!=="cloudflare")return bad("FREE_PROVIDER_ADAPTER_NOT_READY",409,{provider:external.provider,plan});const out=await cloudflareImage(ownerId,prompt,b.channel_id?String(b.channel_id):null,b.video_id?String(b.video_id):null);return json({ok:true,...out});
    }
    let m=path.match(/^\/providers\/([a-z0-9_\-]+)\/connect$/i);
    if(m&&req.method==="POST"){
      const provider=m[1],cats=await catalog(),cat=cats.find((x:any)=>x.provider===provider);if(!cat)return bad("PROVIDER_NOT_FOUND",404);
      const creds=secretPayload(provider,b);const meaningful=Object.values(creds).some(v=>String(v||"").trim());if(!meaningful)return bad("CREDENTIAL_REQUIRED");
      const sid=await vaultStore(ownerId,`media_${provider}`,JSON.stringify(creds));const pr=await probe(provider,creds);const mode=pr.supported?(pr.ok?"VERIFIED_REAL":"BLOCKED"):"CONFIGURED";
      const c=await upsertConnection(ownerId,provider,{mode,vault_secret_id:sid,external_account_id:String((creds as any).account_id||(creds as any).space_url||pr.account||"")||null,verified_at:pr.ok?now():null,last_probe:pr,last_error:pr.supported&&!pr.ok?pr:null,metadata:{capabilities:cat.capabilities,free_policy:cat.free_policy,free_safe:pr.free_safe===true,router_enabled:pr.free_safe===true,configured_inside:"channels",secret_echoed:false,guard:pr.guard||null}});
      return json({ok:mode!=="BLOCKED",connection:publicConn(c),probe:pr},mode==="BLOCKED"?422:200);
    }
    m=path.match(/^\/providers\/([a-z0-9_\-]+)\/probe$/i);
    if(m&&req.method==="POST"){
      const provider=m[1],c=await connection(ownerId,provider);if(!c?.vault_secret_id)return bad("PROVIDER_NOT_CONNECTED",409);const raw=await vaultRead(c.vault_secret_id);let creds:any={};try{creds=JSON.parse(raw)}catch{creds={api_key:raw,token:raw,api_token:raw}}const pr=await probe(provider,creds);const next=await upsertConnection(ownerId,provider,{mode:pr.supported?(pr.ok?"VERIFIED_REAL":"BLOCKED"):c.mode,verified_at:pr.ok?now():c.verified_at,last_probe:pr,last_error:pr.supported&&!pr.ok?pr:null,metadata:{free_safe:pr.free_safe===true,router_enabled:pr.free_safe===true,guard:pr.guard||c.metadata?.guard||null}});return json({ok:pr.ok||!pr.supported,probe:pr,connection:publicConn(next)},pr.supported&&!pr.ok?422:200);
    }
    return bad("NOT_FOUND",404,{path});
  }catch(e){const m=String((e as any)?.message||e),status=m.startsWith("AUTH_")||m==="NOT_OWNER"?401:/NOT_FOUND/.test(m)?404:500;console.error("creator_media_router",m);return bad(m,status)}
});
