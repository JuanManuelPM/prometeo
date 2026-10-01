import assert from 'node:assert/strict';
import { mergePrimaryChatMessages } from '../../../scripts/lib/primary-chat-mirror-merge.mjs';

const base = {
  schema: 'prometeo.chat-thread-projection/v1',
  projection_status: 'NON_AUTHORITATIVE',
  chat_object_id: 'chat-object-prometeo-chat-control-main',
  updated_at: '2026-10-01T17:00:00Z',
  messages: [{
    message_id: 'MSG-HUMAN-BASE',
    chat_object_id: 'chat-object-prometeo-chat-control-main',
    actor_type: 'HUMAN',
    body_text: 'base',
    created_at: '2026-10-01T17:00:00Z',
    published_at: '2026-10-01T17:00:00Z',
    privacy: 'PUBLIC_SANITIZED_CANARY'
  }]
};

const worker = (id, resultRef, body, at) => ({
  message_id: id,
  chat_object_id: base.chat_object_id,
  reply_to_message_id: 'MSG-HUMAN-BASE',
  actor_type: 'WORKER',
  source_surface: 'PROMETEO',
  input_origin: 'WORKER_AUTOMATIC',
  body_kind: 'TEXT',
  body_text: body,
  created_at: at,
  published_at: at,
  status: 'PUBLISHED',
  result_ref: resultRef,
  evidence_refs: [],
  privacy: 'PUBLIC_SANITIZED_CANARY'
});

const a = worker('MSG-WORKER-A', 'returns/A.json', 'A', '2026-10-01T17:01:00Z');
const b = worker('MSG-WORKER-B', 'returns/B.json', 'B', '2026-10-01T17:02:00Z');

const one = mergePrimaryChatMessages(base, [a]);
assert.equal(one.added, 1);
assert.equal(one.thread.messages.some(m => m.message_id === a.message_id), true);

const writerA = mergePrimaryChatMessages(base, [a]).thread;
const writerBStaleCandidate = mergePrimaryChatMessages(base, [b]).thread;
const latest = mergePrimaryChatMessages(
  writerA,
  writerBStaleCandidate.messages.filter(m => m.message_id === b.message_id)
);
assert.equal(latest.thread.messages.some(m => m.message_id === a.message_id), true);
assert.equal(latest.thread.messages.some(m => m.message_id === b.message_id), true);
assert.equal(latest.thread.messages.length, 3);

const duplicate = mergePrimaryChatMessages(latest.thread, [b]);
assert.equal(duplicate.added, 0);
assert.equal(duplicate.idempotent, 1);
assert.equal(duplicate.thread.messages.length, 3);

assert.throws(
  () => mergePrimaryChatMessages(latest.thread, [{ ...b, body_text: 'DIFFERENT' }]),
  /MESSAGE_ID_CONFLICT:MSG-WORKER-B/
);

assert.throws(
  () => mergePrimaryChatMessages(latest.thread, [{ ...b, message_id: 'MSG-WORKER-B-OTHER', body_text: 'DIFFERENT' }]),
  /RESULT_REF_CONFLICT:returns\/B\.json/
);

console.log(JSON.stringify({
  schema: 'prometeo.primary-chat-mirror-atomic-append-test-result/v1',
  overall: 'PASS',
  checks: [
    'UNIQUE_APPEND',
    'STALE_WRITERS_RECONCILE_TO_LATEST_WITHOUT_LOSS',
    'DUPLICATE_IDEMPOTENT',
    'MESSAGE_ID_CONFLICT_FAIL_CLOSED',
    'RESULT_REF_CONFLICT_FAIL_CLOSED'
  ]
}, null, 2));
