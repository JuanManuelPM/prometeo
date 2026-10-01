#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assetVersion, versionProgressReference, PAGE_REL, PROGRESS_REL } from '../../../scripts/version-primary-chat-assets.mjs';
import { compileVerifierPacket, judgeQaResult, servedAssetCheck } from '../../../scripts/verify-qa-block-v1.mjs';

const argv = process.argv.slice(2);
const value = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
};
const repoRoot = path.resolve(value('--repo-root', process.cwd()));
const pagesRootRaw = value('--pages-root', null);
const pagesRoot = pagesRootRaw ? path.resolve(pagesRootRaw) : null;

const sourcePage = fs.readFileSync(path.join(repoRoot, PAGE_REL), 'utf8');
const sourceProgress = fs.readFileSync(path.join(repoRoot, PROGRESS_REL));
const version = assetVersion(sourceProgress);
const compiled = versionProgressReference(sourcePage, version);
const expectedRef = `src="./progress-v1.js?v=${version}"`;

assert.ok(compiled.includes(expectedRef), 'compiled page must reference progress-v1.js with content-derived version');
assert.equal(versionProgressReference(compiled, version), compiled, 'asset version compilation must be idempotent');
assert.doesNotMatch(compiled, /src=(['"])\.\/progress-v1\.js\1/, 'compiled page may not retain an unversioned progress reference');

const result = {
  schema: 'prometeo.primary-chat-asset-versioning-test/v1',
  ok: true,
  version,
  source_progress_bytes: sourceProgress.length,
  compiled_reference: `./progress-v1.js?v=${version}`,
  staged_pages_verified: false,
  async_qa: {schema:'prometeo.async-qa-promotion-harness/v1', overall:'PASS', cases:[]}
};

const record = (name, fn) => {
  fn();
  result.async_qa.cases.push({name,status:'PASS'});
};

record('cheap PASS without browser', () => {
  const packet = compileVerifierPacket({artifact_ref:'artifact:cheap',version_ref:'v1',risk:'LOW',acceptance_vectors:[{id:'static',kind:'source_static'},{id:'harness',kind:'deterministic_harness'}]});
  assert.equal(packet.selected_depth, 'DETERMINISTIC_HARNESS');
  assert.equal(packet.browser_required, false);
  const disposition = judgeQaResult({packet,checks:[{id:'harness',depth:'DETERMINISTIC_HARNESS',status:'PASS'}],policy:{promotion:'AUTO_PROMOTABLE_BY_EXISTING_AUTHORITY'}});
  assert.equal(disposition.qa_status, 'QA_PASS');
  assert.equal(disposition.promotion_signal.auto_promoted_by_qa, false);
});

record('QA_PENDING candidate visible + visual/browser lane pending', () => {
  const packet = compileVerifierPacket({artifact_ref:'artifact:ui',version_ref:'v2',risk:'MEDIUM',acceptance_vectors:[{id:'interaction',kind:'representative_interaction'},{id:'visual',kind:'visual_screenshot'}]});
  assert.equal(packet.browser_required, true);
  const disposition = judgeQaResult({packet,checks:[{id:'source',depth:'SOURCE_STATIC',status:'PASS'},{id:'visual',depth:'VISUAL_SCREENSHOT',status:'PENDING'}],candidate_visible:true});
  assert.equal(disposition.qa_status, 'QA_PENDING');
  assert.equal(disposition.candidate_visible, true);
});

record('FAIL -> bounded repair successor', () => {
  const packet = compileVerifierPacket({artifact_ref:'artifact:repair',version_ref:'v1',acceptance_vectors:[{id:'harness',kind:'deterministic_harness'}]});
  const disposition = judgeQaResult({packet,checks:[{id:'harness',depth:'DETERMINISTIC_HARNESS',status:'FAIL'}]});
  assert.equal(disposition.qa_status, 'QA_REPAIR_IN_PROGRESS');
  assert.equal(disposition.repair_successor.owner_ref, 'coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md');
  assert.equal(disposition.repair_successor.reverify_required, true);
});

record('repaired candidate -> reverify', () => {
  const packet = compileVerifierPacket({artifact_ref:'artifact:repair',version_ref:'v2',acceptance_vectors:[{id:'harness',kind:'deterministic_harness'}]});
  const disposition = judgeQaResult({packet,checks:[{id:'harness',depth:'DETERMINISTIC_HARNESS',status:'PENDING'}],repaired_from:'v1'});
  assert.equal(disposition.qa_status, 'QA_PENDING');
  assert.equal(disposition.disposition, 'REVERIFY_PENDING');
});

record('human approval required -> READY_TO_PROMOTE not auto-promote', () => {
  const packet = compileVerifierPacket({artifact_ref:'artifact:approval',version_ref:'v3',acceptance_vectors:[{id:'harness',kind:'deterministic_harness'}]});
  const disposition = judgeQaResult({packet,checks:[{id:'harness',depth:'DETERMINISTIC_HARNESS',status:'PASS'}],policy:{promotion:'HUMAN_APPROVAL_REQUIRED'}});
  assert.equal(disposition.qa_status, 'READY_TO_PROMOTE');
  assert.equal(disposition.promotion_signal.auto_promoted_by_qa, false);
});

record('auto-promotable policy emits signal only', () => {
  const packet = compileVerifierPacket({artifact_ref:'artifact:auto',version_ref:'v4',acceptance_vectors:[{id:'harness',kind:'deterministic_harness'}]});
  const disposition = judgeQaResult({packet,checks:[{id:'harness',depth:'DETERMINISTIC_HARNESS',status:'PASS'}],policy:{promotion:'AUTO_PROMOTABLE_BY_EXISTING_AUTHORITY'}});
  assert.equal(disposition.qa_status, 'QA_PASS');
  assert.equal(disposition.promotion_signal.action, 'EMIT_TO_EXISTING_PROMOTION_AUTHORITY');
  assert.equal(disposition.promotion_signal.auto_promoted_by_qa, false);
});

record('stale served asset detection', () => {
  const expectedVersion = assetVersion(sourceProgress);
  const fresh = servedAssetCheck({source_bytes:sourceProgress,served_bytes:sourceProgress,asset_url:`./progress-v1.js?v=${expectedVersion}`,expected_version:expectedVersion});
  assert.equal(fresh.pass, true);
  const stale = servedAssetCheck({source_bytes:sourceProgress,served_bytes:Buffer.from('stale'),asset_url:`./progress-v1.js?v=${expectedVersion}`,expected_version:expectedVersion});
  assert.equal(stale.pass, false);
  assert.equal(stale.failure, 'SERVED_BYTES_STALE');
  const stable = servedAssetCheck({source_bytes:sourceProgress,served_bytes:sourceProgress,asset_url:'./progress-v1.js',expected_version:expectedVersion});
  assert.equal(stable.pass, false);
  assert.equal(stable.failure, 'STABLE_OR_WRONG_ASSET_VERSION');
});

record('browser PASS cannot be manufactured from deterministic evidence', () => {
  const packet = compileVerifierPacket({artifact_ref:'artifact:browser',version_ref:'v5',acceptance_vectors:[{id:'interaction',kind:'representative_interaction'}]});
  const disposition = judgeQaResult({packet,checks:[{id:'static',depth:'SERVED_BYTE_PARITY',status:'PASS'}]});
  assert.equal(packet.browser_required, true);
  assert.equal(disposition.qa_status, 'QA_PENDING');
  assert.equal(disposition.promotion_ready, false);
});

if (pagesRoot) {
  const stagedPage = fs.readFileSync(path.join(pagesRoot, PAGE_REL), 'utf8');
  const stagedProgress = fs.readFileSync(path.join(pagesRoot, PROGRESS_REL));
  assert.equal(stagedProgress.equals(sourceProgress), true, 'main/staged gh-pages progress bytes diverge');
  assert.equal(stagedPage, compiled, 'staged gh-pages HTML must equal deterministic compiled source HTML');
  assert.ok(stagedPage.includes(expectedRef), 'staged gh-pages HTML missing expected versioned progress reference');
  const served = servedAssetCheck({source_bytes:sourceProgress,served_bytes:stagedProgress,asset_url:`./progress-v1.js?v=${version}`,expected_version:version});
  assert.equal(served.pass, true, 'staged served-asset parity/version gate must pass');
  result.staged_pages_verified = true;
}

result.async_qa.case_count = result.async_qa.cases.length;
console.log(JSON.stringify(result, null, 2));
