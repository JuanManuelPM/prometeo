import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFastAllocator } from '../scripts/build-fast-allocator.mjs';

const feed = {
  generated_at:'2026-09-29T11:00:00Z',
  source_sha:'test',
  projects:[
    {
      project_id:'audio-text-to-speech',
      label:'TTS',
      jobs:[{
        job_id:'product-high',
        project_id:'audio-text-to-speech',
        priority:500,
        state:'ready',
        required_capabilities:[]
      }]
    },
    {
      project_id:'prometeo-autonomous-growth',
      label:'Prometeo',
      jobs:[
        {
          job_id:'finish-g05',
          project_id:'prometeo-autonomous-growth',
          priority:340,
          state:'ready',
          required_capabilities:[],
          finish_critical:true,
          goal_gate_ids:['G05_REAL_PRIVATE_E2E']
        },
        {
          job_id:'infra-normal',
          project_id:'prometeo-autonomous-growth',
          priority:900,
          state:'ready',
          required_capabilities:[]
        }
      ]
    }
  ],
  plans:[],
  workers:[],
  summary:{workers:{}}
};

const roleContext = {
  projectGuideMesh:{infrastructure_projects:['prometeo-autonomous-growth']},
  growthPolicy:{}
};

test('finish-critical CURRENT work outranks ordinary product work without bypassing allocator authority',()=>{
  const out=buildFastAllocator(feed,{status:'OK',metrics:{},reasons:[]},{roleContext});
  assert.equal(out.batch_candidates[0].job_id,'finish-g05');
  assert.equal(out.batch_candidates[0].finish_critical,true);
  assert.deepEqual(out.batch_candidates[0].goal_gate_ids,['G05_REAL_PRIVATE_E2E']);
  assert.ok(out.batch_candidates.some(row=>row.job_id==='product-high'));
  assert.ok(out.batch_candidates.some(row=>row.job_id==='infra-normal'));
  assert.equal(out.batch_strategy,'DETERMINISTIC_UNIFIED_CANDIDATE_SHARD');
  assert.equal(out.preferred_order[0],'ready');
});

test('ordinary infrastructure priority still does not leapfrog product work',()=>{
  const withoutCritical=structuredClone(feed);
  withoutCritical.projects[1].jobs[0].finish_critical=false;
  const out=buildFastAllocator(withoutCritical,{status:'OK',metrics:{},reasons:[]},{roleContext});
  assert.equal(out.batch_candidates[0].job_id,'product-high');
});


test('product-rich batch reserves two infrastructure candidates without displacing the product head',()=>{
  const richFeed={
    generated_at:'2026-09-30T01:50:00Z',
    source_sha:'reserve-test',
    projects:[
      {
        project_id:'product-project',
        label:'Product',
        jobs:Array.from({length:9},(_,i)=>({
          job_id:'product-'+String(i+1).padStart(2,'0'),
          project_id:'product-project',
          priority:900-i,
          state:'ready',
          required_capabilities:[]
        }))
      },
      {
        project_id:'prometeo-autonomous-growth',
        label:'Prometeo',
        jobs:Array.from({length:3},(_,i)=>({
          job_id:'infra-'+String(i+1).padStart(2,'0'),
          project_id:'prometeo-autonomous-growth',
          priority:1000-i,
          state:'ready',
          required_capabilities:[]
        }))
      }
    ],
    plans:[],
    workers:[],
    summary:{workers:{}}
  };
  const out=buildFastAllocator(richFeed,{status:'OK',metrics:{},reasons:[]},{roleContext});
  assert.equal(out.batch_candidates[0].job_id,'product-01','ordinary product must retain the head position');
  const infra=out.batch_candidates.filter(row=>row.project_id==='prometeo-autonomous-growth');
  assert.equal(infra.length,2,'exactly two infrastructure candidates should be reserved into the unified batch');
  assert.deepEqual(infra.map(row=>row.job_id),['infra-01','infra-02']);
  assert.ok(out.batch_candidates.filter(row=>row.project_id==='product-project').length>=9,'product work remains the majority');
});
