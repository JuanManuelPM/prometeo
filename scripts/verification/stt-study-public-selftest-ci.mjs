import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const target = "https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-transcribe-v1?selftest=1";
const allowedMethod = "GET";
const startedAt = new Date().toISOString();
let targetRequests = 0;
let mutatingTargetRequests = 0;

async function guardedTargetFetch(url, init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  if (url !== target) throw new Error("TARGET_URL_NOT_ALLOWLISTED");
  if (method !== allowedMethod) {
    mutatingTargetRequests += 1;
    throw new Error(`MUTATING_METHOD_BLOCKED_BEFORE_NETWORK:${method}`);
  }
  targetRequests += 1;
  return fetch(url, { ...init, method: allowedMethod, redirect: "manual" });
}

const result = {
  schema: "prometeo.stt-study-public-selftest-ci-evidence/v1",
  target,
  method: allowedMethod,
  started_at: startedAt,
  completed_at: null,
  http_status: null,
  body: null,
  body_sha256: null,
  body_bytes: null,
  target_requests_total: 0,
  mutating_target_requests: 0,
  request_guard: "ONLY_EXACT_ALLOWLISTED_URL_AND_GET",
  sensitive_payload_sent: false,
  sensitive_fields_sent: [],
  outcome: "BOUNDARY_PRE_HTTP",
  error: null
};

try {
  const response = await guardedTargetFetch(target, { method: allowedMethod });
  const body = await response.text();
  result.http_status = response.status;
  result.body = body;
  result.body_bytes = Buffer.byteLength(body, "utf8");
  result.body_sha256 = createHash("sha256").update(body, "utf8").digest("hex");
  result.outcome = "HTTP_OBSERVED";
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
} finally {
  result.target_requests_total = targetRequests;
  result.mutating_target_requests = mutatingTargetRequests;
  result.completed_at = new Date().toISOString();
  await mkdir("artifacts/stt-study-public-selftest", { recursive: true });
  await writeFile(
    "artifacts/stt-study-public-selftest/evidence.json",
    JSON.stringify(result, null, 2) + "\n",
    "utf8"
  );
  console.log(JSON.stringify({
    outcome: result.outcome,
    http_status: result.http_status,
    body_sha256: result.body_sha256,
    target_requests_total: result.target_requests_total,
    mutating_target_requests: result.mutating_target_requests,
    sensitive_payload_sent: result.sensitive_payload_sent,
    error: result.error
  }));
}
