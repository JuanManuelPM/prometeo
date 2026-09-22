#!/usr/bin/env node
import assert from 'node:assert/strict';
import {validateBacklogOrigin,validateBacklogOriginPolicy} from '../scripts/validate-backlog-origin.mjs';

const at='2026-09-22T04:25:36Z';
const origin=(author_kind,author_ref,confidence='DIRECT')=>({
  schema:'prometeo.backlog-item-origin/v1',
  author_kind,author_ref,
  source_ref:'prometeo://evidence/example',
  authored_at:at,
  recorded_at:at,
  confidence
});
const policy={
  schema:'prometeo.backlog-origin-policy/v1',
  origin_schema:'prometeo.backlog-item-origin/v1',
  legacy_cutoff_id:253,
  legacy_missing_origin:'UNKNOWN_LEGACY',
  new_items_require_origin:true
};
const checks=[];
const check=(name,fn)=>{fn();checks.push(name)};

check('USER valid',()=>assert.equal(validateBacklogOrigin(origin('USER','USER')).valid,true));
check('WORKER valid',()=>assert.equal(validateBacklogOrigin(origin('WORKER','K119')).valid,true));
check('POST_HOC_ANALYSIS valid',()=>assert.equal(validateBacklogOrigin(origin('POST_HOC_ANALYSIS','K119','ATTRIBUTED')).valid,true));
check('UNKNOWN_LEGACY valid',()=>assert.equal(validateBacklogOrigin({...origin('UNKNOWN_LEGACY',null,'UNKNOWN'),authored_at:null}).valid,true));
check('worker requires author_ref',()=>assert.equal(validateBacklogOrigin(origin('WORKER',null)).valid,false));
check('legacy cannot invent author',()=>assert.equal(validateBacklogOrigin({...origin('UNKNOWN_LEGACY','K001','UNKNOWN'),authored_at:null}).valid,false));
check('legacy item may omit origin',()=>assert.equal(validateBacklogOriginPolicy({origin_policy:policy,items:[{id:253}]}).valid,true));
check('new item requires origin',()=>assert.equal(validateBacklogOriginPolicy({origin_policy:policy,items:[{id:254}]}).valid,false));
check('new item with origin valid',()=>assert.equal(validateBacklogOriginPolicy({origin_policy:policy,items:[{id:254,origin:origin('WORKER','K119')}]}).valid,true));

process.stdout.write(JSON.stringify({suite:'backlog-origin-v1',checks:checks.length,passed:checks.length,status:'PASS'},null,2)+'\n');
