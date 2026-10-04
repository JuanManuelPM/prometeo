#!/usr/bin/env node
import fs from 'node:fs';

const arr = v => Array.isArray(v) ? v : [];
const DEFAULT_MAX_CANDIDATES = 24;
const DEFAULT_MAX_SERIALIZED_BYTES = 14_000;
const PREPARED_BURST_MAX_SERIALIZED_BYTES = 24_000;
const DEFAULT_PREPARED_BURST_CAPACITY = 10;
const DEFAULT_CAPABILITY_DIVERSITY_SLOTS = 8;
const DEFAULT_ZERO_CAPABILITY_CAPACITY = 10;
const DEFAULT_ZERO_CAPABILITY_RUNWAY = 4;
const POSTCLAIM_RUNTIME_BINDINGS = Object.freeze(['worker_id','generation','claim_id','source_head']);
const CLAIM_PHASE_CONTRACT = Object.freeze({
  contract_version:'EFF001_EFF034_V1',
  ordinary_base_create_budget:3,
  pool_tail_rescue_max:1,
  total_authority_create_hard_cap:4,
  stale_collision_refresh:Object.freeze({
    after_create_exists:2,
    snapshot_age_seconds_gt:90,
    max_refreshes:1,
    refresh_ref:'gh-pages:live/claim-frontier.json',
    rebuild_capability_filter:true,
    reuse_beacon_shard_seed:true,
    consumes_authority_attempt:false
  })
});

// Pre-claim needs authority bytes, capability routing, and one exact post-claim source.
// Human-facing labels, priority/state and duplicated identity already live in allocator/job files.
const KEEP = [
  'job_id','opportunity_id','role_id','guide_work_id','work_item_id','page_id','source_path','project_id','scope_project_id','kind','role','trigger','value_class',
  'required_capabilities','capability_confirmation_required','forbidden_worker_ids','context_transport','private_packet_lookup','return_path','expires_at','claim_mode','claim_path','claim_payload_shape',
  'post_claim_validate','contention_barrier','post_release_claim','next_action',
  'release_path','release_payload_shape','timeout_payload_shape',
  'deadline_at','entrant_dir'
];

const POSTCLAIM_FORBIDDEN_INHERITED_FIELDS = Object.freeze([
  'task_ref',
  'matrix_source_ref',
  'program_ref',
  'must_read',
  'execution.scope',
  'execution_scope',
  'return_path'
]);

export function compilePostclaimContext(item = {}) {
  if (!item?.source_path) return null;
  return {
    source_ref:item.source_path,
    compile:'EXACT_SOURCE_ONLY_AFTER_OWNERSHIP'
  };
}

