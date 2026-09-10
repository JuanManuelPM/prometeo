import { createClient } from "npm:@supabase/supabase-js@2.57.4";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
export const WORKER_ID = `creator-worker:${crypto.randomUUID().slice(0,8)}`;

export async function workerAuthorized(req: Request) {
  const candidate = req.headers.get("x-creator-worker-secret") || "";
  if (!candidate) return false;
  const { data, error } = await db.rpc("creator_worker_secret_matches", { p_candidate: candidate });
  return !error && data === true;
}

export async function vaultRead(id: string | null | undefined) {
  if (!id) return null;
  const { data, error } = await db.rpc("creator_vault_read", { p_secret_id: id });
  if (error) throw error;
  return data as string | null;
}

export async function connection(owner: string, kind: string, provider: string) {
  const { data, error } = await db.from("creator_provider_connections").select("*").eq("owner_id", owner).eq("kind", kind).eq("provider", provider).maybeSingle();
  if (error) throw error;
  return data;
}

export async function patchConnection(owner: string, kind: string, provider: string, patch: Record<string,unknown>) {
  const { data, error } = await db.from("creator_provider_connections").upsert({ owner_id: owner, kind, provider, connection_key: "default", ...patch, updated_at: new Date().toISOString() }, { onConflict: "owner_id,kind,provider" }).select().single();
  if (error) throw error;
  return data;
}

export async function event(job: any, name: string, data: Record<string,unknown> = {}) {
  await db.from("creator_job_events").insert({ job_id: job.id, owner_id: job.owner_id, event: name, data });
}

export async function succeed(job: any, output: Record<string,unknown> = {}) {
  await event(job, "SUCCEEDED", output);
  const { error } = await db.from("creator_jobs").update({ status: "SUCCEEDED", output: { ...(job.output || {}), ...output }, error: null, lease_owner: null, lease_until: null, last_heartbeat_at: new Date().toISOString() }).eq("id", job.id);
  if (error) throw error;
}

export async function waitExternal(job: any, providerOperationId: string, output: Record<string,unknown> = {}, seconds = 12) {
  await event(job, "WAITING_EXTERNAL", { provider_operation_id: providerOperationId, ...output });
  const { error } = await db.from("creator_jobs").update({ status: "WAITING_EXTERNAL", provider_operation_id: providerOperationId, output: { ...(job.output || {}), ...output }, available_at: new Date(Date.now()+seconds*1000).toISOString(), lease_owner: null, lease_until: null }).eq("id", job.id);
  if (error) throw error;
}

export async function waitAuth(job: any, reason: string, data: Record<string,unknown> = {}) {
  await event(job, "WAITING_AUTH", { reason, ...data });
  const { error } = await db.from("creator_jobs").update({ status: "WAITING_AUTH", error: { reason, ...data }, lease_owner: null, lease_until: null }).eq("id", job.id);
  if (error) throw error;
}

export async function blocked(job: any, reason: string, data: Record<string,unknown> = {}) {
  await event(job, "BLOCKED", { reason, ...data });
  const { error } = await db.from("creator_jobs").update({ status: "BLOCKED", error: { reason, ...data }, lease_owner: null, lease_until: null }).eq("id", job.id);
  if (error) throw error;
}

export async function failOrRetry(job: any, errorLike: unknown, retriable = true) {
  const message = String((errorLike as any)?.message || errorLike);
  const exhausted = Number(job.attempt_count || 0) >= Number(job.max_attempts || 5);
  const status = retriable && !exhausted ? "RETRY" : "FAILED";
  const delay = Math.min(300, Math.max(5, 2 ** Math.min(7, Number(job.attempt_count || 1)) * 3));
  await event(job, status, { message, delay_seconds: status === "RETRY" ? delay : 0 });
  const { error } = await db.from("creator_jobs").update({ status, error: { message, at: new Date().toISOString() }, available_at: status === "RETRY" ? new Date(Date.now()+delay*1000).toISOString() : job.available_at, lease_owner: null, lease_until: null }).eq("id", job.id);
  if (error) throw error;
}

