import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const index = JSON.parse(await readFile(join(ROOT, 'coordination/project-context-v1/INDEX.json'), 'utf8'));
if (index.schema !== 'prometeo.project-context-index/v1') throw new Error('bad index schema');
if (index.projection_status !== 'NON_AUTHORITATIVE_PROJECTION') throw new Error('index authority regression');
if (!Array.isArray(index.projects) || index.projects.length < 1) throw new Error('empty contexts');
const seen = new Set();
const allowedTop = new Set(['schema','projection_status','authority_boundary','project_id','label','status','priority','revision','cycle_count','objective','focus','freshness','blockers','frontier','owner_refs','privacy']);

function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

for (const entry of index.projects) {
  if (seen.has(entry.project_id)) throw new Error(`duplicate ${entry.project_id}`);
  seen.add(entry.project_id);
  const context = JSON.parse(await readFile(join(ROOT, entry.context_ref), 'utf8'));
  for (const key of Object.keys(context)) if (!allowedTop.has(key)) throw new Error(`unexpected context key ${key}`);
  if (context.project_id !== entry.project_id) throw new Error(`project mismatch ${entry.project_id}`);
  if (context.projection_status !== 'NON_AUTHORITATIVE_PROJECTION') throw new Error(`authority regression ${entry.project_id}`);
  if (context.privacy?.allowlisted_fields_only !== true) throw new Error(`privacy allowlist missing ${entry.project_id}`);
  if (context.privacy?.copied_private_chat_transcript !== false) throw new Error(`private transcript flag bad ${entry.project_id}`);
  const [sourcePath, sourceSha] = context.owner_refs.state.split('@');
  const raw = await readFile(join(ROOT, sourcePath), 'utf8');
  const source = JSON.parse(raw);
  if (gitBlobSha(raw) !== sourceSha) throw new Error(`source sha mismatch ${entry.project_id}`);
  if (source.project_id !== context.project_id || source.status !== context.status || source.updated_at !== context.freshness.source_updated_at) {
    throw new Error(`source drift ${entry.project_id}`);
  }
  if (JSON.stringify(source.frontier_refs ?? []) !== JSON.stringify(context.frontier.refs)) throw new Error(`frontier drift ${entry.project_id}`);
  if ((source.blockers ?? []).length !== context.blockers.count) throw new Error(`blocker count drift ${entry.project_id}`);
}
process.stdout.write(JSON.stringify({ status:'PASS', project_count:index.projects.length, non_authoritative:true, allowlisted:true }) + '\n');
