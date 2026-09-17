#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const g = n => String(n).padStart(6, '0');
const arr = value => Array.isArray(value) ? value : [];
const finiteInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};
const parseTime = value => Date.parse(value || '') || 0;
const eventTime = doc => parseTime(doc?.returned_at || doc?.completed_at || doc?.heartbeat_at || doc?.observed_at || doc?.recorded_at || doc?.closed_at || doc?.started_at || doc?.claimed_at || doc?.launched_at || doc?.created_at || doc?.updated_at || doc?.timestamp);
const uniq = values => [...new Set(arr(values).filter(Boolean))].sort((a, b) => Buffer.from(String(a)).compare(Buffer.from(String(b))));
const clamp = (min, value, max) => Math.max(min, Math.min(max, value));
const lower = value => String(value ?? '').toLowerCase();
const sha12 = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
const roleLower = role => String(role).replace(/^GUIDE_/, '').toLowerCase();

export function normalizeRecoveryPolicy(job = {}, policy = null) {
  const source = policy && typeof policy === 'object' ? policy : {};
  if (source.mode === 'fixed_generation') {
    const fixedGeneration = finiteInt(source.fixed_generation, 0);
    if (fixedGeneration < 1) {
      return {
        mode: 'invalid_fixed_generation',
        ordinary_next_generation_eligible: false,
        fixed_generation: null,
        attention_route: source.attention_route || 'FIXED_GENERATION_RECONCILE',
        valid: false,
        reason: 'FIXED_GENERATION_POLICY_REQUIRES_POSITIVE_GENERATION'
      };
    }
    return {
      mode: 'fixed_generation',
      ordinary_next_generation_eligible: false,
      fixed_generation: fixedGeneration,
      attention_route: source.attention_route || 'FIXED_GENERATION_RECONCILE',
      attention_until: source.attention_until && typeof source.attention_until === 'object' ? source.attention_until : null,
      valid: true,
      reason: source.reason || 'JOB_CONTRACT_IS_GENERATION_FIXED'
    };
  }
  return {
    mode: 'next_generation_retry',
    ordinary_next_generation_eligible: true,
    fixed_generation: null,
    attention_route: null,
    attention_until: null,
    valid: true,
    reason: source.reason || 'DEFAULT_RETRY_SAFE_NEXT_GENERATION'
  };
}

function compactPortfolio(feed, semantic, job, targetGeneration = null) {
  const current = finiteInt(job.pin_generation, 0);
  const recovery = semantic(job);
  const next = targetGeneration ?? current + 1;
  const predecessor = current ? `coordination/portfolio/pins/${job.job_id}/G${g(current)}.json` : null;
  return {
    job_id: job.job_id,
    dedupe_key: job.dedupe_key || null,
    project_id: job.project_id || null,
    project_label: job.project_label || null,
    title: job.title || job.job_id,
    required_capabilities: uniq(job.required_capabilities),
    priority: job.priority || 0,
    state: job.state,
    authority_mode: job.authority_mode || null,
    pin_generation: current,
    next_generation: next,
    claim_generation_mode: recovery.mode === 'fixed_generation' ? 'FIXED' : 'NEXT',
    recovery_semantics: recovery,
    claim_mode: 'PORTFOLIO_PIN_CREATE',
    claim_path: `coordination/portfolio/pins/${job.job_id}/G${g(next)}.json`,
    claim_payload_shape: {
      schema: 'prometeo.portfolio-pin/v1',
      pin_id: `pin-${job.job_id}-G${g(next)}-<worker_id>`,
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      generation: next,
      worker_id: '<worker_id>',
      claim_id: `claim-${job.job_id}-G${g(next)}-<worker_id>`,
      claimed_at: '<now_iso>',
      expires_at: '<now_plus_10m_iso>',
      source_head: feed.source_sha || '<allocator_source_sha>',
      predecessor_pin_ref_or_null: predecessor,
      predecessor_claim_ref_or_null: null,
      recovery_basis_or_null: current ? {
        allocator_generated_at: feed.generated_at,
        predecessor_last_signal_at: job.last_signal_at || null,
        allocator_state: job.state
      } : null
    },
    predecessor_pin_ref: predecessor,
    last_signal_at: job.last_signal_at || null,
    post_claim_validate: true
  };
}

function roleEvidenceRef(job) {
  return job?.source_path || `coordination/portfolio/PORTFOLIO.json#job:${job?.job_id || 'unknown'}`;
}