function compactCandidate(item, lane) {
  const out = { lane };
  for (const k of KEEP) if (item?.[k] !== undefined && item?.[k] !== null) out[k] = item[k];
  out.required_capabilities = arr(item?.required_capabilities);
  out.forbidden_worker_ids = arr(item?.forbidden_worker_ids);
  if (item?.source_path) {
    if (!item?.opportunity_id) delete out.return_path;
    out.postclaim_context = compilePostclaimContext(item);
  }
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

function stableJobRouteKey(lane, item) {
  return item?.job_id ? `${lane}:job:${item.job_id}` : null;
}

function isBarrierRoutedCandidate(item) {
  return String(item?.claim_mode || '').startsWith('PORTFOLIO_BARRIER_') || item?.contention_barrier?.mode === 'contention_barrier';
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

// A prepared block graph names portable blocks ...-b001, ...-b002, etc. When at least ten
// compatible blocks from the same prepared graph are simultaneously claimable, keeping only
// one exemplar of that capability signature destroys the very concurrency the graph prepared.
// This is transport ordering only. Atomic PIN CREATE remains authority and no worker identity,
// role, reserve label or routing assignment is introduced here.
function preparedBurstGroupKey(candidate) {
  const id = String(candidate?.job_id || '');
  const match = id.match(/^(.*)-b\d{3}$/i);
  if (!match) return null;
  return `${match[1]}\n${capabilitySignature(candidate)}`;
}

function selectPreparedBurst(rows, capacity = DEFAULT_PREPARED_BURST_CAPACITY) {
  const groups = new Map();
  arr(rows).forEach((candidate, index) => {
    const key = preparedBurstGroupKey(candidate);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, { key, first:index, rows:[] });
    groups.get(key).rows.push(candidate);
  });
  const eligible = [...groups.values()]
    .filter(group => group.rows.length >= capacity)
    .sort((a,b)=>a.first-b.first || b.rows.length-a.rows.length || a.key.localeCompare(b.key));
  return eligible[0]?.rows.slice(0, capacity) || [];
}

function preserveCapabilityDiversity(
  ordered,
  {
    prefix = 1,
    maxPromotions = DEFAULT_CAPABILITY_DIVERSITY_SLOTS,
    minZeroCapabilityCandidates = DEFAULT_ZERO_CAPABILITY_CAPACITY,
    zeroCapabilityRunway = DEFAULT_ZERO_CAPABILITY_RUNWAY,
    preparedBurstCapacity = DEFAULT_PREPARED_BURST_CAPACITY
  } = {}
) {
  const rows = arr(ordered);
  if (rows.length <= 1) return rows;

  const preparedBurst = selectPreparedBurst(rows, preparedBurstCapacity);
  if (preparedBurst.length) {
    const selected = new Set(preparedBurst);
    return [...preparedBurst, ...rows.filter(candidate => !selected.has(candidate))];
  }

  const head = rows.slice(0, Math.max(1, prefix));
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

  const promotedSet = new Set(promoted);
  const zeroTarget = Math.max(0, minZeroCapabilityCandidates);
  const zeroCount = [...head, ...promoted].filter(hasZeroRequiredCapabilities).length;
  const zeroPromoted = tail
    .map((candidate, index) => ({ candidate, index }))
    .filter(({candidate}) => !promotedSet.has(candidate) && hasZeroRequiredCapabilities(candidate))
    .sort((a, b) => serializedBytes(a.candidate) - serializedBytes(b.candidate) || a.index - b.index)
    .slice(0, Math.max(0, zeroTarget - zeroCount))
    .map(({candidate}) => candidate);

  const headZeroCount = head.filter(hasZeroRequiredCapabilities).length;
  const runwayCount = Math.min(
    zeroPromoted.length,
    Math.max(0, Math.min(zeroTarget, zeroCapabilityRunway) - headZeroCount)
  );
  const zeroRunway = zeroPromoted.slice(0, runwayCount);
  const zeroReserveTail = zeroPromoted.slice(runwayCount);
  const protectedSet = new Set([...promoted, ...zeroPromoted]);
  return [
    ...head,
    ...zeroRunway,
    ...promoted,
    ...zeroReserveTail,
    ...tail.filter(candidate => !protectedSet.has(candidate))
  ];
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
  const barrierByStableJob = new Map(
    live
      .filter(({row}) => isBarrierRoutedCandidate(row))
      .map(({lane,row}) => [stableJobRouteKey(lane,row), {lane,row}])
      .filter(([key]) => Boolean(key))
  );
  const suppressedBarrierJobs = new Set(
    arr(allocator?.contention_barrier_routing?.suppressed_expired_candidates)
      .map(row => row?.job_id)
      .filter(Boolean)
  );
  const ordered = [];
  const seen = new Set();

  for (const raw of arr(allocator.batch_candidates)) {
    const lane = raw.lane || 'ready';
    if (raw?.job_id && suppressedBarrierJobs.has(raw.job_id)) continue;
    const match = byKey.get(keyOf(raw)) || barrierByStableJob.get(stableJobRouteKey(lane,raw));
    const row = match?.row || raw;
    const key = keyOf({lane,...row});
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(compactCandidate(row,lane));
  }

  for (const {lane,row} of live) {
    if (row?.job_id && suppressedBarrierJobs.has(row.job_id)) continue;
    const key = keyOf({lane,...row});
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(compactCandidate(row,lane));
  }

  const preparedBurst = selectPreparedBurst(ordered);
  const effectiveMaxSerializedBytes = preparedBurst.length
    ? Math.max(maxSerializedBytes, PREPARED_BURST_MAX_SERIALIZED_BYTES)
    : maxSerializedBytes;
  const capabilityDiverse = preserveCapabilityDiversity(ordered);
  const bounded = capabilityDiverse.slice(0, Math.max(1, maxCandidates));
  const recoveryAttention = arr(allocator.recovery_attention)
    .map(compactRecoveryAttention)
    .filter(row => row.job_id && row.reason)
    .slice(0, 2);
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
    postclaim_runtime_bindings:[...POSTCLAIM_RUNTIME_BINDINGS],
    postclaim_context_policy:{
      compile:'EXACT_SOURCE_ONLY_AFTER_OWNERSHIP',
      field_policy:'DECLARED_SOURCE_FIELDS_PLUS_RUNTIME_BINDINGS',
      forbidden_inherited_fields:[...POSTCLAIM_FORBIDDEN_INHERITED_FIELDS]
    },
    claim_phase_contract:CLAIM_PHASE_CONTRACT,
    transport_bytes_max:effectiveMaxSerializedBytes,
    prepared_burst:preparedBurst.length ? {
      detected:true,
      capacity:preparedBurst.length,
      group:preparedBurstGroupKey(preparedBurst[0])?.split('\n')[0] || null,
      authority_change:false
    } : null,
    truth_boundary:'COMPACT_CLAIM_HINT_ONLY_ATOMIC_CREATE_REMAINS_AUTHORITY'
  };

  const candidates = [];
  for (const candidate of bounded) {
    const next = [...candidates, candidate];
    const trial = {...base, candidate_count:next.length, candidates:next};
    if (serializedBytes(trial) > effectiveMaxSerializedBytes) break;
    candidates.push(candidate);
  }

  if (!candidates.length && bounded.length) {
    throw new Error(`claim frontier cannot fit one candidate inside ${effectiveMaxSerializedBytes} bytes`);
  }

  return {...base, candidate_count:candidates.length, candidates};
}

if (process.argv[1] && process.argv[1].endsWith('build-claim-frontier.mjs')) {
  const [inPath,outPath] = process.argv.slice(2);
  if (!inPath || !outPath) throw new Error('usage: build-claim-frontier.mjs <allocator.json> <claim-frontier.json>');
  const allocator=JSON.parse(fs.readFileSync(inPath,'utf8'));
  const out=buildClaimFrontier(allocator);
  fs.writeFileSync(outPath,JSON.stringify(out)+'\n');
  process.stdout.write(`claim-frontier ${out.candidate_count}/${out.candidate_total} candidates ${fs.statSync(outPath).size} bytes\n`);
}
