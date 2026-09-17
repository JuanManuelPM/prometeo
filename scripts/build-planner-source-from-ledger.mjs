#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateIntegrationDispositionLedger, loadSchema } from './validate-integration-dispositions.mjs';

const TERMINAL_RETURN_STATES = new Set(['RETURNED_CANDIDATE','RETURNED','DONE','VERIFIED','NO_ACTION_NEEDED','SUPERSEDED']);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stableValue(value[k])]));
  return value;
}
function stableStringify(value) { return JSON.stringify(stableValue(value), null, 2) + '\n'; }
function sha256Bytes(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function fail(code, detail) { const e = new Error(`${code}${detail ? `:${detail}` : ''}`); e.code = code; throw e; }
function safeReturnPath(repoRoot, ref) {
  if (typeof ref !== 'string' || !ref || path.isAbsolute(ref) || ref.includes('..')) fail('UNSAFE_RETURN_REF', ref);
  const resolved = path.resolve(repoRoot, ref);
  const root = path.resolve(repoRoot) + path.sep;
  if (!resolved.startsWith(root)) fail('RETURN_REF_ESCAPES_REPO', ref);
  return resolved;
}
function extractPlanningAtoms(doc) {
  if (doc?.planning_atom_candidate && typeof doc.planning_atom_candidate === 'object') return [doc.planning_atom_candidate];
  if (Array.isArray(doc?.planning_atoms)) return doc.planning_atoms;
  return [];
}
function isTerminalReturn(doc) {
  return TERMINAL_RETURN_STATES.has(String(doc?.state ?? doc?.outcome ?? '').toUpperCase());
}

export function buildPlannerSourceFromLedger({ledger, previousOutput, returnBytesByRef, schema = {}}) {
  const validation = validateIntegrationDispositionLedger(ledger, schema);
  if (!validation.ok) { const e = new Error('INVALID_INTEGRATION_DISPOSITION_LEDGER'); e.validation = validation; throw e; }
  if (!previousOutput || previousOutput.schema !== 'prometeo.planner-generation-output/v1') fail('INVALID_PREVIOUS_OUTPUT');
  if (!ledger.generation_id || ledger.generation_id === previousOutput.generation_id) fail('INVALID_TARGET_GENERATION', ledger.generation_id);

  const dispositions = [];
  const satisfied = new Set();
  const entries = [...ledger.entries].sort((a,b) => a.return_ref.localeCompare(b.return_ref));
  for (const entry of entries) {
    const bytes = returnBytesByRef.get(entry.return_ref);
    if (!bytes) fail('MISSING_RETURN_BYTES', entry.return_ref);
    const actualHash = sha256Bytes(bytes);
    if (actualHash !== entry.source_content_sha256) fail('RETURN_HASH_MISMATCH', entry.return_ref);
    let doc;
    try { doc = JSON.parse(bytes.toString('utf8')); } catch { fail('INVALID_RETURN_JSON', entry.return_ref); }
    if (doc.worker_instance_id && doc.worker_instance_id !== entry.source_worker_instance_id) fail('RETURN_WORKER_MISMATCH', entry.return_ref);

    const scopes = [...(entry.scopes ?? [])].sort((a,b) => a.scope_id.localeCompare(b.scope_id));
    for (const scope of scopes) {
      const planningAtoms = scope.disposition === 'CONSUMED' ? extractPlanningAtoms(doc) : [];
      dispositions.push({
        source_ref: entry.return_ref,
        scope_id: scope.scope_id,
        disposition: scope.disposition,
        reason: scope.reason ?? null,
        planning_atoms: planningAtoms
      });
      if (scope.disposition === 'CONSUMED' && isTerminalReturn(doc) && typeof doc.opportunity_id === 'string' && doc.opportunity_id) {
        satisfied.add(doc.opportunity_id);
      }
    }
  }

  return {
    plannerInput: {
      schema: 'prometeo.planner-generation-input/v1',
      generation_id: previousOutput.generation_id,
      parent_generation_id: previousOutput.parent_generation_id ?? null,
      source_head_cutoff: previousOutput.output_digest ?? ledger.source_head_cutoff,
      north_star_ref: previousOutput.north_star_ref ?? null
    },
    dispositionLedger: {
      schema: 'prometeo.integration-dispositions/v1-candidate',
      dispositions
    },
    existingOpportunities: previousOutput.opportunities ?? [],
    satisfiedDependencyIds: [...satisfied].sort(),
    criticPolicy: {required: false},
    generationId: ledger.generation_id,
    parentGenerationId: previousOutput.generation_id,
    source_receipt: {
      schema: 'prometeo.planner-source-receipt/v1',
      integration_batch_id: ledger.integration_batch_id,
      decision_actor_id: ledger.decision_actor_id,
      validated_ledger_schema: ledger.schema,
      return_refs: entries.map(e => e.return_ref),
      return_sha256: Object.fromEntries(entries.map(e => [e.return_ref, e.source_content_sha256])),
      authority: 'PLANNING_PROJECTION_ONLY_NOT_CURRENT_NOT_HUMAN_ACCEPTED_NOT_SERVED'
    }
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i=0; i<argv.length; i+=2) {
    if (!argv[i]?.startsWith('--') || argv[i+1] === undefined) fail('USAGE');
    args[argv[i].slice(2)] = argv[i+1];
  }
  return args;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    for (const req of ['ledger','previous-output','repo-root','out']) if (!args[req]) fail('USAGE', `missing --${req}`);
    const ledger = JSON.parse(fs.readFileSync(path.resolve(args.ledger), 'utf8'));
    const previousOutput = JSON.parse(fs.readFileSync(path.resolve(args['previous-output']), 'utf8'));
    const schema = loadSchema(args.schema ? path.resolve(args.schema) : undefined);
    const returnBytesByRef = new Map();
    for (const entry of ledger.entries ?? []) returnBytesByRef.set(entry.return_ref, fs.readFileSync(safeReturnPath(args['repo-root'], entry.return_ref)));
    const source = buildPlannerSourceFromLedger({ledger, previousOutput, returnBytesByRef, schema});
    fs.mkdirSync(path.dirname(path.resolve(args.out)), {recursive:true});
    fs.writeFileSync(path.resolve(args.out), stableStringify(source));
    console.log(JSON.stringify({ok:true,out:path.resolve(args.out),generation_id:source.generationId,returns:source.source_receipt.return_refs.length}, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ok:false,error:error.code ?? error.message,validation:error.validation ?? null}, null, 2));
    process.exit(1);
  }
}
