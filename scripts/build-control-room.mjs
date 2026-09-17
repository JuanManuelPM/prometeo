import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const CONTROL_ROOM_SCHEMA = 'prometeo.control-room-projection/v1';
export const CONTROL_ROOM_AUTHORITY = 'DERIVED_READ_ONLY_NO_PROMOTION';

const TERMINAL_RUN_STATES = new Set([
  'DONE', 'BOUNDARY', 'FAILED', 'COMPLETE', 'CLOSED', 'RECOVERY_COMPLETE',
  'CANCELLED', 'SUPERSEDED', 'ABORTED'
]);

const RETURN_STATES = new Set([
  'RETURNED', 'RETURNED_CANDIDATE', 'RETURNED_BOUNDARY', 'DONE'
]);

const ACTIVE_RUN_STATES = new Set([
  'STARTED', 'WORKING', 'EXECUTING', 'WRITING', 'INTEGRATING', 'CLAIMED'
]);

function array(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function parseTime(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function newest(items, timestampFields) {
  return [...items].sort((a, b) => {
    const at = Math.max(...timestampFields.map(k => parseTime(a?.[k]) ?? -Infinity));
    const bt = Math.max(...timestampFields.map(k => parseTime(b?.[k]) ?? -Infinity));
    return bt - at;
  })[0] ?? null;
}

function checkpointTimes(run) {
  const out = [];
  for (const cp of array(run?.checkpoints)) {
    if (typeof cp === 'string') continue;
    for (const key of ['heartbeat_at', 'updated_at', 'checkpoint_at', 'reached_at', 'created_at', 'timestamp', 'at']) {
      const ms = parseTime(cp?.[key]);
      if (ms != null) out.push(ms);
    }
  }
  return out;
}

function latestRunSignal(run) {
  if (!run) return null;
  const candidates = checkpointTimes(run);
  for (const key of ['heartbeat_at', 'updated_at', 'checkpoint_at', 'started_at', 'created_at']) {
    const ms = parseTime(run?.[key]);
    if (ms != null) candidates.push(ms);
  }
  if (!candidates.length) return null;
  return Math.max(...candidates);
}

function staleProjection(run, returnEvidence, nowMs, stalePolicy) {
  if (!run || returnEvidence || TERMINAL_RUN_STATES.has(String(run.state || '').toUpperCase())) {
    return { state: 'NONE', age_minutes: null, last_signal_at: null, policy_proof_required: false };
  }
  const signalMs = latestRunSignal(run);
  if (signalMs == null || nowMs == null) {
    return { state: 'UNKNOWN', age_minutes: null, last_signal_at: null, policy_proof_required: true };
  }
  const ageMinutes = Math.max(0, (nowMs - signalMs) / 60000);
  const lastSignalAt = new Date(signalMs).toISOString();
  const suspect = Number(stalePolicy?.suspect_minutes ?? stalePolicy?.suspect_after_minutes ?? 20);
  const recovery = Number(stalePolicy?.recovery_eligible_minutes ?? stalePolicy?.recovery_eligible_after_minutes ?? 30);
  if (ageMinutes >= recovery) {
    return {
      state: 'RECOVERY_TIME_GATE_MET',
      age_minutes: Math.floor(ageMinutes * 10) / 10,
      last_signal_at: lastSignalAt,
      policy_proof_required: true,
      note: 'Time gate only. Retry safety, authority and collision checks are still required before recovery.'
    };
  }
  if (ageMinutes >= suspect) {
    return {
      state: 'STALE_SUSPECT',
      age_minutes: Math.floor(ageMinutes * 10) / 10,
      last_signal_at: lastSignalAt,
      policy_proof_required: true
    };
  }
  return {
    state: 'ACTIVE_OR_UNKNOWN',
    age_minutes: Math.floor(ageMinutes * 10) / 10,
    last_signal_at: lastSignalAt,
    policy_proof_required: false
  };
}

function dependencyIds(opportunity) {
  const candidates = [
    opportunity?.dependency_ids,
    opportunity?.dependencies,
    opportunity?.depends_on,
    opportunity?.activation_rule?.dependency_ids,
    opportunity?.activation?.dependency_ids,
    opportunity?.activation?.dependencies
  ];
  return [...new Set(candidates.flatMap(array).filter(v => typeof v === 'string' && v.trim()))].sort();
}

function surfaceId(opportunity) {
  return opportunity?.surface_id ?? opportunity?.root_id ?? opportunity?.surface ?? null;
}

function returnIsPresent(ret) {
  if (!ret) return false;
  const state = String(ret.state || '').toUpperCase();
  return RETURN_STATES.has(state) || state.startsWith('RETURNED') || Boolean(ret.created_at || ret.returned_at);
}

function lifecycle({ opportunity, claim, run, ret }) {
  const queueStatus = String(opportunity?.status || 'UNKNOWN').toUpperCase();
  const runState = String(run?.state || '').toUpperCase();
  const hasReturn = returnIsPresent(ret);

  if (hasReturn && !run) return 'RETURNED_ORPHAN_EVIDENCE';
  if (hasReturn && run && !TERMINAL_RUN_STATES.has(runState)) return 'RETURNED_NOT_TERMINAL';
  if (run && TERMINAL_RUN_STATES.has(runState)) return runState;
  if (run && ACTIVE_RUN_STATES.has(runState)) return 'WORKING';
  if (run) return `RUN_${runState || 'UNKNOWN'}`;
  if (claim) return 'CLAIMED_NOT_STARTED';
  if (queueStatus === 'READY') return 'READY_UNCLAIMED';
  if (queueStatus === 'BLOCKED_DEPENDENCY') return 'BLOCKED_DEPENDENCY';
  if (queueStatus.startsWith('BLOCKED')) return queueStatus;
  return queueStatus || 'UNKNOWN';
}

function groupLatest(items, keyFn, timestampFields) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return new Map([...groups].map(([key, group]) => [key, newest(group, timestampFields)]));
}

function sourceRef(item) {
  return item?._source_ref ?? item?.source_ref ?? null;
}

function sanitizeRoot(root) {
  return {
    project_id: root?.project_id ?? null,
    chat_object_id: root?.chat_object_id ?? null,
    status: root?.status ?? 'UNKNOWN'
  };
}

function sanitizeSurface(surface) {
  return {
    surface_id: surface?.surface_id ?? null,
    title: surface?.title ?? null,
    status: surface?.status ?? 'UNKNOWN'
  };
}

export function buildControlRoom({
  continuityHead = {},
  queues = [],
  claims = [],
  runs = [],
  returns = [],
  recoveryClaims = [],
  now = new Date().toISOString()
} = {}) {
  const nowMs = parseTime(now);
  if (nowMs == null) throw new Error(`INVALID_NOW:${now}`);

  const stalePolicy = continuityHead?.distributed_swarm?.stale_defaults ?? {
    suspect_after_minutes: 20,
    recovery_eligible_after_minutes: 30,
    heartbeat_target_minutes: 10
  };

  const opportunities = [];
  for (const queue of queues) {
    for (const opportunity of array(queue?.opportunities)) {
      opportunities.push({ ...opportunity, _queue_id: queue?.queue_id ?? null, _queue_status: queue?.status ?? null });
    }
  }

  const claimByOpportunity = groupLatest(claims, x => x?.opportunity_id, ['claimed_at', 'updated_at', 'created_at']);
  const runByOpportunity = groupLatest(runs, x => x?.opportunity_id, ['heartbeat_at', 'updated_at', 'started_at', 'created_at']);
  const returnByOpportunity = groupLatest(returns, x => x?.opportunity_id, ['returned_at', 'created_at', 'updated_at']);
  const returnByRun = groupLatest(returns, x => x?.run_id, ['returned_at', 'created_at', 'updated_at']);
  const returnsByOpportunity = new Map();
  for (const item of returns) {
    const id = item?.opportunity_id;
    if (!id) continue;
    const list = returnsByOpportunity.get(id) ?? [];
    list.push(item);
    returnsByOpportunity.set(id, list);
  }
  const recoveriesByOpportunity = new Map();
  for (const rc of recoveryClaims) {
    const id = rc?.opportunity_id;
    if (!id) continue;
    const list = recoveriesByOpportunity.get(id) ?? [];
    list.push(rc);
    recoveriesByOpportunity.set(id, list);
  }

  const records = opportunities.map(opportunity => {
    const id = opportunity?.opportunity_id;
    const claim = claimByOpportunity.get(id) ?? null;
    const run = runByOpportunity.get(id) ?? null;
    const ret = run?.run_id ? (returnByRun.get(run.run_id) ?? null) : (returnByOpportunity.get(id) ?? null);
    const allReturns = returnsByOpportunity.get(id) ?? [];
    const crossAttemptReturns = run?.run_id ? allReturns.filter(item => item?.run_id && item.run_id !== run.run_id) : [];
    const stale = staleProjection(run, returnIsPresent(ret), nowMs, stalePolicy);
    const state = lifecycle({ opportunity, claim, run, ret });
    const deps = dependencyIds(opportunity);
    const blockers = [];
    if (String(opportunity?.status || '').toUpperCase() === 'BLOCKED_DEPENDENCY') {
      blockers.push({ type: 'DEPENDENCY', dependency_ids: deps, proof: 'QUEUE_DECLARED_BLOCKED_DEPENDENCY' });
    }
    if (state === 'CLAIMED_NOT_STARTED') {
      blockers.push({ type: 'OWNERSHIP_WAIT', claim_ref: sourceRef(claim), proof: 'CLAIM_EXISTS_START_NOT_OBSERVED' });
    }
    if (state === 'RETURNED_NOT_TERMINAL') {
      blockers.push({ type: 'LINEAGE_MISMATCH', proof: 'RETURN_EXISTS_RUN_NOT_TERMINAL' });
    }
    if (crossAttemptReturns.length) {
      blockers.push({
        type: 'RECONCILIATION_REQUIRED',
        proof: 'RETURN_EXISTS_FOR_DIFFERENT_ATTEMPT',
        return_run_ids: [...new Set(crossAttemptReturns.map(item => item?.run_id).filter(Boolean))].sort()
      });
    }
    if (stale.state === 'STALE_SUSPECT' || stale.state === 'RECOVERY_TIME_GATE_MET') {
      blockers.push({ type: 'STALE_RISK', stale_state: stale.state, proof: 'DURABLE_TIMESTAMP_ONLY' });
    }

    return {
      opportunity_id: id,
      queue_id: opportunity?._queue_id,
      queue_status: opportunity?._queue_status,
      declared_status: opportunity?.status ?? 'UNKNOWN',
      priority: opportunity?.priority ?? null,
      type: opportunity?.type ?? null,
      project_id: opportunity?.project_id ?? null,
      surface_id: surfaceId(opportunity),
      lifecycle_state: state,
      dependency_ids: deps,
      claim: claim ? {
        state: claim.state ?? null,
        worker_instance_id: claim.worker_instance_id ?? null,
        claimed_at: claim.claimed_at ?? null,
        ref: sourceRef(claim)
      } : null,
      run: run ? {
        run_id: run.run_id ?? null,
        state: run.state ?? null,
        worker_instance_id: run.worker_instance_id ?? null,
        started_at: run.started_at ?? null,
        heartbeat_at: run.heartbeat_at ?? null,
        ref: sourceRef(run)
      } : null,
      return_evidence_count: allReturns.length,
      current_run_return: ret ? {
        run_id: ret.run_id ?? null,
        state: ret.state ?? null,
        created_at: ret.created_at ?? ret.returned_at ?? null,
        ref: sourceRef(ret)
      } : null,
      latest_return_evidence: returnByOpportunity.get(id) ? {
        run_id: returnByOpportunity.get(id).run_id ?? null,
        state: returnByOpportunity.get(id).state ?? null,
        created_at: returnByOpportunity.get(id).created_at ?? returnByOpportunity.get(id).returned_at ?? null,
        ref: sourceRef(returnByOpportunity.get(id))
      } : null,
      recovery_claim_count: (recoveriesByOpportunity.get(id) ?? []).length,
      stale,
      blockers
    };
  }).sort((a, b) => (Number(b.priority ?? -Infinity) - Number(a.priority ?? -Infinity)) || String(a.opportunity_id).localeCompare(String(b.opportunity_id)));

  const byState = {};
  for (const record of records) byState[record.lifecycle_state] = (byState[record.lifecycle_state] ?? 0) + 1;

  const free = records.filter(r => r.lifecycle_state === 'READY_UNCLAIMED');
  const working = records.filter(r => r.lifecycle_state === 'WORKING');
  const returned = records.filter(r => r.return_evidence_count > 0);
  const done = records.filter(r => ['DONE', 'COMPLETE', 'CLOSED', 'RECOVERY_COMPLETE'].includes(r.lifecycle_state));
  const problem = records.filter(r => r.lifecycle_state === 'RETURNED_ORPHAN_EVIDENCE' || r.lifecycle_state === 'RETURNED_NOT_TERMINAL' || r.blockers.some(b => b.type === 'RECONCILIATION_REQUIRED') || ['STALE_SUSPECT', 'RECOVERY_TIME_GATE_MET'].includes(r.stale.state));
  const waiting = records.filter(r => r.lifecycle_state.startsWith('BLOCKED') || r.lifecycle_state === 'CLAIMED_NOT_STARTED');

  const workerMap = new Map();
  for (const record of records) {
    const worker = record.run?.worker_instance_id ?? record.claim?.worker_instance_id;
    if (!worker) continue;
    const existing = workerMap.get(worker) ?? { worker_instance_id: worker, opportunity_ids: [], states: [], stale_states: [] };
    existing.opportunity_ids.push(record.opportunity_id);
    existing.states.push(record.lifecycle_state);
    if (record.stale.state !== 'NONE') existing.stale_states.push(record.stale.state);
    workerMap.set(worker, existing);
  }

  const activeQueueRefs = array(continuityHead?.active_queues).map(q => q?.ref).filter(Boolean).sort();
  const sourceRefs = [...new Set([
    'coordination/CONTINUITY_HEAD.json',
    ...activeQueueRefs,
    ...claims.map(sourceRef),
    ...runs.map(sourceRef),
    ...returns.map(sourceRef),
    ...recoveryClaims.map(sourceRef)
  ].filter(Boolean))].sort();

  return {
    schema: CONTROL_ROOM_SCHEMA,
    derived_at: new Date(nowMs).toISOString(),
    authority: CONTROL_ROOM_AUTHORITY,
    truth_boundary: 'Projection only. It cannot create Current, Human Accepted, Served, dependency satisfaction, recovery eligibility, or mutation authority.',
    stale_policy: {
      heartbeat_target_minutes: Number(stalePolicy?.heartbeat_target_minutes ?? 10),
      suspect_after_minutes: Number(stalePolicy?.suspect_minutes ?? stalePolicy?.suspect_after_minutes ?? 20),
      recovery_eligible_after_minutes: Number(stalePolicy?.recovery_eligible_minutes ?? stalePolicy?.recovery_eligible_after_minutes ?? 30),
      rule: 'RECOVERY_TIME_GATE_MET is not RECOVERY_ELIGIBLE until retry safety, authority, latest target state and collision checks are proven.'
    },
    summary: {
      opportunities_total: records.length,
      working: working.length,
      returned: returned.length,
      done: done.length,
      waiting: waiting.length,
      problem: problem.length,
      ready_unclaimed: free.length,
      useful_free_slots: free.length,
      by_lifecycle_state: Object.fromEntries(Object.entries(byState).sort(([a], [b]) => a.localeCompare(b)))
    },
    useful_free_slots: {
      count: free.length,
      opportunity_ids: free.map(x => x.opportunity_id),
      rule: 'Only explicitly READY and currently unclaimed opportunities are counted. Dependency-blocked work is excluded unless another verified readiness compiler has already made it READY.'
    },
    roots: array(continuityHead?.roots).map(sanitizeRoot),
    surfaces: array(continuityHead?.surface_targets).map(sanitizeSurface),
    workers: [...workerMap.values()].sort((a, b) => a.worker_instance_id.localeCompare(b.worker_instance_id)),
    blockers: records.flatMap(r => r.blockers.map(b => ({ opportunity_id: r.opportunity_id, ...b }))),
    opportunities: records,
    sources: {
      refs: sourceRefs,
      source_count: sourceRefs.length,
      reconstructible: true
    },
    semantics: {
      working: 'A durable run exists in an active execution state and no durable return supersedes that state.',
      returned: 'At least one durable return artifact exists for the opportunity; current attempt state remains separately visible.',
      done: 'The latest durable run is terminal in a completed state.',
      waiting: 'Dependency-blocked or claimed-without-STARTED work.',
      problem: 'Stale risk or run/return lineage mismatch. It does not imply failure.',
      useful_free_slots: 'Explicit READY opportunities with no observed exclusive claim.'
    }
  };
}

function walkJson(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJson(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full);
  }
  return out.sort();
}

