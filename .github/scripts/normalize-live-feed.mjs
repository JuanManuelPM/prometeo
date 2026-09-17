import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const feedPath = path.resolve(process.argv[3] || '/tmp/feed.json');
const NO_ALLOCATION_GRACE_MS = 45_000;
const now = Date.now();

const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const feed = readJson(feedPath);
if (!feed || !Array.isArray(feed.workers)) throw new Error('invalid live feed');

const lower = v => String(v ?? '').toLowerCase();
const first = (...v) => v.find(x => x !== undefined && x !== null && x !== '');
const ts = v => Date.parse(v || '') || 0;

const outcomeSemanticsPath = path.join(root, 'coordination/portfolio/RETURN_OUTCOME_SEMANTICS_V1.json');
const outcomeSemantics = readJson(outcomeSemanticsPath) || {};
const terminalOutcomes = new Set((outcomeSemantics.terminal_outcomes || ['DONE','VERIFIED','NO_ACTION_NEEDED','SUPERSEDED']).map(lower));
const attentionOutcomes = new Set((outcomeSemantics.nonterminal_attention_outcomes || ['PARTIAL','BOUNDARY','ROUTE_ABORTED']).map(lower));
const outcomeOf = d => lower(first(d?.outcome, d?.status, d?.result));

const reconciliationByJob = new Map();
const reconciliationRoot = path.join(root, 'coordination/portfolio/return-reconciliations');
const walkJson = dir => {
  if (!fs.existsSync(dir)) return [];
  const rows = [];
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) rows.push(...walkJson(p));
    else if (ent.isFile() && ent.name.endsWith('.json')) rows.push(p);
  }
  return rows;
};
for (const file of walkJson(reconciliationRoot)) {
  const d = readJson(file);
  if (!d?.job_id || !d?.return_ref || d?.effect !== 'NONTERMINAL_ROUTE_ABORT') continue;
  const map = reconciliationByJob.get(d.job_id) || new Map();
  const row = {...d, source_path:path.relative(root, file).split(path.sep).join('/')};
  const prior = map.get(d.return_ref);
  if (!prior || ts(row.recorded_at) >= ts(prior.recorded_at)) map.set(d.return_ref, row);
  reconciliationByJob.set(d.job_id, map);
}

let reconciledTerminalReceipts = 0;
let jobsReopened = 0;
for (const project of (feed.projects || [])) {
  for (const job of (project.jobs || [])) {
    const reconciliations = [...(reconciliationByJob.get(job.job_id)?.values() || [])];
    const terminalReturn = job.terminal_return || null;
    const matchingReconciliation = terminalReturn ? reconciliations.find(r => {
      if (lower(r.original_outcome) !== outcomeOf(terminalReturn)) return false;
      if (r.original_returned_at && ts(r.original_returned_at) !== ts(terminalReturn.returned_at)) return false;
      if (r.original_worker_id && r.original_worker_id !== terminalReturn.worker_id) return false;
      return true;
    }) : null;

    if (matchingReconciliation) {
      const priorState = job.state;
      reconciledTerminalReceipts++;
      job.terminal_return = null;
      job.return_reconciliations = reconciliations.map(r => r.source_path);
      if (job.latest_return && lower(job.latest_return.outcome) === lower(matchingReconciliation.original_outcome)) {
        job.latest_return = {...job.latest_return, effective_terminal:false, reconciliation_effect:matchingReconciliation.effect};
      }
      const staleMs = Number(feed.thresholds?.stale_suspect_minutes ?? 6) * 60_000;
      const replaceMs = Number(feed.thresholds?.recovery_eligible_minutes ?? 10) * 60_000;
      const age = job.last_signal_at ? Math.max(0, now - ts(job.last_signal_at)) : Infinity;
      if (job.owner && age < staleMs) job.state = Number(job.pin_generation || 0) > 1 ? 'recovery' : 'working';
      else if (job.owner && age < replaceMs) job.state = 'suspect';
      else if (job.owner) job.state = 'replaceable';
      else if (job.latest_return && attentionOutcomes.has(outcomeOf(job.latest_return))) job.state = 'partial';
      else if (lower(job.seed_status).includes('block')) job.state = 'blocked';
      else job.state = 'ready';
      if (priorState === 'done' && job.state !== 'done') jobsReopened++;
    } else if (job.latest_return && outcomeOf(job.latest_return) === 'route_aborted' && job.state === 'ready') {
      job.state = 'partial';
    }
  }
}

