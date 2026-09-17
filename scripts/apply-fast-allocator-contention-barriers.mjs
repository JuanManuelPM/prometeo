#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arr = value => Array.isArray(value) ? value : [];
const parseTime = value => Date.parse(value || '') || 0;
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);

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

function validRelease(release, barrier) {
  if (!isObject(release) || release.schema !== 'prometeo.portfolio-contention-release/v1') return false;
  if (release.fixture_id !== barrier.fixture_id) return false;
  if (release.grants_execution_authority !== false || release.next_action !== 'RACE_DETERMINISTIC_PIN') return false;
  const released = parseTime(release.released_at);
  if (!released || released >= parseTime(barrier.deadline_at)) return false;
  const ids = [...new Set(arr(release.entrant_worker_ids).filter(Boolean))];
  return ids.length >= Number(barrier.required_contenders);
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
  const releaseOkay = validRelease(barrierRow.release, b);
  const pinCandidate = structuredClone(candidate);

  if (releaseOkay) {
    return {
      ...candidate,
      contention_barrier: {
        ...barrierMeta(barrierRow, 'RELEASED'),
        release_ref: barrierRow.release_ref || `coordination/portfolio/contention_barriers/${b.fixture_id}/RELEASE.json`,
        released_at: barrierRow.release.released_at,
        entrant_worker_ids: [...new Set(arr(barrierRow.release.entrant_worker_ids).filter(Boolean))]
      }
    };
  }

  if (now >= deadline) {
    const meta = barrierMeta(barrierRow, 'TIMED_OUT');
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
      release_payload_shape: {
        schema: 'prometeo.portfolio-contention-release/v1',
        fixture_id: b.fixture_id,
        released_at: '<now_iso>',
        required_contenders: Number(b.required_contenders),
        entrant_worker_ids: '<distinct_entrant_worker_ids>',
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

export function applyContentionBarrierRouting(allocator = {}, barriers = [], nowIso = allocator.generated_at || new Date().toISOString()) {
  const routeLane = lane => arr(allocator[lane]).map(candidate => routePortfolioCandidate(candidate, selectBarrier(candidate.job_id, barriers), nowIso));
  const ready = routeLane('ready');
  const recovery = routeLane('recovery');
  return {
    ...allocator,
    schema: allocator.schema || 'prometeo.fast-allocator/v3',
    contention_barrier_routing: {
      status: 'CANARY_BINDING_OPT_IN',
      source: 'coordination/portfolio/contention_barriers/*/BARRIER.json',
      authority: 'TIMING_ONLY_UNTIL_DETERMINISTIC_PIN_WIN',
      ordinary_jobs_direct_to_pin: true
    },
    ready,
    recovery,
    counts: {
      ...(allocator.counts || {}),
      barrier_enter: [...ready, ...recovery].filter(x => x.claim_mode === 'PORTFOLIO_BARRIER_ENTER').length,
      barrier_timeout: [...ready, ...recovery].filter(x => x.claim_mode === 'PORTFOLIO_BARRIER_TIMEOUT').length
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
  process.stdout.write(`allocator-contention barriers=${barriers.length} enter=${routed.counts?.barrier_enter || 0} timeout=${routed.counts?.barrier_timeout || 0}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { runCli(); }
  catch (error) { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; }
}
