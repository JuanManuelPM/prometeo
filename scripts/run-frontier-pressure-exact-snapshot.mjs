#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TERMINAL_OUTCOMES = new Set(['DONE', 'VERIFIED', 'NO_ACTION_NEEDED', 'SUPERSEDED']);
const DEFAULT_CANARY_JOB = 'portfolio-exclusive-job-pin-live-race-2-v1';

function sha256Text(value) {
  return crypto.createHash('sha256').update(value ?? '').digest('hex');
}

async function sha256File(file) {
  return sha256Text(await fs.readFile(file));
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function collectJsonRows(dir, repoRoot) {
  const rows = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return rows;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) rows.push(...await collectJsonRows(full, repoRoot));
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      let value;
      try {
        value = await readJson(full);
      } catch (error) {
        throw new Error(`Malformed JSON at ${path.relative(repoRoot, full)}: ${error.message}`);
      }
      rows.push({
        source_path: path.relative(repoRoot, full).replaceAll(path.sep, '/'),
        value,
      });
    }
  }
  return rows;
}

function asTime(value) {
  const t = Date.parse(value ?? '');
  return Number.isFinite(t) ? t : null;
}

function newestIso(values) {
  const parsed = values.map((value) => ({ value, t: asTime(value) })).filter((row) => row.t !== null);
  if (!parsed.length) return null;
  parsed.sort((a, b) => b.t - a.t);
  return parsed[0].value;
}

export async function collectCanaryRefs(repoRoot, jobId = DEFAULT_CANARY_JOB) {
  const pinRows = await collectJsonRows(path.join(repoRoot, 'coordination/portfolio/pins', jobId), repoRoot);
  const claimRows = await collectJsonRows(path.join(repoRoot, 'coordination/portfolio/claims', jobId), repoRoot);
  const returnRows = await collectJsonRows(path.join(repoRoot, 'coordination/portfolio/returns', jobId), repoRoot);

  if (!pinRows.length) throw new Error(`Canary ${jobId} has no durable pin refs`);
  if (!claimRows.length) throw new Error(`Canary ${jobId} has no durable claim refs`);
  if (!returnRows.length) throw new Error(`Canary ${jobId} has no durable return refs`);

  for (const row of pinRows) {
    if (row.value?.job_id !== jobId || !Number.isInteger(Number(row.value?.generation)) || !row.value?.worker_id) {
      throw new Error(`Malformed pin ref ${row.source_path}`);
    }
  }
  for (const row of claimRows) {
    if (row.value?.job_id !== jobId || !row.value?.worker_id) throw new Error(`Malformed claim ref ${row.source_path}`);
  }
  for (const row of returnRows) {
    if (row.value?.job_id !== jobId || !row.value?.outcome) throw new Error(`Malformed return ref ${row.source_path}`);
  }

  const orderedPins = [...pinRows].sort((a, b) => Number(b.value.generation) - Number(a.value.generation));
  const latestPin = orderedPins[0];
  const latestGeneration = Number(latestPin.value.generation);
  const sameGeneration = orderedPins.filter((row) => Number(row.value.generation) === latestGeneration);
  if (sameGeneration.length !== 1) throw new Error(`Ambiguous highest pin generation ${latestGeneration} for ${jobId}`);

  const matchingClaim = claimRows.find((row) =>
    row.value?.worker_id === latestPin.value.worker_id &&
    (row.value?.claim_id === latestPin.value.claim_id || row.value?.pin_generation === latestGeneration));
  if (!matchingClaim) throw new Error(`No matching claim for highest pin generation ${latestGeneration} of ${jobId}`);

  const workerIds = new Set([
    ...pinRows.map((row) => row.value?.worker_id),
    ...claimRows.map((row) => row.value?.worker_id),
    ...returnRows.map((row) => row.value?.worker_id),
  ].filter(Boolean));

  const heartbeatRows = [];
  for (const workerId of workerIds) {
    const rows = await collectJsonRows(path.join(repoRoot, 'coordination/workers/heartbeats', workerId), repoRoot);
    heartbeatRows.push(...rows.filter((row) => (row.value?.job_id ?? row.value?.opportunity_id) === jobId));
  }
  if (!heartbeatRows.length) throw new Error(`Canary ${jobId} has no job-scoped heartbeat refs`);

  const latestWorkerHeartbeats = heartbeatRows.filter((row) => row.value?.worker_id === latestPin.value.worker_id);
  if (!latestWorkerHeartbeats.length) {
    throw new Error(`Highest pin worker ${latestPin.value.worker_id} has no job-scoped heartbeat for ${jobId}`);
  }

  const latestOwnerSignalAt = newestIso([
    latestPin.value?.claimed_at,
    matchingClaim.value?.claimed_at,
    ...latestWorkerHeartbeats.map((row) => row.value?.heartbeat_at),
  ]);
  if (!latestOwnerSignalAt) throw new Error(`No parseable owner signal for ${jobId}`);

  return {
    job_id: jobId,
    highest_generation: latestGeneration,
    highest_pin_worker_id: latestPin.value.worker_id,
    highest_pin_ref: latestPin.source_path,
    matching_claim_ref: matchingClaim.source_path,
    latest_owner_signal_at: latestOwnerSignalAt,
    refs: {
      pins: pinRows.map((row) => row.source_path).sort(),
      claims: claimRows.map((row) => row.source_path).sort(),
      heartbeats: heartbeatRows.map((row) => row.source_path).sort(),
      returns: returnRows.map((row) => row.source_path).sort(),
    },
    returns: returnRows.map((row) => ({ source_path: row.source_path, outcome: String(row.value.outcome).toUpperCase() })),
  };
}

