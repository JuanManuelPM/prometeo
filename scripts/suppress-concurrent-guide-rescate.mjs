#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arr = value => Array.isArray(value) ? value : [];
const parseTime = value => Date.parse(value || '') || 0;
const eventTime = doc => parseTime(doc?.heartbeat_at || doc?.claimed_at || doc?.created_at || doc?.updated_at || doc?.timestamp);
const generation = row => Number(row?.doc?.generation) || Number(String(row?.path || '').match(/\/G(\d+)\.json$/)?.[1] || 0);

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

export function activeGuideRescatePins({ guidePins = [], heartbeats = [], receipts = [] } = {}, now = Date.now(), activeMs = 10 * 60_000) {
  const receiptWorkIds = new Set(arr(receipts).map(row => row.doc?.guide_work_id).filter(Boolean));
  const hbByWorker = new Map();
  for (const row of arr(heartbeats)) {
    const workerId = row.doc?.worker_id || row.doc?.session_id;
    if (!workerId) continue;
    const current = hbByWorker.get(workerId);
    if (!current || eventTime(row.doc) > eventTime(current.doc)) hbByWorker.set(workerId, row);
  }

  const latestByWork = new Map();
  for (const row of arr(guidePins)) {
    const workId = row.doc?.guide_work_id;
    if (!workId || row.doc?.role !== 'GUIDE_RESCATE') continue;
    const current = latestByWork.get(workId);
    if (!current || generation(row) > generation(current) || (generation(row) === generation(current) && eventTime(row.doc) > eventTime(current.doc))) {
      latestByWork.set(workId, row);
    }
  }

  return [...latestByWork.values()]
    .filter(row => !receiptWorkIds.has(row.doc?.guide_work_id))
    .map(row => {
      const workerId = row.doc?.worker_id || null;
      const hb = workerId ? hbByWorker.get(workerId) : null;
      const lastSignalAt = Math.max(eventTime(row.doc), eventTime(hb?.doc));
      return {
        guide_work_id: row.doc?.guide_work_id,
        worker_id: workerId,
        generation: generation(row),
        pin_path: row.path,
        last_signal_at: lastSignalAt ? new Date(lastSignalAt).toISOString() : null,
        active: Boolean(lastSignalAt) && now - lastSignalAt < activeMs
      };
    })
    .filter(row => row.active)
    .sort((a, b) => String(a.guide_work_id).localeCompare(String(b.guide_work_id)));
}

export function suppressConcurrentGuideRescate(allocator = {}, state = {}, now = Date.now()) {
  const active = activeGuideRescatePins(state, now);
  if (!active.length) return allocator;

  const roleReady = arr(allocator.role_ready);
  const suppressed = roleReady.filter(candidate => candidate?.role === 'GUIDE_RESCATE');
  if (!suppressed.length) return allocator;

  const kept = roleReady.filter(candidate => candidate?.role !== 'GUIDE_RESCATE');
  return {
    ...allocator,
    role_ready: kept,
    counts: {
      ...(allocator.counts || {}),
      role_ready: kept.length
    },
    diagnostics: {
      ...(allocator.diagnostics || {}),
      guide_rescate_active_suppression: {
        policy: 'ONE_ACTIVE_GUIDE_RESCATE_ACROSS_FINGERPRINT_CHURN',
        active_pins: active,
        suppressed_candidates: suppressed.map(candidate => ({
          guide_work_id: candidate.guide_work_id || candidate.role_id || null,
          fingerprint: candidate.fingerprint || null,
          trigger: candidate.trigger || null
        }))
      }
    }
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const [allocatorPath, root = '.'] = argv;
  if (!allocatorPath) throw new Error('usage: suppress-concurrent-guide-rescate.mjs <allocator.json> [repo-root]');
  const allocator = JSON.parse(fs.readFileSync(allocatorPath, 'utf8'));
  const state = {
    guidePins: loadJsonRows(root, 'coordination/guide/pins'),
    heartbeats: loadJsonRows(root, 'coordination/workers/heartbeats'),
    receipts: loadJsonRows(root, 'coordination/guide/receipts')
  };
  const next = suppressConcurrentGuideRescate(allocator, state);
  fs.writeFileSync(allocatorPath, `${JSON.stringify(next, null, 2)}\n`);
  const suppressed = next.diagnostics?.guide_rescate_active_suppression?.suppressed_candidates?.length || 0;
  process.stdout.write(`guide-rescate suppression active=${activeGuideRescatePins(state).length} suppressed=${suppressed}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { runCli(); }
  catch (error) {
    process.stderr.write(`${error?.stack || error}\n`);
    process.exitCode = 1;
  }
}
