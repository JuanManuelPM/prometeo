#!/usr/bin/env node
import assert from 'node:assert/strict';
import { validateForgePointInterface } from '../scripts/validate-forge-point-interface.mjs';

const H1='sha256:'+'a'.repeat(64);
const H2='sha256:'+'b'.repeat(64);

function validDoc(){
  return {
    schema:'prometeo.forge-point-interface/v1',
    point_id:'P001',
    interface_version:1,
    source:{canonical_ref:'forge://blueprint/P001/canonical',canonical_version:1,source_hash:H1},
    purpose:'Accept work only while the lease is current and emit durable completion evidence.',
    inputs:[{id:'input.work_item',type:'WorkItem',required:true,description:'Durable work assignment.',constraints:['lease_token present']}],
    outputs:[{id:'output.receipt',type:'Receipt',required:true,description:'Durable completion receipt.',constraints:['job_key preserved']}],
    states:[
      {id:'state.ready',description:'Assignment is current and executable.',terminal:false},
      {id:'state.done',description:'Completion was durably accepted.',terminal:true}
    ],
    operations:[{
      id:'op.publish',
      requires_state:'state.ready',
      input_ids:['input.work_item'],
      output_ids:['output.receipt'],
      next_state:'state.done',
      event_ids:['event.published'],
      failure_modes:['STALE_LEASE']
    }],
    events:[{id:'event.published',trigger:'server accepts output',payload:[{name:'job_key',type:'string',required:true}]}],
    invariants:[{id:'inv.no_stale_overwrite',status:'CANONICAL',statement:'A stale lease cannot overwrite newer work.',evidence_ref:'forge://evidence/stale-lease-test'}],
    dependencies:[{point_id:'P012',relation:'REQUIRES',interface_version:2}],
    tests:[{id:'test.publish_current',precondition:'Lease is current.',action:'Publish a valid output.',expected_observable_result:'Server returns an accepted publish state.'}],
    open_decisions:[]
  };
}

const cases=[];

function check(name,fn){
  fn();
  cases.push({name,status:'PASS'});
}

check('valid compact interface',()=>{
  const r=validateForgePointInterface(validDoc());
  assert.equal(r.valid,true);
  assert.equal(r.stale,false);
});

check('duplicate internal IDs rejected',()=>{
  const d=validDoc();
  d.outputs[0].id=d.inputs[0].id;
  const r=validateForgePointInterface(d);
  assert.equal(r.valid,false);
  assert.match(r.errors.join('\n'),/duplicate internal id/);
});

check('missing state reference rejected',()=>{
  const d=validDoc();
  d.operations[0].next_state='state.missing';
  const r=validateForgePointInterface(d);
  assert.equal(r.valid,false);
  assert.match(r.errors.join('\n'),/next_state does not resolve/);
});

check('stale canonical detected',()=>{
  const r=validateForgePointInterface(validDoc(),{canonicalVersion:2,sourceHash:H2});
  assert.equal(r.valid,true);
  assert.equal(r.stale,true);
  assert.equal(r.stale_reasons.length,2);
});

check('historical interface versions can coexist',()=>{
  const a=validDoc();
  const b=structuredClone(a);
  b.interface_version=2;
  b.source.canonical_version=2;
  b.source.source_hash=H2;
  assert.equal(validateForgePointInterface(a).valid,true);
  assert.equal(validateForgePointInterface(b).valid,true);
  assert.notEqual(a.interface_version,b.interface_version);
});

check('contradiction represented explicitly',()=>{
  const d=validDoc();
  d.dependencies=[{point_id:'P013',relation:'CONFLICTS_WITH',interface_version:1}];
  d.open_decisions=[{
    id:'decision.retry_semantics',
    status:'OPEN',
    question:'Which retry policy is canonical?',
    alternatives:['bounded retry','no retry'],
    provenance:['forge://blueprint/P001/canonical#conflict-2']
  }];
  const r=validateForgePointInterface(d);
  assert.equal(r.valid,true);
});

check('build criterion is machine-readable',()=>{
  const d=validDoc();
  assert.equal(d.tests[0].expected_observable_result.length>0,true);
  assert.equal(validateForgePointInterface(d).valid,true);
});

check('provenance survives validation unchanged',()=>{
  const d=validDoc();
  const before=JSON.stringify(d.source);
  const r=validateForgePointInterface(d);
  assert.equal(r.valid,true);
  assert.equal(JSON.stringify(d.source),before);
});

check('TBD placeholder outside open decisions rejected',()=>{
  const d=validDoc();
  d.purpose='TBD';
  const r=validateForgePointInterface(d);
  assert.equal(r.valid,false);
  assert.match(r.errors.join('\n'),/placeholder TBD forbidden/);
});

process.stdout.write(JSON.stringify({
  suite:'forge-point-interface-v1',
  contract_checks:cases.length,
  passed:cases.length,
  status:'PASS',
  note:'These are contract-level checks. Real canonical compilation and section-integrator acceptance remain pending until upstream canonicals exist.'
},null,2)+'\n');
