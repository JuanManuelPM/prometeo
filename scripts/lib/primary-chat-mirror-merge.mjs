import assert from 'node:assert/strict';

function normalizedMessage(message) {
  const clone = JSON.parse(JSON.stringify(message));
  if (Array.isArray(clone.evidence_refs)) clone.evidence_refs = [...clone.evidence_refs].sort();
  return clone;
}

function normalizedMessageWithoutEvidence(message) {
  const clone = normalizedMessage(message);
  delete clone.evidence_refs;
  return clone;
}

function sameMessage(a, b) {
  return JSON.stringify(normalizedMessage(a)) === JSON.stringify(normalizedMessage(b));
}

function sameMessageExceptEvidence(a, b) {
  return JSON.stringify(normalizedMessageWithoutEvidence(a)) === JSON.stringify(normalizedMessageWithoutEvidence(b));
}

function enrichEvidenceRefs(target, candidate) {
  const merged = [...new Set([
    ...(Array.isArray(target?.evidence_refs) ? target.evidence_refs : []),
    ...(Array.isArray(candidate?.evidence_refs) ? candidate.evidence_refs : [])
  ])].sort();
  const current = Array.isArray(target?.evidence_refs) ? [...target.evidence_refs].sort() : [];
  if (JSON.stringify(current) === JSON.stringify(merged)) return false;
  if (merged.length) target.evidence_refs = merged;
  else delete target.evidence_refs;
  return true;
}

function timestamp(message) {
  return Date.parse(message?.published_at || message?.created_at || '') || 0;
}

function isPublicCanaryWorkerReply(message) {
  return message?.actor_type === 'WORKER'
    && message?.input_origin === 'WORKER_AUTOMATIC'
    && String(message?.privacy || '').toUpperCase() === 'PUBLIC_SANITIZED_CANARY'
    && String(message?.result_ref || '').startsWith('coordination/portfolio/returns/portfolio-primary-chat-canary-');
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
  let updated = 0;
  for (const candidate of candidateMessages) {
    if (!candidate?.message_id) throw new Error('CANDIDATE_MESSAGE_ID_REQUIRED');

    const sameId = byId.get(candidate.message_id);
    if (sameId) {
      if (!sameMessage(sameId, candidate)) {
        if (!sameMessageExceptEvidence(sameId, candidate)) {
          throw new Error(`MESSAGE_ID_CONFLICT:${candidate.message_id}`);
        }
        if (enrichEvidenceRefs(sameId, candidate)) updated += 1;
      }
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

  return { thread, added, idempotent, updated };
}

export function reconcilePrimaryChatCanonicalWorkerReplies(threadInput, canonicalMessages = []) {
  const thread = validatePrimaryChatMirror(JSON.parse(JSON.stringify(threadInput)));
  const canonicalByReply = new Map();

  for (const candidate of canonicalMessages) {
    if (!candidate?.message_id) throw new Error('CANDIDATE_MESSAGE_ID_REQUIRED');
    if (!candidate?.reply_to_message_id) throw new Error(`CANDIDATE_REPLY_TO_REQUIRED:${candidate.message_id}`);
    if (!isPublicCanaryWorkerReply(candidate)) throw new Error(`CANDIDATE_NOT_PUBLIC_CANARY_WORKER_REPLY:${candidate.message_id}`);
    if (canonicalByReply.has(candidate.reply_to_message_id)) {
      throw new Error(`MULTIPLE_CANONICAL_REPLIES:${candidate.reply_to_message_id}`);
    }
    canonicalByReply.set(candidate.reply_to_message_id, candidate);
  }

  let superseded = 0;
  thread.messages = thread.messages.filter(message => {
    const canonical = canonicalByReply.get(message?.reply_to_message_id);
    if (!canonical || !isPublicCanaryWorkerReply(message)) return true;
    if (message?.message_id === canonical.message_id || message?.result_ref === canonical.result_ref) return true;
    superseded += 1;
    return false;
  });

  const merged = mergePrimaryChatMessages(thread, canonicalMessages);
  return { ...merged, superseded };
}
