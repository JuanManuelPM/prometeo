import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import process from 'node:process';

const SCHEMA = 'prometeo.page-change-thread-bridge/v1';
const PLANNER_SCHEMA = 'prometeo.page-thread-planner-input/v1';
const OPPORTUNITY_SCHEMA = 'prometeo.opportunity-candidate/v1';
const EXECUTION_RESULT_SCHEMA = 'prometeo.execution-result/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeId(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  const bytes = typeof value === 'string' ? value : JSON.stringify(stable(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

function assertRefArray(name, refs, { min = 0 } = {}) {
  invariant(Array.isArray(refs), `${name} must be an array`);
  invariant(refs.length >= min, `${name} must contain at least ${min} item(s)`);
  for (const [index, item] of refs.entries()) {
    invariant(item && typeof item === 'object', `${name}[${index}] must be an object`);
    invariant(nonEmptyString(item.ref), `${name}[${index}].ref is required`);
    if ('digest' in item && item.digest !== null) {
      invariant(nonEmptyString(item.digest), `${name}[${index}].digest must be a non-empty string or null`);
    }
  }
}

function publicRef(ref) {
  const out = { ref: ref.ref };
  if (nonEmptyString(ref.digest)) out.digest = ref.digest;
  if (nonEmptyString(ref.kind)) out.kind = ref.kind;
  if (nonEmptyString(ref.state)) out.state = ref.state;
  return out;
}

