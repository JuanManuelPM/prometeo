import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRATEGY_RPC = "prometeo_strategic_console_v2";
const WORLD_RPC = "prometeo_world_snapshot_v1";
const APPLY_CHOICES_RPC = "prometeo_strategic_apply_choices_v2";
const CHANNEL = "PROMETEO_MAIN";
const TTS_URL = `${SUPABASE_URL}/functions/v1/prometeo-strategy-audio-v1`;
const CONTRACT = "prometeo.mobile/v1";
const REQUEST_CANON = "prometeo.mobile.request/v1";
const MIN_APP_VERSION = 1;
const RECOMMENDED_APP_VERSION = 1;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type,x-prometeo-device,x-prometeo-timestamp,x-prometeo-nonce,x-prometeo-signature,x-prometeo-approval-signature",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function json(body: unknown, status = 200, extra: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

function b64ToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  const raw = atob(normalized + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function importRsaPublicKey(spkiB64: string) {
  return await crypto.subtle.importKey(
    "spki",
    b64ToBytes(spkiB64),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function verifyRsa(spkiB64: string, signatureB64: string, message: string) {
  try {
    const key = await importRsaPublicKey(spkiB64);
    return await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64ToBytes(signatureB64),
      new TextEncoder().encode(message),
    );
  } catch {
    return false;
  }
}

function serviceHeaders(extra: Record<string,string> = {}) {
  return {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    apikey: SERVICE_ROLE,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest(path: string, init: RequestInit = {}) {
  return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
  });
}

async function rpc(name: string, body: unknown) {
  const r = await rest(`rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${name}:${r.status}:${text.slice(0,180)}`);
  return text ? JSON.parse(text) : null;
}

function safeText(v: unknown, max = 6000) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function surfaceTime(v: any) {
  const t = Date.parse(String(v?.generated_at || ""));
  return Number.isFinite(t) ? t : 0;
}

function strategicSurface(state: any) {
  const p = state?.preview || null;
  const f = state?.firm || null;
  if (p && (!f || surfaceTime(p) > surfaceTime(f))) {
    return {
      ...p,
      spoken_brief: p.preview_text || "",
      tts_message_id: "strategic-preview-" + String(p.epoch_id || "current"),
    };
  }
  return f || p || null;
}

function latestVoice(state: any) {
  const s = strategicSurface(state);
  if (!s) return null;
  const text = safeText(s.spoken_brief || s.preview_text || "", 12000);
  return {
    message_id: safeText(s.tts_message_id || s.epoch_id || "current", 140),
    epoch_id: safeText(s.epoch_id || "", 80),
    headline: safeText(s.headline || "Estado actual", 500),
    text,
    part_count: chunkAudioText(text).length,
    generated_at: s.generated_at || null,
  };
}

function worldProjection(world: any) {
  const f = world?.focus_run || {};
  const c = f?.counts || {};
  const p = world?.product_completion || {};
  return {
    run: {
      id: f.run_id || null,
      status: f.status || null,
      objective: safeText(f.objective || "", 1000),
      completion_ratio: Number(f.job_completion_ratio || 0),
      counts: {
        total: Number(c.total || 0),
        done: Number(c.done || 0),
        ready: Number(c.ready || 0),
        active: Number(c.active || 0),
        blocked: Number(c.blocked || 0),
        success: Number(c.success || 0),
      },
    },
    product: {
      percentage: p?.percentage || null,
      capacity: p?.capacity || null,
      review_gate: p?.review_gate || null,
    },
    event_cursor: world?.event_cursor || null,
    guides_count: Array.isArray(world?.guides) ? world.guides.length : null,
  };
}

async function releaseState() {
  const r = await rest(
    "prometeo_mobile_release_channels?select=channel,contract_version,min_version_code,recommended_version_code,version_name,distribution,update_url,apk_sha256,updated_at&channel=eq.internal&limit=1"
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows?.[0] || null;
}

function buildHome(state: any, world: any, release: any) {
  const s = strategicSurface(state);
  const voice = latestVoice(state);
  const minVersion = Number(release?.min_version_code || MIN_APP_VERSION);
  const recommendedVersion = Number(
    release?.recommended_version_code || RECOMMENDED_APP_VERSION
  );
  const options = Array.isArray(s?.action_options)
    ? s.action_options.map((o: any) => ({
        id: safeText(o?.option_id || "", 120),
        label: safeText(o?.label || "", 240),
        why: safeText(o?.why_now || "", 1200),
        perspective: safeText(o?.perspective || "", 80),
        priority: Number(o?.priority || 0),
        risk: "confirm",
      })).filter((o: any) => o.id)
    : [];

  const blocks: any[] = [
    { type: "voice", id: "current_voice" },
    { type: "run_status", id: "focus_run" },
    { type: "strategic_choices", id: "strategy" },
  ];
  if (release?.update_url && recommendedVersion > 0) {
    blocks.push({ type: "app_update", id: "app_update" });
  }

  return {
    schema: CONTRACT,
    contract_version: 1,
    min_app_version_code: minVersion,
    recommended_app_version_code: recommendedVersion,
    generated_at: new Date().toISOString(),
    cache_ttl_seconds: 30,
    capabilities: {
      voice: true,
      world: true,
      strategic_choices: true,
      declarative_surfaces: true,
      push: false,
    },
    update: release ? {
      channel: release.channel,
      version_name: release.version_name,
      distribution: release.distribution,
      update_url: release.update_url,
      apk_sha256: release.apk_sha256,
      updated_at: release.updated_at,
    } : null,
    home: {
      voice,
      world: worldProjection(world),
      strategic: s ? {
        epoch_id: safeText(s.epoch_id || "", 80),
        headline: safeText(s.headline || "Estado actual", 500),
        brief: safeText(s.preview_text || s.spoken_brief || "", 9000),
        generated_at: s.generated_at || null,
        confidence: s.confidence || null,
        options,
      } : null,
    },
    blocks,
  };
}

async function pair(body: any, req: Request) {
  const pairToken = String(body?.pairToken || "");
  const publicKey = String(body?.publicKeySpki || "");
  const approvalKey = String(body?.approvalPublicKeySpki || "");
  const label = safeText(body?.deviceLabel || "Android", 120);
  const appVersionCode = Number(body?.appVersionCode || 0);
  const protocolMax = Number(body?.protocolMax || 1);
  const deviceModel = safeText(body?.deviceModel || "", 180);

  if (pairToken.length < 32 || pairToken.length > 512) {
    return json({ code: "PAIR_TOKEN_INVALID" }, 403);
  }
  if (publicKey.length < 200 || publicKey.length > 8192) {
    return json({ code: "PUBLIC_KEY_INVALID" }, 400);
  }
  try { await importRsaPublicKey(publicKey); } catch {
    return json({ code: "PUBLIC_KEY_INVALID" }, 400);
  }
  if (approvalKey) {
    try { await importRsaPublicKey(approvalKey); } catch {
      return json({ code: "APPROVAL_KEY_INVALID" }, 400);
    }
  }

  const tokenHash = await sha256Hex(pairToken);
  const uaHash = await sha256Hex(req.headers.get("User-Agent") || "android");
  const compatibilityHash = await sha256Hex(publicKey);

  try {
    const result = await rpc("prometeo_mobile_pair_device_v1", {
      p_token_hash: tokenHash,
      p_public_key_spki: publicKey,
      p_approval_public_key_spki: approvalKey,
      p_compatibility_hash: compatibilityHash,
      p_label: label,
      p_user_agent_hash: uaHash,
      p_app_version_code: appVersionCode,
      p_protocol_max: protocolMax,
      p_device_model: deviceModel,
    });
    return json({
      ...result,
      schema: CONTRACT,
      contract_version: 1,
      expires_in_days: 180,
      min_app_version_code: MIN_APP_VERSION,
      recommended_app_version_code: RECOMMENDED_APP_VERSION,
    });
  } catch (e) {
    const detail = String(e);
    if (detail.includes("mobile_pair_invalid")
        || detail.includes("mobile_pair_expired")
        || detail.includes("mobile_pair_used")) {
      return json({ code: "PAIR_INVALID_OR_EXPIRED" }, 403);
    }
    if (detail.includes("mobile_owner_not_ready")) {
      return json({ code: "OWNER_NOT_READY" }, 409);
    }
    if (detail.includes("mobile_public_key_exists")) {
      return json({ code: "DEVICE_ALREADY_PAIRED" }, 409);
    }
    return json({ code: "PAIR_FAILED" }, 500);
  }
}

async function authenticate(req: Request, rawBody: string) {
  const sessionId = String(req.headers.get("x-prometeo-device") || "");
  const timestamp = String(req.headers.get("x-prometeo-timestamp") || "");
  const nonce = String(req.headers.get("x-prometeo-nonce") || "");
  const signature = String(req.headers.get("x-prometeo-signature") || "");

  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { ok: false, code: "DEVICE_REQUIRED" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts * 1000) > 180000) {
    return { ok: false, code: "TIMESTAMP_INVALID" };
  }
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(nonce)) return { ok: false, code: "NONCE_INVALID" };
  if (signature.length < 100 || signature.length > 8192) return { ok: false, code: "SIGNATURE_REQUIRED" };

  const sres = await rest(
    `prometeo_device_sessions?select=id,auth_user_id,public_key_spki,approval_public_key_spki,expires_at,revoked_at,auth_scheme&` +
    `id=eq.${encodeURIComponent(sessionId)}&limit=1`
  );
  if (!sres.ok) return { ok: false, code: "DEVICE_LOOKUP_FAILED" };
  const rows = await sres.json();
  const s = rows?.[0];
  if (!s || s.revoked_at || !s.expires_at || Date.parse(s.expires_at) < Date.now()) {
    return { ok: false, code: "DEVICE_EXPIRED" };
  }
  if (s.auth_scheme !== "rsa-pkcs1-sha256-v1" || !s.public_key_spki) {
    return { ok: false, code: "DEVICE_AUTH_UNSUPPORTED" };
  }

  const bodyHash = await sha256Hex(rawBody);
  const canonical = `${REQUEST_CANON}\nPOST\n/functions/v1/prometeo-mobile-v1\n${timestamp}\n${nonce}\n${bodyHash}`;
  const valid = await verifyRsa(s.public_key_spki, signature, canonical);
  if (!valid) return { ok: false, code: "SIGNATURE_INVALID" };

  const nres = await rest("prometeo_mobile_request_nonces", {
    method: "POST",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ session_id: sessionId, nonce }),
  });
  if (nres.status === 409) return { ok: false, code: "REPLAY" };
  if (!nres.ok) return { ok: false, code: "NONCE_STORE_FAILED" };

  await rest(`prometeo_device_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
  });

  return { ok: true, session: s, canonical, bodyHash };
}

async function currentState() {
  const [strategy, world, release] = await Promise.all([
    rpc(STRATEGY_RPC, { p_channel_key: CHANNEL }),
    rpc(WORLD_RPC, {}),
    releaseState(),
  ]);
  return { strategy, world, release };
}

async function requireApproval(req: Request, auth: any) {
  const sig = String(req.headers.get("x-prometeo-approval-signature") || "");
  const key = auth?.session?.approval_public_key_spki;
  if (!key || !sig) return false;
  return await verifyRsa(key, sig, auth.canonical + "\nAPPROVE");
}

function chunkAudioText(raw: string) {
  const text = safeText(raw, 12000);
  const out: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    const max = out.length === 0 ? 220 : 500;
    let end = Math.min(text.length, offset + max);
    if (end < text.length) {
      const min = offset + Math.floor(max * 0.6);
      let cut = -1;
      for (let i = end; i >= min; i--) {
        const ch = text[i - 1];
        if (".!?;:,".includes(ch)) { cut = i; break; }
      }
      if (cut < 0) {
        for (let i = end; i >= min; i--) {
          if (/\s/.test(text[i - 1])) { cut = i; break; }
        }
      }
      if (cut > offset) end = cut;
    }
    const chunk = text.slice(offset, end).trim();
    if (chunk) out.push(chunk);
    offset = end;
    while (offset < text.length && /\s/.test(text[offset])) offset++;
  }
  return out;
}

async function handleVoiceAudio(state: any, requestedId: string, requestedPart: number) {
  const voice = latestVoice(state);
  if (!voice || !voice.text) return json({ code: "VOICE_UNAVAILABLE" }, 404);
  if (requestedId && requestedId !== voice.message_id) {
    return json({ code: "VOICE_STALE", current_message_id: voice.message_id }, 409);
  }

  const chunks = chunkAudioText(voice.text);
  if (!Number.isInteger(requestedPart) || requestedPart < 0 || requestedPart >= chunks.length) {
    return json({ code: "VOICE_PART_INVALID", parts: chunks.length }, 400);
  }

  const chunk = chunks[requestedPart];
  const chunkHash = (await sha256Hex(chunk)).slice(0, 16);
  const id = (
    "mobile-v1-" + voice.message_id + "-" + (requestedPart + 1) + "-" + chunkHash
  ).replace(/[^a-zA-Z0-9._:-]/g, "-").slice(0, 120);

  let response = await fetch(TTS_URL + "?id=" + encodeURIComponent(id), { cache: "no-store" });
  if (response.status === 404) {
    response = await fetch(TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id, text: chunk }),
    });
  }
  if (!response.ok) return json({ code: "VOICE_BACKEND_ERROR", status: response.status }, 502);

  const headers = new Headers(CORS);
  headers.set("Content-Type", response.headers.get("content-type") || "audio/wav");
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("X-Prometeo-Voice-Message", voice.message_id);
  headers.set("X-Prometeo-Voice-Headline", encodeURIComponent(voice.headline));
  headers.set("X-Prometeo-Voice-Part", String(requestedPart));
  headers.set("X-Prometeo-Voice-Parts", String(chunks.length));
  return new Response(await response.arrayBuffer(), { status: 200, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ code: "METHOD_NOT_ALLOWED" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ code: "SERVER_CONFIG_ERROR" }, 500);

  const rawBody = await req.text();
  let body: any = {};
  try { body = JSON.parse(rawBody || "{}"); } catch { return json({ code: "INVALID_JSON" }, 400); }

  if (body?.op === "pair") return await pair(body, req);

  const auth = await authenticate(req, rawBody);
  if (!auth.ok) return json({ code: auth.code }, 401);

  try {
    if (body?.op === "bootstrap") {
      const { strategy, world, release } = await currentState();
      return json(buildHome(strategy, world, release));
    }

    if (body?.op === "voice_audio") {
      const strategy = await rpc(STRATEGY_RPC, { p_channel_key: CHANNEL });
      return await handleVoiceAudio(
        strategy,
        safeText(body?.messageId || "", 140),
        Number(body?.partIndex ?? 0),
      );
    }

    if (body?.op === "action" && body?.action === "strategic_select") {
      if (!await requireApproval(req, auth)) return json({ code: "APPROVAL_REQUIRED" }, 403);

      const strategy = await rpc(STRATEGY_RPC, { p_channel_key: CHANNEL });
      const s = strategicSurface(strategy);
      const epochId = safeText(body?.epochId || "", 80);
      const optionIds = Array.isArray(body?.optionIds)
        ? body.optionIds.map((x: unknown) => safeText(x, 120)).filter(Boolean)
        : [];
      const allowed = new Set(
        Array.isArray(s?.action_options) ? s.action_options.map((o: any) => String(o?.option_id || "")) : []
      );
      if (!s || !epochId || epochId !== String(s.epoch_id || "")) {
        return json({ code: "STRATEGIC_EPOCH_STALE" }, 409);
      }
      if (!optionIds.length || optionIds.some((x: string) => !allowed.has(x))) {
        return json({ code: "OPTION_INVALID" }, 400);
      }

      const actionId = safeText(body?.actionId || "", 80);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actionId)) {
        return json({ code: "ACTION_ID_INVALID" }, 400);
      }

      const result = await rpc("prometeo_mobile_apply_strategic_choices_v1", {
        p_session_id: auth.session.id,
        p_action_id: actionId,
        p_request_hash: auth.bodyHash,
        p_epoch_id: epochId,
        p_selected_option_ids: optionIds,
      });
      return json({ schema: CONTRACT, ...result });
    }

    return json({ code: "OP_NOT_SUPPORTED" }, 400);
  } catch (e) {
    return json({ code: "MOBILE_GATEWAY_ERROR", detail: String(e).slice(0, 220) }, 500);
  }
});
