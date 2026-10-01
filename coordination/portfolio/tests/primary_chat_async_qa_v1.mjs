#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  selectQaDepth,
  servedAssetParity,
  compileQaDisposition,
  primaryChatQaUiBlocks
} from '../../../scripts/lib/primary-chat-async-qa-v1.mjs';

const root = process.cwd();
const contractPath = path.join(root, 'coordination/guide/PRIMARY_CHAT_ASYNC_QA_CONTRACT_V1.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
assert.equal(contract.schema, 'prometeo.primary-chat-async-qa-contract/v1');
assert.equal(contract.authority, 'NON_AUTHORITATIVE_VERIFICATION_EVIDENCE_ONLY');

const cheap = selectQaDepth({risk:'LOW', acceptance_vectors_present:true});
assert.deepEqual(cheap, ['SOURCE_STATIC','DETERMINISTIC_HARNESS']);
assert.equal(cheap.includes('REPRESENTATIVE_INTERACTION'), false);

const ui = selectQaDepth({risk:'MEDIUM', public_ui:true, interaction_change:true});
assert.ok(ui.includes('SERVED_BYTE_PARITY'));
assert.ok(ui.includes('REPRESENTATIVE_INTERACTION'));
assert.equal(ui.includes('VISUAL_SCREENSHOT'), false);

const visualPending = compileQaDisposition({candidate_visible:true, pending_lanes:['VISUAL_SCREENSHOT']});
assert.equal(visualPending.state, 'QA_PENDING');
assert.equal(visualPending.candidate_visible, true);

const failed = compileQaDisposition({candidate_visible:true, failed_lanes:['INTEGRATION']});
assert.equal(failed.state, 'QA_REPAIR_IN_PROGRESS');
assert.equal(failed.repair_successor_required, true);

const repaired = compileQaDisposition({candidate_visible:true, all_required_passed:false, pending_lanes:['DETERMINISTIC_HARNESS']});
assert.equal(repaired.state, 'QA_PENDING');

const humanPromote = compileQaDisposition({candidate_visible:true, all_required_passed:true, human_approval_required:true});
assert.equal(humanPromote.state, 'READY_TO_PROMOTE');
assert.equal(humanPromote.promotion_signal, 'HUMAN_ACCEPTANCE_REQUIRED');

const autoPromote = compileQaDisposition({candidate_visible:true, all_required_passed:true, auto_promotable:true});
assert.equal(autoPromote.state, 'QA_PASS');
assert.equal(autoPromote.promotion_signal, 'AUTO_PROMOTION_PERMITTED_BY_EXISTING_POLICY');

const stale = servedAssetParity({expected_version:'abcdef123456', served_reference:'./progress-v1.js'});
assert.equal(stale.pass, false);
assert.equal(stale.code, 'SERVED_ASSET_VERSION_STALE_OR_UNVERSIONED');

const parity = servedAssetParity({expected_version:'abcdef123456', served_reference:'./progress-v1.js?v=abcdef123456', source_asset_sha256:'aa', served_asset_sha256:'aa'});
assert.equal(parity.pass, true);

const block = primaryChatQaUiBlocks({state:'QA_PENDING', artifact_ref:'artifact:1', version_ref:'v2', pending_lanes:['REPRESENTATIVE_INTERACTION']});
assert.equal(block.length, 1);
assert.equal(block[0].type, 'details');
assert.match(block[0].label, /QA_PENDING/);

console.log(JSON.stringify({
  schema:'prometeo.primary-chat-async-qa-harness-result/v1',
  ok:true,
  scenarios:8,
  cheap_depth:cheap,
  ui_depth:ui,
  stale_asset_detection:stale.code,
  primary_chat_block:block[0]
}, null, 2));
