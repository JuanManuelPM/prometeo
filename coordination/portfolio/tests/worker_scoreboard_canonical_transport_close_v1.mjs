import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../../..');
const workerId='wc-20260919T145500Z-b83f2a6d91c4';
const refs={
  beacon:`coordination/workers/beacons/${workerId}.json`,
  exam:`coordination/workers/exams/${workerId}.json`,
  noalloc:`coordination/workers/no-allocation/${workerId}.json`
};
const sourcePaths=Object.fromEntries(Object.entries(refs).map(([k,ref])=>[k,path.join(repo,ref)]));
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const before=Object.fromEntries(Object.entries(sourcePaths).map(([k,p])=>[k,digest(p)]));

const exam=JSON.parse(fs.readFileSync(sourcePaths.exam,'utf8'));
const noalloc=JSON.parse(fs.readFileSync(sourcePaths.noalloc,'utf8'));
assert.equal(exam.close_reason,'CLAIM_TRANSPORT_BLOCKED','historical raw exam diagnostic must remain intact');
assert.equal(noalloc.outcome,'CLAIM_TRANSPORT_BLOCKED','historical no-allocation diagnostic must remain intact');
assert.equal(exam.pool_id,'PROD-01');
assert.equal(exam.protocol_version,'v3.30');
assert.equal(exam.productive_units,0);

const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-eff060-scoreboard-'));
try{
  for(const [kind,src] of Object.entries(sourcePaths)){
    const ref=refs[kind];
    const dst=path.join(fixtureRoot,ref);
    fs.mkdirSync(path.dirname(dst),{recursive:true});
    fs.copyFileSync(src,dst);
  }

  const output=path.join(fixtureRoot,'worker-scoreboard.json');
  execFileSync(process.execPath,[
    path.join(repo,'scripts/build-worker-scoreboard.mjs'),
    fixtureRoot,
    output
  ],{cwd:repo,encoding:'utf8'});

  const scoreboard=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(scoreboard.schema,'prometeo.worker-scoreboard/v1');
  assert.equal(scoreboard.source_beacon_count,1);

  const launch=scoreboard.launch_measurements.find(row=>row.worker_id===workerId);
  assert.ok(launch,'isolated historical worker launch row missing');
  assert.equal(launch.explicit_exam,true);
  assert.equal(launch.no_allocation,true);
  assert.equal(launch.productive_units,0);
  assert.equal(launch.pool_residency?.status,'EARLY_CLOSE_EXPLAINED');
  assert.equal(launch.pool_residency?.close_reason,'TRANSPORT_BOUNDARY');
  assert.ok(
    Number(launch.pool_residency?.close_evidence_count)>=1,
    'canonical transport boundary must keep at least one durable close evidence ref'
  );

  assert.equal(scoreboard.pool_residency_integrity?.pooled_launches,1);
  assert.equal(scoreboard.pool_residency_integrity?.unjustified_early_terminal_count,0);
  assert.deepEqual(scoreboard.pool_residency_integrity?.unjustified_early_terminal_workers,[]);

  const after=Object.fromEntries(Object.entries(sourcePaths).map(([k,p])=>[k,digest(p)]));
  assert.deepEqual(after,before,'regression must not rewrite historical beacon/exam/no-allocation bytes');

  console.log(JSON.stringify({
    schema:'prometeo.eff060-scoreboard-canonical-close-regression/v1',
    result:'PASS',
    worker_id:workerId,
    raw_diagnostic:'CLAIM_TRANSPORT_BLOCKED',
    canonical_close_reason:launch.pool_residency.close_reason,
    residency_status:launch.pool_residency.status,
    close_evidence_count:launch.pool_residency.close_evidence_count,
    unjustified_early_terminal_count:scoreboard.pool_residency_integrity.unjustified_early_terminal_count,
    historical_bytes_preserved:true
  }));
}finally{
  fs.rmSync(fixtureRoot,{recursive:true,force:true});
}
