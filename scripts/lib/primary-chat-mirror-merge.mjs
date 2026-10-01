import assert from 'node:assert/strict';

function normalizedMessage(message) {
  const clone = JSON.parse(JSON.stringify(message));
  if (Array.isArray(clone.evidence_refs)) clone.evidence_refs = [...clone.evidence_refs].sort();
  return clone;
}

function sameMessage(a, b) {
  return JSON.stringify(normalizedMessage(a)) === JSON.stringify(normalizedMessage(b));
}

function timestamp(message) {
  return Date.parse(message?.published_at || message?.created_at || '') || 0;
}

export function validatePrimaryChatMirror(thread) {
  assert.equal(thread?.schema, 'prometeo.chat-thread-projection/v1', 'THREAD_SHAPE_INCOMPATIBLE');
  if (!Array.isArray(thread.messages)) thread.messages = [];
  return thread;
}

export function mergePrimaryChatMessages(threadInput, candidateMessages = []) {
  const thread = validatePrimaryChatMirror(JSON.parse(JSON.stringify(threadInput)));
  const messages = [...thread.messages];
  const byId = new Map();
  const byResultRef = new Map();

  for (const message of messages) {
    if (message?.message_id) {
      if (byId.has(message.message_id) && !sameMessage(byId.get(message.message_id), message)) {
        throw new Error(`MESSAGE_ID_CONFLICT:${message.message_id}`);
      }
      byId.set(message.message_id, message);
    }
    if (message?.result_ref) {
      if (byResultRef.has(message.result_ref) && !sameMessage(byResultRef.get(message.result_ref), message)) {
        throw new Error(`RESULT_REF_CONFLICT:${message.result_ref}`);
      }
      byResultRef.set(message.result_ref, message);
    }
  }

  let added = 0;
  let idempotent = 0;
  for (const candidate of candidateMessages) {
    if (!candidate?.message_id) throw new Error('CANDIDATE_MESSAGE_ID_REQUIRED');

    const sameId = byId.get(candidate.message_id);
    if (sameId) {
      if (!sameMessage(sameId, candidate)) throw new Error(`MESSAGE_ID_CONFLICT:${candidate.message_id}`);
      idempotent += 1;
      continue;
    }

    if (candidate?.result_ref) {
      const sameResult = byResultRef.get(candidate.result_ref);
      if (sameResult) {
        if (!sameMessage(sameResult, candidate)) throw new Error(`RESULT_REF_CONFLICT:${candidate.result_ref}`);
        idempotent += 1;
        continue;
      }
    }

    const copy = JSON.parse(JSON.stringify(candidate));
    messages.push(copy);
    byId.set(copy.message_id, copy);
    if (copy.result_ref) byResultRef.set(copy.result_ref, copy);
    added += 1;
  }

  messages.sort((a, b) => {
    const delta = timestamp(a) - timestamp(b);
    if (delta) return delta;
    return String(a?.message_id || '').localeCompare(String(b?.message_id || ''));
  });

  thread.messages = messages;
  const newest = messages.reduce((max, message) => {
    const value = message?.published_at || message?.created_at;
    const ms = Date.parse(value || '') || 0;
    return ms > max.ms ? { ms, value } : max;
  }, { ms: 0, value: thread.updated_at || null });
  if (newest.value) thread.updated_at = newest.value;

  return { thread, added, idempotent };
}
