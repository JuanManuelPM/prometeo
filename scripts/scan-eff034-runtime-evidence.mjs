#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THIS = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(THIS), '..');
const DEFAULT_ROOTS = [
  'coordination/workers/no-allocation',
  'coordination/workers/receipts',
  'coordination/workers/exams'
];
const REFRESH_PATH = 'gh-pages:live/claim-frontier.json';
const STALE_MS = 90_000;

const arr = value => Array.isArray(value) ? value : [];
const time = value => {
  const n = Date.parse(value || '');
  return Number.isFinite(n) ? n : null;
};
const first = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const truthy = value => value === true || String(value || '').toLowerCase() === 'true';
const int = value => Number.isInteger(Number(value)) ? Number(value) : null;

function walkJson(root, rel) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    const childRel = path.posix.join(rel, entry.name);
    const full = path.join(root, childRel);
    if (entry.isDirectory()) out.push(...walkJson(root, childRel));
    else if (entry.isFile() && entry.name.endsWith('.json')) out.push(childRel);
  }
  return out;
}

function readJson(root, rel) {
  try { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); }
  catch { return null; }
}

function attemptRows(doc) {
  const rows = [
    ...arr(doc?.claim_attempts),
    ...arr(doc?.authority_attempts_detail),
    ...arr(doc?.collision_evidence)
  ];
  return rows.map(row => ({
    outcome:String(first(row?.outcome, row?.classification, row?.result, '')).toUpperCase(),
    at:first(row?.completed_at, row?.observed_at, row?.attempted_at, row?.at, row?.timestamp, null),
    claim_path:first(row?.claim_path, row?.path, null)
  }));
}

function refreshRows(doc) {
  const rows = [
    ...arr(doc?.frontier_refreshes),
    ...arr(doc?.refreshes)
  ];
  const single = first(doc?.stale_collision_refresh, doc?.claim_frontier_refresh, null);
  if (single && typeof single === 'object') rows.push(single);
  return rows.map(row => ({
    path:first(row?.refresh_path, row?.path, row?.frontier_ref, null),
    decision_at:first(row?.decision_at, row?.refresh_decision_at, row?.observed_at, row?.at, null),
    snapshot_generated_at:first(row?.snapshot_generated_at, row?.frontier_generated_at, row?.prior_generated_at, null),
    shard_seed_before:first(row?.shard_seed_before, row?.beacon_commit_sha, null),
    shard_seed_after:first(row?.shard_seed_after, row?.reused_beacon_commit_sha, null),
    shard_seed_reused:first(row?.shard_seed_reused, row?.pool_shard_seed_reused, null),
    capability_filter_rebuilt:first(row?.capability_filter_rebuilt, row?.compatibility_view_rebuilt, null)
  }));
}

