import fs from 'node:fs';
import path from 'node:path';
import { reconcilePrimaryChatCanonicalWorkerReplies } from './lib/primary-chat-mirror-merge.mjs';
import { primaryChatQaUiBlocks } from './lib/primary-chat-async-qa-v1.mjs';

const root = process.cwd();
const threadRel = 'coordination/portfolio/evidence/prometeo-autonomous-growth/CHAT_THREAD_MIRROR_CANARY_V1.json';
const returnsRootRel = 'coordination/portfolio/returns';
const threadPath = path.join(root, threadRel);
const returnsRoot = path.join(root, returnsRootRel);

const thread = JSON.parse(fs.readFileSync(threadPath, 'utf8'));
if (thread?.schema !== 'prometeo.chat-thread-projection/v1') {
  throw new Error('THREAD_SHAPE_INCOMPATIBLE');
}
if (!Array.isArray(thread.messages)) thread.messages = [];

const candidateDirs = fs.existsSync(returnsRoot)
  ? fs.readdirSync(returnsRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('portfolio-primary-chat-canary-'))
      .map(entry => entry.name)
      .sort()
  : [];

function outcomeRank(outcome) {
  const value = String(outcome || '').toUpperCase();
  if (['DONE', 'PASS', 'SUCCESS', 'DEPLOYED'].some(token => value.includes(token))) return 4;
  if (value.includes('PARTIAL')) return 3;
  if (value.includes('STALE')) return 2;
  if (value.includes('BOUNDARY')) return 1;
  return 0;
}

function compareReturns(a, b) {
  const rankDelta = outcomeRank(a?.outcome) - outcomeRank(b?.outcome);
  if (rankDelta) return rankDelta;
  const generationDelta = Number(a?.generation || 0) - Number(b?.generation || 0);
  if (generationDelta) return generationDelta;
  return (Date.parse(a?.returned_at || 0) || 0) - (Date.parse(b?.returned_at || 0) || 0);
}

const winnersByReply = new Map();
for (const dir of candidateDirs) {
  const dirPath = path.join(returnsRoot, dir);
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile() || !/^RETURN-.*\.json$/i.test(entry.name)) continue;
    const rel = path.posix.join(returnsRootRel, dir, entry.name);

    let ret;
    try {
      ret = JSON.parse(fs.readFileSync(path.join(dirPath, entry.name), 'utf8'));
    } catch {
      continue;
    }

    const responseText = typeof ret?.response_text === 'string' ? ret.response_text.trim() : '';
    const replyTo = typeof ret?.reply_to_message_id === 'string' ? ret.reply_to_message_id.trim() : '';
    const privacy = String(ret?.privacy || '').toUpperCase();
    const workerId = typeof ret?.worker_id === 'string' ? ret.worker_id.trim() : '';
    const returnedAt = typeof ret?.returned_at === 'string' ? ret.returned_at : null;

    if (!responseText || !replyTo || privacy !== 'PUBLIC_SANITIZED_CANARY') continue;
    if (!String(ret?.job_id || '').startsWith('portfolio-primary-chat-canary-')) continue;
    if (!thread.messages.some(message => message?.message_id === replyTo)) continue;

    const messageId = `MSG-WORKER-${String(ret?.return_id || entry.name.replace(/\.json$/i, ''))}`;
    const qaBlocks = primaryChatQaUiBlocks(ret?.qa);
    const candidate = {
      message_id: messageId,
      chat_object_id: thread.chat_object_id,
      reply_to_message_id: replyTo,
      actor_type: 'WORKER',
      ...(workerId ? { actor_ref: `coordination/workers/beacons/${workerId}.json` } : {}),
      source_surface: 'PROMETEO',
      input_origin: 'WORKER_AUTOMATIC',
      body_kind: 'TEXT',
      body_text: responseText,
      created_at: returnedAt,
      published_at: returnedAt,
      status: 'PUBLISHED',
      result_ref: rel,
      evidence_refs: Array.isArray(ret?.evidence) ? ret.evidence : [],
      ...(qaBlocks.length ? { ui_blocks: qaBlocks } : {}),
      privacy: 'PUBLIC_SANITIZED_CANARY'
    };

    const previous = winnersByReply.get(replyTo);
    if (!previous || compareReturns(previous.ret, ret) < 0) winnersByReply.set(replyTo, { ret, candidate });
  }
}

const canonicalMessages = [...winnersByReply.values()].map(value => value.candidate);
if (!canonicalMessages.length) {
  console.log('Primary Chat mirror has no eligible canonical canary returns to reconcile.');
  process.exit(0);
}

const reconciled = reconcilePrimaryChatCanonicalWorkerReplies(thread, canonicalMessages);
if (!reconciled.added && !reconciled.superseded && !reconciled.updated) {
  console.log('Primary Chat mirror already matches canonical canary winners.');
  process.exit(0);
}

fs.writeFileSync(threadPath, JSON.stringify(reconciled.thread, null, 2) + '\n');
console.log(`Primary Chat mirror reconciled ${reconciled.added} canonical winner(s); superseded ${reconciled.superseded} stale retry projection(s); enriched ${reconciled.updated} evidence set(s).`);
for (const message of canonicalMessages) {
  if (reconciled.thread.messages.some(existing => existing.result_ref === message.result_ref)) {
    console.log(`${message.reply_to_message_id} -> ${message.body_text} (${message.result_ref})`);
  }
}
