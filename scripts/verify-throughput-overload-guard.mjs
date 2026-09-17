#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TERMINAL = new Set(['DONE', 'VERIFIED', 'NO_ACTION_NEEDED', 'SUPERSEDED']);
const PRESERVED_EXISTING = ['EXECUTION', 'VERIFY', 'RECOVERY', 'GUIDE_INTEGRATOR', 'GUIDE_RESCATE', 'GUIDE_CRITIC'];
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const asTime = (value) => { const t = Date.parse(value ?? ''); return Number.isFinite(t) ? t : null; };

async function walk(dir) {
  const out = []; let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error?.code === 'ENOENT') return out; throw error; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

async function jsonRows(dir, root) {
  const out = [];
  for (const file of await walk(dir)) {
    const source_path = path.relative(root, file).replaceAll(path.sep, '/');
    try { out.push({ source_path, value: JSON.parse(await fs.readFile(file, 'utf8')) }); }
    catch (error) { throw new Error(`Malformed JSON ${source_path}: ${error.message}`); }
  }
  return out;
}

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
  return result.stdout.trim();
}

function patchValue(candidate, pointer) {
  const op = (candidate?.exact_json_patch ?? []).find((row) => row?.path === pointer && row?.op === 'add');
  if (!op) throw new Error(`Candidate missing patch ${pointer}`);
  return op.value;
}

export function extractCandidateConfig(candidate) {
  const minimum = Number(patchValue(candidate, '/signals/young_active_pin_guard_minimum'));
  const fraction = Number(patchValue(candidate, '/signals/young_active_pin_guard_fraction_of_recent_launches'));
  const ageMinutes = Number(patchValue(candidate, '/signals/young_active_pin_guard_age_minutes'));
  const overloadGuard = patchValue(candidate, '/overload_guard');
  const match = /distinct_recent_launches\s*>=\s*(\d+)/.exec(overloadGuard?.activation ?? '');
  const launchThreshold = match ? Number(match[1]) : NaN;
  if (![minimum, fraction, ageMinutes, launchThreshold].every(Number.isFinite)) throw new Error('Candidate activation thresholds are malformed');
  return { minimum, fraction, ageMinutes, launchThreshold, overloadGuard };
}

export function evaluateCandidate(config, launchEvidence, action = { kind: 'SELF_MATERIALIZE', guide_role: 'GUIDE_PLANNER' }) {
  const required = ['distinct_recent_launches', 'young_active_pin_count', 'worker_window_minutes', 'active_pin_age_minutes'];
  const missing = required.filter((key) => !Number.isFinite(Number(launchEvidence?.[key])));
  if (missing.length) return { verification_safe: false, active: null, selectable: null, planner_self_materialization_allowed: null, reason: `missing_or_malformed:${missing.join(',')}` };
  if (Number(launchEvidence.active_pin_age_minutes) !== config.ageMinutes) return { verification_safe: false, active: null, selectable: null, planner_self_materialization_allowed: null, reason: 'active_pin_age_window_mismatch' };
  const launches = Number(launchEvidence.distinct_recent_launches);
  const youngPins = Number(launchEvidence.young_active_pin_count);
  const requiredYoungPins = Math.max(config.minimum, Math.ceil(config.fraction * launches));
  const active = launches >= config.launchThreshold && youngPins >= requiredYoungPins;
  const suppressPlannerCreation = active && action?.kind === 'SELF_MATERIALIZE' && action?.guide_role === 'GUIDE_PLANNER';
  return {
    verification_safe: true,
    active,
    required_young_pins: requiredYoungPins,
    planner_self_materialization_allowed: !active,
    selectable: !suppressPlannerCreation,
    suppressed: suppressPlannerCreation,
  };
}