export function classifyEff034EvidenceDoc(doc = {}, sourcePath = '<memory>') {
  const attempts = attemptRows(doc);
  const createExists = attempts.filter(row => row.outcome === 'CREATE_EXISTS');
  const structured = doc?.eff034_runtime_observation && typeof doc.eff034_runtime_observation === 'object'
    ? doc.eff034_runtime_observation
    : {};
  const refreshes = refreshRows(doc);
  const refreshCount = int(first(structured.refresh_count, doc?.refresh_count, refreshes.length));
  const refresh = refreshes[0] || {};
  const snapshotAt = first(
    structured.snapshot_generated_at,
    refresh.snapshot_generated_at,
    doc?.frontier_snapshot?.generated_at,
    doc?.frontier_generated_at,
    null
  );
  const secondCollisionAt = first(
    structured.post_second_create_exists_decision_at,
    structured.refresh_decision_at,
    refresh.decision_at,
    createExists[1]?.at,
    null
  );
  const snapshotAgeMs = time(secondCollisionAt) !== null && time(snapshotAt) !== null
    ? time(secondCollisionAt) - time(snapshotAt)
    : null;
  const authorityAttempts = int(first(
    structured.authority_attempts,
    doc?.authority_attempts,
    attempts.length || null
  ));
  const beaconCommitSha = first(structured.beacon_commit_sha, doc?.beacon_commit_sha, null);
  const refreshPath = first(structured.refresh_path, refresh.path, null);
  const shardBefore = first(structured.shard_seed_before, refresh.shard_seed_before, beaconCommitSha, null);
  const shardAfter = first(structured.shard_seed_after, refresh.shard_seed_after, null);
  const seedReused = truthy(first(structured.shard_seed_reused, refresh.shard_seed_reused, false)) ||
    Boolean(beaconCommitSha && shardBefore === beaconCommitSha && shardAfter === beaconCommitSha);
  const capabilityFilterRebuilt = truthy(first(
    structured.capability_filter_rebuilt,
    refresh.capability_filter_rebuilt,
    false
  ));

  const checks = {
    create_exists_exactly_two:createExists.length === 2,
    post_second_collision_time_explicit:Boolean(secondCollisionAt),
    snapshot_generated_at_explicit:Boolean(snapshotAt),
    snapshot_age_gt_90000:snapshotAgeMs !== null && snapshotAgeMs > STALE_MS,
    refresh_count_exactly_one:refreshCount === 1,
    refresh_path_exact:refreshPath === REFRESH_PATH,
    beacon_commit_sha_present:Boolean(beaconCommitSha),
    shard_seed_reused:seedReused,
    capability_filter_rebuilt:capabilityFilterRebuilt,
    authority_attempts_lte_3:authorityAttempts !== null && authorityAttempts <= 3
  };
  const qualifying = Object.values(checks).every(Boolean);
  return {
    source_path:sourcePath,
    worker_id:first(doc?.worker_id, doc?.session_id, null),
    observed_at:first(doc?.observed_at, doc?.closed_at, doc?.returned_at, doc?.created_at, null),
    qualifying,
    create_exists_count:createExists.length,
    snapshot_generated_at:snapshotAt,
    post_second_collision_decision_at:secondCollisionAt,
    snapshot_age_ms:snapshotAgeMs,
    refresh_count:refreshCount,
    refresh_path:refreshPath,
    beacon_commit_sha:beaconCommitSha,
    authority_attempts:authorityAttempts,
    checks
  };
}

export function scanEff034RuntimeEvidence(root = REPO, roots = DEFAULT_ROOTS) {
  const files = [...new Set(roots.flatMap(rel => walkJson(root, rel)))].sort();
  const rows = [];
  let earliest = null;
  let latest = null;
  for (const rel of files) {
    const doc = readJson(root, rel);
    if (!doc) continue;
    const result = classifyEff034EvidenceDoc(doc, rel);
    rows.push(result);
    const when = time(result.observed_at);
    if (when !== null) {
      earliest = earliest === null ? when : Math.min(earliest, when);
      latest = latest === null ? when : Math.max(latest, when);
    }
  }
  const qualifying = rows.filter(row => row.qualifying);
  const closest = rows
    .filter(row => row.create_exists_count > 0)
    .sort((a,b) => b.create_exists_count - a.create_exists_count || String(b.observed_at||'').localeCompare(String(a.observed_at||'')))
    .slice(0,8)
    .map(row => ({
      source_path:row.source_path,
      worker_id:row.worker_id,
      observed_at:row.observed_at,
      create_exists_count:row.create_exists_count,
      snapshot_age_ms:row.snapshot_age_ms,
      refresh_count:row.refresh_count,
      failed_checks:Object.entries(row.checks).filter(([,ok]) => !ok).map(([name]) => name)
    }));
  return {
    schema:'prometeo.eff034-runtime-evidence-scan/v1',
    status:qualifying.length ? 'OBSERVED' : 'UNOBSERVED',
    law:'EFF034',
    runtime_observation_only:true,
    artificial_collision_or_delay_performed:false,
    refresh_path_required:REFRESH_PATH,
    snapshot_age_threshold_ms:STALE_MS,
    corpus:{
      roots,
      json_files_scanned:files.length,
      parsed_documents:rows.length,
      earliest_observed_at:earliest === null ? null : new Date(earliest).toISOString(),
      latest_observed_at:latest === null ? null : new Date(latest).toISOString()
    },
    qualifying_cases:qualifying,
    closest_cases:closest,
    boundary:qualifying.length ? null : 'BOUNDARY_UNOBSERVED_NO_NATURAL_TWO_CREATE_EXISTS_STALE_REFRESH_EVIDENCE'
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === THIS) {
  const rootArg = process.argv[2] ? path.resolve(process.argv[2]) : REPO;
  const result = scanEff034RuntimeEvidence(rootArg);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