export function reconcileCanary(canary, compilerResult) {
  const observedAt = asTime(compilerResult?.observed_at);
  const latestSignalAt = asTime(canary?.latest_owner_signal_at);
  const cutoffMinutes = Number(compilerResult?.windows?.recovery_eligible_minutes);
  if (observedAt === null || latestSignalAt === null || !Number.isFinite(cutoffMinutes)) {
    throw new Error('Compiler result lacks parseable observed_at/recovery window for reconciliation');
  }

  const terminal = canary.returns.some((row) => TERMINAL_OUTCOMES.has(row.outcome));
  const ownerAgeMinutes = Math.max(0, (observedAt - latestSignalAt) / 60_000);
  const expectedReplaceable = !terminal && ownerAgeMinutes >= cutoffMinutes;
  const compilerReplaceable = (compilerResult?.liveness?.replaceable_job_ids ?? []).includes(canary.job_id);
  const compilerClaimable = (compilerResult?.frontier?.claimable_job_ids ?? []).includes(canary.job_id);

  if (compilerReplaceable !== expectedReplaceable) {
    throw new Error(`Canary ${canary.job_id} reconciliation mismatch: expected replaceable=${expectedReplaceable}, compiler=${compilerReplaceable}`);
  }
  if (terminal && compilerClaimable) {
    throw new Error(`Terminal canary ${canary.job_id} is compiler-claimable`);
  }

  return {
    status: 'PASS',
    owner_age_minutes: Number(ownerAgeMinutes.toFixed(3)),
    recovery_cutoff_minutes: cutoffMinutes,
    terminal,
    expected_replaceable: expectedReplaceable,
    compiler_replaceable: compilerReplaceable,
    compiler_claimable: compilerClaimable,
  };
}

