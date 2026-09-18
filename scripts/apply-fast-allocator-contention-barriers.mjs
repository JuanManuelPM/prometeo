#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arr = value => Array.isArray(value) ? value : [];
const parseTime = value => Date.parse(value || '') || 0;
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
const uniq = values => [...new Set(arr(values).filter(Boolean).map(String))].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function explicitBarrier(doc) {
  return isObject(doc) && doc.schema === 'prometeo.portfolio-contention-barrier/v1' && (
    doc.contention_barrier_mode === true ||
    doc.rendezvous_mode === 'ACTIVE_POLL_UNTIL_RELEASE_OR_TIMEOUT'
  );
}

function validBarrier(doc) {
  return explicitBarrier(doc) &&
    typeof doc.fixture_id === 'string' && doc.fixture_id.length > 0 &&
    typeof (doc.job_id || doc.target_job_id) === 'string' &&
    Number.isInteger(Number(doc.required_contenders)) && Number(doc.required_contenders) >= 2 &&
    parseTime(doc.opened_at) > 0 && parseTime(doc.deadline_at) > parseTime(doc.opened_at);
}

export function selectReleaseCohort(workerIds, requiredContenders) {
  const required = Number(requiredContenders);
  if (!Number.isInteger(required) || required < 2) return [];
  const ids = uniq(workerIds);
  return ids.length >= required ? ids.slice(0, required) : [];
}

function validEntrant(receipt, barrier) {
  if (!isObject(receipt) || receipt.schema !== 'prometeo.portfolio-contention-entrant/v1') return false;
  if (receipt.fixture_id !== barrier.fixture_id) return false;
  if (receipt.target_job_id !== (barrier.job_id || barrier.target_job_id)) return false;
  if (typeof receipt.worker_id !== 'string' || !receipt.worker_id.length) return false;
  if (receipt.grants_execution_authority !== false) return false;
  const registered = parseTime(receipt.registered_at);
  return registered >= parseTime(barrier.opened_at) && registered < parseTime(barrier.deadline_at);
}

function validRelease(release, barrier, entrantWorkerIds = null) {
  if (!isObject(release) || release.schema !== 'prometeo.portfolio-contention-release/v1') return false;
  if (release.fixture_id !== barrier.fixture_id) return false;
  if (release.grants_execution_authority !== false || release.next_action !== 'RACE_DETERMINISTIC_PIN') return false;
  if (Number(release.required_contenders) !== Number(barrier.required_contenders)) return false;
  const released = parseTime(release.released_at);
  if (!released || released < parseTime(barrier.opened_at) || released >= parseTime(barrier.deadline_at)) return false;
  const ids = arr(release.entrant_worker_ids).filter(Boolean).map(String);
  const unique = uniq(ids);
  const required = Number(barrier.required_contenders);
  if (ids.length !== required || unique.length !== required) return false;
  if (ids.some((id, index) => id !== unique[index])) return false;
  if (Array.isArray(entrantWorkerIds)) {
    const entrants = new Set(uniq(entrantWorkerIds));
    if (unique.some(id => !entrants.has(id))) return false;
  }
  return true;
}

function validTimeout(receipt, barrier) {
  return isObject(receipt) &&
    receipt.schema === 'prometeo.portfolio-contention-timeout/v1' &&
    receipt.fixture_id === barrier.fixture_id &&
    typeof receipt.worker_id === 'string' && receipt.worker_id.length > 0 &&
    receipt.pin_attempted === false &&
    receipt.grants_execution_authority === false;
}

