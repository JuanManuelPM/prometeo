#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||'.';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exec=read('coordination/AGENT_EXECUTION_PROTOCOL_V1.md');
const constitution=read('coordination/GLOBAL_AGENT_CONSTITUTION_V1.md');
const page=read('coordination/workspaces/PAGE_CHANGE_WORKER_PROTOCOL_V1.md');
const edge=read('supabase/functions/prometeo-change-loop-v1/index.ts');
const v11=read('current-tree/control-v11/v11.js');
const preservation=JSON.parse(read('coordination/design-dna/preservation-contracts/CONTROL_ROOM_V11_WORKSPACE_LOOP_V1.json'));

const must=(label,source,needle)=>{
  if(!source.includes(needle))throw new Error('PAGE_CHANGE_PREWRITE_FAIL '+label);
};

must('packet-v2',edge,"schema:'prometeo.execution-packet/v2'");
must('target-source-identity',edge,'source_identity:page?.source_identity||null');
must('target-writable-owner',edge,'writable_target:page?.writable_target||null');
must('baseline-current-digest',edge,'current_graph_digest:bindings.current_digest');
must('baseline-catalog-digest',edge,'catalog_digest:bindings.catalog_digest');
must('optional-target-blob-validated',edge,"['surface_id','project_id','authority_status','target_path','target_source_blob'");
must('v11-forwards-optional-target-blob',v11,'target_source_blob:p.target_source_blob||p.writable_target?.git_blob_sha||null');

must('constitution-live-overlap',constitution,'another **active writing worker** owns overlapping paths');
must('constitution-hard-collision',constitution,'live HARD_WRITE_COLLISION');
must('constitution-cas',constitution,'Use compare-and-swap semantics where possible');

must('execution-refetch-target',exec,'Re-fetch the exact current owner/file/branch head being modified');
must('execution-active-writers-only',exec,'overlapping **active writing workers**');
must('execution-cas',exec,'Use compare-and-swap/blob-SHA/head-aware writes');
must('page-concurrent-head-replan',page,'If concurrent HEAD movement materially changes the owned target, stop or re-plan');
must('page-reread-targets',page,'Re-read mutable targets immediately before mutation');

if(!preservation.must_preserve?.includes('Atomic existing claim/create remains execution authority.')){
  throw new Error('PAGE_CHANGE_PREWRITE_FAIL atomic-existing-claim');
}
if(!preservation.must_preserve?.includes('No new scheduler, queue, worker family or CURRENT architecture.')){
  throw new Error('PAGE_CHANGE_PREWRITE_FAIL no-parallel-scheduler');
}

console.log('PAGE_CHANGE_PREWRITE_FENCING_PASS');
