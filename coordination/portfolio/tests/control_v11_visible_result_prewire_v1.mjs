#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const adapterPath=path.join(root,'current-tree/control-v11/result-adapter-v1.js');
const {normalizeVisibleResultProjection,visibleResultCanPromote}=await import(pathToFileURL(adapterPath).href);
const projection=JSON.parse(fs.readFileSync(path.join(root,'current-tree/control-v11/result-candidate-v1.json'),'utf8'));
const v11=fs.readFileSync(path.join(root,'current-tree/control-v11/v11.js'),'utf8');
const config=fs.readFileSync(path.join(root,'current-tree/control-v11/config-v1.js'),'utf8');

const blocked=normalizeVisibleResultProjection(projection);
assert.equal(blocked.state,'BLOCKED');
assert.equal(blocked.fixture_contract_only,true);
assert.equal(blocked.blocker,'G05_REAL_PRIVATE_E2E_NOT_VERIFIED');
assert.equal(visibleResultCanPromote(projection),false);
assert.equal(projection.privacy.private_packet_present,false);
assert.equal(projection.privacy.private_token_present,false);
assert.equal(projection.privacy.attachment_secret_present,false);

const unknown=normalizeVisibleResultProjection({schema:'wrong',state:'VERIFIED'});
assert.equal(unknown.state,'PENDING','unknown/missing projection must not become success');

const incompleteVerified=normalizeVisibleResultProjection({
  schema:'prometeo.v11-visible-result-projection/v1',
  state:'VERIFIED',
  lineage:{builder_return_ref:'coordination/x/RETURN.json',verifier_ref:null,candidate_ref:'candidate/x',same_lineage:true,independent_verifier:true},
  verification:{outcome:'PASS'}
});
assert.equal(incompleteVerified.state,'BLOCKED','VERIFIED without complete independent lineage must fail closed');

const verified=normalizeVisibleResultProjection({
  schema:'prometeo.v11-visible-result-projection/v1',
  state:'VERIFIED',
  summary:'real candidate',
  lineage:{
    builder_return_ref:'coordination/portfolio/returns/x/RETURN.json',
    verifier_ref:'coordination/verifications/x/VERIFY.json',
    candidate_ref:'candidate/x',
    same_lineage:true,
    independent_verifier:true
  },
  verification:{outcome:'PASS'},
  candidate_url:'https://juanmanuelpm.github.io/prometeo/candidate/x/'
});
assert.equal(verified.state,'VERIFIED');
assert.equal(visibleResultCanPromote(verified),true);

assert.match(config,/resultProjectionUrl:'\.\/result-candidate-v1\.json'/);
assert.match(v11,/normalizeVisibleResultProjection/);
assert.match(v11,/data-visible-result-state/);
assert.match(v11,/G05/);
assert.match(v11,/builder_return_ref/);
assert.match(v11,/verifier_ref/);
assert.doesNotMatch(v11,/createElement\(['"]iframe/);
assert.doesNotMatch(v11,/HTMLIFrameElement|contentWindow/);

console.log('CONTROL_V11_VISIBLE_RESULT_PREWIRE_PASS');
