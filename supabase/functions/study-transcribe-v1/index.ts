import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { Client, handle_file } from "npm:@gradio/client@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const SPACES = ["hf-audio/whisper-large-v3", "hf-audio/whisper-large-v3-turbo", "openai/whisper"];
const ALLOWED = new Set([
  "https://juanmanuelpm.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
]);
const hits = new Map();
const spacePromises = new Map();

function cors(req) {
  const o = req.headers.get("origin") || "";
  const h = {
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
  if (!o || ALLOWED.has(o)) h["Access-Control-Allow-Origin"] = o || "*";
  return { ok: !o || ALLOWED.has(o), h };
}

function out(req, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(req).h, "content-type": "application/json; charset=utf-8" }
  });
}

function clean(v, n = 160) {
  return String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

function uuid(v) {
  const s = String(v || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s) ? s : "";
}

function num(v, lo = 0, hi = Number.MAX_SAFE_INTEGER) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
}

function rate(req) {
  const ip = (req.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.at > 60000) {
    hits.set(ip, { at: now, n: 1 });
    return true;
  }
  h.n++;
  return h.n <= 24;
}

async function roomOK(id, t) {
  if (!id || t.length < 24) return false;
  const q = await db.from("study_class_sessions").select("id").eq("id", id).eq("room_token", t).maybeSingle();
  if (q.error) throw q.error;
  return !!q.data;
}

function norm(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ]+/g, " ").trim();
}

function sameBlock(w, a, b, n) {
  for (let i = 0; i < n; i++) if (w[a + i] !== w[b + i]) return false;
  return true;
}

function quality(text) {
  const w = norm(text).split(/\s+/).filter(Boolean);
  if (w.length < 4) return { bad: false, score: 0, reasons: [], words: w.length, unique_ratio: 1 };
  let score = 0;
  const reasons = [];
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < w.length; i++) {
    run = w[i] === w[i - 1] ? run + 1 : 1;
    if (run > maxRun) maxRun = run;
  }
  if (maxRun >= 6) {
    score += 10;
    reasons.push("token-loop");
  }
  let maxBlockRepeat = 1;
  for (const n of [2, 3, 4, 5, 6, 7, 8]) {
    for (let i = 0; i + n * 4 <= w.length; i++) {
      let reps = 1;
      while (i + (reps + 1) * n <= w.length && sameBlock(w, i, i + reps * n, n)) reps++;
      if (reps > maxBlockRepeat) maxBlockRepeat = reps;
      if (reps >= 4) {
        score += 10;
        reasons.push(`${n}gram-consecutive-loop`);
        i += reps * n - 1;
        break;
      }
    }
    if (score >= 10) break;
  }
  const uniqueRatio = new Set(w).size / w.length;
  if (w.length > 60 && uniqueRatio < .16) {
    score += 7;
    reasons.push("very-low-diversity");
  }
  return {
    bad: score >= 7,
    score,
    reasons,
    words: w.length,
    unique_ratio: Number(uniqueRatio.toFixed(3)),
    max_token_run: maxRun,
    max_block_repeat: maxBlockRepeat
  };
}

async function targetFor(space) {
  if (!spacePromises.has(space)) {
    spacePromises.set(space, (async () => {
      const app = await Client.connect(space);
      const api = await app.view_api();
      const keys = Object.keys(api?.named_endpoints || {});
      const eps = keys.filter(k => /transcrib|predict|infer/i.test(k) && !/youtube|yt/i.test(k));
      if (!(eps.length || keys.length)) throw new Error(`NO_ENDPOINT_${space}`);
      return { space, app, endpoints: eps.length ? eps : keys };
    })());
  }
  return await spacePromises.get(space);
}

async function whisperOn(audio, space) {
  const t = await targetFor(space);
  let last = null;
  for (const ep of t.endpoints) {
    for (const args of [[handle_file(audio), "transcribe"], [handle_file(audio)]]) {
      try {
        const r = await t.app.predict(ep, args);
        const d = r?.data;
        const text = clean(Array.isArray(d) ? d[0] : d, 50000);
        if (text) return { text, endpoint: ep, space: t.space, quality: quality(text) };
        last = new Error("EMPTY_TRANSCRIPT");
      } catch (e) {
        last = e;
      }
    }
  }
  throw last || new Error("WHISPER_ENDPOINT_NOT_FOUND");
}

