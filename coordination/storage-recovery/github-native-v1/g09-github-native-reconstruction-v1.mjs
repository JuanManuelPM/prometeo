#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportClosurePack } from './export-closure-pack.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const exists = rel => fs.existsSync(path.join(root, rel));

const contract = read('coordination/storage-recovery/github-native-v1/CLOSURE_PACK_CONTRACT.json');
const retention = read('coordination/storage-recovery/github-native-v1/RETENTION_ELIGIBILITY.json');
const zeroWrite = read('coordination/storage-recovery/github-native-v1/ZERO_WRITE_AUDIT.json');
const pageClose = read('coordination/canaries/page-change-pipeline-v1/software-closeout-20260928T232800Z.json');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/live-feed.yml'), 'utf8');

for (const rel of [
  'coordination/portfolio/PORTFOLIO.json',
  'scripts/build-fast-allocator.mjs',
  '.github/scripts/build-live-feed.mjs',
  '.github/scripts/normalize-live-feed.mjs',
  'coordination/integration-runs/PROMETEO-MP10-01/CURRENT_HANDOFF.json',
  'coordination/storage-recovery/github-native-v1/CLOSURE_PACK_CONTRACT.json',
  'coordination/storage-recovery/github-native-v1/RETENTION_ELIGIBILITY.json'
]) {
  assert(exists(rel), `durable reconstruction dependency missing: ${rel}`);
}

assert.equal(contract.export_mode, 'ALLOWLIST_FAIL_CLOSED');
assert.equal(contract.destructive_retention_action, 'FORBIDDEN_IN_THIS_RUN');
assert.equal(retention.destructive_action_performed, false);
assert.equal(retention.future_deletion_gate?.status, 'BLOCKED_PENDING_MEASUREMENT_AND_EXPLICIT_AUTHORITY');
assert(zeroWrite.targets?.length >= 4, 'zero-write audit must keep concrete read targets');

const safe = {
  schema: 'prometeo.public-closure-pack/v1',
  closure_id: 'G09:RECONSTRUCTION:CANARY',
  project_id: 'prometeo-autonomous-growth',
  objective_id: 'G09_RECOVERY_STORAGE_PRIVACY',
  status: 'CLOSED',
  completion_class: 'SUCCESS',
  closed_at: '2026-09-29T11:20:00Z',
  source_refs: ['coordination/portfolio/PORTFOLIO.json'],
  result_refs: ['coordination/integration-runs/PROMETEO-MP10-01/CURRENT_HANDOFF.json'],
  verification_refs: ['coordination/storage-recovery/github-native-v1/CLOSURE_PACK_CONTRACT.json'],
  changed_refs: [],
  boundary_codes: [],
  next_refs: [],
  retention_class: 'PUBLIC_COMPACTED_EVIDENCE'
};
assert.equal(exportClosurePack(safe).completion_class, 'SUCCESS');
assert.throws(
  () => exportClosurePack({...safe, authorization:'Bearer synthetic'}),
  /SENSITIVE_KEY/
);
assert.throws(
  () => exportClosurePack({...safe, project_id:'alice@example.com'}),
  /FORBIDDEN_VALUE_CLASS/
);

assert.equal(pageClose.status, 'SOFTWARE_CLOSEOUT_COMPLETE_EXTERNAL_STORAGE_BLOCK');
assert.equal(pageClose.checks?.worker_frontier_degraded_mode?.result, 'PASS');
assert.equal(pageClose.software_without_database?.status, 'CLOSED');
assert.equal(pageClose.current_external_block?.class, 'POSTGRES_DISK_EXHAUSTION');
assert(
  workflow.includes('node source/scripts/build-fast-allocator.mjs /tmp/feed.json /tmp/efficiency.json /tmp/allocator.json source'),
  'binding live-feed workflow must rebuild allocator from durable GitHub source'
);
assert(
  workflow.includes('node source/.github/scripts/build-live-feed.mjs source /tmp/feed.json'),
  'binding live-feed workflow must rebuild worker feed from durable GitHub source'
);

process.stdout.write('G09_GITHUB_NATIVE_RECONSTRUCTION_PASS\n');
