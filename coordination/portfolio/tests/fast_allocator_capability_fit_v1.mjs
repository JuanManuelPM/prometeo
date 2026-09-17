#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const { buildFastAllocator } = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);

const josePath = 'coordination/portfolio/derived/alumnos/portfolio-alumnos-jose-v11-unrestricted-browser-verify-v1.json';
const studentHttpPath = 'coordination/portfolio/derived/alumnos/portfolio-alumnos-student-world-live-route-bridge-public-http-verify-v1.json';
const jose = readJson(josePath);
const studentHttp = readJson(studentHttpPath);

assert.ok(Array.isArray(jose.required_capabilities) && jose.required_capabilities.length > 0, 'Jose unrestricted-browser fixture must remain capability-bound');
assert.deepEqual(
  studentHttp.required_capabilities,
  ['unrestricted_public_http_origin_fetch'],
  'Student World public-HTTP verifier must declare its specialized network capability'
);

const feed = {
  generated_at: '2026-09-17T22:30:00Z',
  source_sha: 'capability-fit-fixture-source',
  summary: { workers: {} },
  workers: [],
  plans: [],
  projects: [{
    project_id: 'alumnos',
    label: 'Alumnos / Student World',
    jobs: [
      { ...jose, state: 'ready', pin_generation: 0, last_signal_at: null },
      { ...studentHttp, state: 'replaceable', pin_generation: 1, last_signal_at: '2026-09-17T21:00:00Z' }
    ]
  }]
};

const allocator = buildFastAllocator(
  feed,
  { status: 'HEALTHY', metrics: {}, reasons: [] },
  { recoveryPolicies: [], roleContext: null }
);

const joseCandidate = allocator.ready.find(row => row.job_id === jose.job_id);
assert.ok(joseCandidate, 'Jose capability-bound ready job must remain claimable for compatible workers');
assert.deepEqual(joseCandidate.required_capabilities, [...jose.required_capabilities].sort());

const studentCandidate = allocator.recovery.find(row => row.job_id === studentHttp.job_id);
assert.ok(studentCandidate, 'Student World capability-bound recovery must remain visible for compatible workers');
assert.deepEqual(studentCandidate.required_capabilities, ['unrestricted_public_http_origin_fetch']);

const liveBuilder = read('.github/scripts/build-live-feed.mjs');
assert.ok(
  liveBuilder.includes("arr.push({...row.doc, origin:'derived', source_path:row.path});"),
  'derived-job loader must preserve durable fields such as required_capabilities'
);
assert.ok(
  liveBuilder.includes('return {\n    ...job,'),
  'portfolio inspection must preserve durable job fields into the live feed'
);

const wc = read('wc');
for (const needle of [
  'candidate.required_capabilities',
  'CAPABILITY_MISMATCH_PRECLAIM',
  'Unknown or ambiguous capability is NOT absence',
  'Never read repository/project context to prove capability fit.'
]) {
  assert.ok(wc.includes(needle), `wc missing capability-fit contract: ${needle}`);
}

const fast = read('coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md');
for (const needle of [
  'candidate.required_capabilities',
  'CAPABILITY_MISMATCH_PRECLAIM',
  'Unknown or ambiguous capability is NOT absence',
  'does not consume an authority CREATE attempt',
  'does not justify `NO_ALLOCATION` while another compatible candidate remains'
]) {
  assert.ok(fast.includes(needle), `fast allocation protocol missing capability-fit contract: ${needle}`);
}

console.log('FAST_ALLOCATOR_CAPABILITY_FIT_PASS');
