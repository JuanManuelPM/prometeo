import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const WORK_URL = `${SUPABASE_URL}/functions/v1/creator-work`;
const OAUTH_CALLBACK = `${SUPABASE_URL}/functions/v1/creator-google-oauth/callback`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-idempotency-key",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Cache-Control": "no-store",
};

function out(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
function err(message: string, status = 400, extra: Record<string, unknown> = {}) {
  return out({ ok: false, error: message, ...extra }, status);
}
function routePath(url: URL) {
  const marker = "/creator-api";
  const i = url.pathname.indexOf(marker);
  const p = i >= 0 ? url.pathname.slice(i + marker.length) : url.pathname;
  return p || "/";
}
function slugify(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "canal";
}
function safeReturnTo(raw: unknown) {
  const fallback = "https://juanmanuelpm.github.io/prometeo/pages/lab/channels/";
  if (!raw) return fallback;
  try {
    const u = new URL(String(raw));
    if (u.origin === "https://juanmanuelpm.github.io" || u.hostname === "localhost" || u.hostname === "127.0.0.1") return u.toString();
  } catch { /* ignored */ }
  return fallback;
}
async function sha256(v: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function randomToken(bytes = 32) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
async function requireUser(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("AUTH_INVALID");
  return data.user;
}
async function jsonBody(req: Request) {
  if (!req.body) return {};
  try { return await req.json(); } catch { throw new Error("INVALID_JSON"); }
}
async function ownedChannel(owner: string, id: string) {
  const { data, error } = await service.from("creator_channels").select("*").eq("id", id).eq("owner_id", owner).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("CHANNEL_NOT_FOUND");
  return data;
}
async function ownedStory(owner: string, id: string) {
  const { data, error } = await service.from("creator_stories").select("*").eq("id", id).eq("owner_id", owner).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("STORY_NOT_FOUND");
  return data;
}
async function ownedVideo(owner: string, id: string) {
  const { data, error } = await service.from("creator_videos").select("*").eq("id", id).eq("owner_id", owner).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("VIDEO_NOT_FOUND");
  return data;
}
async function connection(owner: string, kind: string, provider: string) {
  const { data, error } = await service.from("creator_provider_connections").select("*").eq("owner_id", owner).eq("kind", kind).eq("provider", provider).maybeSingle();
  if (error) throw error;
  return data;
}
async function vaultStore(owner: string, kind: string, secret: string) {
  const { data, error } = await service.rpc("creator_vault_store", { p_owner: owner, p_kind: kind, p_secret: secret });
  if (error) throw error;
  return data as string;
}
async function vaultRead(id: string) {
  const { data, error } = await service.rpc("creator_vault_read", { p_secret_id: id });
  if (error) throw error;
  return data as string;
}
async function upsertConnection(owner: string, kind: string, provider: string, patch: Record<string, unknown>) {
  const row = { owner_id: owner, kind, provider, ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await service.from("creator_provider_connections").upsert(row, { onConflict: "owner_id,kind,provider" }).select().single();
  if (error) throw error;
  return data;
}
async function enqueue(owner: string, spec: Record<string, any>) {
  const idem = spec.idempotency_key || randomToken(18);
  const row = {
    owner_id: owner,
    channel_id: spec.channel_id || null,
    video_id: spec.video_id || null,
    story_id: spec.story_id || null,
    kind: spec.kind,
    status: spec.status || "QUEUED",
    provider: spec.provider || null,
    input: spec.input || {},
    idempotency_key: idem,
    priority: spec.priority ?? 100,
    max_attempts: spec.max_attempts ?? 5,
    estimated_cost_cents: spec.estimated_cost_cents ?? 0,
    max_cost_cents: spec.max_cost_cents ?? 500,
  };
  const { data, error } = await service.from("creator_jobs").upsert(row, { onConflict: "owner_id,idempotency_key", ignoreDuplicates: true }).select().maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: existing, error: e2 } = await service.from("creator_jobs").select("*").eq("owner_id", owner).eq("idempotency_key", idem).single();
  if (e2) throw e2;
  return existing;
}

async function providerStatus(owner: string) {
  const { data, error } = await service.from("creator_provider_connections").select("kind,provider,mode,verified_at,expires_at,last_probe,last_error,metadata").eq("owner_id", owner).order("kind");
  if (error) throw error;
  return data || [];
}

async function probeGemini(secret: string) {
  const started = Date.now();
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models", { headers: { "x-goog-api-key": secret } });
  const text = await r.text();
  let payload: any = {}; try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text.slice(0, 300) }; }
  if (!r.ok) return { ok: false, status: r.status, latency_ms: Date.now() - started, error: payload?.error?.message || "GEMINI_PROBE_FAILED" };
  const names = Array.isArray(payload.models) ? payload.models.map((m: any) => String(m.name || "")) : [];
  return {
    ok: true,
    status: r.status,
    latency_ms: Date.now() - started,
    model_count: names.length,
    veo_visible: names.some((n: string) => /veo/i.test(n)),
    tts_visible: names.some((n: string) => /tts|speech/i.test(n)),
    sample_models: names.filter((n: string) => /gemini|veo|tts|speech/i.test(n)).slice(0, 12),
  };
}
async function probeHF(secret: string) {
  const started = Date.now();
  const r = await fetch("https://huggingface.co/api/whoami-v2", { headers: { Authorization: `Bearer ${secret}` } });
  const text = await r.text(); let payload: any = {}; try { payload = JSON.parse(text); } catch { payload = {}; }
  return r.ok ? { ok: true, status: r.status, latency_ms: Date.now() - started, account: payload?.name || null }
              : { ok: false, status: r.status, latency_ms: Date.now() - started, error: payload?.error || "HF_PROBE_FAILED" };
}

