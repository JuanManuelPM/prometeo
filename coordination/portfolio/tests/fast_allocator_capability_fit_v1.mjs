#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const readJson = rel => JSON.parse(read(rel));
const { buildFastAllocator, classifyJobCapabilities, classifyProjectGuideFrontier, classifyFrontierCapabilityPressure } = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);

const josePath = 'coordination/portfolio/derived/alumnos/portfolio-alumnos-jose-v11-unrestricted-browser-verify-v1.json';
const studentHttpPath = 'coordination/portfolio/derived/alumnos/portfolio-alumnos-student-world-live-route-bridge-public-http-verify-v1.json';
const ttsBrowserPath = 'coordination/portfolio/derived/audio-text-to-speech/portfolio-tts-generic-text-surface-browser-smoke-v1.json';
const ttsVerifyPath = 'coordination/portfolio/derived/audio-text-to-speech/portfolio-tts-generic-text-surface-verify-v1.json';
const ttsCachePath = 'coordination/portfolio/derived/audio-text-to-speech/portfolio-tts-existing-cache-get-verify-v1.json';
const sttLivePath = 'coordination/portfolio/derived/audio-speech-to-text/portfolio-stt-live-canary-entrypoint-v1.json';
const studentLegacyBrowserPath = 'coordination/portfolio/derived/alumnos/portfolio-alumnos-student-world-live-route-bridge-browser-verify.json';
const liveMobilePath = 'coordination/portfolio/derived/prometeo-live/portfolio-live-mobile-human-registry-v3-verify.json';
const joseV12LegacyPath = 'coordination/portfolio/derived/jose/portfolio-jose-v12-map-runtime-verification-v1.json';
const jose = readJson(josePath);
const studentHttp = readJson(studentHttpPath);
const ttsBrowser = readJson(ttsBrowserPath);
const ttsVerify = readJson(ttsVerifyPath);
const ttsCache = readJson(ttsCachePath);
const sttLive = readJson(sttLivePath);
const studentLegacyBrowser = readJson(studentLegacyBrowserPath);
const liveMobile = readJson(liveMobilePath);
const joseV12Legacy = readJson(joseV12LegacyPath);

const legacySingularRows = [];
const derivedRoot = path.join(root, 'coordination', 'portfolio', 'derived');
const visitDerived = dir => {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) visitDerived(full);
    else if (ent.name.endsWith('.json')) {
      const doc = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (Object.hasOwn(doc, 'capability_required')) {
        legacySingularRows.push({
          path: path.relative(root, full).split(path.sep).join('/'),
          doc,
          model: classifyJobCapabilities(doc)
        });
      }
    }
  }
};
visitDerived(derivedRoot);
assert.equal(legacySingularRows.length, 1, 'repo-local singular capability_required inventory changed; classify new values explicitly');
assert.equal(legacySingularRows[0].doc.job_id, 'portfolio-jose-v12-map-runtime-verification-v1');
assert.deepEqual(legacySingularRows[0].doc.capability_required, ['real_browser_execution']);
assert.deepEqual(legacySingularRows[0].model.required_capabilities, ['representative_javascript_browser']);
assert.deepEqual(legacySingularRows[0].model.unsupported_legacy_capabilities, []);

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