export async function buildLaunchEvidence(root, config, observedAt) {
  const now = asTime(observedAt); if (now === null) throw new Error('Invalid observed_at');
  const workerWindowMinutes = 10;
  const beacons = await jsonRows(path.join(root, 'coordination/workers/beacons'), root);
  const pins = await jsonRows(path.join(root, 'coordination/portfolio/pins'), root);
  const heartbeats = await jsonRows(path.join(root, 'coordination/workers/heartbeats'), root);
  const returns = await jsonRows(path.join(root, 'coordination/portfolio/returns'), root);
  const recentCutoff = now - workerWindowMinutes * 60_000;
  const recent = beacons.filter(({ value }) => {
    const t = asTime(value.launched_at ?? value.observed_at ?? value.created_at);
    return t !== null && t >= recentCutoff && t <= now && value.worker_id;
  });
  const workerIds = [...new Set(recent.map(({ value }) => value.worker_id))].sort();
  const terminalJobs = new Set(returns.filter(({ value }) => {
    const t = asTime(value.returned_at ?? value.completed_at ?? value.created_at);
    return t !== null && t <= now && TERMINAL.has(String(value.outcome ?? value.state ?? value.status ?? '').toUpperCase());
  }).map(({ value }) => value.job_id ?? value.opportunity_id).filter(Boolean));
  const heartbeatLatest = new Map();
  for (const { value } of heartbeats) {
    const job = value.job_id ?? value.opportunity_id; const worker = value.worker_id;
    const t = asTime(value.heartbeat_at ?? value.observed_at ?? value.created_at);
    if (!job || !worker || t === null || t > now) continue;
    const key = `${job}\0${worker}`; if (t > (heartbeatLatest.get(key) ?? -Infinity)) heartbeatLatest.set(key, t);
  }
  const byJob = new Map();
  for (const row of pins) {
    const value = row.value; const job = value.job_id; const generation = Number(value.generation);
    const claimedAt = asTime(value.claimed_at ?? value.pinned_at ?? value.created_at);
    if (!job || !Number.isInteger(generation) || !value.worker_id || claimedAt === null || claimedAt > now) continue;
    const group = byJob.get(job) ?? []; group.push(row); byJob.set(job, group);
  }
  const young = [];
  for (const [job, group] of byJob) {
    if (terminalJobs.has(job)) continue;
    const maxGeneration = Math.max(...group.map(({ value }) => Number(value.generation)));
    const highest = group.filter(({ value }) => Number(value.generation) === maxGeneration);
    if (highest.length !== 1) continue;
    const row = highest[0]; const value = row.value;
    const claimedAt = asTime(value.claimed_at ?? value.pinned_at ?? value.created_at) ?? -Infinity;
    const latest = Math.max(claimedAt, heartbeatLatest.get(`${job}\0${value.worker_id}`) ?? -Infinity);
    if (latest === -Infinity) continue;
    const ageMinutes = (now - latest) / 60_000;
    if (ageMinutes >= 0 && ageMinutes <= config.ageMinutes) young.push({ job_id: job, worker_id: value.worker_id, generation: maxGeneration, age_minutes: Number(ageMinutes.toFixed(3)), pin_ref: row.source_path });
  }
  young.sort((a, b) => a.job_id.localeCompare(b.job_id));
  return {
    observed_at: new Date(now).toISOString(),
    worker_window_minutes: workerWindowMinutes,
    active_pin_age_minutes: config.ageMinutes,
    distinct_recent_launches: workerIds.length,
    recent_worker_ids: workerIds,
    young_active_pin_count: young.length,
    young_active_pins: young,
  };
}