async function whisper(audio) {
  let best = null;
  const failures = [];
  for (const space of SPACES) {
    try {
      const r = await whisperOn(audio, space);
      if (!best || r.quality.score < best.quality.score) best = r;
      if (!r.quality.bad) return r;
      failures.push({ space, quality: r.quality });
    } catch (e) {
      spacePromises.delete(space);
      failures.push({ space, error: clean(e?.message || e, 300) });
    }
  }
  const err = new Error("QUALITY_GATE_FAILED " + JSON.stringify(failures));
  err.quality = best?.quality || null;
  throw err;
}

async function selftest() {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/casa-tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "Esto es una prueba de transcripción canónica en español rioplatense.",
      voice: "es-AR-TomasNeural"
    })
  });
  if (!r.ok) throw new Error(`TTS_SELFTEST_${r.status}`);
  const b = await r.blob();
  const f = new File([b], "selftest.mp3", { type: b.type || "audio/mpeg" });
  return await whisper(f);
}

function readMeta(form) {
  const startMs = Math.round(num(form.get("start_ms"), 0));
  const endMs = Math.max(startMs, Math.round(num(form.get("end_ms"), startMs)));
  return {
    id: uuid(form.get("chunk_id")) || crypto.randomUUID(),
    participantId: clean(form.get("participant_id"), 120) || "anon",
    participantName: clean(form.get("participant_name"), 80) || "Participante",
    seq: Math.max(1, Math.round(num(form.get("seq"), 1, 1000000))),
    segmentNo: Math.max(1, Math.round(num(form.get("segment_no"), 1, 100000))),
    startMs,
    endMs,
    overlapMs: Math.round(num(form.get("overlap_ms"), 0, 60000)),
    captureWindowMs: Math.round(num(form.get("capture_window_ms"), Math.max(0, endMs - startMs), 300000)),
    captureVersion: clean(form.get("capture_version"), 40) || "legacy"
  };
}

async function transcribeStandalone(req, form, audio) {
  const clientSessionId = uuid(form.get("client_session_id"));
  if (!clientSessionId) return out(req, { ok: false, error: "CLIENT_SESSION_REQUIRED" }, 400);
  const meta = readMeta(form);
  try {
    const r = await whisper(audio);
    const source = r.space.includes("turbo")
      ? "whisper-large-v3-turbo"
      : r.space.includes("large-v3") ? "whisper-large-v3" : "whisper";
    return out(req, {
      ok: true,
      mode: "standalone",
      client_session_id: clientSessionId,
      id: meta.id,
      transcript: r.text,
      source,
      space: r.space,
      endpoint: r.endpoint,
      quality: r.quality,
      overlap_ms: meta.overlapMs,
      capture_window_ms: meta.captureWindowMs,
      capture_version: meta.captureVersion,
      timestamps: null
    });
  } catch (e) {
    const msg = clean(e?.message || e, 1200);
    const status = msg.startsWith("QUALITY_GATE_FAILED") ? 422 : 502;
    return out(req, {
      ok: false,
      mode: "standalone",
      client_session_id: clientSessionId,
      id: meta.id,
      error: status === 422 ? "LOW_QUALITY_TRANSCRIPT" : "TRANSCRIPTION_FAILED",
      detail: msg
    }, status);
  }
}

