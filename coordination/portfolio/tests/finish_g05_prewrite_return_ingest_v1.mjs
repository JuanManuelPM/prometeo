#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateG05LineageReceipt} from '../../../scripts/g05-lineage-receipt-lib.mjs';

const root=process.argv[2]||'.';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contract=JSON.parse(read('coordination/goal-progress/G05_LINEAGE_RECEIPT_CONTRACT_V1.json'));
const edge=read('supabase/functions/prometeo-change-loop-v1/index.ts');
const worker=read('coordination/workspaces/PAGE_CHANGE_WORKER_PROTOCOL_V1.md');
const execution=read('coordination/AGENT_EXECUTION_PROTOCOL_V1.md');

for(const needle of [
  "fail('RESULT_WORK_ITEM_MISMATCH',409)",
  "body.schema!=='prometeo.execution-result/v1'||body.work_item_id!==packet.work_item_id",
  "return await ingestResult(packet,body,'GITHUB_RETURN')"
]) assert(edge.includes(needle), 'missing runtime ingest fence '+needle);
for(const needle of [
  'Re-read mutable targets immediately before mutation',
  'run the CURRENT PREWRITE law'
]) assert(worker.includes(needle), 'missing Page Change PREWRITE law '+needle);
assert(execution.includes('Use compare-and-swap/blob-SHA/head-aware writes'),'missing execution CAS law');

const blob='a'.repeat(40);
const good={
  schema:'prometeo.g05-lineage-receipt/v1',
  lineage_id:'LIN-G05-TEST',
  work_item_id:'WI-G05-TEST',
  builder_worker_id:'wc-test-builder',
  claim:{ref:'coordination/opportunities/claims/page-change-WI-G05-TEST.json',generation:1},
  prewrite:{generation:1,target_ref:'current-tree/control-v11/v11.js',expected_blob:blob,observed_blob:blob,cas_result:'PASS'},
  return:{path:'coordination/executions/WI-G05-TEST/RETURN.json',schema:'prometeo.execution-result/v1',lineage_id:'LIN-G05-TEST',work_item_id:'WI-G05-TEST',sanitized:true,digest:'b'.repeat(40)},
  ingest:{source:'GITHUB_RETURN',lineage_id:'LIN-G05-TEST',work_item_id:'WI-G05-TEST',status:'CANDIDATE_READY'}
};
assert.equal(validateG05LineageReceipt(good,contract).ok,true);

const cases=[
  ['stale_generation',{prewrite:{...good.prewrite,generation:2}},'STALE_GENERATION'],
  ['cas_mismatch',{prewrite:{...good.prewrite,observed_blob:'c'.repeat(40)}},'CAS_BLOB_MISMATCH'],
  ['return_work_mismatch',{return:{...good.return,work_item_id:'WI-OTHER'}},'RETURN_WORK_ITEM_MISMATCH'],
  ['ingest_lineage_mismatch',{ingest:{...good.ingest,lineage_id:'LIN-OTHER'}},'INGEST_LINEAGE_MISMATCH'],
  ['unsanitized',{return:{...good.return,sanitized:false}},'RETURN_NOT_SANITIZED'],
  ['private_key',{packet_token:'forbidden'},'PRIVATE_KEY']
];
for(const [name,patch,code] of cases){
  const doc={...good,...patch};
  const out=validateG05LineageReceipt(doc,contract);
  assert.equal(out.ok,false,name+' should fail');
  assert(out.errors.some(e=>e.code===code),name+' missing '+code);
}
console.log(JSON.stringify({status:'PASS',positive:1,negative_controls:cases.length,runtime_ingest_fence:true,prewrite_cas_law:true}));
