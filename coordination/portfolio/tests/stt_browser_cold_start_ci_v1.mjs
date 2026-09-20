#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const target = process.env.STT_TARGET_URL || 'https://juanmanuelpm.github.io/prometeo/pages/voice/';
const probeTimeoutMs = Math.max(30_000, Number(process.env.STT_PROBE_TIMEOUT_MS || 360_000));
const outDir = path.resolve(process.env.STT_ARTIFACT_DIR || 'artifacts/stt-browser-cold-start');
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-stt-ci-'));
fs.mkdirSync(outDir, { recursive: true });

const safeHost = value => {
  try { return new URL(value).hostname; } catch { return null; }
};

async function probe(context, phase) {
  const page = await context.newPage();
  const network = [];
  const consoleErrors = [];
  let workerScriptStatus = null;

  page.on('requestfailed', request => {
    const host = safeHost(request.url());
    if (host) network.push({ kind:'request_failed', host, error:request.failure()?.errorText || 'unknown' });
  });
  page.on('response', response => {
    const url = response.url();
    if (url.endsWith('/pages/voice/transcriber-worker.js') || url.endsWith('/transcriber-worker.js')) {
      workerScriptStatus = response.status();
    }
    if (response.status() >= 400) {
      const host = safeHost(url);
      if (host) network.push({ kind:'http_error', host, status:response.status() });
    }
  });
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 400));
  });

  const navStart = Date.now();
  let navMs = null;
  try {
    await page.goto(target, { waitUntil:'domcontentloaded', timeout:60_000 });
    navMs = Date.now() - navStart;
    await page.waitForFunction(() => typeof worker !== 'undefined' && worker instanceof Worker, null, { timeout:15_000 });

    const run = await page.evaluate(async ({ phase, timeoutMs }) => {
      const sampleRate = 16_000;
      const durationMs = 750;
      const samples = new Float32Array(Math.round(sampleRate * durationMs / 1000));
      for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        samples[i] = i < sampleRate * 0.5 ? 0.035 * Math.sin(2 * Math.PI * 440 * t) : 0;
      }
      const id = `ci-${phase}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const t0 = performance.now();

      return await new Promise(resolve => {
        const events = [];
        let settled = false;
        let modelReadyMs = null;
        const finish = result => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          worker.removeEventListener('message', onMessage);
          resolve({
            ...result,
            elapsed_ms: Math.round(performance.now() - t0),
            model_ready_ms: modelReadyMs,
            events
          });
        };
        const onMessage = event => {
          const data = event.data || {};
          if (data.id !== id) return;
          const elapsed = Math.round(performance.now() - t0);
          if (data.type === 'model-progress') {
            events.push({ type:'model-progress', progress:Number(data.progress || 0), elapsed_ms:elapsed });
            return;
          }
          if (data.type === 'status') {
            events.push({ type:'status', status:String(data.status || ''), elapsed_ms:elapsed });
            if (data.status === 'transcribing' && modelReadyMs === null) modelReadyMs = elapsed;
            return;
          }
          if (data.type === 'done') {
            const text = String(data.text || '');
            events.push({ type:'done', text_length:text.length, elapsed_ms:elapsed });
            finish({ status:'done', text_length:text.length });
            return;
          }
          if (data.type === 'error') {
            const error = String(data.error || 'worker error').slice(0, 600);
            events.push({ type:'error', error, elapsed_ms:elapsed });
            finish({ status:'error', error });
          }
        };
        worker.addEventListener('message', onMessage);
        const timer = setTimeout(() => finish({ status:'timeout', error:`probe timeout after ${timeoutMs}ms` }), timeoutMs);
        worker.postMessage({ type:'transcribe', id, audio:samples.buffer }, [samples.buffer]);
      });
    }, { phase, timeoutMs:probeTimeoutMs });

    return {
      phase,
      navigation_status:'ok',
      navigation_ms:navMs,
      worker_script_status:workerScriptStatus,
      ...run,
      network:network.slice(0, 40),
      console_errors:consoleErrors.slice(0, 20)
    };
  } catch (error) {
    return {
      phase,
      navigation_status:'error',
      navigation_ms:navMs,
      worker_script_status:workerScriptStatus,
      status:'harness_error',
      error:String(error?.message || error).slice(0, 900),
      network:network.slice(0, 40),
      console_errors:consoleErrors.slice(0, 20)
    };
  } finally {
    await page.close().catch(() => {});
  }
}

let context;
let cold;
let repeat;
try {
  context = await chromium.launchPersistentContext(profileDir, {
    headless:true,
    viewport:{ width:390, height:844 }
  });
  cold = await probe(context, 'cold');
  repeat = await probe(context, 'repeat');
} finally {
  if (context) await context.close().catch(() => {});
}

const exactTerminal = row => ['done','error','timeout'].includes(row?.status);
const complete = exactTerminal(cold) && exactTerminal(repeat);
const bothDone = cold?.status === 'done' && repeat?.status === 'done';
const coldReady = Number.isFinite(cold?.model_ready_ms) ? cold.model_ready_ms : null;
const repeatReady = Number.isFinite(repeat?.model_ready_ms) ? repeat.model_ready_ms : null;

const receipt = {
  schema:'prometeo.stt-browser-cold-start-ci/v1',
  generated_at:new Date().toISOString(),
  target_url:target,
  worker_url:new URL('transcriber-worker.js', target).toString(),
  browser:'chromium-playwright',
  synthetic_audio:{
    private:false,
    content:'deterministic_440hz_tone_then_silence',
    sample_rate_hz:16000,
    duration_ms:750,
    transcript_persisted:false
  },
  cold,
  repeat,
  cache_observation:{
    cold_model_ready_ms:coldReady,
    repeat_model_ready_ms:repeatReady,
    warmed_repeat_faster:
      coldReady !== null && repeatReady !== null ? repeatReady < coldReady : null,
    interpretation:'Timing/status evidence only. A successful warmed repeat does not establish offline-first behavior or independence from external model/CDN resources.'
  },
  external_dependency_observation:{
    hosts:[...new Set([...(cold?.network || []), ...(repeat?.network || [])].map(row => row.host).filter(Boolean))].sort(),
    failures:[...(cold?.network || []), ...(repeat?.network || [])].filter(row => row.kind === 'request_failed' || row.kind === 'http_error')
  },
  verdict:bothDone ? 'TRANSCRIPTION_PATH_COMPLETED' : complete ? 'EXACT_FAILURE_CAPTURED' : 'HARNESS_INCOMPLETE',
  truth_boundary:'CI_MEASURES_DEPLOYED_BROWSER_BEHAVIOR_WITH_SYNTHETIC_AUDIO_ONLY_NO_OFFLINE_FIRST_CLAIM'
};

fs.writeFileSync(path.join(outDir, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(JSON.stringify({
  verdict:receipt.verdict,
  cold:{status:cold?.status,model_ready_ms:coldReady,elapsed_ms:cold?.elapsed_ms},
  repeat:{status:repeat?.status,model_ready_ms:repeatReady,elapsed_ms:repeat?.elapsed_ms},
  artifact:path.join(outDir,'receipt.json')
}) + '\n');

if (receipt.verdict === 'HARNESS_INCOMPLETE') process.exitCode = 1;
