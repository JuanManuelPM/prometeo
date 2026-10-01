import assert from 'node:assert/strict';
import {
  classifyFrontierCapabilityPressure,
  compileRoleFrontier,
} from '../scripts/build-fast-allocator.mjs';

const mixedFrontier = [
  { job_id:'generic-repo', required_capabilities:['repository_test_runtime'] },
  { job_id:'browser-only', required_capabilities:['representative_javascript_browser'] },
  { job_id:'mobile-only', required_capabilities:['mobile_touch_input'] },
  { job_id:'host-only', required_capabilities:['authorized_readonly_target_host_runtime'] },
  { job_id:'dispatch-only', required_capabilities:['authorized_worker_dispatch'] },
  { job_id:'unknown-only', required_capabilities:['mystery_accelerator_v9'] },
];

const pressure = classifyFrontierCapabilityPressure(mixedFrontier, {});
assert.equal(pressure.total_clean_frontier, 6);
assert.equal(pressure.generic_compatible_count, 1,
  'specialized-only and unknown-only candidates must not inflate generic-compatible frontier');
assert.equal(pressure.specialized_candidate_count, 4);
assert.equal(pressure.unknown_capability_candidate_count, 1);
assert.deepEqual(pressure.unknown_capabilities, ['mystery_accelerator_v9'],
  'unknown capabilities must remain explicitly unknown rather than becoming generic-compatible');
assert.deepEqual(pressure.buckets, {
  browser:1,
  mobile:1,
  host:1,
  dispatch:1,
  unknown:1,
});

const now = new Date().toISOString();
const jobs = mixedFrontier.map((job, index) => ({
  ...job,
  state:'ready',
  priority:100-index,
  source_path:`coordination/portfolio/derived/test/${job.job_id}.json`,
}));
const ready = jobs.map(job => ({
  job_id:job.job_id,
  required_capabilities:job.required_capabilities,
  source_path:job.source_path,
  priority:job.priority,
}));
const noAlloc = [1,2,3].map(index => ({
  path:`coordination/workers/no-allocation/test-${index}.json`,
  doc:{ worker_id:`test-${index}`, reason:'NO_COMPATIBLE_CANDIDATE', recorded_at:now },
}));

const compiled = compileRoleFrontier(
  { source_sha:'0123456789abcdef0123456789abcdef01234567', workers:[] },
  {},
  jobs,
  ready,
  [],
  [],
  {
    metabolism:{
      signals:{
        frontier_floor_absolute:8,
        frontier_per_recent_launch:1.5,
        frontier_ceiling:40,
        unconsumed_returns_trigger:3,
        replaceable_trigger:3,
      },
    },
    guideReceipts:[],
    guidePins:[],
    heartbeats:[],
    beacons:[],
    noAlloc,
    projectGuideMesh:null,
    projectGuideStates:null,
    portfolio:null,
    growthPolicy:{},
  },
);

assert.equal(compiled.metabolism.clean_frontier_total, 6);
assert.equal(compiled.metabolism.generic_compatible_clean_frontier, 1);
assert.deepEqual(compiled.metabolism.capability_pressure.unknown_capabilities, ['mystery_accelerator_v9']);

const planner = compiled.role_ready.find(row => row.role === 'GUIDE_PLANNER' && row.trigger === 'FRONTIER_THIN');
assert.ok(planner, 'generic-compatible shortage must be visible to Guide Planner');
assert.ok(planner.evidence.includes('gh-pages:live/allocator.json#metabolism.capability_pressure'),
  'Planner must cite the already-compiled capability pressure instead of requiring extra preclaim reads');

const rescate = compiled.role_ready.find(row => row.role === 'GUIDE_RESCATE' && row.trigger === 'LOW_YIELD');
assert.ok(rescate, 'independent no-allocation pressure must still permit Guide Rescate');
assert.ok(rescate.evidence.includes('gh-pages:live/allocator.json#metabolism.capability_pressure'),
  'Rescate must cite the already-compiled capability pressure when specialized work dominates');

console.log(JSON.stringify({
  ok:true,
  total_clean_frontier:compiled.metabolism.clean_frontier_total,
  generic_compatible_clean_frontier:compiled.metabolism.generic_compatible_clean_frontier,
  buckets:compiled.metabolism.capability_pressure.buckets,
  unknown_capabilities:compiled.metabolism.capability_pressure.unknown_capabilities,
  planner_evidence:planner.evidence,
  rescate_evidence:rescate.evidence,
}, null, 2));
