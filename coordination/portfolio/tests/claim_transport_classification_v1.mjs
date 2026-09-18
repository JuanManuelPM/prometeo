#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const wc=fs.readFileSync(path.join(repoRoot,'wc'),'utf8');
const fast=fs.readFileSync(path.join(repoRoot,'coordination/workers/FAST_ALLOCATION_PROTOCOL_V1.md'),'utf8');
const baseline=JSON.parse(fs.readFileSync(path.join(repoRoot,'coordination/efficiency/RATCHET_BASELINE_V1.json'),'utf8'));

const classify=({explicitDenial=false,branchHeadMoved=false,targetExists=false}={})=>{
  if(targetExists) return 'CREATE_EXISTS';
  if(branchHeadMoved) return 'BRANCH_HEAD_MOVED';
  if(explicitDenial) return 'CLAIM_TRANSPORT_BLOCKED';
  return 'CLAIM_TRANSPORT_AMBIGUOUS';
};
const afterAmbiguous=({diversions=0,currentPath,candidates=[]})=>{
  if(diversions>=1) return {action:'STOP_CLAIM_TRANSPORT_AMBIGUOUS'};
  const alternate=candidates.find(c=>c.claim_path!==currentPath && !c.tried);
  return alternate
    ? {action:'TRY_ONE_DIFFERENT_PATH',candidate:alternate,diversions:diversions+1}
    : {action:'STOP_CLAIM_TRANSPORT_AMBIGUOUS'};
};

assert.equal(classify({explicitDenial:true}),'CLAIM_TRANSPORT_BLOCKED');
assert.equal(classify({branchHeadMoved:true}),'BRANCH_HEAD_MOVED');
assert.equal(classify({targetExists:true}),'CREATE_EXISTS');
assert.equal(classify({}),'CLAIM_TRANSPORT_AMBIGUOUS');

const candidates=[
  {claim_path:'pins/a.json',tried:true},
  {claim_path:'pins/b.json',tried:false},
  {claim_path:'pins/c.json',tried:false}
];
const first=afterAmbiguous({diversions:0,currentPath:'pins/a.json',candidates});
assert.equal(first.action,'TRY_ONE_DIFFERENT_PATH');
assert.equal(first.candidate.claim_path,'pins/b.json');
assert.equal(first.diversions,1);
assert.equal(afterAmbiguous({diversions:1,currentPath:'pins/b.json',candidates}).action,'STOP_CLAIM_TRANSPORT_AMBIGUOUS');
assert.equal(afterAmbiguous({diversions:0,currentPath:'pins/a.json',candidates:[{claim_path:'pins/a.json',tried:true}]}).action,'STOP_CLAIM_TRANSPORT_AMBIGUOUS');

for(const [name,text] of [['wc',wc],['fast',fast]]){
  assert(text.includes('CLAIM_TRANSPORT_AMBIGUOUS'),name+' must name ambiguous transport explicitly');
  assert(text.includes('explicit authorization/safety denial'),name+' must reserve CLAIM_TRANSPORT_BLOCKED for explicit denial');
  assert(text.includes('different claim path'),name+' must require a different claim path for the bounded diversion');
  assert(text.includes('at most ONE transport diversion'),name+' must bound diversion to one');
  assert(text.includes('Never retry the denied action/path'),name+' must forbid safety-control bypass');
}

const eff031=baseline.items?.find(x=>x.id==='EFF031');
assert(eff031,'EFF031 missing');
assert.equal(eff031.required?.explicit_denial_classification,'CLAIM_TRANSPORT_BLOCKED');
assert.equal(eff031.required?.ambiguous_transport_classification,'CLAIM_TRANSPORT_AMBIGUOUS');
assert.equal(eff031.required?.transport_diversion_max,1);
assert.equal(eff031.required?.alternate_claim_path_must_differ,true);
assert.equal(eff031.required?.same_denied_action_retry_forbidden,true);
assert.equal(eff031.required?.safety_control_bypass_forbidden,true);

console.log('CLAIM_TRANSPORT_CLASSIFICATION_PASS');
