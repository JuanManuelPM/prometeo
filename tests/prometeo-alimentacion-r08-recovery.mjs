import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const read=rel=>fs.readFileSync(new URL(rel,root),'utf8');
const html=read('coordination/recovery/prometeo-alimentacion/demo/index.html');
const contract=JSON.parse(read('coordination/recovery/prometeo-alimentacion/PUBLIC_PRODUCT_CONTRACT_V1.json'));
const recovery=JSON.parse(read('coordination/recovery/prometeo-alimentacion/R08_RECOVERY_2026-09-09.json'));

assert.match(html,/data-authority="RECONSTRUCTED_CANDIDATE"/);
assert.match(html,/LAB_ONLY_NOT_CURRENT_NOT_HUMAN_ACCEPTED_NOT_SERVED/);
assert.match(html,/window\.__PROMETEO_ALIMENTACION_R08__/);
assert.doesNotMatch(html,/<script[^>]+src=/i);
assert.doesNotMatch(html,/<link[^>]+href=/i);
assert.doesNotMatch(html,/position\s*:\s*fixed/i);
assert.doesNotMatch(html,/<nav\b/i);
assert.match(html,/localStorage\.getItem/);
assert.match(html,/localStorage\.setItem/);
assert.match(html,/pointerdown/);
assert.match(html,/pointerup/);
assert.match(html,/addEventListener\('wheel'/);
assert.match(html,/HOY COMÉ ESTO/);
assert.match(html,/COMER ALGO/);
assert.match(html,/COMPRAR/);
assert.match(html,/aria-pressed/);
assert.match(html,/const palettes=\[/);
assert.match(html,/const AUTHORITY='RECONSTRUCTED_CANDIDATE'/);

assert.equal(contract.authority,'LAB_ONLY_NOT_CURRENT_NOT_HUMAN_ACCEPTED_NOT_SERVED');
assert.equal(contract.interaction.mobile_first,true);
assert.equal(contract.interaction.desktop_mouse_supported,true);
assert.equal(contract.interaction.persistent_bottom_nav,false);
assert.equal(contract.interaction.inventory_required,false);
assert.equal(contract.interaction.meal_time_forms_required,false);
assert.equal(contract.visual.active_palette_color_count,2);
assert.equal(contract.data.public_demo_data,'generic only');
assert.match(contract.data.personal_foods,/LOCAL_PRIVATE/);
assert.ok(contract.visual.responsive_failures.includes('overlapping panels'));
assert.ok(contract.visual.responsive_failures.includes('dead click/tap targets'));

assert.equal(recovery.lane,'R08');
assert.equal(recovery.authority.current,'NO_ALIMENTACION_ENTRY_FOUND');
assert.equal(recovery.durable_search.exact_latest_demo_bytes,'CHAT_ONLY_UNKNOWN');
assert.equal(recovery.material_continuation.candidate_truth_state,'RECONSTRUCTED_CANDIDATE');
assert.equal(recovery.material_continuation.promotion_claimed,false);
assert.ok(recovery.truth_states.CHAT_ONLY_UNKNOWN.length>0);
assert.ok(recovery.negative_knowledge.some(x=>x.includes('inventory tracker')));

console.log('R08 Alimentación recovery guards: PASS');
