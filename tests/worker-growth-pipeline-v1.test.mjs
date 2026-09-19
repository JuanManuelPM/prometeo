import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root=path.resolve(process.argv[2]||'.');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prometeo-growth-scoreboard-'));
const out=path.join(tmp,'scoreboard.json');
try{
  const run=spawnSync(process.execPath,[path.join(root,'scripts','build-worker-scoreboard.mjs'),root,out],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const d=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(d.schema,'prometeo.worker-scoreboard/v1');
  assert.ok(Number(d.source_beacon_count)>0,'durable beacons must be measured');
  assert.equal(d.measurement_coverage.launch_rows,d.source_beacon_count);
  assert.equal(d.measurement_coverage.total_beacons,d.source_beacon_count);
  assert.equal(d.measurement_coverage.launch_observation_coverage,1);
  assert.ok(Array.isArray(d.launch_measurements));
  assert.ok(d.launch_measurements.length<=20);
  for(const row of d.launch_measurements){
    assert.ok(row.worker_id);
    assert.ok(row.beacon_ref);
    if(!row.explicit_exam) assert.equal(row.causal_strategy_eligible,false,'derived rows cannot become causal strategy evidence');
  }
  assert.ok(d.growth_health);
  for(const key of ['terminal_classification_rate','authority_rate','productive_worker_rate','productive_units_per_launch','capability_mismatch_rate','product_value_unit_share','system_multiplier_unit_share','control_overhead_unit_share']){
    assert.ok(Object.prototype.hasOwnProperty.call(d.growth_health,key),key+' missing');
  }
  if(d.strategy_experiment_health){
    for(const cls of Object.values(d.strategy_experiment_health.classes||{})){
      assert.equal(cls.assignment_hint?.mode,'ADAPTIVE_MIN_SAMPLE_THEN_HASH_TIEBREAK');
      assert.ok(cls.assignment_hint?.counts && typeof cls.assignment_hint.counts==='object');
    }
  }
  console.log(JSON.stringify({ok:true,beacons:d.source_beacon_count,exams:d.source_exam_count,growth:d.growth_health}));
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
