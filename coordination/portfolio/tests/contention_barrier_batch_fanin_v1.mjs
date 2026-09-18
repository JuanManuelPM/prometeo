#!/usr/bin/env node
import assert from 'node:assert/strict';
import { applyContentionBarrierRouting, selectReleaseCohort } from '../../../scripts/apply-fast-allocator-contention-barriers.mjs';
import { buildClaimFrontier } from '../../../scripts/build-claim-frontier.mjs';

const baseCandidate = (jobId='fanin-fixture') => ({
  lane:'ready',
  job_id:jobId,
  dedupe_key:`dedupe:${jobId}`,
  project_id:'test',
  priority:200,
  state:'ready',
  claim_mode:'PORTFOLIO_PIN_CREATE',
  claim_path:`coordination/portfolio/pins/${jobId}/G000001.json`,
  claim_payload_shape:{
    schema:'prometeo.portfolio-pin/v1',
    pin_id:`pin-${jobId}-G000001-<worker_id>`,
    job_id:jobId,
    dedupe_key:`dedupe:${jobId}`,
    project_id:'test',
    generation:1,
    worker_id:'<worker_id>',
    claim_id:`claim-${jobId}-G000001-<worker_id>`,
    claimed_at:'<now_iso>',
    expires_at:'<now_plus_10m_iso>',
    source_head:'fixture-source',
    predecessor_pin_ref_or_null:null,
    predecessor_claim_ref_or_null:null,
    recovery_basis_or_null:null
  },
  post_claim_validate:true
});

const workers = Array.from({length:10},(_,i)=>`wave-worker-${String(i+1).padStart(2,'0')}`);
const cohort = selectReleaseCohort(workers.slice().reverse(),5);
assert.deepEqual(cohort, workers.slice(0,5), 'cohort must be deterministic lexicographic first N');
assert.equal(new Set(cohort).size,5);

const barrier = (release=null, entrantWorkerIds=[]) => ({
  fixture_id:'fanin-5-of-10',
  job_id:'fanin-fixture',
  barrier:{
    schema:'prometeo.portfolio-contention-barrier/v1',
    contention_barrier_mode:true,
    fixture_id:'fanin-5-of-10',
    job_id:'fanin-fixture',
    required_contenders:5,
    opened_at:'2026-09-18T01:00:00Z',
    deadline_at:'2026-09-18T01:05:00Z'
  },
  release,
  entrant_worker_ids:entrantWorkerIds,
  timeout_worker_ids:[],
  barrier_ref:'coordination/portfolio/contention_barriers/fanin-5-of-10/BARRIER.json',
  release_ref:'coordination/portfolio/contention_barriers/fanin-5-of-10/RELEASE.json'
});

const ordinary = Array.from({length:9},(_,i)=>baseCandidate(`ordinary-${i+1}`));
const fixture = baseCandidate();
const allocator = {
  schema:'prometeo.fast-allocator/v3',
  generated_at:'2026-09-18T01:00:30Z',
  source_sha:'fixture-source',
  batch_strategy:'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD',
  preferred_order:['ready','queue_ready','role_ready','recovery'],
  counts:{ready:10,recovery:0},
  ready:[fixture,...ordinary],
  queue_ready:[],
  role_ready:[],
  recovery:[],
  batch_candidates:[fixture,...ordinary]
};

const armed = applyContentionBarrierRouting(allocator,[barrier(null,[])],'2026-09-18T01:00:30Z');
assert.equal(armed.ready[0].claim_mode,'PORTFOLIO_BARRIER_ENTER');
assert.equal(armed.batch_candidates[0].claim_mode,'PORTFOLIO_BARRIER_ENTER','batch candidate must not leak the original direct PIN');
assert.equal(armed.batch_contention_fanin.state,'ARMING');
assert.equal(armed.batch_contention_fanin.required_contenders,5);
assert.equal(armed.batch_contention_fanin.next_action,'ENTER_NO_AUTHORITY_BARRIER_BEFORE_SHARDING');
assert.equal(armed.batch_contention_fanin.grants_execution_authority,false);
assert.equal(armed.batch_contention_fanin.post_release_claim.claim_path,'coordination/portfolio/pins/fanin-fixture/G000001.json');

