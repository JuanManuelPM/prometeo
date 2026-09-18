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
const ttsBrowserPath = 'coordination/portfolio/derived/audio-text-to-speech/portfolio-tts-generic-text-surface-browser-smoke-v1.json';
const ttsVerifyPath = 'coordination/portfolio/derived/audio-text-to-speech/portfolio-tts-generic-text-surface-verify-v1.json';
const ttsCachePath = 'coordination/portfolio/derived/audio-text-to-speech/portfolio-tts-existing-cache-get-verify-v1.json';
const sttLivePath = 'coordination/portfolio/derived/audio-speech-to-text/portfolio-stt-live-canary-entrypoint-v1.json';
const studentLegacyBrowserPath = 'coordination/portfolio/derived/alumnos/portfolio-alumnos-student-world-live-route-bridge-browser-verify.json';
const liveMobilePath = 'coordination/portfolio/derived/prometeo-live/portfolio-live-mobile-human-registry-v3-verify.json';
const jose = readJson(josePath);
const studentHttp = readJson(studentHttpPath);
const ttsBrowser = readJson(ttsBrowserPath);
const ttsVerify = readJson(ttsVerifyPath);
const ttsCache = readJson(ttsCachePath);
const sttLive = readJson(sttLivePath);
const studentLegacyBrowser = readJson(studentLegacyBrowserPath);
const liveMobile = readJson(liveMobilePath);

assert.ok(Array.isArray(jose.required_capabilities) && jose.required_capabilities.length > 0, 'Jose unrestricted-browser fixture must remain capability-bound');
assert.deepEqual(
  studentHttp.required_capabilities,
  ['unrestricted_public_http_origin_fetch'],
  'Student World public-HTTP verifier must declare its specialized network capability'
);
assert.deepEqual(
  ttsBrowser.required_capabilities,
  ['browser_network_navigation_to_github_pages', 'representative_javascript_browser'],
  'TTS browser smoke must route only to representative networked browser workers'
);
assert.deepEqual(
  ttsVerify.required_capabilities,
  ['unrestricted_public_http_origin_fetch'],
  'TTS served/health verifier must require direct public HTTP/DNS'
);
assert.deepEqual(
  ttsCache.required_capabilities,
  ['unrestricted_public_http_origin_fetch'],
  'TTS cache GET verifier must require direct public HTTP/DNS'
);
assert.deepEqual(
  sttLive.required_capabilities,
  ['browser_network_navigation_to_github_pages', 'representative_javascript_browser', 'unrestricted_public_http_origin_fetch'],
  'STT live canary must require browser microphone route plus direct selftest network access'
);
assert.deepEqual(
  studentLegacyBrowser.required_capabilities,
  ['browser_network_navigation_to_github_pages', 'representative_javascript_browser', 'unrestricted_public_http_origin_fetch'],
  'Student World interactive browser verifier must be capability-bound before recovery'
);
assert.deepEqual(
  liveMobile.required_capabilities,
  ['browser_network_navigation_to_github_pages', 'representative_javascript_browser'],
  'Live mobile verifier must be capability-bound before recovery'
);

const feed = {
  generated_at: '2026-09-17T22:30:00Z',
  source_sha: 'capability-fit-fixture-source',
  summary: { workers: {} },
  workers: [],
  plans: [],
  projects: [
    {
      project_id: 'alumnos',
      label: 'Alumnos / Student World',
      jobs: [
        { ...jose, state: 'ready', pin_generation: 0, last_signal_at: null },
        { ...studentHttp, state: 'replaceable', pin_generation: 1, last_signal_at: '2026-09-17T21:00:00Z' },
        {
          job_id: 'fixture-legacy-capability-alias',
          dedupe_key: 'fixture:legacy-capability-alias:v1',
          project_id: 'alumnos',
          title: 'Legacy capability alias fixture',
          priority: 1,
          capability_requirements: ['representative_javascript_browser'],
          state: 'replaceable',
          pin_generation: 1,
          last_signal_at: '2026-09-17T21:00:00Z'
        }
      ]
    },
    {
      project_id: 'audio-text-to-speech',
      label: 'Audio / Text to Speech',
      jobs: [
        { ...ttsBrowser, state: 'ready', pin_generation: 0, last_signal_at: null },
        { ...ttsVerify, state: 'ready', pin_generation: 0, last_signal_at: null },
        { ...ttsCache, state: 'ready', pin_generation: 0, last_signal_at: null }
      ]
    },
    {
      project_id: 'audio-speech-to-text',
      label: 'Audio / Speech to Text',
      jobs: [
        { ...sttLive, state: 'ready', pin_generation: 0, last_signal_at: null }
      ]
    }
  ]
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

const legacyAliasCandidate = allocator.recovery.find(row => row.job_id === 'fixture-legacy-capability-alias');
assert.ok(legacyAliasCandidate, 'legacy capability_requirements recovery fixture must remain claimable for compatible workers');
assert.deepEqual(
  legacyAliasCandidate.required_capabilities,
  ['representative_javascript_browser'],
  'legacy capability_requirements must normalize into required_capabilities before claim'
);

for (const [job, expected] of [
  [ttsBrowser, ['browser_network_navigation_to_github_pages', 'representative_javascript_browser']],
  [ttsVerify, ['unrestricted_public_http_origin_fetch']],
  [ttsCache, ['unrestricted_public_http_origin_fetch']],
  [sttLive, ['browser_network_navigation_to_github_pages', 'representative_javascript_browser', 'unrestricted_public_http_origin_fetch']]
]) {
  const candidate = allocator.ready.find(row => row.job_id === job.job_id);
  assert.ok(candidate, `${job.job_id} must remain visible to compatible workers`);
  assert.deepEqual(candidate.required_capabilities, expected, `${job.job_id} capability metadata must survive allocator compilation`);
}

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
