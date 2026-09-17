#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const arr = value => Array.isArray(value) ? value : [];
const parseTime = value => Date.parse(value || '') || 0;
const sha12 = value => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
const g = n => String(n).padStart(6, '0');
const slug = value => String(value || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 52) || 'project';
const uniq = values => [...new Set(arr(values).filter(Boolean))].sort();
const terminalProject = status => /^(done|complete|completed|archived|retired|paused)$/i.test(String(status || ''));
const terminalJob = state => String(state || '').toLowerCase() === 'done';
const activeJob = state => ['working','recovery','suspect'].includes(String(state || '').toLowerCase());

function walkJson(root, rel) {
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

const eventTime = doc => parseTime(doc?.heartbeat_at || doc?.returned_at || doc?.completed_at || doc?.observed_at || doc?.started_at || doc?.claimed_at || doc?.created_at || doc?.updated_at || doc?.timestamp);

function evidenceRef(projectId, job) {
  return job?.source_path || `coordination/portfolio/PORTFOLIO.json#project:${projectId}:job:${job?.job_id || 'unknown'}`;
}

function projectLastActivity(project) {
  return Math.max(0, ...arr(project.jobs).flatMap(job => [
    parseTime(job?.last_signal_at),
    parseTime(job?.claimed_at),
    parseTime(job?.latest_return?.returned_at),
    parseTime(job?.terminal_return?.returned_at)
  ]));
}

export function applyProjectCoverage(allocator = {}, feed = {}, root = '.') {
  const now = Date.now();
  const guidePins = walkJson(root, 'coordination/guide/pins');
  const guideReceipts = walkJson(root, 'coordination/guide/receipts');
  const heartbeats = walkJson(root, 'coordination/workers/heartbeats');
  const receiptIds = new Set(guideReceipts.map(row => row.doc?.guide_work_id).filter(Boolean));
  const hbByWorker = new Map();
  for (const row of heartbeats) {
    const wid = row.doc?.worker_id || row.doc?.session_id;
    if (!wid) continue;
    const old = hbByWorker.get(wid) || 0;
    hbByWorker.set(wid, Math.max(old, eventTime(row.doc)));
  }

  const latestPinByRole = new Map();
  for (const row of guidePins) {
    const roleId = row.doc?.guide_work_id || row.path.match(/coordination\/guide\/pins\/([^/]+)\//)?.[1];
    if (!roleId) continue;
    const gen = Number(row.doc?.generation || row.path.match(/G(\d+)\.json$/)?.[1] || 0);
    const prev = latestPinByRole.get(roleId);
    if (!prev || gen > prev.gen || (gen === prev.gen && eventTime(row.doc) > eventTime(prev.row.doc))) latestPinByRole.set(roleId, { gen, row });
  }

  const activeCoverageProjects = new Set();
  for (const [roleId, info] of latestPinByRole) {
    const match = roleId.match(/^guide-planner-project-([a-z0-9-]+)-[a-f0-9]{12}$/);
    if (!match || receiptIds.has(roleId)) continue;
    const wid = info.row.doc?.worker_id;
    const last = Math.max(eventTime(info.row.doc), hbByWorker.get(wid) || 0);
    if (last && now - last < 10 * 60_000) activeCoverageProjects.add(match[1]);
  }

  const readyProjectIds = new Set(arr(allocator.ready).map(item => item.project_id).filter(Boolean));
  const roleProjectIds = new Set(arr(allocator.role_ready).map(item => item.project_id).filter(Boolean));

  const gaps = arr(feed.projects)
    .filter(project => project?.project_id && !terminalProject(project.status))
    .map(project => {
      const jobs = arr(project.jobs);
      const unresolved = jobs.filter(job => !terminalJob(job.state));
      const projectSlug = slug(project.project_id);
      const hasCleanReady = readyProjectIds.has(project.project_id);
      const hasActiveExecution = jobs.some(job => activeJob(job.state));
      const hasActiveCoverage = activeCoverageProjects.has(projectSlug) || roleProjectIds.has(project.project_id);
      const evidence = uniq([
        `coordination/portfolio/PORTFOLIO.json#project:${project.project_id}`,
        ...unresolved.sort((a,b)=>(b.priority||0)-(a.priority||0)).slice(0, 6).map(job => evidenceRef(project.project_id, job)),
        ...jobs.filter(job => terminalJob(job.state)).sort((a,b)=>parseTime(b?.terminal_return?.returned_at)-parseTime(a?.terminal_return?.returned_at)).slice(0, 2).map(job => job?.latest_return?.path || evidenceRef(project.project_id, job))
      ]);
      return {
        project,
        projectSlug,
        evidence,
        hasCleanReady,
        hasActiveExecution,
        hasActiveCoverage,
        unresolvedCount: unresolved.length,
        lastActivity: projectLastActivity(project)
      };
    })
    .filter(row => !row.hasCleanReady && !row.hasActiveExecution && !row.hasActiveCoverage && row.evidence.length)
    .sort((a,b) => {
      if (!a.lastActivity && b.lastActivity) return -1;
      if (a.lastActivity && !b.lastActivity) return 1;
      if (a.lastActivity !== b.lastActivity) return a.lastActivity - b.lastActivity;
      return (b.project.priority || 0) - (a.project.priority || 0) || a.project.project_id.localeCompare(b.project.project_id);
    });

  const target = Number(allocator.metabolism?.target_claimable || 8);
  const currentClean = Number(allocator.counts?.ready || 0) + Number(allocator.counts?.queue_ready || 0) + Number(allocator.counts?.role_ready || 0);
  const desiredCoverage = gaps.length ? Math.min(8, gaps.length, Math.max(3, target - currentClean)) : 0;
  const selected = gaps.slice(0, desiredCoverage);
  const additions = [];

  for (const row of selected) {
    const fingerprint = sha12(JSON.stringify({ project_id: row.project.project_id, evidence: row.evidence }));
    const roleId = `guide-planner-project-${row.projectSlug}-${fingerprint}`;
    if (receiptIds.has(roleId)) continue;
    const pin = latestPinByRole.get(roleId);
    const wid = pin?.row?.doc?.worker_id;
    const last = pin ? Math.max(eventTime(pin.row.doc), hbByWorker.get(wid) || 0) : 0;
    if (pin && last && now - last < 10 * 60_000) continue;
    const generation = pin?.gen || 0;
    const next = generation + 1;
    const predecessor = generation ? `coordination/guide/pins/${roleId}/G${g(generation)}.json` : null;
    const priority = 164 + Math.min(4, Math.floor(Number(row.project.priority || 0) / 25));
    additions.push({
      role_id: roleId,
      guide_work_id: roleId,
      role: 'GUIDE_PLANNER',
      trigger: 'PROJECT_COVERAGE_GAP',
      fingerprint,
      project_id: row.project.project_id,
      project_label: row.project.label || row.project.project_id,
      title: `Abrir trabajo útil en ${row.project.label || row.project.project_id}`,
      mission: `Trabajá sólo sobre ${row.project.project_id}. Usá el goal y evidencia durable del proyecto para materializar 1–3 trabajos concretos, no duplicados y ejecutables/verificables. Si realmente no queda trabajo fundado, cerrá este coverage gap con un receipt NO_ACTION_NEEDED; no inventes filler. Después reentrá al allocator.`,
      priority,
      evidence: row.evidence,
      state: generation ? 'replaceable' : 'ready',
      generation,
      next_generation: next,
      required_capabilities: [],
      claim_mode: 'GUIDE_ROLE_PIN_CREATE',
      claim_path: `coordination/guide/pins/${roleId}/G${g(next)}.json`,
      claim_payload_shape: {
        schema: 'prometeo.guide-role-pin/v1',
        pin_id: `pin-${roleId}-G${g(next)}-<worker_id>`,
        guide_work_id: roleId,
        role: 'GUIDE_PLANNER',
        trigger: 'PROJECT_COVERAGE_GAP',
        project_id: row.project.project_id,
        generation: next,
        worker_id: '<worker_id>',
        claim_id: `claim-${roleId}-G${g(next)}-<worker_id>`,
        claimed_at: '<now_iso>',
        expires_at: '<now_plus_10m_iso>',
        source_head: allocator.source_sha || '<allocator_source_sha>',
        evidence: row.evidence,
        predecessor_pin_ref_or_null: predecessor
      },
      post_claim_validate: true,
      coverage: {
        unresolved_jobs: row.unresolvedCount,
        last_project_activity_at: row.lastActivity ? new Date(row.lastActivity).toISOString() : null,
        anti_starvation: 'OLDEST_UNCOVERED_THEN_PRIORITY'
      }
    });
  }

  allocator.role_ready = [...arr(allocator.role_ready), ...additions]
    .sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.role_id).localeCompare(String(b.role_id)));
  allocator.counts = { ...(allocator.counts || {}), role_ready: allocator.role_ready.length };
  allocator.coverage = {
    schema: 'prometeo.project-coverage/v1',
    gap_count: gaps.length,
    added_count: additions.length,
    selected_projects: additions.map(item => item.project_id),
    target_claimable: target,
    clean_before_coverage: currentClean,
    policy: 'NO_CLEAN_READY_OR_ACTIVE_EXECUTION => PROJECT_COVERAGE_GAP; oldest-uncovered first; max 8; at least 3 while gaps exist'
  };
  allocator.diagnostics = {
    ...(allocator.diagnostics || {}),
    project_coverage_gaps: gaps.map(row => ({
      project_id: row.project.project_id,
      label: row.project.label || row.project.project_id,
      unresolved_jobs: row.unresolvedCount,
      last_activity_at: row.lastActivity ? new Date(row.lastActivity).toISOString() : null
    }))
  };
  return allocator;
}

export function runCli(argv = process.argv.slice(2)) {
  const [allocatorPath, feedPath, outPath = allocatorPath, root = '.'] = argv;
  if (!allocatorPath || !feedPath) throw new Error('usage: apply-project-coverage.mjs <allocator.json> <feed.json> [out.json] [repo-root]');
  const allocator = JSON.parse(fs.readFileSync(allocatorPath, 'utf8'));
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
  const out = applyProjectCoverage(allocator, feed, root);
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  process.stdout.write(`project-coverage gaps=${out.coverage.gap_count} added=${out.coverage.added_count} role_ready=${out.counts.role_ready}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { runCli(); }
  catch (error) { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; }
}
