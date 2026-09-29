#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const gate=JSON.parse(fs.readFileSync(path.join(root,'coordination/goal-progress/G05_REAL_PRIVATE_E2E_EVIDENCE_CONTRACT_V1.json'),'utf8'));
const builder=fs.readFileSync(path.join(root,'scripts/build-goal-progress.mjs'),'utf8');

assert.equal(gate.gate_id,'G05_REAL_PRIVATE_E2E');
assert.equal(gate.status,'OBSERVABILITY_ONLY');
assert(Array.isArray(gate.required_evidence) && gate.required_evidence.length >= 10);
for (const key of [
  'capture_sync','atomic_claim','worker_pool_execution_packet','private_packet_post_claim',
  'prewrite_cas','sanitized_return','github_return_ingestion','independent_verifier',
  'same_lineage','public_frontier_privacy'
]) {
  assert(gate.required_evidence.includes(key), 'G05 evidence contract missing '+key);
}
assert.match(gate.provider_law,/No provider is mandatory/);
assert(builder.includes("G05_REAL_PRIVATE_E2E_EVIDENCE_CONTRACT_V1.json"));
assert(builder.includes('missingRealE2E.length === 0'));
assert(builder.includes('requiredRealE2E.length > 0'));
assert(builder.includes('Evidencia faltante:'));
console.log('G05_STRICT_SAME_LINEAGE_EVIDENCE_CONTRACT_PASS');