const frontier = buildClaimFrontier(armed,24);
assert(frontier.batch_contention_fanin,'compact frontier must publish batch-wide fan-in before shard selection');
assert.equal(frontier.batch_contention_fanin.fixture_id,'fanin-5-of-10');
const fixtureRows = frontier.candidates.filter(row=>row.job_id==='fanin-fixture');
assert.equal(fixtureRows.length,1,'fixture must appear once in unified candidate mesh');
assert.equal(fixtureRows[0].claim_mode,'PORTFOLIO_BARRIER_ENTER');
assert(!frontier.candidates.some(row=>row.job_id==='fanin-fixture' && row.claim_path==='coordination/portfolio/pins/fanin-fixture/G000001.json'),'pre-release direct PIN must be absent from compact frontier');

// All ten batch workers read the same compact frontier before their hash shard. The fan-in descriptor
// therefore reaches the exact contender cohort independently of which candidate index each hash selects.
const firstShard = seed => Number.parseInt(seed.slice(0,8),16) % frontier.candidates.length;
const seeds = workers.map((_,i)=>(0x10000000+i*0x01010101).toString(16).padStart(8,'0').slice(0,8));
const shardChoices = seeds.map(firstShard);
assert(shardChoices.some(index=>index!==shardChoices[0]),'fixture must prove workers are actually distributed across shard indices');
for (const worker of workers) {
  assert.equal(frontier.batch_contention_fanin.next_action,'ENTER_NO_AUTHORITY_BARRIER_BEFORE_SHARDING',`fan-in must precede sharding for ${worker}`);
}

// Once >= required entrants exist, every contender computes the same exact five-member cohort.
const release = {
  schema:'prometeo.portfolio-contention-release/v1',
  fixture_id:'fanin-5-of-10',
  released_at:'2026-09-18T01:01:00Z',
  required_contenders:5,
  entrant_worker_ids:cohort,
  grants_execution_authority:false,
  next_action:'RACE_DETERMINISTIC_PIN'
};
const released = applyContentionBarrierRouting(allocator,[barrier(release,workers)],'2026-09-18T01:01:10Z');
const releasedCandidate = released.ready[0];
assert.equal(releasedCandidate.claim_mode,'PORTFOLIO_BARRIER_RELEASED');
assert.equal(releasedCandidate.claim_path,null);
assert.equal(releasedCandidate.next_action,'CHECK_RELEASE_MEMBERSHIP');
assert.deepEqual(releasedCandidate.contention_barrier.entrant_worker_ids,cohort);
assert.equal(releasedCandidate.post_release_claim.claim_path,'coordination/portfolio/pins/fanin-fixture/G000001.json');
assert.deepEqual(released.batch_contention_fanin.released_worker_ids,cohort);
assert.equal(released.batch_contention_fanin.next_action,'CHECK_RELEASE_MEMBERSHIP_BEFORE_SHARDING');

const members = workers.filter(id=>cohort.includes(id));
const nonmembers = workers.filter(id=>!cohort.includes(id));
assert.equal(members.length,5);
assert.equal(nonmembers.length,5);
assert(members.every(id=>released.batch_contention_fanin.released_worker_ids.includes(id)));
assert(nonmembers.every(id=>!released.batch_contention_fanin.released_worker_ids.includes(id)));

// Overfull or non-canonical RELEASE is invalid and cannot open the PIN gate.
const overfullRelease = {...release, entrant_worker_ids:workers.slice(0,6)};
const overfull = applyContentionBarrierRouting(allocator,[barrier(overfullRelease,workers)],'2026-09-18T01:01:10Z');
assert.equal(overfull.ready[0].claim_mode,'PORTFOLIO_BARRIER_ENTER');

const wrongCohortRelease = {...release, entrant_worker_ids:workers.slice(1,6)};
const wrongCohort = applyContentionBarrierRouting(allocator,[barrier(wrongCohortRelease,workers)],'2026-09-18T01:01:10Z');
assert.equal(wrongCohort.ready[0].claim_mode,'PORTFOLIO_BARRIER_ENTER');

// Ordinary batches incur no fan-in coordination and preserve direct PIN sharding.
const ordinaryOnly = {
  ...allocator,
  ready:ordinary,
  batch_candidates:ordinary,
  counts:{ready:ordinary.length,recovery:0}
};
const ordinaryRouted = applyContentionBarrierRouting(ordinaryOnly,[],'2026-09-18T01:00:30Z');
assert.equal(ordinaryRouted.batch_contention_fanin,null);
assert(ordinaryRouted.batch_candidates.every(row=>row.claim_mode==='PORTFOLIO_PIN_CREATE'));

console.log('CONTENTION_BARRIER_BATCH_FANIN_PASS');