const noAllocationDir = path.join(root, 'coordination/workers/no-allocation');
const explicitNoAllocation = new Set();
if (fs.existsSync(noAllocationDir)) {
  for (const name of fs.readdirSync(noAllocationDir)) {
    if (!name.endsWith('.json')) continue;
    const d = readJson(path.join(noAllocationDir, name));
    if (d?.worker_id) explicitNoAllocation.add(d.worker_id);
  }
}

const latestPinByJob = new Map();
for (const w of feed.workers) {
  for (const a of (w.assignments || [])) {
    if (a.kind !== 'portfolio' || !a.job_id || !a.pin_at) continue;
    if (!String(a.source || '').includes('/pins/')) continue;
    const t = ts(a.pin_at);
    const prev = latestPinByJob.get(a.job_id);
    if (!prev || t > prev.time) latestPinByJob.set(a.job_id, {time:t, worker_id:w.worker_id, source:a.source});
  }
}

const kept = [];
const noAllocation = [];
const superseded = [];

for (const w of feed.workers) {
  const assignments = (w.assignments || []).filter(a => !['beacon','collision'].includes(a.kind));
  const ownsAnything = assignments.some(a => a.kind === 'portfolio' || a.kind === 'queue');
  const beaconAge = w.first_seen ? Math.max(0, now - ts(w.first_seen)) : Infinity;

  if (!ownsAnything && !w.end_at && (explicitNoAllocation.has(w.worker_id) || beaconAge >= NO_ALLOCATION_GRACE_MS)) {
    noAllocation.push(w);
    continue;
  }

  if (!w.end_at && w.job_id && w.pin_at) {
    const newest = latestPinByJob.get(w.job_id);
    if (newest && newest.time > ts(w.pin_at) && newest.worker_id !== w.worker_id) {
      superseded.push({...w, superseded_by:newest.worker_id, superseded_at:new Date(newest.time).toISOString()});
      continue;
    }
  }

  kept.push(w);
}

feed.workers = kept;
feed.thresholds = {...(feed.thresholds || {}), allocation_grace_seconds:45};
feed.diagnostics = {
  ...(feed.diagnostics || {}),
  launches_total_before_projection: kept.length + noAllocation.length + superseded.length,
  no_allocation_suppressed: noAllocation.length,
  superseded_owner_attempts_suppressed: superseded.length,
  reconciled_nonterminal_returns: [...reconciliationByJob.values()].reduce((n, m) => n + m.size, 0),
  reconciled_terminal_receipts: reconciledTerminalReceipts,
  jobs_reopened_by_return_reconciliation: jobsReopened,
  return_outcome_semantics: fs.existsSync(outcomeSemanticsPath) ? 'coordination/portfolio/RETURN_OUTCOME_SEMANTICS_V1.json' : 'BUILTIN_FALLBACK',
  projection_rule: 'No-PIN launches age out of Ahora quickly; superseded pin generations remain evidence but are not simultaneous active owners. Reconciled route-abort receipts remain historical evidence but do not terminally close jobs.'
};

const s = feed.summary?.workers || (feed.summary.workers = {});
s.seen = kept.length;
s.working = kept.filter(w => ['working','recovery'].includes(w.status)).length;
s.suspect = kept.filter(w => w.status === 'suspect').length;
s.replaceable = kept.filter(w => w.status === 'replaceable').length;
s.allocating = kept.filter(w => w.status === 'allocating').length;
s.finished = kept.filter(w => !!w.end_at).length;
s.no_allocation = noAllocation.length;
s.superseded = superseded.length;

const portfolioJobs = (feed.projects || []).flatMap(p => p.jobs || []);
const ps = feed.summary?.portfolio || (feed.summary.portfolio = {});
ps.ready = portfolioJobs.filter(j => j.state === 'ready').length;
ps.working = portfolioJobs.filter(j => ['working','recovery'].includes(j.state)).length;
ps.suspect = portfolioJobs.filter(j => j.state === 'suspect').length;
ps.replaceable = portfolioJobs.filter(j => j.state === 'replaceable').length;
ps.done = portfolioJobs.filter(j => j.state === 'done').length;
ps.terminal_returns = portfolioJobs.filter(j => !!j.terminal_return).length;
if (Number.isFinite(Number(ps.derived))) ps.reproduction = Number(ps.derived) / Math.max(1, ps.terminal_returns);

fs.writeFileSync(feedPath, JSON.stringify(feed, null, 2) + '\n');
console.log(`normalized live: visible=${kept.length} no-allocation=${noAllocation.length} superseded=${superseded.length} reopened=${jobsReopened}`);
