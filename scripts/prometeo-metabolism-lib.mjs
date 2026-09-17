import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {buildControlRoom, loadControlRoomInputs} from './build-control-room.mjs';

export const METABOLISM_SCHEMA = 'prometeo.metabolism-tick/v1';
export const METABOLISM_AUTHORITY = 'DERIVED_SHADOW_ONLY_NO_PROMOTION';
export const GENERATED_BASE = 'coordination/workstreams/chat-native-control-plane-v1/generated/metabolism';

const SECRET_KEY_RE = /^(secret|password|passwd|api[_-]?key|service[_-]?role[_-]?key|authorization|private[_-]?key|access[_-]?token|refresh[_-]?token|github[_-]?token|supabase[_-]?service[_-]?role[_-]?key)$/i;
const TERMINAL = new Set(['DONE','COMPLETE','CLOSED','BOUNDARY','FAILED','CANCELLED','SUPERSEDED','ABORTED','RECOVERY_COMPLETE']);
const RETURNISH = new Set(['RETURNED','RETURNED_CANDIDATE','RETURNED_BOUNDARY','DONE']);

function arr(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function rel(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listJsonFiles(full));
    else if (ent.isFile() && ent.name.endsWith('.json')) out.push(full);
  }
  return out.sort();
}

function readJsonTree(root, relDir) {
  return listJsonFiles(path.join(root, relDir)).flatMap(file => {
    try {
      const value = readJson(file);
      return [{...value, _source_ref: rel(root, file)}];
    } catch {
      return [];
    }
  });
}

function normalize(value, {dropVolatile=false} = {}) {
  if (Array.isArray(value)) return value.map(v => normalize(v, {dropVolatile}));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (dropVolatile && ['generated_at','derived_at','evaluated_at','triggered_at','age_minutes','heartbeat_age_minutes'].includes(key)) continue;
    out[key] = normalize(value[key], {dropVolatile});
  }
  return out;
}

export function stableStringify(value, options = {}) {
  return JSON.stringify(normalize(value, options));
}

export function semanticDigest(value) {
  return crypto.createHash('sha256').update(stableStringify(value, {dropVolatile:true})).digest('hex');
}

export function currentGitHead(root = process.cwd()) {
  try {
    return execFileSync('git', ['rev-parse','HEAD'], {cwd:root, encoding:'utf8'}).trim();
  } catch {
    return null;
  }
}

export function assertPinnedHead(pinnedHead, currentHead) {
  if (!pinnedHead || !currentHead) throw new Error('SOURCE_HEAD_UNRESOLVED');
  if (pinnedHead !== currentHead) throw new Error(`SOURCE_HEAD_DRIFT:${pinnedHead}:${currentHead}`);
  return true;
}

export function scanForbiddenSecrets(value, prefix = '$', findings = []) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanForbiddenSecrets(v, `${prefix}[${i}]`, findings));
    return findings;
  }
  if (!value || typeof value !== 'object') return findings;
  for (const [key, child] of Object.entries(value)) {
    const next = `${prefix}.${key}`;
    if (SECRET_KEY_RE.test(key) && child != null && String(child).length > 0) findings.push(next);
    scanForbiddenSecrets(child, next, findings);
  }
  return findings;
}

export function assertPublicSafe(inputs) {
  const findings = [];
  for (const [name, value] of Object.entries(inputs ?? {})) {
    scanForbiddenSecrets(value, `$inputs.${name}`, findings);
  }
  if (findings.length) {
    const error = new Error(`PRIVACY_BOUNDARY:${findings.join(',')}`);
    error.code = 'PRIVACY_BOUNDARY';
    error.findings = findings;
    throw error;
  }
  return true;
}

