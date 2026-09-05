import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async p=>readFile(new URL(p,import.meta.url),'utf8');
const authority=JSON.parse(await read('../coordination/AUTHORITY_MAP.json'));
const diseases=JSON.parse(await read('./known-diseases.json'));
const kernel=await read('../shared/design-kernel/v2/tokens.css');
const material=await read('../shared/material/v2/material.css');
const interaction=await read('../shared/interaction/touch-first/v2/interaction.js');
const manifest=JSON.parse(await read('../shared/interaction/touch-first/v2/MANIFEST.json'));

assert.equal(authority.policy.version_numbers_cross_lineage_comparable,false);
const nav=authority.lineages.find(x=>x.id==='public-navigation-folder-stack');
assert.equal(nav.current.status,'HUMAN_ACCEPTED_BASELINE');
assert.equal(nav.current.sha256,'f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398');
assert.equal(authority.lineages.find(x=>x.id==='controls-v9').status,'RECONSTRUCTED');

assert.ok(!/@import\s+[^;]*material/i.test(kernel),'Design Kernel neutral tokens must not import material');
assert.match(material,/NON-MANIPULABLE SURFACES/);
assert.match(material,/box-shadow:none/);
assert.match(material,/--pm2-control-shadow:0 var\(--pm2-control-lift\) 0 var\(--pm2-shadow\),inset 0 2px 0 var\(--pm2-highlight\)/);
assert.doesNotMatch(material,/p-surface[^\{]*\{[^\}]*var\(--pm2-control-shadow/s);

assert.equal(manifest.status,'CANDIDATE_NOT_HUMAN_ACCEPTED');
assert.match(interaction,/PointerCapture/);
assert.match(interaction,/DRAG_THRESHOLD_PX\s*=\s*7/);
assert.match(interaction,/CLICK_SUPPRESS_MS/);
assert.match(interaction,/lostpointercapture/);
assert.match(interaction,/pagehide/);
assert.match(interaction,/data-p-wheel-axis/);
assert.match(interaction,/e\.pointerType==='touch'/);
assert.doesNotMatch(interaction,/navigator\.userAgent|iPad|iPhone/);
assert.doesNotMatch(interaction,/requestAnimationFrame\([^)]*inertia|momentum/i);

const ids=new Set();
for(const d of diseases.diseases){assert.ok(d.id&&d.name&&d.test);assert.ok(!ids.has(d.id),`duplicate disease ${d.id}`);ids.add(d.id)}
for(const required of ['ownerless-input','stale-focus-lease','duplicate-back','stale-generation-callback','unclosed-focus-lease','raised-content-surface','global-material-side-effect','builder-absolute-path']){
  assert.ok(diseases.diseases.some(d=>d.name===required),`missing regression disease: ${required}`);
}

for(const schemaFile of ['page.schema.json','widget.schema.json','context-bundle.schema.json','receipt.schema.json']){
  const schema=JSON.parse(await read('../shared/contracts/v1/'+schemaFile));
  assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
  assert.ok(schema.$id?.startsWith('prometeo.'));
}

console.log(JSON.stringify({ok:true,lineages:authority.lineages.length,diseases:diseases.diseases.length,interaction:manifest.version},null,2));
