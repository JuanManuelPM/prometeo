import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const closer = fs.readFileSync(path.join(repo, 'scripts/return-fanin-judge-closer-lib.mjs'), 'utf8');
const materializer = fs.readFileSync(path.join(repo, 'scripts/materialize-return-fanin-judge-closer.mjs'), 'utf8');
const continuation = fs.readFileSync(path.join(repo, 'scripts/multi-stage-worker-continuation.mjs'), 'utf8');
const audit = JSON.parse(fs.readFileSync(path.join(here, 'fanin-consumer-reentry-audit-v1.json'), 'utf8'));

assert.equal(audit.status, 'AUDIT_COMPLETE');
assert.equal(audit.verdict, 'REENTRY_GAP_CONFIRMED');
assert.equal(audit.findings.length, 3);
assert.match(closer, /continuity_request:\s*needed/);
assert.match(closer, /CONTINUITY_REQUEST_ONLY_NO_SCHEDULING_OR_PROMOTION_AUTHORITY/);
assert.match(materializer, /fanin:\s*writeStable/);
assert.match(materializer, /projection:\s*writeStable/);
assert.doesNotMatch(materializer, /attemptAtomicSuccessorClaim|evaluateSuccessorClaim|opportunity_id/);
assert.match(continuation, /export function evaluateSuccessorClaim/);
assert.match(continuation, /export async function attemptAtomicSuccessorClaim/);
assert.match(continuation, /opportunity_id/);
assert.doesNotMatch(continuation, /continuity_request/);

console.log('fanin-consumer-reentry-audit: PASS (reentry gap confirmed)');