function explicitStalePolicy(continuityHead) {
  const policy =
    continuityHead?.distributed_swarm?.stale_defaults ??
    continuityHead?.stale_policy ??
    null;
  if (!policy || typeof policy !== 'object') return null;
  const suspect = Number(policy.suspect_minutes ?? policy.suspect_after_minutes);
  const recover = Number(policy.recovery_eligible_minutes ?? policy.recovery_eligible_after_minutes);
  if (!Number.isFinite(suspect) || !Number.isFinite(recover)) return null;
  return {
    suspect_after_minutes: suspect,
    recovery_eligible_after_minutes: recover,
    heartbeat_target_minutes: Number(policy.heartbeat_target_minutes ?? 10)
  };
}

function runSignal(run) {
  const fields = ['heartbeat_at','updated_at','checkpoint_at','started_at','created_at'];
  const times = fields.map(k => Date.parse(run?.[k])).filter(Number.isFinite);
  for (const cp of arr(run?.checkpoints)) {
    if (!cp || typeof cp !== 'object') continue;
    for (const key of ['heartbeat_at','updated_at','checkpoint_at','reached_at','created_at','timestamp','at']) {
      const ms = Date.parse(cp[key]);
      if (Number.isFinite(ms)) times.push(ms);
    }
  }
  return times.length ? Math.max(...times) : null;
}

function latestBy(items, key, timeFields) {
  const groups = new Map();
  for (const item of items) {
    const id = item?.[key];
    if (!id) continue;
    const list = groups.get(id) ?? [];
    list.push(item);
    groups.set(id, list);
  }
  const out = new Map();
  for (const [id, list] of groups) {
    list.sort((a,b) => {
      const ta = Math.max(...timeFields.map(k => Date.parse(a?.[k])).filter(Number.isFinite), -Infinity);
      const tb = Math.max(...timeFields.map(k => Date.parse(b?.[k])).filter(Number.isFinite), -Infinity);
      return tb - ta;
    });
    out.set(id, list[0]);
  }
  return out;
}

export function deriveStaleCandidates({continuityHead, runs=[], returns=[], now}) {
  const policy = explicitStalePolicy(continuityHead);
  if (!policy) {
    return {
      schema: 'prometeo.metabolism-stale-candidates/v1',
      authority: 'DIAGNOSTIC_ONLY_NO_RETRY_AUTHORITY',
      status: 'STALE_POLICY_MISSING',
      candidates: [],
      rule: 'No stale inference is allowed without an explicit durable stale/heartbeat policy.'
    };
  }
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error(`INVALID_NOW:${now}`);
  const retByRun = new Map(returns.filter(r => r?.run_id).map(r => [r.run_id, r]));
  const candidates = [];
  for (const run of runs) {
    const state = String(run?.state ?? '').toUpperCase();
    if (!run?.run_id || TERMINAL.has(state) || retByRun.has(run.run_id)) continue;
    const signal = runSignal(run);
    if (!Number.isFinite(signal)) continue;
    const ageMinutes = Math.max(0, (nowMs - signal) / 60000);
    if (ageMinutes < policy.suspect_after_minutes) continue;
    const staleState = ageMinutes >= policy.recovery_eligible_after_minutes
      ? 'RECOVERY_TIME_GATE_MET'
      : 'STALE_SUSPECT';
    candidates.push({
      opportunity_id: run.opportunity_id ?? null,
      run_id: run.run_id,
      worker_instance_id: run.worker_instance_id ?? null,
      stale_state: staleState,
      last_signal_at: new Date(signal).toISOString(),
      age_minutes: Math.floor(ageMinutes * 10) / 10,
      proof: 'EXPLICIT_POLICY_PLUS_DURABLE_RUN_SIGNAL',
      recovery_authorized: false
    });
  }
  candidates.sort((a,b) => String(a.opportunity_id).localeCompare(String(b.opportunity_id)) || String(a.run_id).localeCompare(String(b.run_id)));
  return {
    schema: 'prometeo.metabolism-stale-candidates/v1',
    authority: 'DIAGNOSTIC_ONLY_NO_RETRY_AUTHORITY',
    status: 'EVALUATED',
    policy,
    candidates,
    rule: 'RECOVERY_TIME_GATE_MET is not recovery authorization; retry safety, latest-target, collision and authority checks remain separate.'
  };
}

