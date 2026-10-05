#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  compilePrimaryChatResponseFanout
} from '../../../scripts/primary-chat-response-fanout-v1.mjs';
import {
  compilePrimaryChatResponseJudgeFanout
} from '../../../scripts/primary-chat-response-judge-v1.mjs';
import {
  synthesizePrimaryChatResponse
} from '../../../scripts/primary-chat-response-synthesis-v1.mjs';
import {
  compilePrimaryChatResponseProgress
} from '../../../scripts/primary-chat-response-progress-v1.mjs';

const requestSource = fs.readFileSync(
  new URL('../../../current-tree/control-v11/chat-canary/response-request-v1.js', import.meta.url),
  'utf8'
);
const richSource = fs.readFileSync(
  new URL('../../../current-tree/control-v11/chat-canary/rich-response-v1.js', import.meta.url),
  'utf8'
);
const indexHtml = fs.readFileSync(
  new URL('../../../current-tree/control-v11/chat-canary/index.html', import.meta.url),
  'utf8'
);
const root = JSON.parse(fs.readFileSync(
  new URL('../../guide/receipts/portfolio-guide-planner-universal-cognitive-block-v1/RECEIPT-DISPATCH-COMPILER-DOGFOOD-V1.json', import.meta.url),
  'utf8'
)).compiled_dispatch_contract;

const privateText = 'C010_PRIVATE_NOTE_MUST_NOT_APPEAR_PUBLICLY';
const ingressCalls = [];
const requestSandbox = {
  Date, Math, JSON, Object, String, Number, Promise,
  crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000010' },
  PROMETEO_CHAT_CANARY_INPUT_V1: {
    submitText: async payload => {
      ingressCalls.push(payload);
      return { status: 'QUEUED', queued: true, ref: 'private://fixture/request-c010' };
    }
  }
};
requestSandbox.globalThis = requestSandbox;
vm.runInNewContext(requestSource, requestSandbox, { filename: 'response-request-v1.js' });
const requestApi = requestSandbox.PROMETEO_PRIMARY_CHAT_RESPONSE_REQUEST_V1;
assert.ok(requestApi);

const submit = await requestApi.submitResponseRequest({
  text: privateText,
  page: { page_id: 'control-v11-chat-canary' },
  request_id: 'rr-c010-e2e-001',
  created_at: '2026-10-05T01:40:00Z'
});
assert.equal(submit.queued, true);
assert.equal(ingressCalls.length, 1);
assert.equal(ingressCalls[0].kind, 'PRIMARY_CHAT_RESPONSE_REQUEST_V1');
const parsed = requestApi.parsePrivate(ingressCalls[0].text);
assert.equal(parsed.text, privateText);
const projection = requestApi.publicProjection(parsed.envelope);
assert.equal(projection.request_id, 'rr-c010-e2e-001');
assert.equal(projection.requested_candidate_count, 4);
assert.equal(projection.requested_exam_count, 2);
assert.equal(projection.requested_synthesizer_count, 1);
assert.equal(projection.routing, 'CURRENT_WORK_GRAPH');
assert.equal(projection.raw_text_public, false);
assert.equal(JSON.stringify(projection).includes(privateText), false);

const templateId = root.capacity_plan.ready_block_ids[0];
const template = root.decomposition.blocks.find(block => block.block_id === templateId);
assert.ok(template);
const fanout = compilePrimaryChatResponseFanout({
  root_contract: root,
  root_contract_ref: 'receipt://primary-chat-current#compiled_dispatch_contract',
  request_projection: projection,
  request_projection_ref: 'projection://primary-chat/rr-c010-e2e-001',
  template_work_block_id: templateId
});
assert.equal(fanout.pass, true, JSON.stringify(fanout.errors || []));
assert.equal(fanout.candidate_blocks.length, 4);
assert.equal(fanout.response_fanout.workers_claimed, 0);
assert.equal(fanout.response_fanout.returns_received, 0);

const candidateReturns = fanout.candidate_blocks.map((block, index) => ({
  schema: 'prometeo.primary-chat-response-candidate-return-public/v1',
  request_id: projection.request_id,
  candidate_ordinal: index + 1,
  worker_id: `wc-c010-candidate-${index + 1}`,
  return_ref: `coordination/portfolio/returns/c010-fixture-candidate-${index + 1}/RETURN.json`,
  outcome: 'VERIFIED',
  durable_return: true,
  raw_text_public: false,
  evidence_refs: [`evidence://c010/candidate-${index + 1}`],
  rich_response: {
    schema: 'prometeo.primary-chat-rich-response/v1',
    request_id: projection.request_id,
    prose: [`respuesta visible ${index + 1}`],
    links: [{ label: 'Prometeo WC', href: 'https://juanmanuelpm.github.io/prometeo/wc/' }],
    widgets: [{ type: 'experiment_stats', label: 'respuesta', metrics: { candidato: String(index + 1) }, note: 'fixture durable' }],
    evidence_refs: [`evidence://c010/candidate-${index + 1}`]
  },
  source_block_id: block.block_id
}));
assert.equal(new Set(candidateReturns.map(x => x.worker_id)).size, 4);

