import assert from 'node:assert/strict';
import {json,context,load} from './part2-test-helpers.mjs';
const c=context();load('shared/reincarnation/v1/reincarnate.js',c);load('shared/operator/v1/operator-view.js',c);
const wake=c.PrometeoReincarnate.wake({
 bootstrap:json('reincarnation/BOOTSTRAP.json'),currentGraph:json('state/CURRENT_GRAPH.json'),head:json('state/HEAD.json'),dotState:json('state/DOT_STATE.json'),parent:json('state/PARENT.json'),
 pending:json('state/PENDING.json'),carry:json('state/CARRY.json'),watermarks:json('state/WATERMARKS.json'),catalog:json('catalog/CATALOG_MANIFEST.json'),lineage:json('lineage/LINEAGE_GRAPH.json'),capabilities:json('lineage/CAPABILITY_REGISTRY.json'),hotBook:json('context/books/HOT.json')
});
assert.equal(wake.ACTIVE_FRONTEND,'navigator-v53-visible');assert.equal(wake.PAGES.count,31);assert.ok(wake.RULES.some(x=>x.includes('EXISTS')));
const op=c.PrometeoOperatorView.project({currentGraph:json('state/CURRENT_GRAPH.json'),pending:json('state/PENDING.json'),catalog:json('catalog/CATALOG_MANIFEST.json')});
assert.deepEqual(Array.from(op.actions),['OPEN_PAGE','SEARCH','USE','REQUEST_CHANGE','CREATE','BACK']);
assert.equal('lease_id' in op,false);assert.equal('receipt_hash' in op,false);
console.log(JSON.stringify({ok:true,phases:['2.17','2.18'],frontend:wake.ACTIVE_FRONTEND}));
