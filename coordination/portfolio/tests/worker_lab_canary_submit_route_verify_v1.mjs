#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const endpoint = process.env.WORKER_LAB_CANARY_ENDPOINT || 'https://worker-lab.vercel.app/api/prometeo-ingress';
const requestId = String(process.env.VERIFY_REQUEST_ID || `wc-route-verify-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
const outDir = process.env.VERIFY_ARTIFACT_DIR || 'artifacts/worker-lab-canary-submit-route-verify-v1';
const canaryText = 'CANARY: verificación segura del transporte Worker Lab; respondé con confirmación sanitizada y RETURN durable; no hagas cambios de producto.';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store', ...options });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

async function verifyDurableRef(ref) {
  const rawUrl = `https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/${ref.split('/').map(encodeURIComponent).join('/')}`;
  let last = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const probe = await fetch(rawUrl, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
      const text = await probe.text();
      last = { status: probe.status, bytes: Buffer.byteLength(text), text };
      if (probe.ok) return { ok: true, raw_url: rawUrl, status: probe.status, bytes: Buffer.byteLength(text), text };
    } catch (error) {
      last = { error: error?.message || String(error) };
    }
    await sleep(5000);
  }
  return { ok: false, raw_url: rawUrl, last };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const evidence = {
    schema: 'prometeo.worker-lab-canary-submit-route-verify/v1',
    generated_at: new Date().toISOString(),
    endpoint,
    request_id: requestId,
    health: null,
    submit: null,
    durable_ref: null,
    status: 'PENDING'
  };

  const health = await fetchJson(endpoint, { method: 'GET', headers: { Origin: 'https://juanmanuelpm.github.io' } });
  evidence.health = {
    http_status: health.response.status,
    schema: health.json?.schema || null,
    status: health.json?.status || null,
    secret_configured: health.json?.secret_configured === true,
    privacy_mode: health.json?.privacy_mode || null
  };
  if (!health.response.ok || health.json?.schema !== 'prometeo.ingress-bridge-health/v3' || health.json?.secret_configured !== true) {
    evidence.status = 'FAIL_HEALTH';
    await writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  const createdAt = new Date().toISOString();
  const payload = {
    schema: 'prometeo.primary-chat-public-canary-submit/v1',
    public_canary: true,
    public_envelope: {
      schema: 'prometeo.browser-ingress-request/v1',
      kind: 'CHAT_CANARY_HUMAN_MESSAGE_V1',
      request_id: requestId,
      created_at: createdAt,
      page: { page_id: 'control-v11-chat-canary' }
    },
    private_payload: { text: canaryText }
  };

  const submit = await fetchJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://juanmanuelpm.github.io' },
    body: JSON.stringify(payload)
  });
  evidence.submit = {
    http_status: submit.response.status,
    schema: submit.json?.schema || null,
    status: submit.json?.status || null,
    queued: submit.json?.queued === true,
    ref: submit.json?.ref || null,
    privacy: submit.json?.privacy || null,
    projection: submit.json?.projection || null,
    error: submit.json?.error || null
  };

  const ref = typeof submit.json?.ref === 'string' ? submit.json.ref : '';
  const expectedPrefix = 'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-primary-chat-canary-';
  if (!submit.response.ok || submit.json?.schema !== 'prometeo.ingress-transport-result/v1' || submit.json?.queued !== true || !ref.startsWith(expectedPrefix)) {
    evidence.status = 'FAIL_SUBMIT';
    await writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  const durable = await verifyDurableRef(ref);
  evidence.durable_ref = {
    ok: durable.ok,
    ref,
    raw_url: durable.raw_url,
    http_status: durable.status || durable.last?.status || null,
    bytes: durable.bytes || durable.last?.bytes || null
  };
  if (!durable.ok) {
    evidence.status = 'FAIL_DURABLE_REF';
    await writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  let job = null;
  try { job = JSON.parse(durable.text); } catch {}
  evidence.durable_ref.job_schema = job?.schema || null;
  evidence.durable_ref.job_id = job?.job_id || null;
  evidence.durable_ref.seed_status = job?.seed_status || null;
  evidence.durable_ref.source_surface = job?.source?.surface || null;
  if (job?.schema !== 'prometeo.portfolio-derived-job/v1' || job?.seed_status !== 'ready' || job?.source?.surface !== 'PRIMARY_CHAT_PUBLIC_CANARY_FALLBACK') {
    evidence.status = 'FAIL_DURABLE_CONTENT';
    await writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  evidence.status = 'PASS';
  await writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}

await main();