Deno.serve(async (req) => {
  try {
    const c = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { status: c.ok ? 204 : 403, headers: c.h });
    if (!c.ok) return out(req, { ok: false, error: "ORIGIN_NOT_ALLOWED" }, 403);

    if (req.method === "GET") {
      const u = new URL(req.url);
      if (u.searchParams.get("selftest") === "1") {
        try {
          const r = await selftest();
          return out(req, {
            ok: true,
            service: "study-transcribe-v1",
            selftest: true,
            capture: "canonical-v2",
            primary_model: "whisper-large-v3",
            standalone: true,
            ...r
          });
        } catch (e) {
          return out(req, { ok: false, selftest: true, error: clean(e?.message || e, 1200) }, 503);
        }
      }
      return out(req, {
        ok: true,
        service: "study-transcribe-v1",
        mode: "canonical-long-window",
        standalone: true,
        spaces: SPACES,
        recommended: { window_ms: 150000, step_ms: 135000, overlap_ms: 15000, language: "es", locale: "es-AR" },
        quality_gate: "consecutive-repetition+diversity",
        audio_persistence: "client-master+canonical-chunks"
      });
    }

    if (req.method !== "POST") return out(req, { ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    if (!rate(req)) return out(req, { ok: false, error: "RATE_LIMITED" }, 429);

    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size < 256) return out(req, { ok: false, error: "AUDIO_REQUIRED" }, 400);
    if (audio.size > 24 * 1024 * 1024) return out(req, { ok: false, error: "CHUNK_TOO_LARGE" }, 413);

    const mode = clean(form.get("mode"), 40);
    if (mode === "standalone") return await transcribeStandalone(req, form, audio);

    const sessionId = uuid(form.get("session_id"));
    const roomToken = String(form.get("room_token") || "");
    if (!(await roomOK(sessionId, roomToken))) return out(req, { ok: false, error: "ROOM_AUTH_FAILED" }, 403);

    const meta = readMeta(form);
    const base = {
      id: meta.id,
      session_id: sessionId,
      participant_id: meta.participantId,
      participant_name: meta.participantName,
      segment_no: meta.segmentNo,
      seq: meta.seq,
      start_ms: meta.startMs,
      end_ms: meta.endMs,
      overlap_ms: meta.overlapMs,
      capture_window_ms: meta.captureWindowMs,
      capture_version: meta.captureVersion,
      transcript: "",
      source: "whisper-large-v3",
      status: "transcribing",
      audio_chunk_id: clean(form.get("audio_chunk_id"), 180) || meta.id,
      mime_type: audio.type || "application/octet-stream",
      byte_size: audio.size,
      provisional_text: "",
      error: null,
      started_processing_at: new Date().toISOString(),
      finished_processing_at: null
    };

    const up = await db.from("study_transcript_chunks").upsert(base, { onConflict: "id" });
    if (up.error) throw up.error;
    try {
      const r = await whisper(audio);
      const source = r.space.includes("turbo")
        ? "whisper-large-v3-turbo"
        : r.space.includes("large-v3") ? "whisper-large-v3" : "whisper";
      const done = await db.from("study_transcript_chunks").update({
        transcript: r.text,
        status: "ready",
        source,
        error: null,
        finished_processing_at: new Date().toISOString()
      }).eq("id", meta.id).eq("session_id", sessionId);
      if (done.error) throw done.error;
      return out(req, {
        ok: true,
        id: meta.id,
        transcript: r.text,
        source,
        space: r.space,
        endpoint: r.endpoint,
        quality: r.quality,
        overlap_ms: meta.overlapMs,
        capture_window_ms: meta.captureWindowMs,
        capture_version: meta.captureVersion
      });
    } catch (e) {
      const msg = clean(e?.message || e, 1200);
      await db.from("study_transcript_chunks").update({
        status: "error",
        error: msg,
        finished_processing_at: new Date().toISOString()
      }).eq("id", meta.id).eq("session_id", sessionId);
      const status = msg.startsWith("QUALITY_GATE_FAILED") ? 422 : 502;
      return out(req, {
        ok: false,
        id: meta.id,
        error: status === 422 ? "LOW_QUALITY_TRANSCRIPT" : "TRANSCRIPTION_FAILED",
        detail: msg
      }, status);
    }
  } catch (e) {
    console.error(e);
    return out(req, { ok: false, error: "INTERNAL_ERROR", detail: clean(e?.message || e, 1200) }, 500);
  }
});
