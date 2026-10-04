import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WORKSPACE_SECRET_SHA256 = String(Deno.env.get("PROMETEO_PRIMARY_HOT_WORKSPACE_SECRET_SHA256") || "").trim().toLowerCase();
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const REQUESTS = "prometeo_primary_hot_requests_v1";
const WORKSPACES = "prometeo_primary_hot_workspaces_v1";
const MAX_TEXT = 65536;
const ALLOWED_ORIGINS = new Set([
  "https://juanmanuelpm.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
]);

function cors(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = !origin || ALLOWED_ORIGINS.has(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (origin && allowed) headers["Access-Control-Allow-Origin"] = origin;
  return { allowed, headers };
}

function json(req: Request, value: unknown, status = 200) {
  const { headers } = cors(req);
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}

function bearer(req: Request) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

function clean(value: unknown, max = 512) {
  const out = String(value ?? "").trim();
  return out ? out.slice(0, max) : "";
}

function safeId(value: unknown, code: string, max = 160) {
  const out = clean(value, max);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(out)) {
    throw Object.assign(new Error(code), { status: 400, code });
  }
  return out;
}

function slug(value: string) {
  const out = value.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!out) throw Object.assign(new Error("REQUEST_ID_INVALID"), { status: 400, code: "REQUEST_ID_INVALID" });
  return out;
}

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value: string) {
  const raw = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", raw));
  return [...digest].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SERVICE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
  return b64url(sig);
}

function projectRef() {
  try { return new URL(SUPABASE_URL).hostname.split(".")[0]; }
  catch { return ""; }
}

function workspaceGuardConfigured() {
  return /^[a-f0-9]{64}$/.test(WORKSPACE_SECRET_SHA256);
}

function timingSafeEqual(a: string, b: string) {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i += 1) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

async function workspace(secret: string, createIfMissing = false) {
  if (!workspaceGuardConfigured()) {
    throw Object.assign(new Error("WORKSPACE_GUARD_NOT_CONFIGURED"), { status: 503, code: "WORKSPACE_GUARD_NOT_CONFIGURED" });
  }
  if (secret.length < 32) {
    throw Object.assign(new Error("WORKSPACE_AUTH_FAILED"), { status: 401, code: "WORKSPACE_AUTH_FAILED" });
  }
  const secretHash = await sha256(secret);
  if (!timingSafeEqual(secretHash, WORKSPACE_SECRET_SHA256)) {
    throw Object.assign(new Error("WORKSPACE_AUTH_FAILED"), { status: 401, code: "WORKSPACE_AUTH_FAILED" });
  }
  const q = await db.from(WORKSPACES).select("id,secret_hash").eq("secret_hash", secretHash).maybeSingle();
  if (q.error) throw q.error;
  if (q.data) return q.data;
  if (!createIfMissing) {
    throw Object.assign(new Error("WORKSPACE_NOT_LINKED"), { status: 401, code: "WORKSPACE_NOT_LINKED" });
  }
  const ins = await db.from(WORKSPACES).insert({ secret_hash: secretHash }).select("id,secret_hash").single();
  if (ins.error) {
    if (String(ins.error.code || "") === "23505") {
      const retry = await db.from(WORKSPACES).select("id,secret_hash").eq("secret_hash", secretHash).single();
      if (retry.error) throw retry.error;
      return retry.data;
    }
    throw ins.error;
  }
  return ins.data;
}

async function deterministicWakeToken(workspaceId: string, requestId: string, workItemId: string) {
  return await hmac("wake:v1:" + workspaceId + ":" + requestId + ":" + workItemId);
}

async function pruneExpired() {
  const cut = new Date().toISOString();
  const del = await db.from(REQUESTS).delete().lt("expires_at", cut);
  if (del.error) throw del.error;
}

async function submit(req: Request, body: any) {
  const secret = bearer(req);
  const ws = await workspace(secret, true);
  const requestId = safeId(body.request_id, "REQUEST_ID_INVALID");
  const pageId = safeId(body.page_id || "control-v11-chat-canary", "PAGE_ID_INVALID");
  const text = String(body.text ?? "");
  if (!text.trim()) throw Object.assign(new Error("EMPTY_TEXT"), { status: 400, code: "EMPTY_TEXT" });
  if (text.length > MAX_TEXT) throw Object.assign(new Error("TEXT_TOO_LARGE"), { status: 413, code: "TEXT_TOO_LARGE" });

  const workItemId = "portfolio-primary-chat-hot-" + slug(requestId);
  const returnPath = "coordination/portfolio/returns/" + workItemId + "/";
  const wakeToken = await deterministicWakeToken(ws.id, requestId, workItemId);
  const wakeTokenHash = await sha256(wakeToken);

  const existing = await db.from(REQUESTS)
    .select("request_id,work_item_id,page_id,private_text,state,return_path,created_at,expires_at")
    .eq("workspace_id", ws.id)
    .eq("request_id", requestId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    if (String(existing.data.private_text) !== text) {
      throw Object.assign(new Error("REQUEST_ID_CONFLICT"), { status: 409, code: "REQUEST_ID_CONFLICT" });
    }
    return json(req, {
      schema: "prometeo.primary-hot-submit/v1",
      status: existing.data.state === "QUEUED" ? "QUEUED_REPLAY" : "HOT_STORED_REPLAY",
      request_id: requestId,
      work_item_id: existing.data.work_item_id,
      return_path: existing.data.return_path,
      wake_token: wakeToken,
      project_ref: projectRef(),
      expires_at: existing.data.expires_at
    });
  }

  await pruneExpired();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
  const ins = await db.from(REQUESTS).insert({
    workspace_id: ws.id,
    request_id: requestId,
    work_item_id: workItemId,
    page_id: pageId,
    private_text: text,
    state: "STORED",
    return_path: returnPath,
    wake_token_hash: wakeTokenHash,
    metadata: {
      source_surface: "PRIMARY_CHAT",
      request_class: "ANSWER",
      raw_text_public: false
    },
    expires_at: expiresAt
  });
  if (ins.error) throw ins.error;

  return json(req, {
    schema: "prometeo.primary-hot-submit/v1",
    status: "HOT_STORED",
    request_id: requestId,
    work_item_id: workItemId,
    return_path: returnPath,
    wake_token: wakeToken,
    project_ref: projectRef(),
    expires_at: expiresAt
  });
}

