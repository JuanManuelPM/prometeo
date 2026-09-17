#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCHEMA_PATH = path.resolve(MODULE_DIR, '../coordination/planner/INTEGRATION_DISPOSITION_SCHEMA_V1.json');

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function push(errors, at, message) {
  errors.push({ path: at, message });
}

function allowedProperties(value, allowed, at, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) push(errors, `${at}.${key}`, 'unexpected property; RETURN payloads/extra authority fields must not be embedded');
  }
}

function requiredString(value, key, at, errors) {
  if (typeof value?.[key] !== 'string' || value[key].trim() === '') push(errors, `${at}.${key}`, 'required non-empty string');
}

function isIsoDateTime(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function validateIntegrationDispositionLedger(ledger, schema) {
  const errors = [];
  if (!isObject(ledger)) return { ok: false, errors: [{ path: '$', message: 'ledger must be an object' }] };

  const topAllowed = new Set(['schema', 'integration_batch_id', 'generation_id', 'decision_actor_id', 'source_head_cutoff', 'created_at', 'authority', 'selection_policy', 'entries']);
  allowedProperties(ledger, topAllowed, '$', errors);
  for (const key of ['schema', 'integration_batch_id', 'generation_id', 'decision_actor_id', 'source_head_cutoff', 'created_at', 'authority', 'selection_policy']) requiredString(ledger, key, '$', errors);

  if (ledger.schema !== 'prometeo.integration-disposition-ledger/v1') push(errors, '$.schema', 'unsupported schema');
  if (!/^[0-9a-f]{40}$/.test(ledger.source_head_cutoff ?? '')) push(errors, '$.source_head_cutoff', 'must be a 40-character lowercase git SHA');
  if (!isIsoDateTime(ledger.created_at)) push(errors, '$.created_at', 'must be an ISO date-time');
  if (ledger.authority !== 'PLANNING_CONSUMPTION_ONLY_NOT_PRODUCT_PROMOTION') push(errors, '$.authority', 'ledger cannot claim product promotion authority');
  if (ledger.selection_policy !== 'EVIDENCE_SCOPED_NO_RECENCY_PRIORITY') push(errors, '$.selection_policy', 'newest-wins/recency selection is forbidden');
  if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) push(errors, '$.entries', 'must contain at least one planner-visible RETURN entry');

  const dispositionEnum = new Set(schema?.$defs?.scope_disposition?.properties?.disposition?.enum ?? ['CONSUMED','DEFERRED','CONFLICTED','REJECTED_WITH_REASON','NOT_APPLICABLE']);
  const visibilityEnum = new Set(schema?.$defs?.entry?.properties?.visibility_state?.enum ?? ['DISPOSITIONED','PENDING_UNREAD']);
  const sourceAuthorityEnum = new Set(schema?.$defs?.entry?.properties?.source_authority_label?.enum ?? []);
  const seenEntryIds = new Set();
  const seenReturnHashes = new Map();

  for (let i = 0; i < (ledger.entries ?? []).length; i += 1) {
    const entry = ledger.entries[i];
    const at = `$.entries[${i}]`;
    if (!isObject(entry)) { push(errors, at, 'entry must be an object'); continue; }
    const entryAllowed = new Set(['entry_id','return_ref','source_content_sha256','source_worker_instance_id','source_authority_label','visibility_state','pending_reason','scopes']);
    allowedProperties(entry, entryAllowed, at, errors);
    for (const key of ['entry_id','return_ref','source_content_sha256','source_worker_instance_id','source_authority_label','visibility_state']) requiredString(entry, key, at, errors);
    if (seenEntryIds.has(entry.entry_id)) push(errors, `${at}.entry_id`, 'duplicate entry_id');
    seenEntryIds.add(entry.entry_id);
    if (!/^[0-9a-f]{64}$/.test(entry.source_content_sha256 ?? '')) push(errors, `${at}.source_content_sha256`, 'must pin immutable source bytes with lowercase sha256');
    if (seenReturnHashes.has(entry.return_ref) && seenReturnHashes.get(entry.return_ref) !== entry.source_content_sha256) push(errors, `${at}.source_content_sha256`, 'same return_ref appears with conflicting source hashes');
    seenReturnHashes.set(entry.return_ref, entry.source_content_sha256);
    if (sourceAuthorityEnum.size && !sourceAuthorityEnum.has(entry.source_authority_label)) push(errors, `${at}.source_authority_label`, 'unsupported source authority label');
    if (!visibilityEnum.has(entry.visibility_state)) push(errors, `${at}.visibility_state`, 'unsupported visibility state');
    if (!Array.isArray(entry.scopes)) push(errors, `${at}.scopes`, 'must be an array');

    if (entry.visibility_state === 'PENDING_UNREAD') {
      if (typeof entry.pending_reason !== 'string' || entry.pending_reason.trim() === '') push(errors, `${at}.pending_reason`, 'PENDING_UNREAD requires an explicit pending_reason');
      if (Array.isArray(entry.scopes) && entry.scopes.length !== 0) push(errors, `${at}.scopes`, 'PENDING_UNREAD must not contain scope dispositions; it is fail-closed and non-consumed');
      continue;
    }

    if (entry.visibility_state === 'DISPOSITIONED' && (!Array.isArray(entry.scopes) || entry.scopes.length === 0)) {
      push(errors, `${at}.scopes`, 'DISPOSITIONED entry requires at least one explicit scope disposition');
      continue;
    }

    const seenScopeIds = new Set();
    for (let j = 0; j < entry.scopes.length; j += 1) {
      const scope = entry.scopes[j];
      const sat = `${at}.scopes[${j}]`;
      if (!isObject(scope)) { push(errors, sat, 'scope disposition must be an object'); continue; }
      const scopeAllowed = new Set(['scope_id','semantic_target','path_globs','disposition','reason','decision_basis_refs','conflict_refs','effect_authority']);
      allowedProperties(scope, scopeAllowed, sat, errors);
      for (const key of ['scope_id','semantic_target','disposition','effect_authority']) requiredString(scope, key, sat, errors);
      if (seenScopeIds.has(scope.scope_id)) push(errors, `${sat}.scope_id`, 'duplicate scope_id inside one RETURN; split scopes deterministically');
      seenScopeIds.add(scope.scope_id);
      if (!dispositionEnum.has(scope.disposition)) push(errors, `${sat}.disposition`, 'missing or unsupported disposition; fail closed');
      if (!Array.isArray(scope.decision_basis_refs) || scope.decision_basis_refs.length === 0 || scope.decision_basis_refs.some(x => typeof x !== 'string' || x.trim() === '')) push(errors, `${sat}.decision_basis_refs`, 'requires at least one durable decision-basis ref');
      if (scope.effect_authority !== 'PLANNING_CONSUMPTION_ONLY_NOT_PRODUCT_PROMOTION') push(errors, `${sat}.effect_authority`, 'scope disposition cannot promote product authority');
      if (scope.disposition === 'CONFLICTED') {
        if (!Array.isArray(scope.conflict_refs) || scope.conflict_refs.length === 0) push(errors, `${sat}.conflict_refs`, 'CONFLICTED requires conflict_refs');
        if (typeof scope.reason !== 'string' || scope.reason.trim() === '') push(errors, `${sat}.reason`, 'CONFLICTED requires a reason');
      }
      if (scope.disposition === 'REJECTED_WITH_REASON' && (typeof scope.reason !== 'string' || scope.reason.trim() === '')) push(errors, `${sat}.reason`, 'REJECTED_WITH_REASON requires a reason');
      if (scope.disposition === 'CONSUMED' && ledger.decision_actor_id === entry.source_worker_instance_id) push(errors, `${sat}.disposition`, 'source worker cannot consume its own RETURN into planning state');
    }
  }

  return { ok: errors.length === 0, errors };
}

