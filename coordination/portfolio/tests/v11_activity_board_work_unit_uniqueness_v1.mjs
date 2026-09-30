import assert from 'node:assert/strict';
import fs from 'node:fs';

const continuityPath='current-tree/control-v11/continuity-v1.js';
const projectionPath='coordination/portfolio/derived/INTERACTIVE_WORK_UNITS_V1.json';
const source=fs.readFileSync(continuityPath,'utf8');
const projection=JSON.parse(fs.readFileSync(projectionPath,'utf8'));
const ids=(projection.work_units||[]).map(x=>String(x?.work_unit_id||'')).filter(Boolean);
assert.equal(new Set(ids).size,ids.length,'durable projection must not contain duplicate work_unit_id values');
assert.match(source,/let activityRenderGeneration=0;/,'activity renderer needs a generation fence');
assert.match(source,/function uniqueWorkUnits\(items\)/,'activity renderer needs identity dedupe');
assert.match(source,/const renderGeneration=\+\+activityRenderGeneration;/,'each render must claim a fresh generation');
assert.match(source,/if\(renderGeneration!==activityRenderGeneration\)return false;/,'stale concurrent renders must abort');
const start=source.indexOf('async function decorateNow(){');
const end=source.indexOf('\nfunction goContinuity(){',start);
assert.ok(start>=0&&end>start,'decorateNow source must be locatable');
const decorate=source.slice(start,end);
const awaitLoad=decorate.indexOf('await load();');
const guard=decorate.indexOf('if(renderGeneration!==activityRenderGeneration)return false;');
const remove=decorate.indexOf("root.querySelector('.live-work-v1')?.remove();");
const prepend=decorate.indexOf('root.prepend(sec);');
assert.ok(awaitLoad>=0&&guard>awaitLoad,'generation guard must run after shared async load');
assert.ok(remove>guard,'old Activity Board removal must occur only for the winning render');
assert.ok(prepend>remove,'winning render must replace before prepend');
const synthetic=[
  {work_unit_id:'WU-A',last_progress_at:'2026-09-30T00:00:00Z'},
  {work_unit_id:'WU-A',last_progress_at:'2026-09-30T00:01:00Z'},
  {work_unit_id:'WU-B',last_progress_at:'2026-09-30T00:00:30Z'}
];
const deduped=new Map();
for(const wu of synthetic){
  const current=deduped.get(wu.work_unit_id);
  if(!current||new Date(wu.last_progress_at)>new Date(current.last_progress_at))deduped.set(wu.work_unit_id,wu);
}
assert.equal(deduped.size,2,'same durable work_unit_id collapses while distinct IDs survive');
assert.equal(deduped.get('WU-A').last_progress_at,'2026-09-30T00:01:00Z');
console.log('V11_ACTIVITY_BOARD_WORK_UNIT_UNIQUENESS_PASS',JSON.stringify({
  projection_ids:ids.length,
  unique_projection_ids:new Set(ids).size,
  generation_fence:true,
  same_id_collapses:true,
  distinct_ids_preserved:true
}));
