#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT_SCHEMA = 'prometeo.forge-point-interface/v1';
const ID_RE = /^[a-z][a-z0-9_.-]{2,127}$/;
const POINT_RE = /^P\d{3}$/;
const HASH_RE = /^sha256:[a-f0-9]{64}$/;
const RELATIONS = new Set(['REQUIRES','CONSUMES','EXTENDS','CONFLICTS_WITH']);

function isObject(v){ return v !== null && typeof v === 'object' && !Array.isArray(v); }
function arr(v){ return Array.isArray(v) ? v : []; }

export function validateForgePointInterface(doc, observed = {}) {
  const errors = [];
  const staleReasons = [];

  if (!isObject(doc)) return { valid:false, stale:false, errors:['root must be an object'], stale_reasons:[] };
  if (doc.schema !== ROOT_SCHEMA) errors.push(`schema must equal ${ROOT_SCHEMA}`);
  if (!POINT_RE.test(doc.point_id || '')) errors.push('point_id must match PNNN');
  if (!Number.isInteger(doc.interface_version) || doc.interface_version < 1) errors.push('interface_version must be a positive integer');

  if (!isObject(doc.source)) {
    errors.push('source must be an object');
  } else {
    if (typeof doc.source.canonical_ref !== 'string' || !doc.source.canonical_ref.trim()) errors.push('source.canonical_ref is required');
    if (!Number.isInteger(doc.source.canonical_version) || doc.source.canonical_version < 1) errors.push('source.canonical_version must be a positive integer');
    if (!HASH_RE.test(doc.source.source_hash || '')) errors.push('source.source_hash must be sha256:<64 lowercase hex>');
    if (observed.canonicalVersion != null && observed.canonicalVersion !== doc.source.canonical_version) {
      staleReasons.push(`canonical_version changed: interface=${doc.source.canonical_version}, observed=${observed.canonicalVersion}`);
    }
    if (observed.sourceHash != null && observed.sourceHash !== doc.source.source_hash) {
      staleReasons.push('source_hash changed');
    }
  }

  if (typeof doc.purpose !== 'string' || !doc.purpose.trim()) errors.push('purpose is required');

  const buckets = {
    inputs: arr(doc.inputs),
    outputs: arr(doc.outputs),
    states: arr(doc.states),
    operations: arr(doc.operations),
    events: arr(doc.events),
    invariants: arr(doc.invariants),
    tests: arr(doc.tests),
    open_decisions: arr(doc.open_decisions)
  };
  for (const key of Object.keys(buckets)) {
    if (!Array.isArray(doc[key])) errors.push(`${key} must be an array`);
  }
  if (!Array.isArray(doc.dependencies)) errors.push('dependencies must be an array');

  const allIds = new Map();
  for (const [bucket, items] of Object.entries(buckets)) {
    for (const item of items) {
      if (!isObject(item) || !ID_RE.test(item.id || '')) {
        errors.push(`${bucket} item has invalid id`);
        continue;
      }
      if (allIds.has(item.id)) errors.push(`duplicate internal id: ${item.id} (${allIds.get(item.id)} and ${bucket})`);
      else allIds.set(item.id, bucket);
    }
  }

  const inputIds = new Set(buckets.inputs.map(x=>x?.id).filter(Boolean));
  const outputIds = new Set(buckets.outputs.map(x=>x?.id).filter(Boolean));
  const stateIds = new Set(buckets.states.map(x=>x?.id).filter(Boolean));
  const eventIds = new Set(buckets.events.map(x=>x?.id).filter(Boolean));

  for (const item of [...buckets.inputs, ...buckets.outputs]) {
    if (!isObject(item)) continue;
    if (typeof item.type !== 'string' || !item.type.trim()) errors.push(`${item.id || 'io'} type is required`);
    if (typeof item.required !== 'boolean') errors.push(`${item.id || 'io'} required must be boolean`);
    if (typeof item.description !== 'string' || !item.description.trim()) errors.push(`${item.id || 'io'} description is required`);
    if (!Array.isArray(item.constraints)) errors.push(`${item.id || 'io'} constraints must be an array`);
  }

  for (const state of buckets.states) {
    if (!isObject(state)) continue;
    if (typeof state.description !== 'string' || !state.description.trim()) errors.push(`${state.id || 'state'} description is required`);
    if (typeof state.terminal !== 'boolean') errors.push(`${state.id || 'state'} terminal must be boolean`);
  }

  for (const op of buckets.operations) {
    if (!isObject(op)) continue;
    if (op.requires_state != null && !stateIds.has(op.requires_state)) errors.push(`${op.id}: requires_state does not resolve: ${op.requires_state}`);
    if (op.next_state != null && !stateIds.has(op.next_state)) errors.push(`${op.id}: next_state does not resolve: ${op.next_state}`);
    for (const id of arr(op.input_ids)) if (!inputIds.has(id)) errors.push(`${op.id}: input_id does not resolve: ${id}`);
    for (const id of arr(op.output_ids)) if (!outputIds.has(id)) errors.push(`${op.id}: output_id does not resolve: ${id}`);
    for (const id of arr(op.event_ids)) if (!eventIds.has(id)) errors.push(`${op.id}: event_id does not resolve: ${id}`);
    if (!Array.isArray(op.failure_modes)) errors.push(`${op.id}: failure_modes must be an array`);
  }

  for (const inv of buckets.invariants) {
    if (!isObject(inv)) continue;
    if (!['CANDIDATE','CANONICAL'].includes(inv.status)) errors.push(`${inv.id}: invariant status must be CANDIDATE or CANONICAL`);
    if (typeof inv.statement !== 'string' || !inv.statement.trim()) errors.push(`${inv.id}: invariant statement is required`);
    if (inv.status === 'CANONICAL' && (typeof inv.evidence_ref !== 'string' || !inv.evidence_ref.trim())) {
      errors.push(`${inv.id}: canonical invariant requires evidence_ref`);
    }
  }

  for (const dep of arr(doc.dependencies)) {
    if (!isObject(dep)) { errors.push('dependency must be an object'); continue; }
    if (!POINT_RE.test(dep.point_id || '')) errors.push('dependency.point_id must match PNNN');
    if (!RELATIONS.has(dep.relation)) errors.push(`invalid dependency relation: ${dep.relation}`);
    if (!Number.isInteger(dep.interface_version) || dep.interface_version < 1) errors.push('dependency.interface_version must be positive integer');
  }

  for (const test of buckets.tests) {
    if (!isObject(test)) continue;
    for (const key of ['precondition','action','expected_observable_result']) {
      if (typeof test[key] !== 'string' || !test[key].trim()) errors.push(`${test.id}: ${key} is required`);
    }
  }

  for (const decision of buckets.open_decisions) {
    if (!isObject(decision)) continue;
    if (decision.status !== 'OPEN') errors.push(`${decision.id}: open decision status must be OPEN`);
    if (typeof decision.question !== 'string' || !decision.question.trim()) errors.push(`${decision.id}: question is required`);
    if (!Array.isArray(decision.alternatives) || decision.alternatives.length < 1) errors.push(`${decision.id}: alternatives required`);
    if (!Array.isArray(decision.provenance) || decision.provenance.length < 1) errors.push(`${decision.id}: provenance required`);
  }

  function scanNoPlaceholder(value, path='root') {
    if (typeof value === 'string' && /\bTBD\b/i.test(value) && !path.startsWith('root.open_decisions')) {
      errors.push(`placeholder TBD forbidden at ${path}`);
    } else if (Array.isArray(value)) {
      value.forEach((v,i)=>scanNoPlaceholder(v,`${path}[${i}]`));
    } else if (isObject(value)) {
      for (const [k,v] of Object.entries(value)) scanNoPlaceholder(v,`${path}.${k}`);
    }
  }
  scanNoPlaceholder(doc);

  return {
    valid: errors.length === 0,
    stale: staleReasons.length > 0,
    errors,
    stale_reasons: staleReasons
  };
}

function parseArgs(argv){
  const out={file:null,canonicalVersion:null,sourceHash:null};
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(!out.file && !a.startsWith('--')) out.file=a;
    else if(a==='--canonical-version') out.canonicalVersion=Number(argv[++i]);
    else if(a==='--source-hash') out.sourceHash=argv[++i];
    else throw new Error(`unknown argument: ${a}`);
  }
  if(!out.file) throw new Error('usage: node scripts/validate-forge-point-interface.mjs <interface.json> [--canonical-version N] [--source-hash sha256:...]');
  return out;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const args=parseArgs(process.argv.slice(2));
    const doc=JSON.parse(fs.readFileSync(args.file,'utf8'));
    const result=validateForgePointInterface(doc,{canonicalVersion:args.canonicalVersion,sourceHash:args.sourceHash});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    process.exitCode=result.valid ? (result.stale ? 3 : 0) : 2;
  } catch (error) {
    process.stderr.write(String(error?.message || error)+'\n');
    process.exitCode=1;
  }
}
