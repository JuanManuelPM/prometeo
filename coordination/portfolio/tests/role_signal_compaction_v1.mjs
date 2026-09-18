#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const { buildFastAllocator } = await import(pathToFileURL(path.join(root, 'scripts/build-fast-allocator.mjs')).href);
const ago = minutes => new Date(Date.now() - minutes * 60_000).toISOString();

const jobs = [
  {
    job_id:'partial-a', dedupe_key:'partial:a', project_id:'p', source_path:'coordination/portfolio/derived/p/partial-a.json',
    title:'Partial A', priority:100, state:'partial', pin_generation:0,
    latest_return:{path:'coordination/portfolio/returns/partial-a/r1.json', outcome:'PARTIAL', returned_at:ago(2)},
    recent_return_evidence:[{path:'coordination/portfolio/returns/partial-a/r1.json', outcome:'PARTIAL', returned_at:ago(2)}],
    recent_collision_evidence:[{path:'coordination/portfolio/collisions/partial-a/c1.json', observed_at:ago(2)}]
  },
  {
    job_id:'boundary-b', dedupe_key:'boundary:b', project_id:'p', source_path:'coordination/portfolio/derived/p/boundary-b.json',
    title:'Boundary B', priority:99, state:'partial', pin_generation:0,
    derived_from_return:'coordination/portfolio/returns/partial-a/r1.json',
    latest_return:{path:'coordination/portfolio/returns/boundary-b/r1.json', outcome:'BOUNDARY', returned_at:ago(3)},
    recent_return_evidence:[{path:'coordination/portfolio/returns/boundary-b/r1.json', outcome:'BOUNDARY', returned_at:ago(3)}],
    recent_collision_evidence:[{path:'coordination/portfolio/collisions/boundary-b/c1.json', observed_at:ago(3)}]
  },
  {
    job_id:'partial-c', dedupe_key:'partial:c', project_id:'p', source_path:'coordination/portfolio/derived/p/partial-c.json',
    title:'Partial C', priority:98, state:'partial', pin_generation:0,
    latest_return:{path:'coordination/portfolio/returns/partial-c/r1.json', outcome:'PARTIAL', returned_at:ago(4)},
    recent_return_evidence:[{path:'coordination/portfolio/returns/partial-c/r1.json', outcome:'PARTIAL', returned_at:ago(4)}],
    recent_collision_evidence:[{path:'coordination/portfolio/collisions/partial-c/c1.json', observed_at:ago(4)}]
  },
  {
    job_id:'old-collision', dedupe_key:'old:collision', project_id:'p', source_path:'coordination/portfolio/derived/p/old-collision.json',
    title:'Old collision', priority:10, state:'ready', pin_generation:0,
    recent_return_evidence:[],
    recent_collision_evidence:[{path:'coordination/portfolio/collisions/old-collision/c-old.json', observed_at:ago(120)}]
  }
];

const feed = {
  generated_at:new Date().toISOString(),
  source_sha:'role-signal-compaction-fixture',
  workers:[],
  plans:[],
  projects:[{project_id:'p',label:'P',jobs}],
  summary:{workers:{}},
  diagnostics:{}
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
      collision_pressure_window_minutes:30,
      young_active_pin_guard_minimum:4,
      young_active_pin_guard_fraction_of_recent_launches:0.5,
      young_active_pin_guard_age_minutes:3
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

const unrelatedFeed = structuredClone(feed);
delete unrelatedFeed.projects[0].jobs.find(job => job.job_id === 'boundary-b').derived_from_return;
const unrelatedOut = buildFastAllocator(unrelatedFeed, {status:'HEALTHY',metrics:{},reasons:[]}, {recoveryPolicies:[],roleContext});
assert(!unrelatedOut.role_ready.some(row => row.role === 'GUIDE_CRITIC'), 'unrelated PARTIAL/BOUNDARY jobs must not synthesize a false PARTIAL_LOOP');
assert.equal(unrelatedOut.metabolism.partial_loop_detected, false);

const out = buildFastAllocator(feed, {status:'HEALTHY',metrics:{},reasons:[]}, {recoveryPolicies:[],roleContext});
const byRole = new Map(out.role_ready.map(row => [row.role,row]));

const integrator = byRole.get('GUIDE_INTEGRATOR');
assert(integrator, 'three compact recent returns must trigger GUIDE_INTEGRATOR');
for (const id of ['partial-a','boundary-b','partial-c']) {
  assert(integrator.evidence.some(ref => ref.includes(`returns/${id}/r1.json`)), `integrator lost compact return evidence for ${id}`);
}

const critic = byRole.get('GUIDE_CRITIC');
assert(critic, 'causal derived nonterminal lineage must trigger GUIDE_CRITIC');
assert(critic.evidence.some(ref => ref.includes('returns/partial-a/r1.json')));
assert(critic.evidence.some(ref => ref.includes('returns/boundary-b/r1.json')));
assert(!critic.evidence.some(ref => ref.includes('returns/partial-c/r1.json')), 'unrelated partial evidence must not contaminate the causal loop');
assert.equal(out.metabolism.partial_loop_detected, true);
assert.equal(out.metabolism.partial_loop_kind, 'DERIVED_NONTERMINAL_LINEAGE');

const recurrenceFeed = structuredClone(feed);
recurrenceFeed.projects[0].jobs = [{
  ...recurrenceFeed.projects[0].jobs.find(job => job.job_id === 'partial-a'),
  derived_from_return: undefined,
  recent_return_evidence:[
    {path:'coordination/portfolio/returns/partial-a/r0.json', outcome:'BOUNDARY', returned_at:ago(5)},
    {path:'coordination/portfolio/returns/partial-a/r1.json', outcome:'PARTIAL', returned_at:ago(2)}
  ]
}];
const recurrenceOut = buildFastAllocator(recurrenceFeed, {status:'HEALTHY',metrics:{},reasons:[]}, {recoveryPolicies:[],roleContext});
const recurrenceCritic = recurrenceOut.role_ready.find(row => row.role === 'GUIDE_CRITIC');
assert(recurrenceCritic, 'same-job nonterminal recurrence must trigger GUIDE_CRITIC');
assert.equal(recurrenceOut.metabolism.partial_loop_kind, 'SAME_JOB_RECURRENCE');

const rescate = byRole.get('GUIDE_RESCATE');
assert(rescate, 'three recent compact collisions must trigger GUIDE_RESCATE');
for (const id of ['partial-a','boundary-b','partial-c']) {
  assert(rescate.evidence.some(ref => ref.includes(`collisions/${id}/c1.json`)), `rescate lost compact collision evidence for ${id}`);
}
assert(!rescate.evidence.some(ref => ref.includes('c-old.json')), 'collision pressure must not be permanent historical pressure');

assert.equal(out.metabolism.unconsumed_returns, 3, 'metabolism must count compact unconsumed returns');

const liveBuilder = read('.github/scripts/build-live-feed.mjs');
assert(liveBuilder.includes('recent_return_evidence:returns.slice(-3)'), 'Live feed must preserve only bounded return evidence');
assert(liveBuilder.includes('recent_collision_evidence:collisions.slice(-3)'), 'Live feed must preserve only bounded collision evidence');
assert(liveBuilder.includes('p.jobs.map(({returns,pins,claims,collisions,...j})=>j)'), 'Live public projection must continue stripping full authority histories');

console.log('ROLE_SIGNAL_COMPACTION_PASS');
