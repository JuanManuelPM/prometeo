import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileActivityTimeline } from '../scripts/build-activity-timeline.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-activity-timeline-'));
fs.mkdirSync(path.join(root, 'coordination', 'chat-sessions', 'CHAT-TEST'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'workers', 'exams'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'portfolio', 'returns', 'job-test'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'guide', 'receipts', 'guide-test'), { recursive: true });

fs.writeFileSync(path.join(root, 'coordination', 'chat-sessions', 'CHAT-TEST', 'JOURNAL.json'), JSON.stringify({
  schema: 'prometeo.chat-session-journal/v1',
  session_id: 'CHAT-TEST',
  entries: [
    {
      entry_id: 'J001',
      created_at: '2026-10-03T12:00:00Z',
      human_intent_summary: 'Quiero mover el sistema sin publicar texto privado.',
      assistant_conclusion: 'Se preserva sólo resumen público sanitizado.'
    },
    {
      entry_id: 'J002',
      created_at: '2026-10-03T12:10:00Z',
      human_intent_summary: 'Segundo checkpoint.',
      assistant_conclusion: 'Resultado parcial.'
    }
  ]
}, null, 2));

fs.writeFileSync(path.join(root, 'coordination', 'portfolio', 'returns', 'job-test', 'RETURN.json'), JSON.stringify({
  worker_id: 'wc-test',
  returned_at: '2026-10-03T12:09:00Z',
  project_id: 'prometeo-autonomous-growth',
  job_id: 'job-test',
  outcome: 'VERIFIED',
  productive_unit_counted: true
}, null, 2));

fs.writeFileSync(path.join(root, 'coordination', 'guide', 'receipts', 'guide-test', 'RECEIPT.json'), JSON.stringify({
  worker_id: 'wc-test',
  created_at: '2026-10-03T12:11:00Z',
  guide_work_id: 'guide-test',
  status: 'DONE'
}, null, 2));

const runtime = {
  schema: 'prometeo.worker-runtime/v1',
  batches: [{
    batch_id: 'POOL-TEST',
    workers: [{
      worker_id: 'wc-test',
      state: 'CLOSED',
      first_event_at: '2026-10-03T11:55:00Z',
      last_event_at: '2026-10-03T12:12:00Z',
      productive_units: 3,
      close: { terminal: true, at: '2026-10-03T12:12:00Z' },
      repo: { exam_ref: 'coordination/workers/exams/wc-test.json' }
    }]
  }]
};

const out = compileActivityTimeline(runtime, root, '2026-10-03T12:15:00Z', 8);
assert.equal(out.schema, 'prometeo.activity-timeline/v1');
assert.equal(out.cycle.seconds, 1800);
assert.equal(out.cycle.human_burst_seconds, 300);
assert.equal(out.coverage.raw_prompt_text_public, false);
assert.equal(out.coverage.arbitrary_external_ai_sessions, 'UNOBSERVED_UNTIL_RECORDER_ADAPTER_EXISTS');
assert.equal(out.spans.filter(x => x.actor_kind === 'worker').length, 1);
assert.equal(out.spans.filter(x => x.actor_kind === 'ai_session').length, 1);
assert.equal(out.events.filter(x => x.type === 'HUMAN_PROMPT_CHECKPOINT').length, 2);
assert.equal(out.events.filter(x => x.type === 'RETURN').length, 1);
assert.equal(out.events.filter(x => x.type === 'GUIDE_RECEIPT').length, 1);
assert.ok(out.events.every(x => !Object.hasOwn(x, 'raw_text')));
const worker = out.spans.find(x => x.actor_kind === 'worker');
assert.equal(worker.start_at, '2026-10-03T11:55:00.000Z');
assert.equal(worker.end_at, '2026-10-03T12:12:00.000Z');
assert.equal(worker.productive_units, 3);
const ai = out.spans.find(x => x.actor_kind === 'ai_session');
assert.equal(ai.evidence_level, 'JOURNAL_CHECKPOINTS_ONLY');

fs.rmSync(root, { recursive: true, force: true });
console.log('PASS activity-timeline-v1');