function returnPresent(ret) {
  if (!ret) return false;
  const state = String(ret.state ?? ret.status ?? '').toUpperCase();
  return RETURNISH.has(state) || state.startsWith('RETURNED') || Boolean(ret.created_at || ret.returned_at);
}

export function derivePlannerTrigger({
  returns=[],
  consumedReturnRefs=[],
  proposals=[],
  incidents=[],
  criticReturns=[],
  controlRoom,
  plannerCompilerAvailable=false,
  readyLowWatermark=2
}) {
  const consumed = new Set(consumedReturnRefs.filter(Boolean));
  const unconsumed = returns
    .filter(returnPresent)
    .filter(ret => !consumed.has(ret._source_ref ?? ret.return_ref))
    .map(ret => ret._source_ref ?? ret.return_ref ?? `${ret.opportunity_id ?? 'unknown'}:${ret.run_id ?? 'unknown'}`)
    .sort();
  const openIncidents = incidents
    .filter(i => !['CLOSED','RESOLVED','DONE'].includes(String(i.state ?? i.status ?? '').toUpperCase()))
    .map(i => i._source_ref ?? i.incident_id ?? 'incident')
    .sort();
  const proposalRefs = proposals.map(p => p._source_ref ?? p.proposal_id ?? 'proposal').sort();
  const criticRefs = criticReturns.filter(returnPresent).map(r => r._source_ref ?? r.run_id ?? 'critic').sort();
  const reasons = [];
  if (unconsumed.length) reasons.push('UNCONSUMED_RETURN');
  if (proposalRefs.length) reasons.push('PROPOSAL_PRESENT');
  if (openIncidents.length) reasons.push('OPEN_INCIDENT');
  if (criticRefs.length) reasons.push('FRESH_CRITIC_RETURN');
  const freeCount = Number(controlRoom?.useful_free_slots?.count ?? 0);
  if (freeCount < readyLowWatermark) reasons.push('READY_DEPTH_BELOW_WATERMARK');
  const due = reasons.length > 0;
  const evidence = {
    unconsumed_return_refs: unconsumed,
    proposal_refs: proposalRefs,
    open_incident_refs: openIncidents,
    critic_return_refs: criticRefs,
    ready_unclaimed_count: freeCount,
    ready_low_watermark: readyLowWatermark
  };
  return {
    schema: 'prometeo.metabolism-planner-trigger/v1',
    authority: 'TRIGGER_ONLY_NO_GENERATION_AUTHORITY',
    due,
    state: !due ? 'NO_TRIGGER' : plannerCompilerAvailable ? 'READY_FOR_DETERMINISTIC_PLANNER' : 'PLANNER_COMPUTE_REQUIRED',
    reason_codes: [...new Set(reasons)].sort(),
    evidence,
    dedup_key: semanticDigest({reason_codes:[...new Set(reasons)].sort(), evidence}),
    rule: 'This artifact may request Planner compute; it never synthesizes opportunities or promotes generated work by itself.'
  };
}

