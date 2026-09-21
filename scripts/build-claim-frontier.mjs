#!/usr/bin/env node
import fs from 'node:fs';

const arr = v => Array.isArray(v) ? v : [];
const DEFAULT_MAX_CANDIDATES = 24;
const DEFAULT_MAX_SERIALIZED_BYTES = 24_000;
const DEFAULT_CAPABILITY_DIVERSITY_SLOTS = 8;
const DEFAULT_ZERO_CAPABILITY_CAPACITY = 8;

// Pre-claim needs authority bytes, capability routing, and one exact post-claim source.
// Human-facing labels, priority/state and duplicated identity already live in allocator/job files.
const KEEP = [
  'job_id','opportunity_id','role_id','guide_work_id','source_path','project_id','scope_project_id','kind','role','trigger','value_class',
  'required_capabilities','capability_confirmation_required','claim_mode','claim_path','claim_payload_shape',
  'post_claim_validate','contention_barrier','post_release_claim','next_action',
  'release_path','release_payload_shape','timeout_payload_shape',
  'deadline_at','entrant_dir'
];

function compactCandidate(item, lane) {
  const out = { lane };
  for (const k of KEEP) if (item?.[k] !== undefined && item?.[k] !== null) out[k] = item[k];
  if (item?.source_path) out.postclaim_context = { source_ref:item.source_path, compile:'EXACT_SOURCE_ONLY_AFTER_OWNERSHIP' };
  // Opportunity/Guide candidates may have no durable job file, so retain bounded execution context only there.
  if (item?.opportunity_id || lane==='role_ready') {
    if (item?.title) out.title = item.title;
    if (item?.mission) out.mission = String(item.mission).slice(0, 220);
  }
  return out;
}

function compactRecoveryAttention(item) {
  const sourceDebt = item?.source_debt && typeof item.source_debt === 'object' ? item.source_debt : null;
  const sourceDebtRef = sourceDebt?.dependency_return_ref || sourceDebt?.path || null;
  const sourceDebtJobId = sourceDebt?.dependency_job_id || (sourceDebtRef ? item?.job_id || null : null);
  return {
    job_id:item?.job_id || null,
    reason:item?.reason || null,
    source_path:item?.source_path || null,
    source_debt_job_id:sourceDebtJobId,
    source_debt_ref:sourceDebtRef,
    ordinary_claim_eligible:false
  };
}

function keyOf(x) {
  return x?.claim_path || [x?.lane,x?.job_id,x?.opportunity_id,x?.role_id,x?.guide_work_id].filter(Boolean).join(':');
}

function serializedBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function capabilitySignature(candidate) {
  return JSON.stringify(
    arr(candidate?.required_capabilities)
      .map(value => String(value).trim())
      .filter(Boolean)
      .sort()
  );
}

function hasZeroRequiredCapabilities(candidate) {
  return arr(candidate?.required_capabilities)
    .map(value => String(value).trim())
    .filter(Boolean).length === 0;
}

function preserveCapabilityDiversity(
  ordered,
  {
    prefix = 4,
    maxPromotions = DEFAULT_CAPABILITY_DIVERSITY_SLOTS,
    minZeroCapabilityCandidates = DEFAULT_ZERO_CAPABILITY_CAPACITY
  } = {}
) {
  const rows = arr(ordered);
  if (rows.length <= 1) return rows;
  const head = rows.slice(0, Math.max(0, prefix));
  const tail = rows.slice(head.length);
  const seenSignatures = new Set(head.map(capabilitySignature));
  const promoted = [];
  for (const candidate of tail) {
    const signature = capabilitySignature(candidate);
    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);
    promoted.push(candidate);
    if (promoted.length >= Math.max(0, maxPromotions)) break;
  }

  // Capability diversity alone collapses every [] candidate into one signature. In a pooled
  // launch that can hide several distinct no-special-capability claims behind a long
  // specialized tail, leaving generic workers to collide on only one or two visible paths.
  // Preserve the allocator prefix + exact capability exemplars, then reserve a small bounded
  // amount of additional zero-capacity claim paths. Eight keeps a full generic-worker safety\n  // margin inside the 24-candidate ceiling while capability exemplars remain protected.\n  // This changes transport ordering only;
  // claim payloads and atomic authority semantics stay untouched.
  const promotedSet = new Set(promoted);
  const zeroPromoted = [];
  let zeroCount = [...head, ...promoted].filter(hasZeroRequiredCapabilities).length;
  const zeroTarget = Math.max(0, minZeroCapabilityCandidates);
  if (zeroCount < zeroTarget) {
    for (const candidate of tail) {
      if (promotedSet.has(candidate) || !hasZeroRequiredCapabilities(candidate)) continue;
      zeroPromoted.push(candidate);
      zeroCount += 1;
      if (zeroCount >= zeroTarget) break;
    }
  }
  const protectedSet = new Set([...promoted, ...zeroPromoted]);
  return [...head, ...promoted, ...zeroPromoted, ...tail.filter(candidate => !protectedSet.has(candidate))];
}