function metricValue(metrics: any, metric: string) {
  const aliases: Record<string, string[]> = {
    views: ["views_per_day", "views"], subs: ["subs_per_day", "subscribers_gained", "subscribersGained"],
    retention: ["retention", "average_percentage_viewed"], ctr: ["ctr", "impressions_ctr"], revenue: ["revenue_per_day", "estimated_revenue"]
  };
  for (const k of aliases[metric] || [metric]) if (metrics?.[k] != null) return Number(metrics[k]);
  return null;
}

async function timeline(owner: string, channelId: string, metric: string) {
  await ownedChannel(owner, channelId);
  const { data: vids, error: ve } = await service.from("creator_videos").select("id,title,published_at,creative,metadata,youtube_video_id").eq("owner_id", owner).eq("channel_id", channelId).eq("state", "PUBLISHED").not("published_at", "is", null).order("published_at");
  if (ve) throw ve;
  const ids = (vids || []).map((v: any) => v.id);
  let snaps: any[] = [];
  if (ids.length) {
    const { data, error } = await service.from("creator_analytics_snapshots").select("video_id,captured_at,source,metrics").eq("owner_id", owner).eq("channel_id", channelId).in("video_id", ids).order("captured_at");
    if (error) throw error; snaps = data || [];
  }
  const byVideo = new Map<string, any[]>();
  for (const s of snaps) { const a = byVideo.get(s.video_id) || []; a.push(s); byVideo.set(s.video_id, a); }
  const points = (vids || []).map((v: any, i: number) => {
    const nextAt = vids?.[i + 1]?.published_at || null;
    const a = (byVideo.get(v.id) || []).filter(s => !nextAt || new Date(s.captured_at) < new Date(nextAt));
    const last = a.at(-1) || null;
    return {
      video_id: v.id, title: v.title, at: v.published_at, next_at: nextAt,
      value: last ? metricValue(last.metrics, metric) : null,
      source: last?.source || null,
      metrics: last?.metrics || null,
      decisions: v.creative || {}, metadata: v.metadata || {}, youtube_video_id: v.youtube_video_id,
    };
  });
  return { metric, points, interval_model: "publication_n_to_publication_n_plus_1" };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const user = await requireUser(req);
    const owner = user.id;
    const url = new URL(req.url);
    const path = routePath(url);
    const body: any = req.method === "GET" ? {} : await jsonBody(req);

    if (req.method === "GET" && path === "/health") {
      const { error: dbError } = await service.from("creator_channels").select("id", { head: true, count: "exact" }).eq("owner_id", owner);
      const { data: buckets, error: bucketError } = await service.storage.listBuckets();
      const storageReady = !bucketError && !!buckets?.some((b: any) => b.id === "creator-assets" && !b.public);
      return out({ ok: !dbError && storageReady, database: dbError ? "FAIL" : "VERIFIED_REAL", storage: storageReady ? "VERIFIED_REAL" : "BLOCKED", storage_error: bucketError?.message || null });
    }

    if (req.method === "GET" && (path === "/capabilities" || path === "/setup/status")) {
      return out({ ok: true, providers: await providerStatus(owner), human_gates: (await providerStatus(owner)).filter((x: any) => x.mode === "BLOCKED" || x.mode === "CONFIGURED") });
    }

    if (req.method === "GET" && path === "/channels") {
      const { data, error } = await service.from("creator_channels").select("*").eq("owner_id", owner).neq("status", "ARCHIVED").order("created_at");
      if (error) throw error; return out({ channels: data || [] });
    }
    if (req.method === "POST" && path === "/channels") {
      const title = String(body.title || "").trim(); if (!title) return err("TITLE_REQUIRED");
      const row = { owner_id: owner, title, slug: slugify(body.slug || title), world: body.world || {}, settings: body.settings || {} };
      const { data, error } = await service.from("creator_channels").insert(row).select().single();
      if (error) throw error; return out({ channel: data }, 201);
    }

    let m = path.match(/^\/channels\/([0-9a-f-]+)\/stories$/i);
    if (req.method === "GET" && m) {
      await ownedChannel(owner, m[1]);
      const { data, error } = await service.from("creator_stories").select("*").eq("owner_id", owner).eq("channel_id", m[1]).neq("status", "ARCHIVED").order("updated_at", { ascending: false });
      if (error) throw error; return out({ stories: data || [] });
    }

    m = path.match(/^\/channels\/([0-9a-f-]+)\/videos$/i);
    if (req.method === "GET" && m) {
      await ownedChannel(owner, m[1]);
      const wanted = String(url.searchParams.get("state") || "").toUpperCase();
      let q = service.from("creator_videos").select("*").eq("owner_id", owner).eq("channel_id", m[1]);
      if (wanted) q = q.eq("state", wanted);
      const { data, error } = await q.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
      if (error) throw error; return out({ videos: data || [] });
    }

    m = path.match(/^\/channels\/([0-9a-f-]+)\/timeline$/i);
    if (req.method === "GET" && m) return out(await timeline(owner, m[1], String(url.searchParams.get("metric") || "views")));

    m = path.match(/^\/stories\/([0-9a-f-]+)\/work$/i);
    if (req.method === "POST" && m) {
      const story = await ownedStory(owner, m[1]); const ch = await ownedChannel(owner, story.channel_id);
      const token = randomToken(32); const tokenHash = await sha256(token);
      const task = String(body.task || "Desarrollar esta historia sin romper continuidad y devolver cambios estructurados.").trim();
      const context = { channel: { id: ch.id, title: ch.title, world: ch.world, settings: ch.settings }, story };
      const { data, error } = await service.from("creator_external_work").insert({ owner_id: owner, channel_id: ch.id, story_id: story.id, task, context_version: story.version, context, claim_token_hash: tokenHash }).select().single();
      if (error) throw error;
      return out({ work: { id: data.id, status: data.status, task }, claim_url: `${WORK_URL}?work_id=${encodeURIComponent(data.id)}&token=${encodeURIComponent(token)}` }, 201);
    }

    m = path.match(/^\/work\/([0-9a-f-]+)\/apply$/i);
    if (req.method === "POST" && m) {
      const { data: w, error } = await service.from("creator_external_work").select("*").eq("id", m[1]).eq("owner_id", owner).single();
      if (error) throw error; if (w.status !== "RETURNED" || !w.result) return err("WORK_NOT_RETURNED", 409);
      if (w.story_id) {
        const story = await ownedStory(owner, w.story_id);
        if (story.version !== w.context_version) return err("STORY_VERSION_CONFLICT", 409, { expected: w.context_version, actual: story.version });
        const merged = { ...(story.story_data || {}), external_return: w.result };
        const { error: ue } = await service.from("creator_stories").update({ story_data: merged, version: story.version + 1, status: "DEVELOPING" }).eq("id", story.id).eq("owner_id", owner);
        if (ue) throw ue;
      }
      await service.from("creator_external_work").update({ status: "APPLIED", applied_at: new Date().toISOString() }).eq("id", w.id);
      return out({ ok: true, work_id: w.id });
    }

    if (req.method === "POST" && path === "/ideas/generate") {
      const channelId = String(body.channel_id || ""); await ownedChannel(owner, channelId);
      const count = Math.max(1, Math.min(50, Number(body.count || 12)));
      const idem = req.headers.get("x-idempotency-key") || `ideas:${channelId}:${body.seed || randomToken(8)}`;
      return out({ job: await enqueue(owner, { kind: "GENERATE_IDEAS", channel_id: channelId, input: { count, brief: body.brief || null }, idempotency_key: idem, max_cost_cents: Number(body.max_cost_cents ?? 50) }) }, 202);
    }

    m = path.match(/^\/videos\/([0-9a-f-]+)\/produce$/i);
    if (req.method === "POST" && m) {
      const v = await ownedVideo(owner, m[1]);
      const idem = req.headers.get("x-idempotency-key") || `produce:${v.id}:v1`;
      const job = await enqueue(owner, { kind: "PIPELINE", channel_id: v.channel_id, video_id: v.id, story_id: v.story_id, input: { mode: body.mode || "AUTO" }, idempotency_key: idem, max_cost_cents: Math.min(v.max_cost_cents, Number(body.max_cost_cents ?? v.max_cost_cents)) });
      return out({ job }, 202);
    }

    m = path.match(/^\/videos\/([0-9a-f-]+)\/publish$/i);
    if (req.method === "POST" && m) {
      const v = await ownedVideo(owner, m[1]);
      if (v.state !== "READY" && v.state !== "PUBLISHED") return err("VIDEO_NOT_READY", 409, { state: v.state });
      const yt = await connection(owner, "youtube", "google");
      const idem = req.headers.get("x-idempotency-key") || `youtube:${v.id}`;
      const pubStatus = yt?.mode === "VERIFIED_REAL" ? "PREPARED" : "WAITING_AUTH";
      const { data: pub, error } = await service.from("creator_publications").upsert({ owner_id: owner, channel_id: v.channel_id, video_id: v.id, status: pubStatus, scheduled_at: body.publish_at || v.scheduled_at, request: { privacy: body.privacy || "private", publish_at: body.publish_at || v.scheduled_at, contains_synthetic_media: body.contains_synthetic_media ?? true }, idempotency_key: idem }, { onConflict: "owner_id,platform,idempotency_key" }).select().single();
      if (error) throw error;
      const job = await enqueue(owner, { kind: "PUBLISH_YOUTUBE", channel_id: v.channel_id, video_id: v.id, input: { publication_id: pub.id }, idempotency_key: `job:${idem}`, status: yt?.mode === "VERIFIED_REAL" ? "QUEUED" : "WAITING_AUTH", max_cost_cents: 0 });
      return out({ publication: pub, job }, 202);
    }

    m = path.match(/^\/jobs\/([0-9a-f-]+)$/i);
    if (req.method === "GET" && m) {
      const { data, error } = await service.from("creator_jobs").select("*,creator_job_events(*)").eq("id", m[1]).eq("owner_id", owner).single();
      if (error) throw error; return out({ job: data });
    }

    if (req.method === "POST" && path === "/setup/provider/gemini") {
      const secret = String(body.secret || "").trim(); if (!secret) return err("SECRET_REQUIRED");
      const sid = await vaultStore(owner, "gemini_api_key", secret);
      const probe = await probeGemini(secret);
      await upsertConnection(owner, "llm", "gemini", { mode: probe.ok ? "VERIFIED_REAL" : "BLOCKED", vault_secret_id: sid, verified_at: probe.ok ? new Date().toISOString() : null, last_probe: probe, last_error: probe.ok ? null : probe });
      await upsertConnection(owner, "video", "veo", { mode: probe.ok ? "CONFIGURED" : "BLOCKED", vault_secret_id: sid, last_probe: { ...probe, note: "Actual paid generation probe intentionally deferred until owner chooses to spend." }, last_error: probe.ok ? null : probe, metadata: { default_model: "veo-3.1-lite-generate-preview", aspect_ratio: "9:16" } });
      await upsertConnection(owner, "voice", "gemini_tts", { mode: probe.ok ? "CONFIGURED" : "BLOCKED", vault_secret_id: sid, last_probe: { ...probe, note: "TTS generation probe deferred; free Edge Neural fallback is already available." }, last_error: probe.ok ? null : probe });
      return out({ ok: probe.ok, probe, capabilities: await providerStatus(owner) }, probe.ok ? 200 : 422);
    }

    if (req.method === "POST" && path === "/setup/provider/hf") {
      const secret = String(body.secret || "").trim(); if (!secret) return err("SECRET_REQUIRED");
      const sid = await vaultStore(owner, "huggingface_token", secret); const probe = await probeHF(secret);
      await upsertConnection(owner, "video_fallback", "huggingface", { mode: probe.ok ? "VERIFIED_REAL" : "BLOCKED", vault_secret_id: sid, verified_at: probe.ok ? new Date().toISOString() : null, last_probe: probe, last_error: probe.ok ? null : probe });
      return out({ ok: probe.ok, probe }, probe.ok ? 200 : 422);
    }

    if (req.method === "POST" && path === "/setup/google-client") {
      const clientId = String(body.client_id || "").trim(); const clientSecret = String(body.client_secret || "").trim();
      if (!clientId || !clientSecret) return err("CLIENT_ID_AND_SECRET_REQUIRED");
      const sid = await vaultStore(owner, "google_oauth_client_secret", clientSecret);
      await upsertConnection(owner, "oauth_client", "google", { mode: "CONFIGURED", vault_secret_id: sid, metadata: { client_id: clientId, redirect_uri: OAUTH_CALLBACK }, last_probe: { configured_at: new Date().toISOString(), secret_echoed: false } });
      return out({ ok: true, mode: "CONFIGURED", redirect_uri: OAUTH_CALLBACK });
    }

    if (req.method === "POST" && path === "/google/start") {
      const cfg = await connection(owner, "oauth_client", "google");
      if (!cfg || !cfg.vault_secret_id || !cfg.metadata?.client_id) return err("GOOGLE_OAUTH_CLIENT_NOT_CONFIGURED", 409);
      const state = randomToken(32); const verifier = randomToken(48);
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
      const returnTo = safeReturnTo(body.return_to);
      const { error } = await service.from("creator_oauth_states").insert({ state, owner_id: owner, provider: "google", return_to: returnTo, code_verifier: verifier, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
      if (error) throw error;
      const scopes = ["openid","email","profile","https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/yt-analytics.readonly"];
      const p = new URLSearchParams({ client_id: String(cfg.metadata.client_id), redirect_uri: OAUTH_CALLBACK, response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "true", scope: scopes.join(" "), state, code_challenge: challenge, code_challenge_method: "S256" });
      return out({ authorization_url: `https://accounts.google.com/o/oauth2/v2/auth?${p}`, expires_in_seconds: 600 });
    }

    return err("NOT_FOUND", 404, { path });
  } catch (e) {
    const msg = String((e as any)?.message || e);
    const status = msg.startsWith("AUTH_") ? 401 : /NOT_FOUND/.test(msg) ? 404 : 500;
    console.error("creator_api", msg);
    return err(msg, status);
  }
});
