#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TERMINAL_OUTCOMES = new Set(['DONE', 'VERIFIED', 'NO_ACTION_NEEDED', 'SUPERSEDED']);
const ACTIVE_JOB_STATUSES = new Set(['READY', 'ready']);

export function clamp(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

function asTime(value) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

function newest(...values) {
  return values.map(asTime).filter((v) => v !== null).reduce((a, b) => Math.max(a, b), -Infinity);
}

function walkValues(value, visit, key = '') {
  if (Array.isArray(value)) {
    for (const item of value) walkValues(item, visit, key);
    return;
  }
  if (value && typeof value === 'object') {
    visit(value, key);
    for (const [childKey, child] of Object.entries(value)) walkValues(child, visit, childKey);
  }
}

function normalizeTerminalReturn(record, sourcePath) {
  const outcome = record?.outcome ?? record?.state ?? record?.status ?? null;
  if (!outcome || !TERMINAL_OUTCOMES.has(String(outcome).toUpperCase())) return null;
  const jobId = record.job_id ?? record.opportunity_id ?? null;
  if (!jobId) return null;
  return {
    job_id: jobId,
    returned_at: record.returned_at ?? record.completed_at ?? record.created_at ?? null,
    source_path: sourcePath,
    outcome: String(outcome).toUpperCase(),
  };
}

export function computeFrontierPressure(snapshot, policy, options = {}) {
  const nowMs = asTime(options.now ?? new Date().toISOString());
  if (nowMs === null) throw new Error('Invalid now timestamp');

  const launchWindowMinutes = Number(policy?.signals?.recent_launch_window_minutes ?? 10);
  const heartbeatTargetMinutes = Number(policy?.signals?.heartbeat_target_minutes ?? 3);
  const staleSuspectMinutes = Number(policy?.signals?.stale_suspect_minutes ?? 6);
  const recoveryEligibleMinutes = Number(policy?.signals?.recovery_eligible_minutes ?? 10);
  const frontierFloor = Number(policy?.signals?.frontier_floor_absolute ?? 8);
  const frontierPerLaunch = Number(policy?.signals?.frontier_per_recent_launch ?? 1.5);
  const frontierCeiling = Number(policy?.signals?.frontier_ceiling ?? 40);
  const unconsumedReturnsTrigger = Number(policy?.signals?.unconsumed_returns_trigger ?? 3);
  const replaceableTrigger = Number(policy?.signals?.replaceable_trigger ?? 3);
  const returnWindowMinutes = Number(options.returnWindowMinutes ?? 60);

  const recentCutoff = nowMs - launchWindowMinutes * 60_000;
  const returnCutoff = nowMs - returnWindowMinutes * 60_000;

  const recentBeacons = (snapshot.beacons ?? []).filter((b) => {
    const t = asTime(b.launched_at);
    return t !== null && t >= recentCutoff && t <= nowMs;
  });
  const distinctRecentWorkers = new Set(recentBeacons.map((b) => b.worker_id).filter(Boolean));
  const targetClaimable = clamp(
    frontierFloor,
    Math.ceil(frontierPerLaunch * distinctRecentWorkers.size),
    frontierCeiling,
  );

  const terminalByJob = new Map();
  for (const r of snapshot.terminal_returns ?? []) {
    if (!r?.job_id) continue;
    const t = asTime(r.returned_at) ?? -Infinity;
    const prior = terminalByJob.get(r.job_id);
    if (!prior || t > (asTime(prior.returned_at) ?? -Infinity)) terminalByJob.set(r.job_id, r);
  }

  const ownerRows = [];
  const ownerByJob = new Map();
  for (const owner of snapshot.owners ?? []) {
    if (!owner?.job_id || terminalByJob.has(owner.job_id)) continue;
    const latest = newest(owner.latest_signal_at, owner.heartbeat_at, owner.claimed_at, owner.pinned_at, owner.started_at);
    const ageMinutes = latest === -Infinity ? null : Math.max(0, (nowMs - latest) / 60_000);
    let liveness = 'UNKNOWN';
    if (ageMinutes !== null) {
      if (ageMinutes < staleSuspectMinutes) liveness = 'ACTIVE';
      else if (ageMinutes < recoveryEligibleMinutes) liveness = 'STALE_SUSPECT';
      else liveness = owner.retry_safe === false ? 'STALE_NOT_RETRY_SAFE' : 'REPLACEABLE';
    }
    const row = { ...owner, latest_signal_at: latest === -Infinity ? null : new Date(latest).toISOString(), age_minutes: ageMinutes, liveness };
    ownerRows.push(row);
    const prior = ownerByJob.get(owner.job_id);
    if (!prior || (row.generation ?? 0) > (prior.generation ?? 0)) ownerByJob.set(owner.job_id, row);
  }

  const jobs = [];
  const seenJobs = new Set();
  for (const job of snapshot.jobs ?? []) {
    if (!job?.job_id || seenJobs.has(job.job_id)) continue;
    seenJobs.add(job.job_id);
    const terminal = terminalByJob.has(job.job_id);
    const owner = ownerByJob.get(job.job_id) ?? null;
    const explicitlyReady = ACTIVE_JOB_STATUSES.has(job.status) || job.status === 'READY';
    const claimable = explicitlyReady && !terminal && (!owner || owner.liveness === 'REPLACEABLE');
    jobs.push({ ...job, terminal, owner: owner ? { worker_id: owner.worker_id, liveness: owner.liveness, generation: owner.generation ?? null } : null, claimable });
  }

  const claimableJobs = jobs.filter((j) => j.claimable);
  const replaceableOwners = ownerRows.filter((o) => o.liveness === 'REPLACEABLE');
  const staleOwners = ownerRows.filter((o) => o.liveness === 'STALE_SUSPECT');

  const consumedReturnRefs = new Set(snapshot.consumed_return_refs ?? []);
  const recentUnconsumedReturns = (snapshot.material_returns ?? []).filter((r) => {
    const t = asTime(r.returned_at ?? r.created_at);
    if (t === null || t < returnCutoff || t > nowMs) return false;
    const ref = r.source_path ?? r.return_id ?? r.id;
    return ref && !consumedReturnRefs.has(ref);
  });

  const signals = {
    FRONTIER_THIN: claimableJobs.length < targetClaimable,
    RETURNS_UNCONSUMED: recentUnconsumedReturns.length >= unconsumedReturnsTrigger,
    REPLACEABLE_PRESSURE: replaceableOwners.length >= replaceableTrigger,
  };

  return {
    schema: 'prometeo.frontier-pressure-snapshot/v1',
    observed_at: new Date(nowMs).toISOString(),
    policy_status: policy?.status ?? null,
    windows: {
      recent_launch_minutes: launchWindowMinutes,
      return_window_minutes: returnWindowMinutes,
      heartbeat_target_minutes: heartbeatTargetMinutes,
      stale_suspect_minutes: staleSuspectMinutes,
      recovery_eligible_minutes: recoveryEligibleMinutes,
    },
    launch_pressure: {
      distinct_recent_workers: distinctRecentWorkers.size,
      recent_beacons: recentBeacons.length,
      target_claimable: targetClaimable,
      rule: `clamp(${frontierFloor}, ceil(${frontierPerLaunch} * distinct_recent_workers), ${frontierCeiling})`,
    },
    frontier: {
      total_jobs_seen: jobs.length,
      claimable_useful_jobs: claimableJobs.length,
      claimable_job_ids: claimableJobs.map((j) => j.job_id).sort(),
      terminal_jobs: jobs.filter((j) => j.terminal).length,
      live_owned_jobs: jobs.filter((j) => j.owner && j.owner.liveness !== 'REPLACEABLE').length,
    },
    liveness: {
      active: ownerRows.filter((o) => o.liveness === 'ACTIVE').length,
      stale_suspect: staleOwners.length,
      replaceable: replaceableOwners.length,
      replaceable_job_ids: replaceableOwners.map((o) => o.job_id).sort(),
    },
    returns: {
      recent_material_unconsumed: recentUnconsumedReturns.length,
      trigger_threshold: unconsumedReturnsTrigger,
      refs: recentUnconsumedReturns.map((r) => r.source_path ?? r.return_id ?? r.id).sort(),
    },
    signals,
    truth_boundary: 'This snapshot derives allocator/Guide pressure only. It does not promote Candidate, Verified, Human Accepted, Current, Served, or production /w authority.',
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonIfExists(file) {
  try { return await readJson(file); } catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}

async function collectJsonFiles(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch (error) { if (error?.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full);
    }
  }
  await walk(root);
  return out;
}

async function parseJsonFiles(files, repoRoot) {
  const rows = [];
  for (const file of files) {
    try {
      rows.push({ source_path: path.relative(repoRoot, file).replaceAll(path.sep, '/'), value: await readJson(file) });
    } catch {
      // Invalid/in-flight JSON is excluded rather than guessed.
    }
  }
  return rows;
}

export async function buildSnapshotFromRepo(repoRoot) {
  const beaconsRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/workers/beacons')), repoRoot);
  const heartbeatRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/workers/heartbeats')), repoRoot);
  const pinRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/portfolio/pins')), repoRoot);
  const portfolioClaimRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/portfolio/claims')), repoRoot);
  const portfolioReturnRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/portfolio/returns')), repoRoot);
  const opportunityClaimRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/opportunities/claims')), repoRoot);
  const opportunityReturnRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/opportunities/returns')), repoRoot);
  const guideReceiptRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/guide/receipts')), repoRoot);
  const derivedRows = await parseJsonFiles(await collectJsonFiles(path.join(repoRoot, 'coordination/portfolio/derived')), repoRoot);

  const heartbeatKey = (workerId, jobId) => JSON.stringify([workerId, jobId]);
  const heartbeatLatest = new Map();
  for (const { value } of heartbeatRows) {
    const worker = value.worker_id;
    const jobId = value.job_id ?? value.opportunity_id ?? null;
    if (!worker || !jobId) continue;
    const t = asTime(value.heartbeat_at);
    const key = heartbeatKey(worker, jobId);
    const prior = heartbeatLatest.get(key);
    if (t !== null && (!prior || t > prior.t)) heartbeatLatest.set(key, { t, at: value.heartbeat_at });
  }

  const terminalReturns = [];
  const materialReturns = [];
  for (const row of [...portfolioReturnRows, ...opportunityReturnRows]) {
    const r = row.value;
    const terminal = normalizeTerminalReturn(r, row.source_path);
    if (terminal) terminalReturns.push(terminal);
    const jobId = r.job_id ?? r.opportunity_id;
    if (jobId) materialReturns.push({ ...r, job_id: jobId, source_path: row.source_path });
  }

  const owners = [];
  for (const { value: pin } of pinRows) {
    if (!pin.job_id || !pin.worker_id) continue;
    owners.push({
      job_id: pin.job_id,
      worker_id: pin.worker_id,
      generation: Number(pin.generation ?? 0),
      pinned_at: pin.claimed_at,
      claimed_at: pin.claimed_at,
      heartbeat_at: heartbeatLatest.get(heartbeatKey(pin.worker_id, pin.job_id))?.at ?? null,
      latest_signal_at: heartbeatLatest.get(heartbeatKey(pin.worker_id, pin.job_id))?.at ?? pin.claimed_at,
      retry_safe: pin.retry_safe !== false,
      source: 'portfolio_pin',
    });
  }
  for (const { value: claim } of opportunityClaimRows) {
    if (!claim.opportunity_id || !claim.worker_instance_id) continue;
    owners.push({
      job_id: claim.opportunity_id,
      worker_id: claim.worker_instance_id,
      generation: 0,
      claimed_at: claim.claimed_at,
      heartbeat_at: heartbeatLatest.get(heartbeatKey(claim.worker_instance_id, claim.opportunity_id))?.at ?? null,
      latest_signal_at: heartbeatLatest.get(heartbeatKey(claim.worker_instance_id, claim.opportunity_id))?.at ?? claim.claimed_at,
      retry_safe: true,
      source: 'opportunity_claim',
    });
  }

  const jobs = [];
  const portfolio = await readJsonIfExists(path.join(repoRoot, 'coordination/portfolio/PORTFOLIO.json'));
  for (const project of portfolio?.projects ?? []) {
    for (const job of project.jobs ?? []) jobs.push({ job_id: job.job_id, status: job.seed_status, priority: job.priority ?? project.priority ?? 0, source: 'portfolio_seed', dedupe_key: job.dedupe_key ?? null });
  }
  for (const { value: job } of derivedRows) {
    if (job.job_id) jobs.push({ job_id: job.job_id, status: job.seed_status, priority: job.priority ?? 0, source: 'portfolio_derived', dedupe_key: job.dedupe_key ?? null });
  }

  const opportunityRootFiles = await parseJsonFiles((await fs.readdir(path.join(repoRoot, 'coordination/opportunities'), { withFileTypes: true }).catch(() => [])).filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => path.join(repoRoot, 'coordination/opportunities', e.name)), repoRoot);
  for (const { value } of opportunityRootFiles) {
    for (const opp of value.opportunities ?? []) {
      jobs.push({ job_id: opp.opportunity_id, status: opp.status, priority: opp.priority ?? 0, source: value.queue_id ?? 'opportunity_queue', dedupe_key: opp.dedupe_key ?? null });
    }
  }

  const consumedReturnRefs = [];
  for (const { value } of guideReceiptRows) {
    for (const ref of value.consumed_returns ?? []) if (typeof ref === 'string') consumedReturnRefs.push(ref);
  }

  return {
    beacons: beaconsRows.map(({ value, source_path }) => ({ ...value, source_path })),
    owners,
    jobs,
    terminal_returns: terminalReturns,
    material_returns: materialReturns,
    consumed_return_refs: consumedReturnRefs,
  };
}

async function main(argv) {
  const args = [...argv];
  const take = (flag, fallback = null) => {
    const i = args.indexOf(flag);
    if (i < 0) return fallback;
    const value = args[i + 1];
    args.splice(i, 2);
    return value;
  };
  const root = path.resolve(take('--root', '.'));
  const out = take('--out', null);
  const now = take('--now', new Date().toISOString());
  const returnWindowMinutes = Number(take('--return-window-minutes', '60'));
  const policyPath = path.join(root, 'coordination/guide/METABOLISM_POLICY_V1.json');
  const policy = await readJson(policyPath);
  const snapshot = await buildSnapshotFromRepo(root);
  const result = computeFrontierPressure(snapshot, policy, { now, returnWindowMinutes });
  const encoded = JSON.stringify(result, null, 2) + '\n';
  if (out) {
    const target = path.resolve(root, out);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, encoded, 'utf8');
  } else {
    process.stdout.write(encoded);
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main(process.argv.slice(2)).catch((error) => { console.error(error?.stack ?? String(error)); process.exitCode = 1; });
