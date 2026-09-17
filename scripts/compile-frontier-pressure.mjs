#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeFrontierPressure as computeBaseFrontierPressure,
  buildSnapshotFromRepo as buildBaseSnapshotFromRepo,
} from './compile-frontier-pressure-base.mjs';

function asTime(value) {
  const t = Date.parse(value ?? '');
  return Number.isFinite(t) ? t : null;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function readJsonIfExists(file) {
  try { return await readJson(file); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}

async function collectJsonFiles(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error?.code === 'ENOENT') return; throw error; }
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
      rows.push({
        source_path: path.relative(repoRoot, file).replaceAll(path.sep, '/'),
        value: await readJson(file),
      });
    } catch {
      // Historical opportunity documents remain diagnostic-only. A malformed
      // document cannot become allocator-routable merely because it exists.
    }
  }
  return rows;
}

function mergePortfolioJobs(seed = [], derived = []) {
  const map = new Map();
  for (const job of [
    ...seed.map((value) => ({ ...value, origin: 'seed' })),
    ...derived.map((value) => ({ ...value, origin: 'derived' })),
  ]) {
    const key = job.dedupe_key || job.job_id;
    if (!key) continue;
    if (!map.has(key) || job.origin === 'seed') map.set(key, job);
  }
  return [...map.values()];
}

export function buildAllocatorPortfolioDomain(portfolio, derivedRows) {
  const derivedByProject = new Map();
  for (const row of derivedRows ?? []) {
    const job = row?.value ?? row;
    if (!job?.project_id || !job?.job_id) continue;
    const rows = derivedByProject.get(job.project_id) ?? [];
    rows.push(job);
    derivedByProject.set(job.project_id, rows);
  }

  const jobs = [];
  for (const project of portfolio?.projects ?? []) {
    const merged = mergePortfolioJobs(project.jobs ?? [], derivedByProject.get(project.project_id) ?? []);
    for (const job of merged) {
      if (!job?.job_id) continue;
      jobs.push({
        job_id: job.job_id,
        status: job.seed_status,
        priority: job.priority ?? project.priority ?? 0,
        source: job.origin === 'derived' ? 'portfolio_derived_current' : 'portfolio_seed_current',
        dedupe_key: job.dedupe_key ?? null,
        project_id: project.project_id ?? null,
      });
    }
  }
  return jobs;
}

function isQueueDocument(sourcePath, value) {
  return /queue/i.test(path.posix.basename(sourcePath)) && Array.isArray(value?.opportunities);
}

function hasDirectClaim(claimRows, opportunityId) {
  const expected = `coordination/opportunities/claims/${opportunityId}.json`;
  return claimRows.some((row) => row.source_path === expected);
}

function hasNestedSignal(rows, prefix) {
  return rows.some((row) => row.source_path.startsWith(prefix));
}

export function buildAllocatorQueueReadyDomain(opportunityDocuments, claimRows, runRows, returnRows) {
  const jobs = [];
  const seen = new Set();
  for (const row of opportunityDocuments ?? []) {
    if (!isQueueDocument(row.source_path, row.value)) continue;
    for (const opp of row.value.opportunities ?? []) {
      const id = opp?.opportunity_id;
      if (!id || seen.has(id)) continue;
      const rawReady = String(opp.status ?? '').toLowerCase().includes('ready');
      const claimed = hasDirectClaim(claimRows ?? [], id);
      const hasRun = hasNestedSignal(runRows ?? [], `coordination/opportunities/runs/${id}/`);
      const hasReturn = hasNestedSignal(returnRows ?? [], `coordination/opportunities/returns/${id}/`);
      if (!rawReady || claimed || hasRun || hasReturn) continue;
      seen.add(id);
      jobs.push({
        job_id: id,
        status: 'ready',
        priority: opp.priority ?? 0,
        source: row.value.queue_id ?? row.value.generation_id ?? path.posix.basename(row.source_path, '.json'),
        dedupe_key: opp.dedupe_key ?? null,
        allocator_lane: 'queue_ready',
      });
    }
  }
  return jobs;
}

function buildRepositoryHistory(opportunityDocuments) {
  const rows = [];
  for (const row of opportunityDocuments ?? []) {
    for (const opp of row.value?.opportunities ?? []) {
      if (!opp?.opportunity_id) continue;
      rows.push({
        opportunity_id: opp.opportunity_id,
        status: opp.status ?? null,
        source_path: row.source_path,
        queue_like_document: isQueueDocument(row.source_path, row.value),
      });
    }
  }
  const uniqueIds = new Set(rows.map((row) => row.opportunity_id));
  return {
    scope: 'DIAGNOSTIC_ONLY_NOT_ALLOCATOR_ROUTABLE',
    opportunity_rows_seen: rows.length,
    unique_opportunity_ids: uniqueIds.size,
    declared_ready_rows: rows.filter((row) => String(row.status ?? '').toLowerCase().includes('ready')).length,
    opportunity_rows: rows,
    participates_in_frontier: false,
  };
}

function canonicalOpportunityOwners(claimRows, heartbeatRows) {
  const latestHeartbeat = new Map();
  for (const row of heartbeatRows ?? []) {
    const value = row.value ?? {};
    const workerId = value.worker_id;
    const jobId = value.job_id ?? value.opportunity_id;
    const t = asTime(value.heartbeat_at);
    if (!workerId || !jobId || t === null) continue;
    const key = JSON.stringify([workerId, jobId]);
    const prior = latestHeartbeat.get(key);
    if (!prior || t > prior.t) latestHeartbeat.set(key, { t, at: value.heartbeat_at });
  }

  const owners = [];
  for (const row of claimRows ?? []) {
    const claim = row.value ?? {};
    const opportunityId = claim.opportunity_id;
    const workerId = claim.worker_id ?? claim.worker_instance_id ?? claim.worker;
    if (!opportunityId || !workerId) continue;
    const heartbeatAt = latestHeartbeat.get(JSON.stringify([workerId, opportunityId]))?.at ?? null;
    owners.push({
      job_id: opportunityId,
      dedupe_key: claim.dedupe_key ?? null,
      worker_id: workerId,
      generation: 0,
      claimed_at: claim.claimed_at ?? null,
      heartbeat_at: heartbeatAt,
      latest_signal_at: heartbeatAt ?? claim.claimed_at ?? null,
      retry_safe: true,
      source: 'opportunity_claim',
    });
  }
  return owners;
}