async function ownershipDigest(root) {
  const roots = ['coordination/portfolio/pins', 'coordination/portfolio/claims', 'coordination/portfolio/returns'];
  const entries = [];
  for (const relRoot of roots) for (const file of await walk(path.join(root, relRoot))) {
    const rel = path.relative(root, file).replaceAll(path.sep, '/'); const bytes = await fs.readFile(file); entries.push([rel, sha256(bytes)]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return { count: entries.length, sha256: sha256(Buffer.from(JSON.stringify(entries))) };
}

async function main(argv) {
  const take = (flag, fallback) => { const i = argv.indexOf(flag); return i < 0 ? fallback : argv[i + 1]; };
  const root = path.resolve(take('--root', '.'));
  const out = path.resolve(take('--out', path.join(root, 'artifacts/throughput-overload-guard-verification.json')));
  const observedAt = take('--observed-at', new Date().toISOString());
  const candidateRel = 'coordination/guide/candidates/THROUGHPUT_OVERLOAD_GUARD_CANDIDATE_V1.json';
  const policyRel = 'coordination/guide/METABOLISM_POLICY_V1.json';
  let evidence;
  try {
    const candidateBytes = await fs.readFile(path.join(root, candidateRel)); const candidate = JSON.parse(candidateBytes);
    const policyBytes = await fs.readFile(path.join(root, policyRel)); JSON.parse(policyBytes);
    const candidateBlob = git(root, ['hash-object', candidateRel]); const policyBlob = git(root, ['hash-object', policyRel]);
    if (policyBlob !== candidate?.target?.observed_blob_sha) throw new Error(`target_blob_mismatch:${policyBlob}:${candidate?.target?.observed_blob_sha ?? 'missing'}`);
    const config = extractCandidateConfig(candidate);
    const before = await ownershipDigest(root);
    const live = await buildLaunchEvidence(root, config, observedAt);
    const liveResult = evaluateCandidate(config, live);
    const fixtures = [
      { name: 'burst_active_10_launches_6_pins', input: { ...live, distinct_recent_launches: 10, young_active_pin_count: 6 }, expected: { active: true, planner_allowed: false } },
      { name: 'burst_inactive_10_launches_3_pins', input: { ...live, distinct_recent_launches: 10, young_active_pin_count: 3 }, expected: { active: false, planner_allowed: true } },
      { name: 'below_launch_threshold_7_launches_6_pins', input: { ...live, distinct_recent_launches: 7, young_active_pin_count: 6 }, expected: { active: false, planner_allowed: true } },
    ].map((fixture) => { const actual = evaluateCandidate(config, fixture.input); return { ...fixture, actual, pass: actual.active === fixture.expected.active && actual.planner_self_materialization_allowed === fixture.expected.planner_allowed }; });
    const overloadFixture = { ...live, distinct_recent_launches: 10, young_active_pin_count: 6 };
    const starvation = PRESERVED_EXISTING.map((work_class) => { const actual = evaluateCandidate(config, overloadFixture, { kind: 'SELECT_EXISTING', guide_role: work_class }); return { work_class, actual, pass: actual.verification_safe && actual.selectable === true && actual.suppressed === false }; });
    const existingPlanner = evaluateCandidate(config, overloadFixture, { kind: 'SELECT_EXISTING', guide_role: 'GUIDE_PLANNER' });
    const malformed = evaluateCandidate(config, { distinct_recent_launches: 10 }, { kind: 'SELF_MATERIALIZE', guide_role: 'GUIDE_PLANNER' });
    const after = await ownershipDigest(root);
    const ownershipUnchanged = before.count === after.count && before.sha256 === after.sha256;
    const liveExpectedYoung = Math.max(config.minimum, Math.ceil(config.fraction * live.distinct_recent_launches));
    const liveExpectedActive = live.distinct_recent_launches >= config.launchThreshold && live.young_active_pin_count >= liveExpectedYoung;
    const pass = liveExpectedActive && liveResult.verification_safe && liveResult.active === true && liveResult.planner_self_materialization_allowed === false && fixtures.every((x) => x.pass) && starvation.every((x) => x.pass) && existingPlanner.selectable === true && malformed.verification_safe === false && ownershipUnchanged;
    evidence = {
      schema: 'prometeo.throughput-overload-guard-verification/v1', status: pass ? 'PASS' : 'FAIL', promotion_safe: pass,
      source_head: git(root, ['rev-parse', 'HEAD']), observed_at: live.observed_at,
      exact_sources: { candidate_path: candidateRel, candidate_blob_sha: candidateBlob, candidate_sha256: sha256(candidateBytes), policy_path: policyRel, policy_blob_sha: policyBlob, policy_sha256: sha256(policyBytes), candidate_observed_target_blob_sha: candidate.target.observed_blob_sha },
      candidate_config: config,
      live_replay: { evidence: live, expected_required_young_pins: liveExpectedYoung, expected_active: liveExpectedActive, actual: liveResult, pass: liveExpectedActive && liveResult.active === true },
      burst_fixtures: fixtures,
      starvation_fixtures: starvation,
      existing_planner_remains_selectable: { actual: existingPlanner, pass: existingPlanner.selectable === true && existingPlanner.suppressed === false },
      fail_closed_fixture: { actual: malformed, pass: malformed.verification_safe === false },
      ownership_immutability: { before, after, pass: ownershipUnchanged },
      authority_boundary: 'Independent verification only. Policy promotion requires a separate CAS-safe integration of the exact candidate patch. No Current/Human Accepted/Served/product authority.'
    };
  } catch (error) {
    evidence = { schema: 'prometeo.throughput-overload-guard-verification/v1', status: 'FAIL', promotion_safe: false, source_head: null, observed_at: observedAt, failure: error?.stack ?? String(error), authority_boundary: 'Fail closed: no policy promotion.' };
    process.exitCode = 1;
  }
  await fs.mkdir(path.dirname(out), { recursive: true }); await fs.writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.status !== 'PASS') process.exitCode = 1; else process.stdout.write(`${JSON.stringify({ status: 'PASS', source_head: evidence.source_head, observed_at: evidence.observed_at })}\n`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main(process.argv.slice(2));