export function deriveLaunchDemand(controlRoom, {maxOpenings=50} = {}) {
  const records = arr(controlRoom?.opportunities);
  const free = records.filter(r => r.lifecycle_state === 'READY_UNCLAIMED');
  const byType = {};
  const bySurface = {};
  for (const item of free) {
    const type = item.type ?? 'UNKNOWN';
    byType[type] = (byType[type] ?? 0) + 1;
    const surface = item.surface_id ?? 'GLOBAL';
    bySurface[surface] = (bySurface[surface] ?? 0) + 1;
  }
  return {
    schema: 'prometeo.metabolism-launch-demand/v1',
    authority: 'DERIVED_DEMAND_ONLY_NO_WORKER_LAUNCH_AUTHORITY',
    claimable_slots: free.length,
    recommended_openings: Math.min(Math.max(0, Number(maxOpenings) || 0), free.length),
    by_type: Object.fromEntries(Object.entries(byType).sort(([a],[b]) => a.localeCompare(b))),
    by_surface: Object.fromEntries(Object.entries(bySurface).sort(([a],[b]) => a.localeCompare(b))),
    opportunity_ids: free.map(x => x.opportunity_id).filter(Boolean).sort(),
    blockers_count: arr(controlRoom?.blockers).length,
    rule: 'Only explicitly READY, currently unclaimed work is demand. BLOCKED_DEPENDENCY is never counted unless another verified compiler made it READY.'
  };
}

function sanitizeControlRoom(controlRoom) {
  return {
    ...controlRoom,
    roots: arr(controlRoom?.roots),
    surfaces: arr(controlRoom?.surfaces),
    workers: arr(controlRoom?.workers),
    opportunities: arr(controlRoom?.opportunities)
  };
}

export function deriveMetabolism({
  sourceHead,
  continuityHead={},
  queues=[],
  claims=[],
  runs=[],
  returns=[],
  recoveryClaims=[],
  proposals=[],
  incidents=[],
  criticReturns=[],
  consumedReturnRefs=[],
  now=new Date().toISOString(),
  plannerCompilerAvailable=false,
  readyLowWatermark=2,
  maxOpenings=50
} = {}) {
  if (!sourceHead) throw new Error('SOURCE_HEAD_REQUIRED');
  const controlRoom = buildControlRoom({continuityHead, queues, claims, runs, returns, recoveryClaims, now});
  const stale = deriveStaleCandidates({continuityHead, runs, returns, now});
  const planner = derivePlannerTrigger({
    returns, consumedReturnRefs, proposals, incidents, criticReturns,
    controlRoom, plannerCompilerAvailable, readyLowWatermark
  });
  const launch = deriveLaunchDemand(controlRoom, {maxOpenings});
  const outputs = {
    CONTROL_ROOM: sanitizeControlRoom(controlRoom),
    STALE_CANDIDATES: stale,
    PLANNER_TRIGGER: planner,
    LAUNCH_DEMAND: launch
  };
  assertPublicSafe(outputs);
  const digests = Object.fromEntries(Object.entries(outputs).map(([k,v]) => [k, semanticDigest(v)]));
  return {
    schema: METABOLISM_SCHEMA,
    authority: METABOLISM_AUTHORITY,
    source_head: sourceHead,
    generated_at: now,
    outputs,
    semantic_digests: digests,
    semantic_bundle_digest: semanticDigest({source_head:sourceHead, outputs}),
    truth_boundary: 'Derived shadow state only. No output grants Current, Human Accepted, Served, retry, integration, deployment or worker-launch authority.'
  };
}

function activeQueueRefs(continuityHead) {
  return arr(continuityHead?.active_queues).map(q => q?.ref).filter(Boolean);
}

function readQueueFiles(root, continuityHead) {
  const refs = activeQueueRefs(continuityHead);
  const files = refs.length
    ? refs.map(ref => path.join(root, ref)).filter(fs.existsSync)
    : listJsonFiles(path.join(root, 'coordination/opportunities')).filter(f => /QUEUE.*\.json$/i.test(path.basename(f)));
  return files.map(file => ({...readJson(file), _source_ref: rel(root,file)}));
}