export function buildClaimFrontier(
  allocator = {},
  maxCandidates = DEFAULT_MAX_CANDIDATES,
  maxSerializedBytes = DEFAULT_MAX_SERIALIZED_BYTES
) {
  const live = [];
  for (const [lane, rows] of [
    ['ready', allocator.ready],
    ['queue_ready', allocator.queue_ready],
    ['role_ready', allocator.role_ready],
    ['recovery', allocator.recovery]
  ]) for (const row of arr(rows)) live.push({ lane, row });

  const byKey = new Map(live.map(({lane,row}) => [keyOf({lane,...row}), {lane,row}]));
  const ordered = [];
  const seen = new Set();

  for (const raw of arr(allocator.batch_candidates)) {
    const lane = raw.lane || 'ready';
    const match = byKey.get(keyOf(raw));
    const row = match?.row || raw;
    const key = keyOf({lane,...row});
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(compactCandidate(row,lane));
  }

  // Preserve a bounded fallback if post-processors introduced a candidate after batch_candidates was built.
  for (const {lane,row} of live) {
    const key = keyOf({lane,...row});
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(compactCandidate(row,lane));
  }

  // Preserve allocator preference at the front while ensuring the compact transport
  // carries at least one exemplar of each observed capability signature when space permits.
  // This prevents byte/candidate truncation from hiding e.g. public-HTTP-only recovery behind
  // many browser-only rows and making otherwise compatible workers appear idle.
  const capabilityDiverse = preserveCapabilityDiversity(ordered);
  const bounded = capabilityDiverse.slice(0, Math.max(1, maxCandidates));
  const recoveryAttention = arr(allocator.recovery_attention)
    .map(compactRecoveryAttention)
    .filter(row => row.job_id && row.reason)
    .slice(0, 8);
  const base = {
    schema:'prometeo.claim-frontier/v1',
    generated_at:allocator.generated_at || new Date().toISOString(),
    source_sha:allocator.source_sha || null,
    allocator_schema:allocator.schema || null,
    batch_strategy:allocator.batch_strategy || null,
    batch_contention_fanin:allocator.batch_contention_fanin || null,
    preferred_order:arr(allocator.preferred_order),
    candidate_total:bounded.length,
    recovery_attention_total:arr(allocator.recovery_attention).length,
    recovery_attention:recoveryAttention,
    transport_bytes_max:maxSerializedBytes,
    truth_boundary:'COMPACT_CLAIM_HINT_ONLY_ATOMIC_CREATE_REMAINS_AUTHORITY'
  };

  const candidates = [];
  for (const candidate of bounded) {
    const next = [...candidates, candidate];
    const trial = {...base, candidate_count:next.length, candidates:next};
    if (serializedBytes(trial) > maxSerializedBytes) break;
    candidates.push(candidate);
  }

  if (!candidates.length && bounded.length) {
    throw new Error(`claim frontier cannot fit one candidate inside ${maxSerializedBytes} bytes`);
  }

  return {...base, candidate_count:candidates.length, candidates};
}

if (process.argv[1] && process.argv[1].endsWith('build-claim-frontier.mjs')) {
  const [inPath,outPath] = process.argv.slice(2);
  if (!inPath || !outPath) throw new Error('usage: build-claim-frontier.mjs <allocator.json> <claim-frontier.json>');
  const allocator=JSON.parse(fs.readFileSync(inPath,'utf8'));
  const out=buildClaimFrontier(allocator);
  // Minified JSON is deliberate: connector rendering expands whitespace and can truncate a semantically compact file.
  fs.writeFileSync(outPath,JSON.stringify(out)+'\n');
  process.stdout.write(`claim-frontier ${out.candidate_count}/${out.candidate_total} candidates ${fs.statSync(outPath).size} bytes\n`);
}