function loadEntrantWorkerIds(dir, barrier) {
  const entrantDir = path.join(dir, 'entrants');
  if (!fs.existsSync(entrantDir)) return [];
  const ids = [];
  for (const ent of fs.readdirSync(entrantDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
    const receipt = readJson(path.join(entrantDir, ent.name));
    if (validEntrant(receipt, barrier)) ids.push(receipt.worker_id);
  }
  return uniq(ids);
}

function loadTimeoutWorkerIds(dir, barrier) {
  const timeoutDir = path.join(dir, 'timeouts');
  if (!fs.existsSync(timeoutDir)) return [];
  const ids = [];
  for (const ent of fs.readdirSync(timeoutDir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.json')) continue;
    const receipt = readJson(path.join(timeoutDir, ent.name));
    if (validTimeout(receipt, barrier)) ids.push(receipt.worker_id);
  }
  return uniq(ids);
}

export function loadContentionBarriers(root = '.') {
  const base = path.join(root, 'coordination', 'portfolio', 'contention_barriers');
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const ent of fs.readdirSync(base, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(base, ent.name);
    const barrier = readJson(path.join(dir, 'BARRIER.json'));
    if (!validBarrier(barrier)) continue;
    out.push({
      fixture_id: barrier.fixture_id,
      job_id: barrier.job_id || barrier.target_job_id,
      barrier,
      release: readJson(path.join(dir, 'RELEASE.json')),
      entrant_worker_ids: loadEntrantWorkerIds(dir, barrier),
      timeout_worker_ids: loadTimeoutWorkerIds(dir, barrier),
      barrier_ref: `coordination/portfolio/contention_barriers/${barrier.fixture_id}/BARRIER.json`,
      release_ref: `coordination/portfolio/contention_barriers/${barrier.fixture_id}/RELEASE.json`
    });
  }
  return out;
}

function selectBarrier(jobId, rows) {
  return arr(rows)
    .filter(row => row?.job_id === jobId && validBarrier(row.barrier))
    .sort((a, b) => parseTime(b.barrier.opened_at) - parseTime(a.barrier.opened_at) || String(b.fixture_id).localeCompare(String(a.fixture_id)))[0] || null;
}

function barrierMeta(row, state) {
  const b = row.barrier;
  const root = `coordination/portfolio/contention_barriers/${b.fixture_id}`;
  return {
    mode: 'contention_barrier',
    state,
    fixture_id: b.fixture_id,
    required_contenders: Number(b.required_contenders),
    opened_at: b.opened_at,
    deadline_at: b.deadline_at,
    barrier_ref: row.barrier_ref || `${root}/BARRIER.json`,
    entrant_dir: `${root}/entrants`,
    entrant_path: `${root}/entrants/<worker_id>.json`,
    release_path: `${root}/RELEASE.json`,
    timeout_path: `${root}/timeouts/<worker_id>.json`,
    grants_execution_authority: false
  };
}

export function routePortfolioCandidate(candidate, barrierRow, nowIso) {
  if (!candidate || candidate.claim_mode !== 'PORTFOLIO_PIN_CREATE' || !barrierRow) return candidate;
  const b = barrierRow.barrier;
  if (!validBarrier(b)) return candidate;
  const now = parseTime(nowIso);
  const opened = parseTime(b.opened_at);
  const deadline = parseTime(b.deadline_at);
  const releaseOkay = validRelease(barrierRow.release, b, Array.isArray(barrierRow.entrant_worker_ids) ? barrierRow.entrant_worker_ids : null);
  const pinCandidate = structuredClone(candidate);

  if (releaseOkay) {
    const releasedWorkerIds = uniq(barrierRow.release.entrant_worker_ids);
    return {
      ...candidate,
      claim_mode: 'PORTFOLIO_BARRIER_RELEASED',
      claim_path: null,
      claim_payload_shape: null,
      contention_barrier: {
        ...barrierMeta(barrierRow, 'RELEASED'),
        release_ref: barrierRow.release_ref || `coordination/portfolio/contention_barriers/${b.fixture_id}/RELEASE.json`,
        released_at: barrierRow.release.released_at,
        entrant_worker_ids: releasedWorkerIds,
        cohort_rule: 'LEXICOGRAPHIC_FIRST_REQUIRED_DISTINCT_WORKER_IDS_FROM_OBSERVED_ENTRANTS'
      },
      next_action: 'CHECK_RELEASE_MEMBERSHIP',
      post_claim_validate: false,
      post_release_claim: pinCandidate
    };
  }

  if (now >= deadline) {
    const meta = barrierMeta(barrierRow, 'TIMED_OUT');
    const priorTimeoutWorkers = uniq(barrierRow.timeout_worker_ids);
    if (priorTimeoutWorkers.length) {
      return {
        ...candidate,
        claim_mode: 'PORTFOLIO_BARRIER_EXPIRED_OBSERVED',
        claim_path: null,
        claim_payload_shape: null,
        contention_barrier: {
          ...meta,
          state: 'TIMED_OUT_OBSERVED',
          timeout_worker_ids: priorTimeoutWorkers,
          timeout_evidence_count: priorTimeoutWorkers.length
        },
        next_action: 'SKIP_EXPIRED_BARRIER',
        post_claim_validate: false,
        post_release_claim: null
      };
    }
    return {
      ...candidate,
      claim_mode: 'PORTFOLIO_BARRIER_TIMEOUT',
      claim_path: meta.timeout_path,
      claim_payload_shape: {
        schema: 'prometeo.portfolio-contention-timeout/v1',
        fixture_id: b.fixture_id,
        worker_id: '<worker_id>',
        observed_at: '<now_iso>',
        next_action: 'REENTER_ALLOCATION',
        pin_attempted: false,
        grants_execution_authority: false
      },
      contention_barrier: meta,
      post_claim_validate: false,
      post_release_claim: null
    };
  }

  if (now < opened) {
    return {
      ...candidate,
      claim_mode: 'PORTFOLIO_BARRIER_NOT_OPEN',
      claim_path: null,
      claim_payload_shape: null,
      contention_barrier: barrierMeta(barrierRow, 'NOT_OPEN'),
      next_action: 'REENTER_ALLOCATION',
      post_claim_validate: false,
      post_release_claim: null
    };
  }

  const meta = barrierMeta(barrierRow, 'ARMING');
  return {
    ...candidate,
    claim_mode: 'PORTFOLIO_BARRIER_ENTER',
    claim_path: meta.entrant_path,
    claim_payload_shape: {
      schema: 'prometeo.portfolio-contention-entrant/v1',
      fixture_id: b.fixture_id,
      target_job_id: candidate.job_id,
      worker_id: '<worker_id>',
      registered_at: '<now_iso>',
      next_action: 'WAIT_FOR_RELEASE_OR_TIMEOUT',
      grants_execution_authority: false
    },
    contention_barrier: {
      ...meta,
      entrant_worker_ids: uniq(barrierRow.entrant_worker_ids),
      entrant_count: uniq(barrierRow.entrant_worker_ids).length,
      cohort_rule: 'LEXICOGRAPHIC_FIRST_REQUIRED_DISTINCT_WORKER_IDS_FROM_OBSERVED_ENTRANTS',
      release_payload_shape: {
        schema: 'prometeo.portfolio-contention-release/v1',
        fixture_id: b.fixture_id,
        released_at: '<now_iso>',
        required_contenders: Number(b.required_contenders),
        entrant_worker_ids: '<lexicographic_first_required_distinct_entrant_worker_ids>',
        grants_execution_authority: false,
        next_action: 'RACE_DETERMINISTIC_PIN'
      },
      timeout_payload_shape: {
        schema: 'prometeo.portfolio-contention-timeout/v1',
        fixture_id: b.fixture_id,
        worker_id: '<worker_id>',
        observed_at: '<now_iso>',
        next_action: 'REENTER_ALLOCATION',
        pin_attempted: false,
        grants_execution_authority: false
      }
    },
    post_claim_validate: false,
    post_release_claim: pinCandidate
  };
}

function batchFaninDescriptor(candidates = []) {
  const eligible = arr(candidates)
    .filter(candidate => ['PORTFOLIO_BARRIER_ENTER', 'PORTFOLIO_BARRIER_RELEASED'].includes(candidate?.claim_mode))
    .filter(candidate => candidate?.contention_barrier?.fixture_id);
  const byFixture = new Map();
  for (const candidate of eligible) {
    const fixtureId = candidate.contention_barrier.fixture_id;
    if (!byFixture.has(fixtureId)) byFixture.set(fixtureId, candidate);
  }
  if (byFixture.size === 0) return null;
  if (byFixture.size > 1) {
    return {
      schema: 'prometeo.batch-contention-fanin/v1',
      state: 'AMBIGUOUS',
      grants_execution_authority: false,
      fixture_ids: [...byFixture.keys()].sort(),
      next_action: 'USE_NORMAL_SHARDING_NO_BATCH_FANIN'
    };
  }
  const candidate = [...byFixture.values()][0];
  const b = candidate.contention_barrier;
  return {
    schema: 'prometeo.batch-contention-fanin/v1',
    state: b.state,
    fixture_id: b.fixture_id,
    target_job_id: candidate.job_id,
    required_contenders: b.required_contenders,
    opened_at: b.opened_at,
    deadline_at: b.deadline_at,
    entrant_dir: b.entrant_dir,
    entrant_path: b.entrant_path,
    release_path: b.release_path,
    timeout_path: b.timeout_path,
    grants_execution_authority: false,
    required_capabilities: arr(candidate.required_capabilities),
    cohort_rule: 'LEXICOGRAPHIC_FIRST_REQUIRED_DISTINCT_WORKER_IDS_FROM_OBSERVED_ENTRANTS',
    entrant_worker_ids: arr(b.entrant_worker_ids),
    entrant_count: Number(b.entrant_count || 0),
    released_worker_ids: b.state === 'RELEASED' ? arr(b.entrant_worker_ids) : [],
    claim_payload_shape: candidate.claim_mode === 'PORTFOLIO_BARRIER_ENTER' ? candidate.claim_payload_shape : null,
    release_payload_shape: b.release_payload_shape || null,
    timeout_payload_shape: b.timeout_payload_shape || null,
    post_release_claim: candidate.post_release_claim || null,
    next_action: candidate.claim_mode === 'PORTFOLIO_BARRIER_RELEASED'
      ? 'CHECK_RELEASE_MEMBERSHIP_BEFORE_SHARDING'
      : 'ENTER_NO_AUTHORITY_BARRIER_BEFORE_SHARDING'
  };
}

export function applyContentionBarrierRouting(allocator = {}, barriers = [], nowIso = allocator.generated_at || new Date().toISOString()) {
  const routeOne = candidate => routePortfolioCandidate(candidate, selectBarrier(candidate?.job_id, barriers), nowIso);
  const routeLane = lane => arr(allocator[lane]).map(routeOne);
  const routedReady = routeLane('ready');
  const routedRecovery = routeLane('recovery');
  const isExpiredObserved = candidate => candidate?.claim_mode === 'PORTFOLIO_BARRIER_EXPIRED_OBSERVED';
  const suppressed = [...routedReady, ...routedRecovery]
    .filter(isExpiredObserved)
    .map(candidate => ({
      job_id: candidate.job_id,
      fixture_id: candidate.contention_barrier?.fixture_id || null,
      timeout_evidence_count: candidate.contention_barrier?.timeout_evidence_count || 0,
      timeout_worker_ids: arr(candidate.contention_barrier?.timeout_worker_ids),
      reason: 'DURABLE_TIMEOUT_ALREADY_OBSERVED',
      next_action: 'SKIP_EXPIRED_BARRIER'
    }));
  const ready = routedReady.filter(candidate => !isExpiredObserved(candidate));
  const recovery = routedRecovery.filter(candidate => !isExpiredObserved(candidate));
  const batchCandidates = arr(allocator.batch_candidates).map(candidate => {
    if (!['ready', 'recovery'].includes(candidate?.lane)) return candidate;
    return { ...routeOne(candidate), lane: candidate.lane };
  }).filter(candidate => !isExpiredObserved(candidate));
  const faninSource = batchCandidates.length ? batchCandidates : [...ready, ...recovery];
  const batchContentionFanin = batchFaninDescriptor(faninSource);
  return {
    ...allocator,
    schema: allocator.schema || 'prometeo.fast-allocator/v3',
    contention_barrier_routing: {
      status: 'CANARY_BINDING_OPT_IN',
      source: 'coordination/portfolio/contention_barriers/*/BARRIER.json',
      authority: 'TIMING_ONLY_UNTIL_DETERMINISTIC_PIN_WIN',
      ordinary_jobs_direct_to_pin: true,
      expired_after_first_timeout_evidence: true,
      batch_fanin_before_sharding: true,
      release_membership_gates_pin: true,
      suppressed_expired_candidates: suppressed
    },
    batch_contention_fanin: batchContentionFanin,
    batch_candidates: batchCandidates.length ? batchCandidates : allocator.batch_candidates,
    ready,
    recovery,
    counts: {
      ...(allocator.counts || {}),
      ready: ready.length,
      recovery: recovery.length,
      barrier_enter: [...ready, ...recovery].filter(x => x.claim_mode === 'PORTFOLIO_BARRIER_ENTER').length,
      barrier_released: [...ready, ...recovery].filter(x => x.claim_mode === 'PORTFOLIO_BARRIER_RELEASED').length,
      barrier_timeout: [...ready, ...recovery].filter(x => x.claim_mode === 'PORTFOLIO_BARRIER_TIMEOUT').length,
      barrier_expired_suppressed: suppressed.length
    }
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const [inputPath, outputPath, root = '.'] = argv;
  if (!inputPath || !outputPath) throw new Error('usage: apply-fast-allocator-contention-barriers.mjs <allocator.json> <out.json> [repo-root]');
  const allocator = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const barriers = loadContentionBarriers(root);
  const routed = applyContentionBarrierRouting(allocator, barriers, allocator.generated_at || new Date().toISOString());
  fs.writeFileSync(outputPath, `${JSON.stringify(routed, null, 2)}\n`);
  process.stdout.write(`allocator-contention barriers=${barriers.length} enter=${routed.counts?.barrier_enter || 0} timeout=${routed.counts?.barrier_timeout || 0} expired_suppressed=${routed.counts?.barrier_expired_suppressed || 0}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { runCli(); }
  catch (error) { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; }
}
