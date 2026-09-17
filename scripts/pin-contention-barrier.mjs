#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

export const ENTRANT_SCHEMA = 'prometeo.portfolio-contention-entrant/v1';
export const BARRIER_SCHEMA = 'prometeo.portfolio-contention-barrier/v1';

function asTime(value) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`Invalid ${name}`);
  return value;
}

export function validateBarrierConfig(config) {
  if (!config || config.schema !== BARRIER_SCHEMA) throw new Error('Invalid barrier schema');
  const fixtureId = requireNonEmptyString(config.fixture_id, 'fixture_id');
  const targetJobId = requireNonEmptyString(config.target_job_id, 'target_job_id');
  const required = Number(config.required_contenders);
  if (!Number.isInteger(required) || required < 2) throw new Error('required_contenders must be an integer >= 2');
  const opened = asTime(config.opened_at);
  const deadline = asTime(config.deadline_at);
  if (opened === null || deadline === null || deadline <= opened) throw new Error('Invalid barrier time window');
  return { fixtureId, targetJobId, required, opened, deadline };
}

export function validateEntrantReceipt(receipt, config) {
  const { fixtureId, targetJobId, opened, deadline } = validateBarrierConfig(config);
  if (!receipt || receipt.schema !== ENTRANT_SCHEMA) return { valid: false, reason: 'BAD_SCHEMA' };
  if (receipt.fixture_id !== fixtureId) return { valid: false, reason: 'WRONG_FIXTURE' };
  if (receipt.target_job_id !== targetJobId) return { valid: false, reason: 'WRONG_TARGET' };
  if (typeof receipt.worker_id !== 'string' || receipt.worker_id.trim() === '') return { valid: false, reason: 'MISSING_WORKER' };
  const armed = asTime(receipt.armed_at);
  if (armed === null) return { valid: false, reason: 'BAD_TIME' };
  if (armed < opened || armed > deadline) return { valid: false, reason: 'OUTSIDE_WINDOW' };
  if (receipt.authority && receipt.authority !== 'BARRIER_ENTRANT_ONLY') return { valid: false, reason: 'BAD_AUTHORITY' };
  return { valid: true, armed, worker_id: receipt.worker_id };
}

export function evaluateContentionBarrier(config, receipts = [], options = {}) {
  const parsed = validateBarrierConfig(config);
  const now = asTime(options.now ?? new Date().toISOString());
  if (now === null) throw new Error('Invalid now timestamp');

  const valid = [];
  const invalid = [];
  for (const receipt of receipts) {
    const check = validateEntrantReceipt(receipt, config);
    if (!check.valid) invalid.push({ worker_id: receipt?.worker_id ?? null, reason: check.reason });
    else valid.push({ receipt, armed: check.armed, worker_id: check.worker_id });
  }

  valid.sort((a, b) => a.armed - b.armed || a.worker_id.localeCompare(b.worker_id));
  const firstByWorker = new Map();
  for (const row of valid) if (!firstByWorker.has(row.worker_id)) firstByWorker.set(row.worker_id, row);
  const entrants = [...firstByWorker.values()];
  const released = entrants.length >= parsed.required;
  const timedOut = !released && now >= parsed.deadline;
  const state = released ? 'RELEASED' : timedOut ? 'TIMED_OUT' : 'ARMING';
  const releaseAt = released ? new Date(entrants[parsed.required - 1].armed).toISOString() : null;

  return {
    schema: 'prometeo.portfolio-contention-barrier-state/v1',
    fixture_id: parsed.fixtureId,
    target_job_id: parsed.targetJobId,
    observed_at: new Date(now).toISOString(),
    state,
    required_contenders: parsed.required,
    distinct_valid_entrants: entrants.length,
    entrant_worker_ids: entrants.map((row) => row.worker_id).sort(),
    duplicate_receipts_ignored: valid.length - entrants.length,
    invalid_receipts: invalid,
    release_at: releaseAt,
    race_allowed: released,
    authority: 'BARRIER_ONLY_NO_EXECUTION_AUTHORITY',
    next_action: released ? 'RACE_NORMAL_DETERMINISTIC_PIN' : timedOut ? 'ABANDON_FIXTURE_AND_REALLOCATE' : 'WAIT_FOR_MORE_ENTRANTS'
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function loadBarrierState(repoRoot, fixtureId, options = {}) {
  requireNonEmptyString(fixtureId, 'fixture_id');
  const root = path.join(repoRoot, 'coordination/portfolio/contention', fixtureId);
  const config = await readJson(path.join(root, 'BARRIER.json'));
  const entrantsDir = path.join(root, 'entrants');
  let entries = [];
  try { entries = await fs.readdir(entrantsDir, { withFileTypes: true }); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  const receipts = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    try { receipts.push(await readJson(path.join(entrantsDir, entry.name))); }
    catch { /* malformed/in-flight receipt fails closed by exclusion */ }
  }
  return evaluateContentionBarrier(config, receipts, options);
}

async function main(argv) {
  const args = [...argv];
  const take = (flag, fallback = null) => {
    const index = args.indexOf(flag);
    if (index < 0) return fallback;
    const value = args[index + 1];
    args.splice(index, 2);
    return value;
  };
  const repoRoot = path.resolve(take('--root', '.'));
  const fixtureId = take('--fixture', null);
  const now = take('--now', new Date().toISOString());
  if (!fixtureId) throw new Error('Missing --fixture');
  process.stdout.write(`${JSON.stringify(await loadBarrierState(repoRoot, fixtureId, { now }), null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
  });
}