function gitHead(repoRoot) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git rev-parse HEAD failed: ${(result.stderr || result.stdout || '').trim()}`);
  return result.stdout.trim();
}

function parseArgs(argv) {
  const args = [...argv];
  const take = (flag, fallback = null) => {
    const index = args.indexOf(flag);
    if (index < 0) return fallback;
    const value = args[index + 1];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    args.splice(index, 2);
    return value;
  };
  const root = path.resolve(take('--root', '.'));
  const sourceSha = take('--source-sha', null);
  const out = path.resolve(take('--out', path.join(root, 'artifacts/frontier-pressure-exact-snapshot-evidence.json')));
  const compilerOut = path.resolve(take('--compiler-out', path.join(root, 'artifacts/frontier-pressure.json')));
  const canaryJob = take('--canary-job', DEFAULT_CANARY_JOB);
  if (args.length) throw new Error(`Unknown arguments: ${args.join(' ')}`);
  if (!sourceSha || !/^[0-9a-f]{40}$/i.test(sourceSha)) throw new Error('--source-sha must be an explicit 40-hex commit SHA');
  return { root, sourceSha: sourceSha.toLowerCase(), out, compilerOut, canaryJob };
}

async function execute(options) {
  const startedAt = new Date().toISOString();
  const compilerPath = path.join(options.root, 'scripts/compile-frontier-pressure.mjs');
  const checkedOutSha = gitHead(options.root).toLowerCase();
  if (checkedOutSha !== options.sourceSha) {
    throw new Error(`Exact snapshot mismatch: requested ${options.sourceSha}, checked out ${checkedOutSha}`);
  }

  const compilerSha256 = await sha256File(compilerPath);
  await fs.mkdir(path.dirname(options.compilerOut), { recursive: true });
  const compilerArgs = [
    compilerPath,
    '--root', options.root,
    '--out', options.compilerOut,
    '--now', startedAt,
  ];
  const command = [process.execPath, ...compilerArgs].map((part) => JSON.stringify(part)).join(' ');
  const run = spawnSync(process.execPath, compilerArgs, { cwd: options.root, encoding: 'utf8' });
  const stdout = run.stdout ?? '';
  const stderr = run.stderr ?? '';

  const baseEvidence = {
    schema: 'prometeo.frontier-pressure-exact-snapshot-evidence/v1',
    requested_source_sha: options.sourceSha,
    checked_out_source_sha: checkedOutSha,
    execution_started_at: startedAt,
    compiler: {
      path: 'scripts/compile-frontier-pressure.mjs',
      sha256: compilerSha256,
      command,
      exit_status: run.status,
      stdout_sha256: sha256Text(stdout),
      stderr_sha256: sha256Text(stderr),
      stdout_excerpt: stdout.slice(0, 4000),
      stderr_excerpt: stderr.slice(0, 4000),
    },
  };

  if (run.status !== 0) {
    return { ...baseEvidence, status: 'FAIL', failure: `compiler exited ${run.status}` };
  }

  const compilerBytes = await fs.readFile(options.compilerOut);
  const compilerResult = JSON.parse(compilerBytes.toString('utf8'));
  const canary = await collectCanaryRefs(options.root, options.canaryJob);
  const reconciliation = reconcileCanary(canary, compilerResult);

  return {
    ...baseEvidence,
    status: 'PASS',
    execution_finished_at: new Date().toISOString(),
    compiler_output: {
      path: path.relative(options.root, options.compilerOut).replaceAll(path.sep, '/'),
      sha256: sha256Text(compilerBytes),
      schema: compilerResult?.schema ?? null,
      observed_at: compilerResult?.observed_at ?? null,
    },
    canary: {
      ...canary,
      reconciliation,
    },
    authority_boundary: 'Verification evidence only. No Current, Human Accepted, Served or production /w promotion.',
  };
}

async function main(argv) {
  let options;
  let evidence;
  try {
    options = parseArgs(argv);
    evidence = await execute(options);
  } catch (error) {
    const fallbackOutArg = (() => {
      const index = argv.indexOf('--out');
      return index >= 0 && argv[index + 1] ? path.resolve(argv[index + 1]) : path.resolve('artifacts/frontier-pressure-exact-snapshot-evidence.json');
    })();
    const sourceIndex = argv.indexOf('--source-sha');
    evidence = {
      schema: 'prometeo.frontier-pressure-exact-snapshot-evidence/v1',
      status: 'FAIL',
      requested_source_sha: sourceIndex >= 0 ? argv[sourceIndex + 1] ?? null : null,
      execution_finished_at: new Date().toISOString(),
      failure: error?.stack ?? String(error),
      authority_boundary: 'Verification failure. No PASS or product authority is implied.',
    };
    await writeJson(options?.out ?? fallbackOutArg, evidence);
    process.exitCode = 1;
    return;
  }

  await writeJson(options.out, evidence);
  process.stdout.write(`${JSON.stringify({ status: evidence.status, source_sha: evidence.checked_out_source_sha ?? null, evidence: path.relative(options.root, options.out).replaceAll(path.sep, '/') })}\n`);
  if (evidence.status !== 'PASS') process.exitCode = 1;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main(process.argv.slice(2));