export function compileRoleFrontier(feed = {}, efficiency = {}, jobs = [], ready = [], queueReady = [], recovery = [], roleContext = null) {
  if (!roleContext?.metabolism) return { role_ready: [], metabolism: null };
  const { metabolism, guideReceipts, guidePins, heartbeats, beacons, noAlloc } = roleContext;
  const now = Date.now();
  const signals = metabolism.signals || {};

  const receiptByWork = new Map();
  const consumedReturns = new Set();
  for (const row of arr(guideReceipts)) {
    const id = row.doc?.guide_work_id;
    if (id) {
      const values = receiptByWork.get(id) || [];
      values.push(row);
      receiptByWork.set(id, values);
    }
    for (const ref of arr(row.doc?.consumed_returns)) consumedReturns.add(ref);
  }

  const hbByWorker = new Map();
  for (const row of arr(heartbeats)) {
    const wid = row.doc?.worker_id || row.doc?.session_id || row.worker_id;
    if (!wid) continue;
    const values = hbByWorker.get(wid) || [];
    values.push(row);
    hbByWorker.set(wid, values);
  }

  const recentWindow = Number(signals.recent_launch_window_minutes || 10) * 60_000;
  const recentBeacons = arr(beacons).filter(row => now - eventTime(row.doc) <= recentWindow);
  const recentNoAlloc = arr(noAlloc).filter(row => now - eventTime(row.doc) <= recentWindow);
  const floor = Number(signals.frontier_floor_absolute || 8);
  const perLaunch = Number(signals.frontier_per_recent_launch || 1.5);
  const ceiling = Number(signals.frontier_ceiling || 40);
  const targetClaimable = clamp(floor, Math.ceil(perLaunch * recentBeacons.length), ceiling);
  const cleanFrontier = ready.length + queueReady.length;

  const recentReturnWindow = 6 * 60 * 60_000;
  const materialReturns = [];
  for (const job of jobs) {
    for (const ret of arr(job.returns)) {
      const ref = ret.path || null;
      const when = eventTime(ret);
      const outcome = lower(ret.outcome || ret.status || ret.result);
      if (!ref || !when || now - when > recentReturnWindow || consumedReturns.has(ref)) continue;
      if (!['done', 'verified', 'no_action_needed', 'superseded', 'partial', 'boundary'].some(value => outcome.includes(value))) continue;
      materialReturns.push({ path: ref, when, outcome, job_id: job.job_id });
    }
  }
  materialReturns.sort((a, b) => b.when - a.when || a.path.localeCompare(b.path));
  const unconsumedReturnRefs = uniq(materialReturns.slice(0, 12).map(row => row.path));

  const recoveryEvidence = uniq(recovery.slice(0, 8).map(item => item.predecessor_pin_ref || `coordination/portfolio/PORTFOLIO.json#job:${item.job_id}`));
  const collisionEvidence = uniq(jobs.flatMap(job => arr(job.collisions).map(row => row.path)).slice(-12));
  const partialEvidence = uniq(jobs
    .filter(job => ['partial', 'blocked'].includes(job.state))
    .flatMap(job => {
      const ret = arr(job.returns).at(-1);
      return [ret?.path, roleEvidenceRef(job)];
    })
    .slice(0, 12));
  const unresolvedEvidence = uniq(jobs
    .filter(job => job.state !== 'done')
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 12)
    .map(roleEvidenceRef));

  const youngAge = Number(signals.young_active_pin_guard_age_minutes || 3) * 60_000;
  const youngActive = arr(feed.workers).filter(worker => {
    if (worker.end_at || !(worker.pin_at || worker.job_id)) return false;
    const last = parseTime(worker.last_signal_at || worker.pin_at || worker.start_at || worker.first_seen);
    return last && now - last <= youngAge;
  }).length;
  const guardMinimum = Math.max(
    Number(signals.young_active_pin_guard_minimum || 4),
    Math.ceil(Number(signals.young_active_pin_guard_fraction_of_recent_launches || 0.5) * recentBeacons.length)
  );
  const overloadGuard = recentBeacons.length >= 8 && youngActive >= guardMinimum;

  const existingRoleBusy = role => jobs.some(job => job.guide_role === role && ['ready', 'working', 'recovery', 'suspect', 'partial'].includes(job.state));
  const rolePinState = roleId => {
    const rows = arr(guidePins)
      .filter(row => row.path?.startsWith(`coordination/guide/pins/${roleId}/`))
      .sort((a, b) => {
        const ga = finiteInt(a.path?.match(/G(\d+)\.json$/)?.[1], 0);
        const gb = finiteInt(b.path?.match(/G(\d+)\.json$/)?.[1], 0);
        return ga - gb || eventTime(a.doc) - eventTime(b.doc);
      });
    const latest = rows.at(-1) || null;
    const generation = finiteInt(latest?.path?.match(/G(\d+)\.json$/)?.[1], 0);
    if (arr(receiptByWork.get(roleId)).length) return { terminal: true, active: false, generation, latest };
    if (!latest) return { terminal: false, active: false, generation: 0, latest: null };
    const workerId = latest.doc?.worker_id;
    const hb = arr(hbByWorker.get(workerId)).sort((a, b) => eventTime(a.doc) - eventTime(b.doc)).at(-1) || null;
    const last = Math.max(eventTime(latest.doc), eventTime(hb?.doc));
    return { terminal: false, active: Boolean(last) && now - last < 10 * 60_000, generation, latest };
  };

  const candidate = ({ role, trigger, evidence, title, mission, priority }) => {
    const refs = uniq(evidence).slice(0, 12);
    if (!refs.length || existingRoleBusy(role)) return null;
    const preimage = JSON.stringify({ role, trigger, evidence: refs });
    const fingerprint = sha12(preimage);
    const roleId = `guide-${roleLower(role)}-${fingerprint}`;
    const state = rolePinState(roleId);
    if (state.terminal || state.active) return null;
    const next = state.generation + 1;
    const predecessor = state.generation ? `coordination/guide/pins/${roleId}/G${g(state.generation)}.json` : null;
    return {
      role_id: roleId,
      guide_work_id: roleId,
      role,
      trigger,
      fingerprint,
      title,
      mission,
      priority,
      evidence: refs,
      state: state.generation ? 'replaceable' : 'ready',
      generation: state.generation,
      next_generation: next,
      claim_mode: 'GUIDE_ROLE_PIN_CREATE',
      claim_path: `coordination/guide/pins/${roleId}/G${g(next)}.json`,
      claim_payload_shape: {
        schema: 'prometeo.guide-role-pin/v1',
        pin_id: `pin-${roleId}-G${g(next)}-<worker_id>`,
        guide_work_id: roleId,
        role,
        trigger,
        generation: next,
        worker_id: '<worker_id>',
        claim_id: `claim-${roleId}-G${g(next)}-<worker_id>`,
        claimed_at: '<now_iso>',
        expires_at: '<now_plus_10m_iso>',
        source_head: feed.source_sha || '<allocator_source_sha>',
        evidence: refs,
        predecessor_pin_ref_or_null: predecessor
      },
      post_claim_validate: true
    };
  };

  const roleReady = [];
  if (unconsumedReturnRefs.length >= Number(signals.unconsumed_returns_trigger || 3)) {
    roleReady.push(candidate({
      role: 'GUIDE_INTEGRATOR',
      trigger: 'RETURNS_UNCONSUMED',
      evidence: unconsumedReturnRefs,
      title: 'Integrar returns recientes y abrir sus sucesores',
      mission: 'Consumí los returns listados, reconciliá duplicados/conflictos, persistí disposición y materializá todos los sucesores seguros actualmente fundados. Después reentrá al allocator.',
      priority: 170
    }));
  }
  if (cleanFrontier < targetClaimable && unresolvedEvidence.length && !overloadGuard) {
    roleReady.push(candidate({
      role: 'GUIDE_PLANNER',
      trigger: 'FRONTIER_THIN',
      evidence: unresolvedEvidence,
      title: `Reponer frontier útil (${cleanFrontier}/${targetClaimable})`,
      mission: 'Usá los objetivos y pendientes evidenciados para materializar 1–7 trabajos no duplicados de implementación/verificación/integración. Nada de filler ni análisis sin jobs. Después intentá ejecutar o verificar uno.',
      priority: 165
    }));
  }
  const rescueEvidence = uniq([
    ...recoveryEvidence,
    ...collisionEvidence,
    ...(efficiency.status === 'REGRESSION' ? ['coordination/efficiency/RATCHET_BASELINE_V1.json'] : []),
    ...recentNoAlloc.slice(0, 4).map(row => row.path)
  ]);
  if (
    recovery.length >= Number(signals.replaceable_trigger || 3) ||
    collisionEvidence.length >= Number(signals.collision_pressure_trigger || 3) ||
    efficiency.status === 'REGRESSION' ||
    recentNoAlloc.length >= 3
  ) {
    roleReady.push(candidate({
      role: 'GUIDE_RESCATE',
      trigger: 'LOW_YIELD',
      evidence: rescueEvidence,
      title: 'Rescatar el cuello de producción más multiplicativo',
      mission: 'Encontrá el mecanismo común detrás de recovery/colisiones/no-allocation y cambialo durablemente. Preferí compiler/protocolo/CI sobre reparar workers uno por uno; agregá ratchet si es hot path y dejá verificación acotada.',
      priority: 175
    }));
  }
  if (partialEvidence.length >= Number(signals.partial_loop_trigger || 2) || efficiency.status === 'REGRESSION') {
    roleReady.push(candidate({
      role: 'GUIDE_CRITIC',
      trigger: 'PARTIAL_LOOP',
      evidence: uniq([...partialEvidence, ...(efficiency.status === 'REGRESSION' ? ['coordination/efficiency/RATCHET_BASELINE_V1.json'] : [])]),
      title: 'Atacar un loop parcial o una señal falsa de cierre',
      mission: 'Auditá independientemente la ruta débil evidenciada. Si el defecto es solucionable, materializá o implementá el repair/verify mínimo; no devuelvas sólo crítica.',
      priority: 160
    }));
  }

  const role_ready = roleReady.filter(Boolean).sort((a, b) => b.priority - a.priority || a.role_id.localeCompare(b.role_id));
  return {
    role_ready,
    metabolism: {
      recent_launches: recentBeacons.length,
      target_claimable: targetClaimable,
      clean_frontier: cleanFrontier,
      overload_guard: overloadGuard,
      young_active: youngActive,
      unconsumed_returns: unconsumedReturnRefs.length,
      recent_no_allocation: recentNoAlloc.length
    }
  };
}