export async function claim(limit = 8) {
  await db.rpc("creator_recover_stale_jobs");
  const { data, error } = await db.rpc("creator_claim_any_jobs", { p_worker: WORKER_ID, p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function storeAsset(args: {
  owner: string, channelId?: string|null, videoId?: string|null, sceneId?: string|null,
  kind: string, bytes: Uint8Array, mime: string, provider: string, pathSuffix: string,
  durationMs?: number|null, metadata?: Record<string,unknown>
}) {
  const objectPath = `${args.owner}/${args.channelId || "unscoped"}/${args.videoId || "unscoped"}/${crypto.randomUUID()}-${args.pathSuffix}`;
  const hashBuf = await crypto.subtle.digest("SHA-256", args.bytes);
  const sha256 = [...new Uint8Array(hashBuf)].map(x=>x.toString(16).padStart(2,"0")).join("");
  const { error: uploadError } = await db.storage.from("creator-assets").upload(objectPath, args.bytes, { contentType: args.mime, upsert: false, cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { data, error } = await db.from("creator_assets").insert({
    owner_id: args.owner, channel_id: args.channelId || null, video_id: args.videoId || null, scene_id: args.sceneId || null,
    kind: args.kind, object_path: objectPath, mime_type: args.mime, byte_size: args.bytes.byteLength,
    duration_ms: args.durationMs || null, sha256, provider: args.provider, metadata: args.metadata || {}
  }).select().single();
  if (error) { await db.storage.from("creator-assets").remove([objectPath]); throw error; }
  return data;
}

export async function loadAsset(asset: any) {
  const { data, error } = await db.storage.from(asset.bucket || "creator-assets").download(asset.object_path);
  if (error || !data) throw error || new Error("ASSET_DOWNLOAD_FAILED");
  return new Uint8Array(await data.arrayBuffer());
}

export async function refreshGoogleAccess(owner: string) {
  const oauth = await connection(owner, "oauth", "google");
  const client = await connection(owner, "oauth_client", "google");
  if (!oauth?.vault_secret_id || !client?.vault_secret_id || !client?.metadata?.client_id) return { ok:false as const, reason:"GOOGLE_OAUTH_NOT_CONFIGURED" };
  const refreshToken = await vaultRead(oauth.vault_secret_id);
  const clientSecret = await vaultRead(client.vault_secret_id);
  if (!refreshToken || !clientSecret) return { ok:false as const, reason:"GOOGLE_OAUTH_SECRET_MISSING" };
  const form = new URLSearchParams({ client_id:String(client.metadata.client_id), client_secret:clientSecret, refresh_token:refreshToken, grant_type:"refresh_token" });
  const r = await fetch("https://oauth2.googleapis.com/token", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:form });
  const payload:any = await r.json().catch(()=>({}));
  if (!r.ok || !payload.access_token) {
    await patchConnection(owner,"oauth","google",{mode:"BLOCKED",last_error:{status:r.status,payload},last_probe:{refresh:false,at:new Date().toISOString()}});
    return { ok:false as const, reason:"GOOGLE_REFRESH_FAILED", status:r.status, payload };
  }
  await patchConnection(owner,"oauth","google",{mode:"VERIFIED_REAL",verified_at:new Date().toISOString(),expires_at:payload.expires_in?new Date(Date.now()+Number(payload.expires_in)*1000).toISOString():null,last_error:null,last_probe:{refresh:true,status:r.status,at:new Date().toISOString()}});
  return { ok:true as const, accessToken:String(payload.access_token) };
}

export function decodeBase64(s:string){const bin=atob(s);const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}

export function parseMp4Basic(bytes: Uint8Array) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read4=(o:number)=>String.fromCharCode(bytes[o]||0,bytes[o+1]||0,bytes[o+2]||0,bytes[o+3]||0);
  let hasFtyp=false,hasMoov=false,hasMdat=false,hasVideo=false,hasAudio=false,width:number|null=null,height:number|null=null,durationMs:number|null=null;
  function walk(start:number,end:number,depth=0){
    let p=start;
    while(p+8<=end){
      let size=dv.getUint32(p); const type=read4(p+4); let header=8;
      if(size===1&&p+16<=end){const hi=dv.getUint32(p+8),lo=dv.getUint32(p+12);if(hi!==0)break;size=lo;header=16}
      if(size===0)size=end-p;if(size<header||p+size>end)break;
      if(type==="ftyp")hasFtyp=true;if(type==="moov")hasMoov=true;if(type==="mdat")hasMdat=true;
      if(type==="hdlr"&&p+header+12<=p+size){const h=read4(p+header+8);if(h==="vide")hasVideo=true;if(h==="soun")hasAudio=true}
      if(type==="tkhd"&&p+size>=p+8){const w=dv.getUint32(p+size-8)/65536,h=dv.getUint32(p+size-4)/65536;if(w>0&&h>0){width=w;height=h}}
      if(type==="mvhd"){
        const version=bytes[p+header];
        try{if(version===0){const timescale=dv.getUint32(p+header+12);const duration=dv.getUint32(p+header+16);if(timescale)durationMs=Math.round(duration/timescale*1000)}else if(version===1){const timescale=dv.getUint32(p+header+20);const hi=dv.getUint32(p+header+24),lo=dv.getUint32(p+header+28);if(timescale&&hi===0)durationMs=Math.round(lo/timescale*1000)}}catch{}
      }
      if(["moov","trak","mdia","minf","stbl","edts","udta"].includes(type)&&depth<6)walk(p+header,p+size,depth+1);
      p+=size;
    }
  }
  walk(0,bytes.length);
  const ratioOk=width&&height?Math.abs(width/height-9/16)<0.03:null;
  return {ok:hasFtyp&&hasMoov&&hasMdat&&hasVideo,hasFtyp,hasMoov,hasMdat,hasVideo,hasAudio,width,height,duration_ms:durationMs,vertical_9_16:ratioOk,byte_size:bytes.byteLength};
}