function readJsonFile(file, root) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return { ...data, _source_ref: path.relative(root, file).split(path.sep).join('/') };
}

function readJsonIfExists(file, root) {
  if (!fs.existsSync(file)) return null;
  return readJsonFile(file, root);
}

export function loadControlRoomInputs(rootDir) {
  const root = path.resolve(rootDir);
  const continuityHead = readJsonIfExists(path.join(root, 'coordination/CONTINUITY_HEAD.json'), root);
  if (!continuityHead) throw new Error('MISSING_CONTINUITY_HEAD');

  const queues = [];
  for (const q of array(continuityHead.active_queues)) {
    if (!q?.ref) continue;
    const item = readJsonIfExists(path.join(root, q.ref), root);
    if (item) queues.push(item);
  }
  const readDir = rel => walkJson(path.join(root, rel)).map(file => readJsonFile(file, root));

  return {
    continuityHead,
    queues,
    claims: readDir('coordination/opportunities/claims'),
    runs: readDir('coordination/opportunities/runs'),
    returns: readDir('coordination/opportunities/returns'),
    recoveryClaims: readDir('coordination/opportunities/recovery-claims')
  };
}

function argValue(args, name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 && index + 1 < args.length ? args[index + 1] : fallback;
}

export function runCli(argv = process.argv.slice(2)) {
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const root = path.resolve(argValue(argv, '--root', defaultRoot));
  const output = path.resolve(argValue(argv, '--output', path.join(root, 'dist/control-room/control-room.json')));
  const now = argValue(argv, '--now', new Date().toISOString());
  const projection = buildControlRoom({ ...loadControlRoomInputs(root), now });
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(projection, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, schema: projection.schema, output, summary: projection.summary }, null, 2)}\n`);
  return projection;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) runCli();
