import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createChangeLoopClient } from '../shared/capture/v1/change-loop.js';

function storage(seed={}) {
  const values=new Map(Object.entries(seed));
  return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value))};
}
function response(data,status=200) {
  return {ok:status>=200&&status<300,status,json:async()=>data};
}

test('Change Loop transports declared Facultad semantic context on Work', async () => {
  let payload=null;
  const client=createChangeLoopClient({
    storage:storage({'prometeo.capture.workspace.secret.v1':'x'.repeat(43)}),
    fetchImpl:async(_url,init)=>{payload=JSON.parse(init.body);return response({ok:true});}
  });
  await client.trabajar({
    id:'prometeo-universal-shell-v5',
    title:'Facultad',
    semantic_context:{
      surface_id:'facultad-digital',
      project_id:'project-facultad',
      authority_status:'CANDIDATE_TARGET_PINNED',
      course_id:'modelos',
      selected_year:2,
      active_tab:'resources',
      semantic_anchor:'course:modelos:tab:resources',
      viewport_fallback:{x:0,y:640},
      ignored_field:'drop-me'
    }
  });
  assert.equal(payload.action,'prepare_execution');
  assert.equal(payload.human_approved,true);
  assert.equal(payload.semantic_context.surface_id,'facultad-digital');
  assert.equal(payload.semantic_context.course_id,'modelos');
  assert.equal(payload.semantic_context.selected_year,2);
  assert.equal(payload.semantic_context.active_tab,'resources');
  assert.equal(payload.semantic_context.semantic_anchor,'course:modelos:tab:resources');
  assert.equal(payload.semantic_context.ignored_field,undefined);
});

test('Study V18 exposes capture and restore without canonical page identity', async () => {
  const source=await readFile(new URL('../pages/study-library/study-v18.js',import.meta.url),'utf8');
  for(const fragment of [
    "PrometeoStudyV18Context",
    "surface_id:'facultad-digital'",
    "project_id:'project-facultad'",
    "semantic_anchor:semanticAnchor()",
    "viewport_fallback:",
    "searchParams.set('year'",
    "searchParams.set('tab'",
    "searchParams.set('anchor'"
  ]) assert.ok(source.includes(fragment),fragment);
  assert.equal(source.includes("page_id:'facultad-digital'"),false);
});

test('Universal Host generator reads hosted semantic context instead of inventing page identity', async () => {
  const source=await readFile(new URL('../scripts/build-universal-control-v5-change-loop.py',import.meta.url),'utf8');
  assert.ok(source.includes('function hostedSemanticContext()'));
  assert.ok(source.includes('PrometeoStudyV18Context?.capture?.()'));
  assert.ok(source.includes('semantic_context'));
});