export function buildFastAllocator(feed = {}, efficiency = {}, { recoveryPolicies = [], roleContext = null } = {}) {
  const jobs = arr(feed.projects).flatMap(project => arr(project.jobs).map(job => ({ ...job, project_label: project.label })));
  const policyByJob = new Map(arr(recoveryPolicies).filter(Boolean).map(policy => [policy.job_id, policy]));
  const semantic = job => normalizeRecoveryPolicy(job, policyByJob.get(job.job_id));
  const byPriority = (a, b) => (b.priority || 0) - (a.priority || 0) || String(a.job_id).localeCompare(String(b.job_id));

  const ready = jobs
    .filter(job => ['ready', 'partial'].includes(job.state))
    .filter(job => {
      const semantics = semantic(job);
      if (semantics.mode !== 'fixed_generation') return semantics.valid;
      return semantics.valid && finiteInt(job.pin_generation, 0) < semantics.fixed_generation;
    })
    .sort(byPriority)
    .map(job => {
      const semantics = semantic(job);
      return compactPortfolio(feed, semantic, job, semantics.mode === 'fixed_generation' ? semantics.fixed_generation : null);
    })
    .slice(0, 40);

  const queueReady = arr(feed.plans).flatMap(plan => arr(plan.items)
    .filter(item => item.state === 'ready')
    .map(item => ({
      opportunity_id: item.opportunity_id,
      mission: item.mission,
      priority: item.priority || 0,
      plan_id: plan.id,
      claim_mode: 'OPPORTUNITY_CLAIM_CREATE',
      claim_path: `coordination/opportunities/claims/${item.opportunity_id}.json`,
      claim_payload_shape: {
        schema: 'prometeo.opportunity-claim/v1',
        worker_id: '<worker_id>',
        opportunity_id: item.opportunity_id,
        claimed_at: '<now_iso>'
      },
      post_claim_validate: true
    })))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 30);

  const recovery = jobs
    .filter(job => job.state === 'replaceable')
    .filter(job => semantic(job).valid && semantic(job).ordinary_next_generation_eligible)
    .sort(byPriority)
    .map(job => compactPortfolio(feed, semantic, job))
    .slice(0, 30);

  const fixedAttentionResolved = (job, semantics) => {
    const gate = semantics.attention_until;
    if (!gate) return job.state === 'done';
    if (gate.metric === 'collision_count' && Number.isFinite(Number(gate.gte))) {
      return job.state === 'done' && finiteInt(job.collision_count, 0) >= Number(gate.gte);
    }
    return false;
  };

  const fixedGenerationAttention = jobs
    .map(job => ({ job, semantics: semantic(job) }))
    .filter(({ job, semantics }) => semantics.mode === 'fixed_generation' && semantics.valid && finiteInt(job.pin_generation, 0) >= semantics.fixed_generation && !fixedAttentionResolved(job, semantics))
    .sort((a, b) => byPriority(a.job, b.job))
    .map(({ job, semantics }) => ({
      job_id: job.job_id,
      dedupe_key: job.dedupe_key || null,
      project_id: job.project_id || null,
      project_label: job.project_label || null,
      title: job.title || job.job_id,
      priority: job.priority || 0,
      state: job.state,
      pin_generation: finiteInt(job.pin_generation, 0),
      fixed_generation: semantics.fixed_generation,
      collision_count: finiteInt(job.collision_count, 0),
      latest_return: job.latest_return || null,
      route: semantics.attention_route,
      attention_until: semantics.attention_until,
      reason: semantics.reason,
      ordinary_next_generation_eligible: false
    }))
    .slice(0, 30);

  const invalidRecoveryPolicies = jobs
    .map(job => ({ job_id: job.job_id, policy: semantic(job) }))
    .filter(row => !row.policy.valid);

  const roles = compileRoleFrontier(feed, efficiency, jobs, ready, queueReady, recovery, roleContext);

  return {
    schema: 'prometeo.fast-allocator/v3',
    generated_at: feed.generated_at,
    source_sha: feed.source_sha || null,
    truth_boundary: 'COMPILED_EXECUTION_PLUS_LATENT_ROLE_FRONTIER',
    max_recovery_snapshot_age_seconds: 90,
    preferred_order: ['ready', 'queue_ready', 'role_ready', 'recovery'],
    counts: {
      ready: ready.length,
      queue_ready: queueReady.length,
      role_ready: roles.role_ready.length,
      recovery: recovery.length,
      fixed_generation_attention: fixedGenerationAttention.length
    },
    ready,
    queue_ready: queueReady,
    role_ready: roles.role_ready,
    recovery,
    fixed_generation_attention: fixedGenerationAttention,
    metabolism: roles.metabolism,
    worker_projection: feed.summary?.workers || {},
    efficiency: {
      status: efficiency.status,
      metrics: efficiency.metrics,
      reasons: efficiency.reasons
    },
    diagnostics: {
      ...(feed.diagnostics || {}),
      invalid_recovery_policies: invalidRecoveryPolicies
    }
  };
}

