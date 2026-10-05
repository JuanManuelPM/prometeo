import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  classifyFrontierBranch,
  frontierBranchDistribution,
  deriveProductiveLineage
} from '../../../current-tree/control-v11/work-score/live10-observability-model.mjs';

assert.equal(
  classifyFrontierBranch({title:'Primary Chat wake metrics growth'}).branch,
  'UNKNOWN',
  'title/mission prose must never classify a LIVE10 branch'
);
assert.equal(classifyFrontierBranch({campaign_branch:'A'}).branch,'CHAT_VIVO');
assert.equal(classifyFrontierBranch({observability_branch:'METRICAS_VIVAS'}).branch,'METRICAS_VIVAS');
assert.equal(classifyFrontierBranch({metadata:{campaign_branch:'C'}}).branch,'CRECIMIENTO');

const distribution=frontierBranchDistribution([
  {campaign_branch:'A'},
  {observability_branch:'METRICAS_VIVAS'},
  {metadata:{campaign_branch:'C'}},
  {title:'Primary Chat'}
]);
assert.deepEqual(distribution.counts,{CHAT_VIVO:1,METRICAS_VIVAS:1,CRECIMIENTO:1,UNKNOWN:1});

const grounded=deriveProductiveLineage({
  batches:[{batch_id:'PROMETEO-LIVE10-V1',workers:[{worker_id:'w',productive_lineage:[
    {observability_branch:'CHAT_VIVO',created_jobs_count:2,consumed_returns_count:1,block_project_jumps:[{from:'B1',to:'B2',crossed_block:true,crossed_project:false}]},
    {observability_branch:null,created_jobs_count:0,consumed_returns_count:2,block_project_jumps:[{from:'B2',to:'B3',crossed_block:true,crossed_project:true}]}
  ]}]}]
},'PROMETEO-LIVE10-V1');
assert.equal(grounded.status,'GROUNDED');
assert.equal(grounded.productive_branching,2);
assert.equal(grounded.fan_in,3);
assert.equal(grounded.block_jumps,2);
assert.equal(grounded.project_jumps,1);
assert.equal(grounded.branch_counts.UNKNOWN,1);

const missing=deriveProductiveLineage({batches:[]},'PROMETEO-LIVE10-V1');
assert.equal(missing.status,'UNKNOWN');
assert.equal(missing.productive_branching,null);

const html=fs.readFileSync('current-tree/control-v11/work-score/live-stats.html','utf8');
assert.match(html,/live10-observability-model\.mjs/);
assert.match(html,/UNKNOWN · sin metadata/);
assert.doesNotMatch(html,/primary-chat\|chat vivo\|response\|ingress\|wake/);
assert.doesNotMatch(html,/metric\|stats\|score\|runtime\|efficien\|timeline\|observab/);

const runtime=fs.readFileSync('scripts/build-worker-runtime.mjs','utf8');
assert.match(runtime,/productive_lineage:productiveUnits\.slice\(-8\)/);
assert.match(runtime,/created_jobs_count/);
assert.match(runtime,/consumed_returns_count/);
assert.match(runtime,/block_project_jumps/);

console.log('live10-series-branching-observability: PASS');