export function buildPageThreadBridge(input, options = {}) {
  const source = clone(input);
  const now = options.now ?? new Date().toISOString();

  invariant(source && typeof source === 'object', 'input object is required');
  invariant(source.target && typeof source.target === 'object', 'target is required');
  invariant(nonEmptyString(source.target.surface_id), 'target.surface_id is required');
  invariant(source.target.page_id === null || source.target.page_id === undefined || nonEmptyString(source.target.page_id), 'target.page_id must be null or a non-empty string');
  invariant(nonEmptyString(source.target.owner_ref), 'target.owner_ref is required');

  invariant(source.intent && typeof source.intent === 'object', 'intent is required');
  invariant(nonEmptyString(source.intent.raw_text), 'intent.raw_text is required');
  invariant(nonEmptyString(source.intent.sanitized_summary), 'intent.sanitized_summary is required');
  invariant(source.intent.public_safe_summary === true, 'intent.public_safe_summary must be true before public coordination output is emitted');
  assertRefArray('intent.capture_refs', source.intent.capture_refs ?? [], { min: 1 });

  invariant(source.context && typeof source.context === 'object', 'context is required');
  assertRefArray('context.current', source.context.current ?? [], { min: 1 });
  assertRefArray('context.candidate', source.context.candidate ?? []);
  assertRefArray('context.history', source.context.history ?? []);

  invariant(source.routing && typeof source.routing === 'object', 'routing is required');
  invariant(nonEmptyString(source.routing.host_url), 'routing.host_url is required');
  invariant(nonEmptyString(source.routing.return_root), 'routing.return_root is required');
  invariant(nonEmptyString(source.routing.host_project), 'routing.host_project is required');

  const surfaceId = source.target.surface_id.trim();
  const pageId = source.target.page_id?.trim() || null;
  const targetKey = `${surfaceId}::${pageId ?? '@surface'}`;
  const intentDigest = digest(source.intent.raw_text.trim());
  const contextDigest = digest({
    current: source.context.current.map(publicRef),
    candidate: source.context.candidate.map(publicRef),
    history: source.context.history.map(publicRef),
  });
  const threadId = `PCT-${digest(targetKey).slice(0, 16)}`;
  const workFingerprint = digest({ targetKey, intentDigest, contextDigest });
  const opportunityId = `O-PAGE-${normalizeId(surfaceId)}-${workFingerprint.slice(0, 12).toUpperCase()}`;
  const workItemId = `WI-${workFingerprint.slice(0, 20).toUpperCase()}`;

  const host = new URL(source.routing.host_url);
  if (pageId) host.searchParams.set('page', pageId);
  else host.searchParams.set('surface', surfaceId);
  host.searchParams.set('changes', workItemId);

  const returnRoot = source.routing.return_root.replace(/\/+$/, '');
  const returnDir = `${returnRoot}/${workItemId}`;

  const currentRefs = source.context.current.map(publicRef);
  const candidateRefs = source.context.candidate.map(publicRef);
  const historyRefs = source.context.history.map(publicRef);
  const captureRefs = source.intent.capture_refs.map(publicRef);

  const plannerInput = {
    schema: PLANNER_SCHEMA,
    thread_id: threadId,
    work_item_id: workItemId,
    target: {
      surface_id: surfaceId,
      page_id: pageId,
      owner_ref: source.target.owner_ref,
    },
    human_intent: {
      sanitized_summary: source.intent.sanitized_summary,
      intent_digest: intentDigest,
      capture_refs: captureRefs,
      raw_text_included: false,
    },
    truth_layers: {
      current: currentRefs,
      candidate: candidateRefs,
      history: historyRefs,
    },
    preserve_first: true,
    owner_resolution_required: true,
    authority: 'CANDIDATE_ONLY_NO_GLOBAL_PROMOTION',
  };

  const opportunity = {
    schema: OPPORTUNITY_SCHEMA,
    opportunity_id: opportunityId,
    dedup_key: workFingerprint,
    state: 'CANDIDATE',
    source: 'PAGE_CHANGE_THREAD_BRIDGE',
    thread_id: threadId,
    work_item_id: workItemId,
    target: plannerInput.target,
    mission: source.intent.sanitized_summary,
    planner_input: plannerInput,
    execution: {
      protocol_ref: 'coordination/AGENT_EXECUTION_PROTOCOL_V1.md',
      packet_state: 'SEED_ONLY_NOT_ISSUED',
      stable_entry_required: true,
      return_path_template: `${returnDir}/<run_id>.json`,
      expected_return_schema: EXECUTION_RESULT_SCHEMA,
    },
    routing: {
      host_project: source.routing.host_project,
      prometeo_url: host.toString(),
      return_dir: returnDir,
    },
    authority: {
      mutation: 'SCOPED_OWNER_ONLY',
      integration: 'CANDIDATE_ONLY',
      global_promotion_allowed: false,
      human_acceptance_implied: false,
      served_implied: false,
    },
  };

  return {
    schema: SCHEMA,
    generated_at: now,
    bridge_version: 1,
    thread: {
      schema: 'prometeo.page-change-thread-pointer/v1',
      thread_id: threadId,
      target: plannerInput.target,
      intent_receipt: {
        intent_digest: intentDigest,
        sanitized_summary: source.intent.sanitized_summary,
        capture_refs: captureRefs,
        raw_text_included: false,
      },
      context_receipt: {
        digest: contextDigest,
        current: currentRefs,
        candidate: candidateRefs,
        history: historyRefs,
      },
    },
    planner_input: plannerInput,
    opportunity,
    return_feed: {
      state: 'AWAITING_EXECUTION',
      expected_schema: EXECUTION_RESULT_SCHEMA,
      return_dir: returnDir,
      ingestion_rule: 'INGEST_SANITIZED_RETURN_AND_RECEIPT_ONLY',
      private_thread_join_key: workItemId,
    },
    host_projection: {
      state: 'CANDIDATE_ONLY',
      prometeo_url: host.toString(),
      project: source.routing.host_project,
      reopen_by: { thread_id: threadId, work_item_id: workItemId },
    },
    privacy: {
      raw_intent_emitted: false,
      private_capture_literals_emitted: false,
      public_coordination_contains_only_sanitized_summary_and_refs: true,
    },
    authority: {
      page_change_thread_is_projection_not_product_authority: true,
      current_unchanged: true,
      human_accepted_unchanged: true,
      served_unchanged: true,
      global_promotion_allowed: false,
    },
    receipts: {
      target_key_digest: digest(targetKey),
      intent_digest: intentDigest,
      context_digest: contextDigest,
      work_fingerprint: workFingerprint,
    },
  };
}

function parseArgs(argv) {
  const args = { input: null, output: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--output') args.output = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  invariant(nonEmptyString(args.input), '--input <file> is required');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = JSON.parse(await fs.readFile(args.input, 'utf8'));
  const result = buildPageThreadBridge(input);
  const encoded = `${JSON.stringify(result, null, 2)}\n`;
  if (args.output) await fs.writeFile(args.output, encoded, 'utf8');
  else process.stdout.write(encoded);
}

const invoked = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (invoked) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