function collectConsumedReturnRefs(root) {
  const workstreamDir = path.join(root, 'coordination/workstreams/chat-native-control-plane-v1');
  if (!fs.existsSync(workstreamDir)) return [];
  const refs = [];
  for (const file of listJsonFiles(workstreamDir)) {
    if (!/CONSUMPTION|DISPOSITION/i.test(path.basename(file))) continue;
    let data;
    try { data = readJson(file); } catch { continue; }
    for (const item of arr(data?.consumed ?? data?.dispositions)) {
      if (item?.return_ref && ['CONSUMED','ADOPT_FOR_NEXT_GENERATION','ADOPT_ROUTE_DELTA','ADOPT_WITH_DOWNGRADES','ADOPT_IMPLEMENTATION_ROUTE','ADOPT_CANARY_CONTRACT_PARTIAL_FAILURE','ADOPT_DESIGN_DEFER_DEPLOY'].includes(String(item.disposition ?? '').toUpperCase())) {
        refs.push(item.return_ref);
      }
    }
  }
  return [...new Set(refs)].sort();
}

export function loadMetabolismInputs(root = process.cwd()) {
  const base = loadControlRoomInputs(root);
  const continuityHead = base.continuityHead ?? readJson(path.join(root, 'coordination/CONTINUITY_HEAD.json'));
  const queues = base.queues?.length ? base.queues : readQueueFiles(root, continuityHead);
  const claims = base.claims ?? [];
  const runs = base.runs ?? [];
  const returns = base.returns ?? [];
  const recoveryClaims = base.recoveryClaims ?? base.recoveries ?? [];
  const proposals = readJsonTree(root, 'coordination/opportunities/proposals');
  const incidents = readJsonTree(root, 'coordination/opportunities/incidents');
  const criticReturns = returns.filter(r => /CRITIC|VERIFY/i.test(String(r.opportunity_id ?? '')));
  const plannerCompilerAvailable = fs.existsSync(path.join(root, 'scripts/compile-planner-generation.mjs'));
  return {
    continuityHead, queues, claims, runs, returns, recoveryClaims,
    proposals, incidents, criticReturns,
    consumedReturnRefs: collectConsumedReturnRefs(root),
    plannerCompilerAvailable
  };
}

export function outputPaths(root = process.cwd()) {
  const base = path.join(root, GENERATED_BASE);
  return {
    LAST_TICK: path.join(base, 'LAST_TICK.json'),
    CONTROL_ROOM: path.join(base, 'CONTROL_ROOM.json'),
    STALE_CANDIDATES: path.join(base, 'STALE_CANDIDATES.json'),
    PLANNER_TRIGGER: path.join(base, 'PLANNER_TRIGGER.json'),
    LAUNCH_DEMAND: path.join(base, 'LAUNCH_DEMAND.json')
  };
}

export function writeShadowOutputs(root, derived, {trigger='manual'} = {}) {
  const paths = outputPaths(root);
  fs.mkdirSync(path.dirname(paths.LAST_TICK), {recursive:true});
  const changed = [];
  for (const [name, payload] of Object.entries(derived.outputs)) {
    const file = paths[name];
    const nextDigest = semanticDigest(payload);
    let priorDigest = null;
    if (fs.existsSync(file)) {
      try { priorDigest = semanticDigest(readJson(file)); } catch {}
    }
    if (priorDigest !== nextDigest) {
      fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
      changed.push(path.relative(root, file).split(path.sep).join('/'));
    }
  }
  const lastTick = {
    schema: 'prometeo.metabolism-last-tick/v1',
    authority: METABOLISM_AUTHORITY,
    source_head: derived.source_head,
    generated_at: derived.generated_at,
    trigger,
    semantic_bundle_digest: derived.semantic_bundle_digest,
    semantic_digests: derived.semantic_digests,
    changed_paths: changed,
    validation: 'PASS',
    next_boundary: derived.outputs.PLANNER_TRIGGER.state
  };
  if (changed.length > 0 || !fs.existsSync(paths.LAST_TICK)) {
    fs.writeFileSync(paths.LAST_TICK, `${JSON.stringify(lastTick, null, 2)}\n`);
    changed.push(path.relative(root, paths.LAST_TICK).split(path.sep).join('/'));
  }
  return {changed, lastTick};
}