const judge = compilePrimaryChatResponseJudgeFanout({
  request_id: projection.request_id,
  candidate_returns: candidateReturns,
  exam_template: template,
  judge_contract_ref: 'coordination/guide/PRIMARY_CHAT_RESPONSE_JUDGE_CONTRACT_V1.json'
});
assert.equal(judge.pass, true, JSON.stringify(judge.errors || []));
assert.equal(judge.exam_blocks.length, 2);

const examReturns = [
  {
    schema: 'prometeo.primary-chat-response-exam-return-public/v1',
    request_id: projection.request_id,
    exam_ordinal: 1,
    worker_id: 'wc-c010-exam-1',
    return_ref: 'coordination/portfolio/returns/c010-fixture-exam-1/RETURN.json',
    durable_return: true,
    raw_text_public: false,
    ranking: [2, 1, 3, 4]
  },
  {
    schema: 'prometeo.primary-chat-response-exam-return-public/v1',
    request_id: projection.request_id,
    exam_ordinal: 2,
    worker_id: 'wc-c010-exam-2',
    return_ref: 'coordination/portfolio/returns/c010-fixture-exam-2/RETURN.json',
    durable_return: true,
    raw_text_public: false,
    ranking: [2, 3, 1, 4]
  }
];

const synthesis = synthesizePrimaryChatResponse({
  request_id: projection.request_id,
  candidate_returns: candidateReturns,
  exam_returns: examReturns
});
assert.equal(synthesis.pass, true, JSON.stringify(synthesis.errors || []));
assert.equal(synthesis.final_response.selected_candidate_ordinal, 2);
assert.equal(synthesis.final_response.execution_depth_class, 'REAL_BOT_RETURNS_SYNTHESIZED');
assert.equal(synthesis.final_response.candidate_returns_received, 4);
assert.equal(synthesis.final_response.exam_returns_received, 2);

const richSandbox = { JSON, Object, String, Number, Array, Set, URL };
richSandbox.globalThis = richSandbox;
vm.runInNewContext(richSource, richSandbox, { filename: 'rich-response-v1.js' });
const richApi = richSandbox.PROMETEO_PRIMARY_CHAT_RICH_RESPONSE_V1;
assert.ok(richApi);
const visibleMessage = richApi.normalizeMessage({
  role: 'assistant',
  body_text: 'legacy fallback',
  rich_response: synthesis.final_response.rich_response
});
assert.equal(visibleMessage.body_text, 'respuesta visible 2');
assert.equal(Array.isArray(visibleMessage.ui_blocks), true);
assert.equal(visibleMessage.ui_blocks.some(block => block.type === 'experiment_stats'), true);

const progress = compilePrimaryChatResponseProgress({
  request_id: projection.request_id,
  candidate_returns: candidateReturns,
  exam_returns: examReturns,
  synthesis_return: {
    request_id: projection.request_id,
    return_ref: 'coordination/portfolio/returns/c010-fixture-synthesis/RETURN.json',
    durable_return: true
  }
});
assert.equal(progress.progress.complete, true);
assert.deepEqual(progress.progress.counts, { candidates: 4, exams: 2, synthesis: 1 });
assert.equal(progress.widget.type, 'experiment_stats');
assert.equal(progress.widget.metrics.candidatos, '4/4');
assert.equal(progress.widget.metrics.examenes, '2/2');
assert.equal(progress.widget.metrics.sintesis, '1/1');
assert.equal(progress.progress.liveness_claimed, false);

assert.match(indexHtml, /continuity-capsule-v1\.js/);
assert.match(indexHtml, /response-request-v1\.js/);
assert.match(indexHtml, /rich-response-v1\.js/);
assert.match(indexHtml, /progress-v1\.js/);
assert.match(indexHtml, /submitResponseRequest/);
assert.equal(JSON.stringify(fanout).includes(privateText), false);
assert.equal(JSON.stringify(judge).includes(privateText), false);
assert.equal(JSON.stringify(synthesis).includes(privateText), false);
assert.equal(JSON.stringify(progress).includes(privateText), false);

console.log('PRIMARY_CHAT_INDEPENDENCE_C010_E2E_PASS');
console.log(JSON.stringify({
  request: 'private->sanitized',
  candidate_returns: 4,
  independent_candidate_workers: 4,
  exam_returns: 2,
  independent_exam_workers: 2,
  synthesis: 1,
  final_visible_answer: true,
  progress_widget: 'experiment_stats',
  liveness_claimed: false,
  raw_private_text_public: false
}));
