import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const GUIDE_ROOT = join(ROOT, 'coordination', 'project-guides');
const OUT_ROOT = join(ROOT, 'coordination', 'project-context-v1');
const PROJECT_OUT = join(OUT_ROOT, 'projects');
const compiledAt = process.env.PROMETEO_COMPILED_AT || new Date().toISOString();

function gitBlobSha(text) {
  const bytes = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function buildContext(state, sourcePath, sourceSha) {
  return {
    schema: 'prometeo.project-context/v1',
    projection_status: 'NON_AUTHORITATIVE_PROJECTION',
    authority_boundary: 'Source STATE and referenced owner receipts remain authority; this projection never owns work, claims, routing or promotion.',
    project_id: state.project_id,
    label: state.label,
    status: state.status,
    priority: state.priority,
    revision: state.revision,
    cycle_count: state.cycle_count,
    objective: state.objective,
    focus: state.focus,
    freshness: {
      source_updated_at: state.updated_at ?? null,
      compiled_at: compiledAt
    },
    blockers: {
      count: Array.isArray(state.blockers) ? state.blockers.length : 0,
      items: Array.isArray(state.blockers) ? state.blockers : []
    },
    frontier: {
      target: state.frontier_target ?? 0,
      refs: Array.isArray(state.frontier_refs) ? state.frontier_refs : []
    },
    owner_refs: {
      state: `${sourcePath}@${sourceSha}`,
      last_receipt: state.last_receipt ?? null,
      authority: state.authority ?? null
    },
    privacy: {
      source_class: 'PUBLIC_DURABLE_PROJECT_GUIDE_STATE',
      copied_private_chat_transcript: false,
      copied_audio: false,
      copied_token_or_secret: false,
      allowlisted_fields_only: true
    }
  };
}

await mkdir(PROJECT_OUT, { recursive: true });
const entries = await readdir(GUIDE_ROOT, { withFileTypes: true });
const projects = [];

for (const entry of entries.filter(x => x.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const sourcePath = `coordination/project-guides/${entry.name}/STATE.json`;
  let raw;
  try {
    raw = await readFile(join(ROOT, sourcePath), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') continue;
    throw error;
  }
  const state = JSON.parse(raw);
  if (state.schema !== 'prometeo.project-guide-state/v1' || !state.project_id) continue;
  const sourceSha = gitBlobSha(raw);
  const context = buildContext(state, sourcePath, sourceSha);
  const contextRef = `coordination/project-context-v1/projects/${context.project_id}.json`;
  await writeFile(join(ROOT, contextRef), JSON.stringify(context, null, 2) + '\n', 'utf8');
  projects.push({
    project_id: context.project_id,
    label: context.label,
    status: context.status,
    priority: context.priority,
    context_ref: contextRef,
    source_ref: context.owner_refs.state,
    source_updated_at: context.freshness.source_updated_at,
    blocker_count: context.blockers.count,
    frontier_count: context.frontier.refs.length
  });
}

projects.sort((a, b) => a.project_id.localeCompare(b.project_id));
const index = {
  schema: 'prometeo.project-context-index/v1',
  projection_status: 'NON_AUTHORITATIVE_PROJECTION',
  authority_boundary: 'Read-only orientation projection compiled from coordination/project-guides/*/STATE.json. Source STATE and owner receipts remain authority.',
  compiled_at: compiledAt,
  source_root: 'coordination/project-guides/',
  compiler_ref: 'coordination/project-context-v1/compiler.mjs',
  self_test_ref: 'coordination/project-context-v1/self-test.mjs',
  project_count: projects.length,
  projects
};
await writeFile(join(OUT_ROOT, 'INDEX.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify({ compiled_at: compiledAt, project_count: projects.length }) + '\n');