async function requestStatus(req: Request, body: any) {
  const ws = await workspace(bearer(req), false);
  const requestId = safeId(body.request_id, "REQUEST_ID_INVALID");
  const q = await db.from(REQUESTS)
    .select("request_id,work_item_id,page_id,state,return_path,created_at,queued_at,returned_at,expires_at")
    .eq("workspace_id", ws.id)
    .eq("request_id", requestId)
    .maybeSingle();
  if (q.error) throw q.error;
  if (!q.data) return json(req, { schema: "prometeo.primary-hot-status/v1", status: "NOT_FOUND", request_id: requestId }, 404);
  return json(req, { schema: "prometeo.primary-hot-status/v1", status: q.data.state, ...q.data });
}

async function rowFromWakeToken(token: string) {
  if (token.length < 32) throw Object.assign(new Error("WAKE_TOKEN_INVALID"), { status: 404, code: "WAKE_TOKEN_INVALID" });
  const hash = await sha256(token);
  const q = await db.from(REQUESTS)
    .select("request_id,work_item_id,page_id,state,return_path,created_at,expires_at,wake_token_hash")
    .eq("wake_token_hash", hash)
    .maybeSingle();
  if (q.error) throw q.error;
  if (!q.data) throw Object.assign(new Error("WAKE_TOKEN_INVALID"), { status: 404, code: "WAKE_TOKEN_INVALID" });
  if (new Date(q.data.expires_at).getTime() <= Date.now()) {
    throw Object.assign(new Error("REQUEST_EXPIRED"), { status: 410, code: "REQUEST_EXPIRED" });
  }
  return q.data;
}

async function wakeVerify(req: Request, body: any) {
  const token = clean(body.wake_token, 256);
  const row = await rowFromWakeToken(token);
  return json(req, {
    schema: "prometeo.primary-hot-wake-verification/v1",
    status: "VERIFIED_PRIVATE_LOCATOR",
    request_id: row.request_id,
    work_item_id: row.work_item_id,
    page_id: row.page_id,
    return_path: row.return_path,
    created_at: row.created_at,
    expires_at: row.expires_at,
    private_packet_lookup: {
      project_id: projectRef(),
      table: REQUESTS,
      key: "work_item_id",
      value: row.work_item_id,
      private_text_field: "private_text"
    },
    privacy: {
      raw_text_in_response: false,
      wake_token_in_response: false
    }
  });
}

async function markQueued(req: Request, body: any) {
  const token = clean(body.wake_token, 256);
  const row = await rowFromWakeToken(token);
  const up = await db.from(REQUESTS)
    .update({ state: "QUEUED", queued_at: new Date().toISOString() })
    .eq("wake_token_hash", await sha256(token))
    .in("state", ["STORED", "QUEUED"]);
  if (up.error) throw up.error;
  return json(req, {
    schema: "prometeo.primary-hot-status/v1",
    status: "QUEUED",
    request_id: row.request_id,
    work_item_id: row.work_item_id,
    return_path: row.return_path
  });
}

async function health(req: Request) {
  if (!workspaceGuardConfigured()) {
    throw Object.assign(new Error("WORKSPACE_GUARD_NOT_CONFIGURED"), { status: 503, code: "WORKSPACE_GUARD_NOT_CONFIGURED" });
  }
  const q = await db.from(WORKSPACES).select("id", { head: true, count: "exact" }).limit(1);
  if (q.error) throw q.error;
  return json(req, {
    schema: "prometeo.primary-hot-health/v1",
    status: "READY",
    project_ref: projectRef(),
    workspace_guard: "SHA256_ALLOWLIST",
    read_side_effects: false
  });
}

Deno.serve(async (req: Request) => {
  try {
    const { allowed, headers } = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers });
    if (!allowed) return json(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);
    if (req.method === "GET") return await health(req);
    if (req.method !== "POST") return json(req, { error: "METHOD_NOT_ALLOWED" }, 405);

    let body: any;
    try { body = await req.json(); }
    catch { return json(req, { error: "INVALID_JSON" }, 400); }

    switch (body.action) {
      case "submit": return await submit(req, body);
      case "request_status": return await requestStatus(req, body);
      case "wake_verify": return await wakeVerify(req, body);
      case "mark_queued": return await markQueued(req, body);
      case "health": return await health(req);
      default: return json(req, { error: "UNKNOWN_ACTION" }, 400);
    }
  } catch (error: any) {
    console.error(error);
    const status = Number(error?.status || 500);
    return json(req, {
      error: error?.code || "INTERNAL_ERROR",
      message: error?.message || String(error)
    }, status);
  }
});