export function projectPlannerEvidence(ledger, schema) {
  const result = validateIntegrationDispositionLedger(ledger, schema);
  if (!result.ok) {
    const error = new Error('integration disposition ledger is invalid');
    error.validation = result;
    throw error;
  }
  const projection = { consumed: [], deferred: [], conflicted: [], rejected: [], not_applicable: [], pending_unread: [] };
  const bucketFor = { CONSUMED: 'consumed', DEFERRED: 'deferred', CONFLICTED: 'conflicted', REJECTED_WITH_REASON: 'rejected', NOT_APPLICABLE: 'not_applicable' };
  for (const entry of ledger.entries) {
    if (entry.visibility_state === 'PENDING_UNREAD') {
      projection.pending_unread.push({ return_ref: entry.return_ref, source_content_sha256: entry.source_content_sha256, reason: entry.pending_reason });
      continue;
    }
    for (const scope of entry.scopes) {
      projection[bucketFor[scope.disposition]].push({
        return_ref: entry.return_ref,
        source_content_sha256: entry.source_content_sha256,
        scope_id: scope.scope_id,
        semantic_target: scope.semantic_target,
        decision_basis_refs: scope.decision_basis_refs
      });
    }
  }
  return projection;
}

export function loadSchema(schemaPath = DEFAULT_SCHEMA_PATH) {
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  const schemaPath = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_SCHEMA_PATH;
  if (!target) {
    console.error('usage: node scripts/validate-integration-dispositions.mjs <ledger.json> [schema.json]');
    process.exit(2);
  }
  let ledger;
  let schema;
  try {
    ledger = JSON.parse(fs.readFileSync(path.resolve(target), 'utf8'));
    schema = loadSchema(schemaPath);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, errors: [{ path: '$', message: `read/parse failure: ${error.message}` }] }, null, 2));
    process.exit(2);
  }
  const result = validateIntegrationDispositionLedger(ledger, schema);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
