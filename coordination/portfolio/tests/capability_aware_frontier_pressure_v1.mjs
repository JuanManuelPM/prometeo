#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const {
  buildFastAllocator,
  classifyFrontierCapabilityPressure
} = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);

const prod01Shape = [
  { required_capabilities:['representative_javascript_browser'] },
  { required_capabilities:['browser_network_navigation_to_github_pages','representative_javascript_browser'] },
  { required_capabilities:['cross_device_tv_phone_or_equivalent','representative_javascript_browser'] },
  { required_capabilities:['mobile_touch_input','representative_javascript_browser'] },
  { required_capabilities:['authorized_readonly_target_host_runtime'] }
];
const pressure = classifyFrontierCapabilityPressure(prod01Shape);
assert.equal(pressure.total, 5);
assert.equal(pressure.generic_compatible, 0, 'specialized PROD-01-shaped candidates must not inflate generic-compatible frontier');
assert.equal(pressure.specialized_total, 5);
assert.equal(pressure.buckets.browser, 4);
assert.equal(pressure.buckets.mobile, 1);
assert.equal(pressure.buckets.host, 2);

const mixed = classifyFrontierCapabilityPressure([
  { required_capabilities:[] },
  { required_capabilities:['repository_test_runtime'] },
  { required_capabilities:['authorized_worker_dispatch'] },
  { required_capabilities:['authorized_supabase_edge_deployment'] }
]);
assert.equal(mixed.generic_compatible, 2, 'empty/repository-only requirements remain generic-compatible');
assert.equal(mixed.buckets.dispatch, 1);
assert.equal(mixed.buckets.unknown, 1);
assert.deepEqual(mixed.unknown_capabilities, ['authorized_supabase_edge_deployment'], 'unrecognized capabilities must remain unknown, never treated as absent or generic');

const specializedCaps = [
  ['representative_javascript_browser'],
  ['browser_network_navigation_to_github_pages'],
  ['unrestricted_public_http_origin_fetch'],
  ['mobile_touch_input'],
  ['authorized_readonly_target_host_runtime'],
  ['cross_device_tv_phone_or_equivalent'],
  ['authorized_worker_dispatch'],
  ['authorized_supabase_edge_deployment']
];
const jobs = specializedCaps.map((required_capabilities, i) => ({
  job_id:`fixture-capability-pressure-${i+1}`,
  dedupe_key:`fixture:capability-pressure:${i+1}:v1`,
  project_id:'fixture-project',
  title:`Capability pressure fixture ${i+1}`,
  source_path:`coordination/portfolio/derived/fixture/fixture-capability-pressure-${i+1}.json`,
  priority:100-i,
  state:'ready',
  pin_generation:0,
  required_capabilities
}));

const feed = {
  generated_at:'2026-09-18T18:30:00Z',
  source_sha:'capability-aware-frontier-pressure-fixture',
  summary:{workers:{}},
  workers:[],
  plans:[],
  projects:[{project_id:'fixture-project', label:'Fixture Project', jobs}]
};
const roleContext = {
  metabolism:{
    signals:{
      recent_launch_window_minutes:10,
      frontier_floor_absolute:8,
      frontier_per_recent_launch:1.5,
      frontier_ceiling:40,
      unconsumed_returns_trigger:3,
      replaceable_trigger:3,
      partial_loop_trigger:2,
      collision_pressure_trigger:3,
      young_active_pin_guard_minimum:4,
      young_active_pin_guard_fraction_of_recent_launches:0.5,
      young_active_pin_guard_age_minutes:3,
      collision_pressure_window_minutes:30
    }
  },
  guideReceipts:[],
  guidePins:[],
  heartbeats:[],
  beacons:[],
  noAlloc:[],
  projectGuideMesh:null,
  projectGuideStates:[],
  portfolio:null
};

const allocator = buildFastAllocator(feed, {status:'HEALTHY',metrics:{},reasons:[]}, {recoveryPolicies:[],roleContext});
assert.equal(allocator.metabolism.clean_frontier, 8, 'total clean frontier remains backward-compatible');
assert.equal(allocator.metabolism.clean_frontier_total, 8);
assert.equal(allocator.metabolism.generic_compatible_clean_frontier, 0, 'specialized-only frontier must not satisfy generic worker pressure');
assert.equal(allocator.metabolism.capability_pressure.buckets.browser, 3);
assert.equal(allocator.metabolism.capability_pressure.buckets.mobile, 1);
assert.equal(allocator.metabolism.capability_pressure.buckets.host, 2);
assert.equal(allocator.metabolism.capability_pressure.buckets.dispatch, 1);
assert.equal(allocator.metabolism.capability_pressure.buckets.unknown, 1);

const planner = allocator.role_ready.find(row => row.role === 'GUIDE_PLANNER' && row.trigger === 'FRONTIER_THIN');
assert.ok(planner, 'FRONTIER_THIN must remain active when total frontier is full but generic-compatible frontier is thin');
assert.ok(
  planner.evidence.includes('gh-pages:live/allocator.json#metabolism.capability_pressure'),
  'Guide pressure evidence must cite the compiled capability-aware signal without adding worker preclaim reads'
);
assert.match(planner.title, /genérica \(0\/8; total 8\)/);

console.log('CAPABILITY_AWARE_FRONTIER_PRESSURE_PASS');
