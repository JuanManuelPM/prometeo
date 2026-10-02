#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildOperationalStats } from '../../../scripts/build-worker-operational-stats.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-passive-stats-'));
const write = (rel, doc) => {
  const p = path.join(tmp,rel);
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,`${JSON.stringify(doc,null,2)}\n`);
};

try {
  const worker='fixture-worker';
  write('coordination/workers/beacons/fixture-a.json',{
    schema:'prometeo.worker-beacon/v1',worker_id:worker,launch_nonce:'nonce-a',batch_id:'POOL-FIXTURE',launched_at:'2026-10-02T08:00:00Z'
  });
  write('coordination/portfolio/pins/job-a/G000001.json',{
    schema:'prometeo.portfolio-pin/v1',pin_id:'pin-a',worker_id:worker,job_id:'job-a',campaign_id:'CAMPAIGN-FIXTURE',claimed_at:'2026-10-02T08:01:00Z',required_capabilities:['repository_read_write']
  });
  write('coordination/workers/started/start-a.json',{
    schema:'prometeo.worker-started/v1',worker_id:worker,work_id:'job-a',started_at:'2026-10-02T08:02:00Z'
  });
  const ret={
    schema:'prometeo.portfolio-return/v1',return_id:'return-a',worker_id:worker,job_id:'job-a',returned_at:'2026-10-02T08:06:00Z',outcome:'PASS',
    local_repairs:['repair-1'],child_refs:['job-a-child'],human_round_trips:0,post_compile_corrections:['correction-1']
  };
  write('coordination/portfolio/returns/job-a/RETURN-a.json',ret);
  write('coordination/portfolio/returns/job-a/RETURN-a-duplicate.json',ret);
  write('coordination/portfolio/collisions/job-a/collision-a.json',{
    schema:'prometeo.portfolio-pin-collision/v1',collision_id:'collision-a',worker_id:worker,job_id:'job-a',observed_at:'2026-10-02T08:00:30Z'
  });
  write('coordination/workers/no-allocation/capability-a.json',{
    schema:'prometeo.worker-no-allocation/v1',id:'noalloc-a',worker_id:worker,job_id:'job-a',observed_at:'2026-10-02T08:00:45Z',classification:'CAPABILITY_MISMATCH'
  });
  write('coordination/workers/exams/fixture-worker.json',{
    schema:'prometeo.worker-exam/v1',worker_id:worker,job_id:'job-a',exit_audit_v1:{audit_completed_at:'2026-10-02T08:07:00Z',exit_reason:'TARGET_REACHED'}
  });

  // Same worker_id appears again with a new launch nonce. Projection must flag the identity conflict
  // rather than silently fusing both incarnations into one authoritative worker history.
  write('coordination/workers/beacons/fixture-b.json',{
    schema:'prometeo.worker-beacon/v1',worker_id:worker,launch_nonce:'nonce-b',batch_id:'POOL-FIXTURE',launched_at:'2026-10-02T09:00:00Z'
  });
  write('coordination/portfolio/pins/job-b/G000001.json',{
    schema:'prometeo.portfolio-pin/v1',pin_id:'pin-b',worker_id:worker,job_id:'job-b',claimed_at:'2026-10-02T09:01:00Z'
  });
  write('coordination/workers/started/start-b.json',{
    schema:'prometeo.worker-started/v1',worker_id:worker,work_id:'job-b',started_at:'2026-10-02T09:02:00Z'
  });

  // Runtime ACTIVE is intentionally stale/diagnostic and must never become liveness truth.
  write('live/runtime.json',{
    schema:'prometeo.worker-runtime/v1',generated_at:'2026-10-02T10:00:00Z',batches:[{batch_id:'POOL-FIXTURE',workers:[{worker_id:worker,state:'ACTIVE',last_event_at:'2026-10-02T08:03:00Z'}]}]
  });

  const projection=buildOperationalStats(tmp,'2026-10-02T10:00:00Z');
  assert.equal(projection.authority,'NON_AUTHORITATIVE_DERIVED_ANALYTICS');
  assert.equal(projection.quality.duplicates_suppressed,1,'duplicate durable return id must be suppressed');
  assert.equal(projection.quality.worker_reincarnations.length,1,'reused worker_id must be surfaced as an identity conflict');

  const a=projection.records.find(row=>row.block?.value==='job-a');
  const b=projection.records.find(row=>row.block?.value==='job-b');
  assert.ok(a && b,'both worker incarnations/jobs must remain reconstructible through the public block field');
  assert.equal(a.launch_nonce,'nonce-a');
  assert.equal(b.launch_nonce,'nonce-b');
  assert.equal(a.identity_conflict,true);
  assert.equal(a.lifecycle.claimed_at.value,'2026-10-02T08:01:00Z');
  assert.equal(a.lifecycle.started_at.value,'2026-10-02T08:02:00Z');
  assert.equal(a.lifecycle.returned_at.value,'2026-10-02T08:06:00Z');
  assert.equal(a.lifecycle.eligible_at.kind,'unknown','missing evidence must remain unknown');
  assert.equal(a.metrics.wall_latency_ms.kind,'derived_metric');
  assert.equal(a.metrics.wall_latency_ms.value,240000);
  assert.equal(a.metrics.collisions.value,1);
  assert.equal(a.metrics.capability_mismatch.value,1);
  assert.equal(a.metrics.local_repairs.value,1);
  assert.equal(a.metrics.child_yield.value,1);
  assert.equal(a.metrics.post_compile_corrections.value,1);
  assert.equal(a.runtime_label_diagnostic.label,'ACTIVE');
  assert.equal(a.runtime_label_diagnostic.stale_active_label_ignored,true);
  assert.equal(a.liveness_authoritative,false);
  assert.equal(projection.causal_policy.includes('do not establish causal claims'),true);

  // Real recent campaign sample: the current worker's durable beacon/claims/returns must be rebuildable
  // from this repository without a hidden DB or synthetic fixture-only path.
  const repoRoot=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../..');
  const real=buildOperationalStats(repoRoot,'2026-10-02T10:00:00Z');
  const current=real.records.filter(row=>row.worker_id==='wc-20261002T093328Z-f091d8d0836d');
  assert.ok(current.length>=1,'recent PROD-01 worker must appear in passive projection');
  assert.ok(current.some(row=>row.launch_nonce==='6c6bf558bbcd28fe'),'recent campaign sample must retain fresh launch identity');
  assert.ok(current.some(row=>row.lifecycle.claimed_at.kind==='durable_fact'),'recent campaign sample must expose at least one durable claim timestamp');
  assert.ok(current.some(row=>row.lifecycle.returned_at.kind==='durable_fact'),'recent campaign sample must expose at least one durable return timestamp');

  console.log('WORKER_PASSIVE_OPERATIONAL_STATS_PASS');
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}