export function loadRecoveryPolicies(root = '.') {
  const dir = path.join(root, 'coordination', 'portfolio', 'recovery-policies');
  if (!fs.existsSync(dir)) return [];
  const policies = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
    const file = path.join(dir, ent.name);
    try {
      const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (doc?.job_id) policies.push(doc);
    } catch {
      policies.push({ job_id: `INVALID:${ent.name}`, mode: 'fixed_generation', fixed_generation: 0, reason: 'INVALID_POLICY_JSON' });
    }
  }
  return policies;
}

function loadJsonRows(root, rel) {
  const base = path.join(root, rel);
  if (!fs.existsSync(base)) return [];
  const rows = [];
  const visit = (dir, relDir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, ent.name);
      const relPath = path.posix.join(relDir, ent.name);
      if (ent.isDirectory()) visit(file, relPath);
      else if (ent.name.endsWith('.json')) {
        try { rows.push({ path: relPath, doc: JSON.parse(fs.readFileSync(file, 'utf8')) }); } catch {}
      }
    }
  };
  visit(base, rel);
  return rows;
}

export function loadRoleContext(root = '.') {
  const metabolismPath = path.join(root, 'coordination', 'guide', 'METABOLISM_POLICY_V1.json');
  if (!fs.existsSync(metabolismPath)) return null;
  return {
    metabolism: JSON.parse(fs.readFileSync(metabolismPath, 'utf8')),
    guideReceipts: loadJsonRows(root, 'coordination/guide/receipts'),
    guidePins: loadJsonRows(root, 'coordination/guide/pins'),
    heartbeats: loadJsonRows(root, 'coordination/workers/heartbeats'),
    beacons: loadJsonRows(root, 'coordination/workers/beacons'),
    noAlloc: loadJsonRows(root, 'coordination/workers/no-allocation')
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const [feedPath, efficiencyPath, outPath, root = '.'] = argv;
  if (!feedPath || !efficiencyPath || !outPath) {
    throw new Error('usage: build-fast-allocator.mjs <feed.json> <efficiency.json> <allocator.json> [repo-root]');
  }
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
  const efficiency = JSON.parse(fs.readFileSync(efficiencyPath, 'utf8'));
  const recoveryPolicies = loadRecoveryPolicies(root);
  const roleContext = loadRoleContext(root);
  const allocator = buildFastAllocator(feed, efficiency, { recoveryPolicies, roleContext });
  fs.writeFileSync(outPath, `${JSON.stringify(allocator, null, 2)}\n`);
  process.stdout.write(`allocator ${allocator.schema} ready=${allocator.counts.ready} queue=${allocator.counts.queue_ready} roles=${allocator.counts.role_ready} recovery=${allocator.counts.recovery}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}