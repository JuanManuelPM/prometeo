import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const load=async path=>{const context={console,Date,Error,Object,String,Number,Array};context.globalThis=context;vm.runInNewContext(await readFile(new URL(path,import.meta.url),'utf8'),context,{filename:path});return context};

const ctx=await load('../shared/runtime/ownership/v1/ownership.js');
const O=ctx.PrometeoOwnership;
const a=O.acquireGesture('navigator',{pointerId:1});
assert.equal(O.snapshot().gesture.owner,'navigator');
assert.throws(()=>O.acquireGesture('page'),e=>e.code==='PROMETEO_INPUT_OWNER_CONFLICT');
assert.equal(O.releaseGesture({id:'wrong',generation:a.generation}),false);
assert.equal(O.releaseGesture(a),true);

const page=O.acquireFocus('page',{restoreKey:'page:main'});
assert.throws(()=>O.acquireFocus('modal'),e=>e.code==='PROMETEO_FOCUS_PARENT_REQUIRED');
const modal=O.acquireFocus('modal',{parentLeaseId:page.id,restoreKey:'button:open-modal'});
assert.throws(()=>O.releaseFocus(page),e=>e.code==='PROMETEO_FOCUS_LEASE_ORDER');
const modalRelease=JSON.parse(JSON.stringify(O.releaseFocus(modal)));
assert.equal(modalRelease.released,true);assert.equal(modalRelease.stale,false);assert.equal(modalRelease.restoreKey,'button:open-modal');assert.equal(modalRelease.parent.id,page.id);
assert.equal(O.releaseFocus(page).released,true);

const stale=O.acquireFocus('page',{restoreKey:'x'});O.invalidate('route-change');
assert.deepEqual(JSON.parse(JSON.stringify(O.releaseFocus(stale))),{released:false,stale:true,restoreKey:null});
assert.equal(O.snapshot().focus.length,0);

const ctx2=await load('../shared/runtime/ownership/v1/semantic-return.js');
const R=ctx2.PrometeoSemanticReturn;
const point=R.capture({route:'/alumnos/jose',pageId:'jose-study',itemId:'exercise-7',anchorId:'theory-index-laws',focusId:'answer-a',scrollOwnerId:'lesson-scroll',scrollTop:842,viewportWidth:1366,viewportHeight:768,orientation:'landscape',capturedAt:'2026-09-04T00:00:00Z'});
const plan=R.plan(point,{route:'/'});
assert.deepEqual(Array.from(plan,x=>x.type),['RESOLVE_ROUTE','RESOLVE_PAGE','RESOLVE_ITEM','RESOLVE_ANCHOR','RESTORE_SCROLL_OWNER','RESTORE_FOCUS']);
assert.equal(plan.find(x=>x.type==='RESTORE_SCROLL_OWNER').advisoryScroll.top,842);
assert.ok(!plan.some(x=>x.type==='SET_ABSOLUTE_PIXEL_POSITION'));

console.log(JSON.stringify({ok:true,generation:O.snapshot().generation,semantic_actions:plan.length},null,2));