export function computeFrontierPressure(snapshot, policy, options = {}) {
  const normalized = {
    ...snapshot,
    jobs: (snapshot?.jobs ?? []).map((job) => (
      ['partial', 'PARTIAL'].includes(job?.status) ? { ...job, status: 'ready' } : job
    )),
  };
  const result = computeBaseFrontierPressure(normalized, policy, options);
  const portfolioJobs = normalized.jobs.filter((job) => String(job.source ?? '').startsWith('portfolio_'));
  const queueReadyJobs = normalized.jobs.filter((job) => job.allocator_lane === 'queue_ready');
  return {
    ...result,
    routing_domain: {
      scope: 'WC_FAST_ALLOCATOR_NORMALIZED_PROJECTS_AND_CURRENT_READY_PLANS',
      contract_ref: '.github/workflows/live-feed.yml#Build tiny claim-ready allocator',
      portfolio_jobs: portfolioJobs.length,
      queue_ready_opportunities: queueReadyJobs.length,
      historical_rows_participate_in_frontier: false,
    },
    repository_history: snapshot?.repository_history ?? {
      scope: 'DIAGNOSTIC_ONLY_NOT_ALLOCATOR_ROUTABLE',
      opportunity_rows_seen: 0,
      unique_opportunity_ids: 0,
      declared_ready_rows: 0,
      participates_in_frontier: false,
    },
    truth_boundary: 'FRONTIER_THIN and claimable-useful work use only the /wc fast-allocator routable domain. Repository-history opportunity rows are diagnostic-only. No Candidate, Verified, Human Accepted, Current, Served, or production /w authority is promoted.',
  };
}

export async function buildSnapshotFromRepo(repoRoot) {
  const base = await buildBaseSnapshotFromRepo(repoRoot);
  const portfolio = await readJsonIfExists(path.join(repoRoot, 'coordination/portfolio/PORTFOLIO.json'));

  const derivedFiles = await collectJsonFiles(path.join(repoRoot, 'coordination/portfolio/derived'));
  const derivedRows = (await parseJsonFiles(derivedFiles, repoRoot))
    .filter((row) => /^coordination\/portfolio\/derived\/[^/]+\/[^/]+\.json$/.test(row.source_path));

  const opportunityFiles = await collectJsonFiles(path.join(repoRoot, 'coordination/opportunities'));
  const opportunityDocuments = await parseJsonFiles(opportunityFiles, repoRoot);
  const claimRows = opportunityDocuments.filter((row) => row.source_path.startsWith('coordination/opportunities/claims/'));
  const runRows = opportunityDocuments.filter((row) => row.source_path.startsWith('coordination/opportunities/runs/'));
  const returnRows = opportunityDocuments.filter((row) => row.source_path.startsWith('coordination/opportunities/returns/'));

  const heartbeatFiles = await collectJsonFiles(path.join(repoRoot, 'coordination/workers/heartbeats'));
  const heartbeatRows = await parseJsonFiles(heartbeatFiles, repoRoot);

  const portfolioJobs = buildAllocatorPortfolioDomain(portfolio, derivedRows);
  const queueReadyJobs = buildAllocatorQueueReadyDomain(opportunityDocuments, claimRows, runRows, returnRows);

  const canonicalOwners = canonicalOpportunityOwners(claimRows, heartbeatRows);
  const ownerKeys = new Set(canonicalOwners.map((owner) => JSON.stringify([owner.job_id, owner.worker_id, owner.source])));
  const legacyOwners = (base.owners ?? []).filter((owner) => {
    if (owner.source !== 'opportunity_claim') return true;
    return !ownerKeys.has(JSON.stringify([owner.job_id, owner.worker_id, owner.source]));
  });

  return {
    ...base,
    owners: [...legacyOwners, ...canonicalOwners],
    jobs: [...portfolioJobs, ...queueReadyJobs],
    routing_domain: {
      scope: 'WC_FAST_ALLOCATOR_NORMALIZED_PROJECTS_AND_CURRENT_READY_PLANS',
      contract_ref: '.github/workflows/live-feed.yml#Build tiny claim-ready allocator',
      portfolio_jobs: portfolioJobs.length,
      queue_ready_opportunities: queueReadyJobs.length,
      historical_rows_participate_in_frontier: false,
    },
    repository_history: buildRepositoryHistory(opportunityDocuments),
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
  if (args.length) throw new Error(`Unknown arguments: ${args.join(' ')}`);
  const policy = await readJson(path.join(root, 'coordination/guide/METABOLISM_POLICY_V1.json'));
  const snapshot = await buildSnapshotFromRepo(root);
  const result = computeFrontierPressure(snapshot, policy, { now, returnWindowMinutes });
  const encoded = `${JSON.stringify(result, null, 2)}\n`;
  if (out) {
    const target = path.resolve(root, out);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, encoded, 'utf8');
  } else {
    process.stdout.write(encoded);
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) main(process.argv.slice(2)).catch((error) => {
  console.error(error?.stack ?? String(error));
  process.exitCode = 1;
});
