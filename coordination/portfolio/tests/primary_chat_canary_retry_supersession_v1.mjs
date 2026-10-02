import assert from 'node:assert/strict';
import { reconcilePrimaryChatCanonicalWorkerReplies } from '../../../scripts/lib/primary-chat-mirror-merge.mjs';

const replyTo = 'MSG-HUMAN-CANARY-TEST';
const base = {
  chat_object_id: 'chat-object-prometeo-chat-control-main',
  reply_to_message_id: replyTo,
  actor_type: 'WORKER',
  source_surface: 'PROMETEO',
  input_origin: 'WORKER_AUTOMATIC',
  body_kind: 'TEXT',
  body_text: 'PONG',
  status: 'PUBLISHED',
  privacy: 'PUBLIC_SANITIZED_CANARY'
};

const boundary = {
  ...base,
  message_id: 'MSG-WORKER-BOUNDARY',
  actor_ref: 'coordination/workers/beacons/w-boundary.json',
  created_at: '2026-10-01T14:00:00Z',
  published_at: '2026-10-01T14:00:00Z',
  result_ref: 'coordination/portfolio/returns/portfolio-primary-chat-canary-test/RETURN-boundary.json'
};
const stale = {
  ...base,
  message_id: 'MSG-WORKER-STALE',
  actor_ref: 'coordination/workers/beacons/w-stale.json',
  created_at: '2026-10-01T17:00:00Z',
  published_at: '2026-10-01T17:00:00Z',
  result_ref: 'coordination/portfolio/returns/portfolio-primary-chat-canary-test/RETURN-stale.json'
};
const done = {
  ...base,
  message_id: 'MSG-WORKER-DONE',
  actor_ref: 'coordination/workers/beacons/w-done.json',
  created_at: '2026-10-01T18:00:00Z',
  published_at: '2026-10-01T18:00:00Z',
  result_ref: 'coordination/portfolio/returns/portfolio-primary-chat-canary-test/RETURN-done.json'
};

const thread = {
  schema: 'prometeo.chat-thread-projection/v1',
  projection_status: 'NON_AUTHORITATIVE',
  chat_object_id: 'chat-object-prometeo-chat-control-main',
  messages: [
    {
      message_id: replyTo,
      chat_object_id: 'chat-object-prometeo-chat-control-main',
      actor_type: 'HUMAN',
      body_kind: 'TEXT',
      body_text: 'CANARY: respondé PONG.',
      created_at: '2026-10-01T13:00:00Z',
      published_at: '2026-10-01T13:00:00Z',
      status: 'PUBLISHED',
      privacy: 'PUBLIC_SANITIZED_CANARY'
    },
    boundary,
    stale,
    done
  ]
};

const reconciled = reconcilePrimaryChatCanonicalWorkerReplies(thread, [done]);
assert.equal(reconciled.superseded, 2, 'boundary and stale retry projections must be superseded');
assert.equal(reconciled.added, 0, 'existing canonical DONE must remain idempotent');
assert.equal(reconciled.thread.projection_status, 'NON_AUTHORITATIVE');

const workerReplies = reconciled.thread.messages.filter(message =>
  message.actor_type === 'WORKER' && message.reply_to_message_id === replyTo
);
assert.equal(workerReplies.length, 1, 'exactly one worker reply must remain projected for the canary');
assert.equal(workerReplies[0].message_id, done.message_id);
assert.equal(workerReplies[0].body_text, 'PONG');
assert.equal(workerReplies[0].result_ref, done.result_ref);
assert.equal(workerReplies[0].privacy, 'PUBLIC_SANITIZED_CANARY');

console.log('PRIMARY_CHAT_CANARY_RETRY_SUPERSESSION_V1_PASS');
