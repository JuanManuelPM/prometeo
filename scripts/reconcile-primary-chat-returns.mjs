import fs from 'node:fs';
import path from 'node:path';

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

const existingResultRefs = new Set(
  thread.messages.map(message => message?.result_ref).filter(Boolean)
);
const existingMessageIds = new Set(
  thread.messages.map(message => message?.message_id).filter(Boolean)
);

const candidateDirs = fs.existsSync(returnsRoot)
  ? fs.readdirSync(returnsRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('portfolio-primary-chat-canary-'))
      .map(entry => entry.name)
      .sort()
  : [];

const additions = [];
for (const dir of candidateDirs) {
  const dirPath = path.join(returnsRoot, dir);
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile() || !/^RETURN-.*\.json$/i.test(entry.name)) continue;
    const rel = path.posix.join(returnsRootRel, dir, entry.name);
    if (existingResultRefs.has(rel)) continue;

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

    // This reconciler is deliberately narrow: only explicit public canaries may be projected.
    if (!responseText || !replyTo || privacy !== 'PUBLIC_SANITIZED_CANARY') continue;
    if (!String(ret?.job_id || '').startsWith('portfolio-primary-chat-canary-')) continue;
    if (!thread.messages.some(message => message?.message_id === replyTo)) continue;

    const baseId = `MSG-WORKER-${String(ret?.return_id || entry.name.replace(/\.json$/i, ''))}`;
    let messageId = baseId;
    let suffix = 2;
    while (existingMessageIds.has(messageId)) messageId = `${baseId}-${suffix++}`;

    const message = {
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
      privacy: 'PUBLIC_SANITIZED_CANARY'
    };

    additions.push(message);
    existingResultRefs.add(rel);
    existingMessageIds.add(messageId);
  }
}

if (!additions.length) {
  console.log('Primary Chat mirror already contains all eligible canonical canary returns.');
  process.exit(0);
}

thread.messages.push(...additions);
thread.messages.sort((a, b) => {
  const ta = Date.parse(a?.published_at || a?.created_at || '') || 0;
  const tb = Date.parse(b?.published_at || b?.created_at || '') || 0;
  return ta - tb;
});
const newest = thread.messages.reduce((max, message) => {
  const value = message?.published_at || message?.created_at;
  const ms = Date.parse(value || '') || 0;
  return ms > max.ms ? { ms, value } : max;
}, { ms: 0, value: thread.updated_at || null });
if (newest.value) thread.updated_at = newest.value;

fs.writeFileSync(threadPath, JSON.stringify(thread, null, 2) + '\n');
console.log(`Primary Chat mirror reconciled ${additions.length} canonical canary return(s).`);
for (const message of additions) console.log(`${message.reply_to_message_id} -> ${message.body_text} (${message.result_ref})`);
