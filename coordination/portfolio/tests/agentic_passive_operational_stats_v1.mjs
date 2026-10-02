#!/usr/bin/env node
import assert from 'node:assert/strict';
import {compilePassiveOperationalStats, PASSIVE_STATS_AUTHORITY} from '../../../scripts/build-passive-operational-stats.mjs';

const campaign = {campaign_id:'PROMETEO-SPEC-AGENTIC-BOOTSTRAP-20261002', root_objective:'Agentic bootstrap objective', source_ref:'campaign.json'};
const base = [
  {type:'ELIGIBLE',job_id:'job-a',eligible_at:'2026-10-02T10:00:00Z',source_ref:'frontier.json'},
  {type:'PIN',job_id:'job-a',worker_id:'w1',launch_nonce:'n1',claimed_at:'2026-10-02T10:00:02Z',source_ref:'pin.json'},
  {type:'STARTED',job_id:'job-a',worker_id:'w1',launch_nonce:'n1',started_at:'2026-10-02T10:00:03Z',source_ref:'started.json'},
  {type:'LOCAL_REPAIR',job_id:'job-a',at:'2026-10-02T10:00:04Z',source_ref:'repair.json'},
  {type:'RETURN',job_id:'job-a',worker_id:'w1',launch_nonce:'n1',returned_at:'2026-10-02T10:00:08Z',boundary_class:'DONE',source_ref:'return.json'},
  {type:'VERIFIED',job_id:'job-a',verified_at:'2026-10-02T10:00:09Z',verified_outcome:'PASS',source_ref:'verify.json'},
  {type:'CLOSED',job_id:'job-a',closed_at:'2026-10-02T10:00:10Z',source_ref:'closed.json'}
];

const projection = compilePassiveOperationalStats({campaign,records:base});
assert.equal(projection.authority, PASSIVE_STATS_AUTHORITY);
assert.equal(projection.policy.runtime_active_is_liveness,false);
assert.equal(projection.units[0].facts.root_objective.status,'FACT');
assert.equal(projection.units[0].metrics.claim_latency_ms.value,2000);
assert.equal(projection.units[0].metrics.wall_latency_ms.value,7000);
assert.equal(projection.units[0].metrics.local_repairs.value,1);
assert.equal(projection.units[0].facts.verified_outcome.value,'PASS');

const missing = compilePassiveOperationalStats({campaign,records:[{type:'PIN',job_id:'missing',claimed_at:'2026-10-02T10:00:00Z',source_ref:'only-pin.json'}]});
assert.equal(missing.units[0].facts.started_at.status,'UNKNOWN');
assert.equal(missing.units[0].metrics.wall_latency_ms.status,'UNKNOWN');

const duplicate = compilePassiveOperationalStats({campaign,records:[base[0],base[0],base[1]]});
assert.equal(duplicate.units[0].evidence_count,2);
assert.deepEqual(duplicate.duplicate_evidence_ignored,['frontier.json']);

const stale = compilePassiveOperationalStats({campaign,records:[{type:'RUNTIME',job_id:'stale',runtime_status:'ACTIVE',source_ref:'runtime.json'}]});
assert.equal(stale.units[0].facts.runtime_labels_observed.value[0],'ACTIVE');
assert.equal(stale.units[0].facts.liveness.status,'UNKNOWN');
assert.equal(stale.policy.runtime_active_is_liveness,false);

const reincarnated = compilePassiveOperationalStats({campaign,records:[
  {type:'PIN',job_id:'reincarnated',worker_id:'worker-x',launch_nonce:'nonce-a',source_ref:'pin-a.json'},
  {type:'PIN',job_id:'reincarnated',worker_id:'worker-x',launch_nonce:'nonce-b',source_ref:'pin-b.json'}
]});
assert.equal(reincarnated.units[0].worker_incarnations.length,2);

const realRecent = compilePassiveOperationalStats({campaign,records:[
  {type:'ELIGIBLE',job_id:'portfolio-agentic-passive-operational-stats-v1',eligible_at:'2026-10-02T11:38:31.688Z',mission_id:'M4_PASSIVE_OPERATIONAL_STATS',source_ref:'gh-pages:live/claim-frontier.json'},
  {type:'PIN',job_id:'portfolio-agentic-passive-operational-stats-v1',worker_id:'wc-20261002T113840Z-80564ced205d',launch_nonce:'56bb4e6c0f146ab7',claimed_at:'2026-10-02T11:39:27Z',source_ref:'coordination/portfolio/pins/portfolio-agentic-passive-operational-stats-v1/G000002.json'}
]});
assert.equal(realRecent.units[0].metrics.claim_latency_ms.value,55312);
assert.equal(realRecent.units[0].facts.returned_at.status,'UNKNOWN');
assert.equal(realRecent.units[0].facts.root_objective.value,'Agentic bootstrap objective');

console.log('AGENTIC_PASSIVE_OPERATIONAL_STATS_PASS');
console.log(JSON.stringify({cases:['missing-evidence','duplicate-events','stale-active-label','worker-reincarnation','recent-campaign-sample'],authority:projection.authority}));