const capabilityBoundFrontierState = {
  status: 'ACTIVE_CANDIDATE_WORK',
  frontier_refs: [
    'coordination/portfolio/derived/facultad-parciales/fixture-edge.json',
    'coordination/portfolio/derived/facultad-parciales/fixture-schedule-browser.json',
    'coordination/portfolio/derived/facultad-parciales/fixture-notes-browser.json'
  ]
};
const capabilityBoundFrontierJobs = [
  {
    job_id: 'fixture-edge',
    source_path: 'coordination/portfolio/derived/facultad-parciales/fixture-edge.json',
    state: 'partial',
    required_capabilities: ['authorized_supabase_edge_deployment', 'repository_test_runtime']
  },
  {
    job_id: 'fixture-schedule-browser',
    source_path: 'coordination/portfolio/derived/facultad-parciales/fixture-schedule-browser.json',
    state: 'ready',
    required_capabilities: ['representative_javascript_browser']
  },
  {
    job_id: 'fixture-notes-browser',
    source_path: 'coordination/portfolio/derived/facultad-parciales/fixture-notes-browser.json',
    state: 'ready',
    required_capabilities: ['representative_javascript_browser']
  }
];
const capabilityBoundFrontier = classifyProjectGuideFrontier(
  capabilityBoundFrontierState,
  capabilityBoundFrontierJobs,
  { project_frontier_baseline_capabilities: ['repository_test_runtime'] }
);
assert.equal(capabilityBoundFrontier.counts.capability_requirement, 3, 'all three specialized residuals must remain explicitly capability-bound');
assert.equal(capabilityBoundFrontier.effective_count, 0, 'generic executable count must continue excluding specialized residuals');
assert.equal(capabilityBoundFrontier.planner_count, 3, 'planner frontier count must include grounded specialized residuals without marking them executable');
assert.deepEqual(
  capabilityBoundFrontier.capability_requirement_refs,
  capabilityBoundFrontierState.frontier_refs,
  'specialized residual refs must remain visible rather than being hidden or marked done'
);
assert.ok(
  read('scripts/build-fast-allocator.mjs').includes('const localReady = frontierClassification.planner_count;'),
  'PROJECT_FRONTIER_THIN must use the grounded planner count, not generic-worker compatibility'
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
    },
    {
      project_id: 'jose',
      label: 'José',
      jobs: [
        { ...joseV12Legacy, state: 'ready', pin_generation: 0, last_signal_at: null }
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

const joseV12Candidate = allocator.ready.find(row => row.job_id === joseV12Legacy.job_id);
assert.ok(joseV12Candidate, 'Jose V12 singular legacy capability job must remain claimable for a compatible browser worker');
assert.deepEqual(
  joseV12Candidate.required_capabilities,
  ['representative_javascript_browser'],
  'real_browser_execution must normalize to representative_javascript_browser'
);
let authorityCreateAttempts = 0;
const definitelyAbsentCapabilities = new Set(['representative_javascript_browser']);
const preclaimMismatch = joseV12Candidate.required_capabilities.some(cap => definitelyAbsentCapabilities.has(cap));
if (!preclaimMismatch) authorityCreateAttempts += 1;
assert.equal(preclaimMismatch, true, 'worker lacking representative browser must detect legacy-normalized mismatch preclaim');
assert.equal(authorityCreateAttempts, 0, 'legacy-normalized capability mismatch must consume zero authority CREATE attempts');

const recoveryFeed = {
  generated_at: '2026-09-17T22:31:00Z',
  source_sha: 'legacy-singular-recovery-fixture-source',
  summary: {workers:{}},
  workers: [],
  plans: [],
  projects: [{
    project_id: 'jose',
    label: 'José',
    jobs: [{...joseV12Legacy, state:'replaceable', pin_generation:3, last_signal_at:'2026-09-17T21:00:00Z'}]
  }]
};
const recoveryAllocator = buildFastAllocator(recoveryFeed, {status:'HEALTHY', metrics:{}, reasons:[]}, {recoveryPolicies:[], roleContext:null});
const joseV12Recovery = recoveryAllocator.recovery.find(row => row.job_id === joseV12Legacy.job_id);
assert.ok(joseV12Recovery, 'Jose V12 singular legacy capability must remain present through recovery generations');
assert.deepEqual(joseV12Recovery.required_capabilities, ['representative_javascript_browser']);

const unsupportedLegacyJob = {
  job_id:'fixture-unsupported-legacy-capability-required',
  dedupe_key:'fixture:unsupported-legacy-capability-required:v1',
  project_id:'jose',
  title:'Unsupported legacy capability fixture',
  priority:999,
  state:'ready',
  pin_generation:0,
  capability_required:['unknown_legacy_runtime']
};
const unsupportedFeed = {
  generated_at:'2026-09-17T22:32:00Z',
  source_sha:'unsupported-legacy-capability-fixture-source',
  summary:{workers:{}},
  workers:[],
  plans:[],
  projects:[{project_id:'jose',label:'José',jobs:[unsupportedLegacyJob]}]
};
const unsupportedAllocator = buildFastAllocator(unsupportedFeed, {status:'HEALTHY',metrics:{},reasons:[]}, {recoveryPolicies:[],roleContext:null});
assert.equal(unsupportedAllocator.ready.some(row => row.job_id === unsupportedLegacyJob.job_id), false, 'unsupported singular legacy capability must fail closed out of ready');
assert.equal(unsupportedAllocator.recovery.some(row => row.job_id === unsupportedLegacyJob.job_id), false, 'unsupported singular legacy capability must fail closed out of recovery');
const unsupportedAttention = unsupportedAllocator.capability_attention.find(row => row.job_id === unsupportedLegacyJob.job_id);
assert.ok(unsupportedAttention, 'unsupported singular legacy capability must remain visible as explicit attention');
assert.equal(unsupportedAttention.reason, 'UNSUPPORTED_LEGACY_CAPABILITY_REQUIRED');
assert.deepEqual(unsupportedAttention.unsupported_legacy_capabilities, ['unknown_legacy_runtime']);

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

const capabilityPressurePolicy = readJson('coordination/guide/METABOLISM_POLICY_V1.json');
const prod01CapabilityShape = [
  { required_capabilities: [] },
  { required_capabilities: ['repository_test_runtime'] },
  { required_capabilities: ['representative_javascript_browser'] },
  { required_capabilities: ['browser_network_navigation_to_github_pages', 'representative_javascript_browser'] },
  { required_capabilities: ['unrestricted_public_http_origin_fetch'] },
  { required_capabilities: ['mobile_touch_input'] },
  { required_capabilities: ['authorized_readonly_target_host_runtime'] },
  { required_capabilities: ['cross_device_tv_phone_or_equivalent'] },
  { required_capabilities: ['unknown_future_runtime'] }
];
const capabilityPressure = classifyFrontierCapabilityPressure(prod01CapabilityShape, capabilityPressurePolicy);
assert.equal(capabilityPressure.total_clean_frontier, 9, 'PROD-01 capability-pressure shape must retain every candidate');
assert.equal(capabilityPressure.generic_compatible_count, 2, 'specialized candidates must not inflate generic-compatible frontier pressure');
assert.equal(capabilityPressure.specialized_candidate_count, 6, 'known specialized candidates must remain explicit capability demand');
assert.equal(capabilityPressure.unknown_capability_candidate_count, 1, 'unknown capability must remain unknown rather than generic or absent');
assert.equal(capabilityPressure.specialized_buckets.find(row => row.bucket === 'browser_js')?.count, 2, 'browser capability bucket must group browser-bound candidates');
assert.deepEqual(capabilityPressure.unknown_capabilities, ['unknown_future_runtime']);
const allocatorSource = read('scripts/build-fast-allocator.mjs');
for (const needle of ['generic_compatible_frontier', 'capability_pressure: capabilityPressure', 'pressureEvidenceRef']) {
  assert.ok(allocatorSource.includes(needle), `allocator missing capability-pressure projection: ${needle}`);
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


const starvationNow = new Date().toISOString();
const starvationSignals = {
  recent_launch_window_minutes: 10,
  heartbeat_target_minutes: 3,
  stale_suspect_minutes: 6,
  recovery_eligible_minutes: 10,
  frontier_floor_absolute: 8,
  frontier_per_recent_launch: 1.5,
  frontier_ceiling: 40,
  unconsumed_returns_trigger: 3,
  replaceable_trigger: 3,
  partial_loop_trigger: 2,
  collision_pressure_trigger: 3,
  young_active_pin_guard_minimum: 4,
  young_active_pin_guard_fraction_of_recent_launches: 0.5,
  young_active_pin_guard_age_minutes: 3,
  collision_pressure_window_minutes: 30
};
const starvationRoleContext = {
  metabolism: { signals: starvationSignals },
  guideReceipts: [],
  guidePins: [],
  heartbeats: [],
  beacons: Array.from({length:8}, (_,i) => ({
    path:`coordination/workers/beacons/fixture-overload-${i}.json`,
    doc:{worker_id:`fixture-overload-${i}`, launched_at:starvationNow}
  })),
  noAlloc: [],
  projectGuideMesh: null,
  projectGuideStates: [],
  portfolio: null
};
const starvationWorkers = Array.from({length:4}, (_,i) => ({
  worker_id:`fixture-young-${i}`,
  job_id:`fixture-owned-${i}`,
  pin_at:starvationNow,
  last_signal_at:starvationNow
}));
const specializedOnlyJob = {
  job_id:'fixture-specialized-only-frontier',
  dedupe_key:'fixture:specialized-only-frontier:v1',
  project_id:'fixture',
  source_path:'coordination/portfolio/derived/fixture/fixture-specialized-only-frontier.json',
  title:'Specialized-only frontier fixture',
  priority:90,
  state:'ready',
  pin_generation:0,
  required_capabilities:['representative_javascript_browser']
};
const starvationFeed = {
  generated_at:starvationNow,
  source_sha:'generic-starvation-override-fixture',
  summary:{workers:{}},
  workers:starvationWorkers,
  plans:[],
  projects:[{project_id:'fixture',label:'Fixture',jobs:[specializedOnlyJob]}]
};
const starvationAllocator = buildFastAllocator(
  starvationFeed,
  {status:'HEALTHY',metrics:{},reasons:[]},
  {recoveryPolicies:[],roleContext:starvationRoleContext}
);
assert.equal(starvationAllocator.metabolism.overload_guard, true, 'fixture must activate overload guard');
assert.equal(starvationAllocator.metabolism.generic_compatible_clean_frontier, 0, 'fixture must expose zero generic-compatible clean work');
assert.equal(starvationAllocator.metabolism.capability_pressure.specialized_total, 1, 'fixture must be specialized-only');
assert.equal(starvationAllocator.metabolism.generic_starvation_override, true, 'specialized-only overload must activate the bounded starvation override');
assert.ok(
  starvationAllocator.role_ready.some(row => row.role === 'GUIDE_PLANNER' && row.trigger === 'FRONTIER_THIN'),
  'zero generic-compatible work must keep one evidence-backed FRONTIER_THIN planner claimable even while overload guard is active'
);

const genericAvailableFeed = {
  ...starvationFeed,
  source_sha:'generic-starvation-guard-preservation-fixture',
  projects:[{
    project_id:'fixture',
    label:'Fixture',
    jobs:[
      specializedOnlyJob,
      {
        job_id:'fixture-generic-ready',
        dedupe_key:'fixture:generic-ready:v1',
        project_id:'fixture',
        source_path:'coordination/portfolio/derived/fixture/fixture-generic-ready.json',
        title:'Generic ready fixture',
        priority:80,
        state:'ready',
        pin_generation:0,
        required_capabilities:[]
      }
    ]
  }]
};
const guardedAllocator = buildFastAllocator(
  genericAvailableFeed,
  {status:'HEALTHY',metrics:{},reasons:[]},
  {recoveryPolicies:[],roleContext:starvationRoleContext}
);
assert.equal(guardedAllocator.metabolism.overload_guard, true);
assert.equal(guardedAllocator.metabolism.generic_compatible_clean_frontier, 1);
assert.equal(guardedAllocator.metabolism.generic_starvation_override, false, 'existing generic work must preserve the overload guard');
assert.equal(
  guardedAllocator.role_ready.some(row => row.role === 'GUIDE_PLANNER' && row.trigger === 'FRONTIER_THIN'),
  false,
  'overload guard must still suppress global frontier replenishment when generic-compatible work already exists'
);
console.log('GENERIC_STARVATION_OVERRIDE_PASS');

console.log('FAST_ALLOCATOR_CAPABILITY_FIT_PASS');
