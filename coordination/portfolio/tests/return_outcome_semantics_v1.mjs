import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const normalize = path.join(repoRoot, '.github/scripts/normalize-live-feed.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-return-semantics-'));
const write = (rel, obj) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(obj, null, 2)}\n`);
};

write('coordination/portfolio/RETURN_OUTCOME_SEMANTICS_V1.json', {
  terminal_outcomes: ['DONE', 'VERIFIED', 'NO_ACTION_NEEDED', 'SUPERSEDED'],
  nonterminal_attention_outcomes: ['PARTIAL', 'BOUNDARY', 'ROUTE_ABORTED']
});

const reconciledRef = 'coordination/portfolio/returns/race5/RETURN-bad.json';
write('coordination/portfolio/return-reconciliations/race5/RETURN-bad.json', {
  schema: 'prometeo.portfolio-return-reconciliation/v1',
  job_id: 'race5',
  return_ref: reconciledRef,
  effect: 'NONTERMINAL_ROUTE_ABORT'
});

const old = new Date(Date.now() - 20 * 60_000).toISOString();
const feed = {
  thresholds: { stale_suspect_minutes: 6, recovery_eligible_minutes: 10 },
  summary: { workers: {}, portfolio: { derived: 2 } },
  workers: [],
  projects: [{
    project_id: 'p',
    jobs: [
      {
        job_id: 'race5', seed_status: 'ready', state: 'done', owner: 'w1', pin_generation: 2, last_signal_at: old,
        returns: [{ path: reconciledRef, outcome: 'NO_ACTION_NEEDED', returned_at: old }],
        latest_return: { outcome: 'NO_ACTION_NEEDED', returned_at: old },
        terminal_return: { outcome: 'NO_ACTION_NEEDED', returned_at: old }
      },
      {
        job_id: 'genuine', seed_status: 'ready', state: 'done', owner: null, pin_generation: 0, last_signal_at: null,
        returns: [{ path: 'coordination/portfolio/returns/genuine/R.json', outcome: 'NO_ACTION_NEEDED', returned_at: old }],
        latest_return: { outcome: 'NO_ACTION_NEEDED', returned_at: old },
        terminal_return: { outcome: 'NO_ACTION_NEEDED', returned_at: old }
      },
      {
        job_id: 'route-abort', seed_status: 'ready', state: 'ready', owner: null, pin_generation: 0, last_signal_at: null,
        returns: [{ path: 'coordination/portfolio/returns/route-abort/R.json', outcome: 'ROUTE_ABORTED', returned_at: old }],
        latest_return: { outcome: 'ROUTE_ABORTED', returned_at: old }, terminal_return: null
      },
      {
        job_id: 'partial', seed_status: 'ready', state: 'partial', owner: null, pin_generation: 0, last_signal_at: null,
        returns: [{ path: 'coordination/portfolio/returns/partial/R.json', outcome: 'PARTIAL', returned_at: old }],
        latest_return: { outcome: 'PARTIAL', returned_at: old }, terminal_return: null
      }
    ]
  }]
};

const feedPath = path.join(root, 'feed.json');
fs.writeFileSync(feedPath, JSON.stringify(feed, null, 2));
const run = spawnSync(process.execPath, [normalize, root, feedPath], { encoding: 'utf8' });
if (run.status !== 0) throw new Error(run.stderr || run.stdout);

const out = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
const jobs = Object.fromEntries(out.projects[0].jobs.map(job => [job.job_id, job]));
if (jobs.race5.state !== 'replaceable' || jobs.race5.terminal_return !== null) {
  throw new Error('reconciled route abort did not reopen replaceable job');
}
if (jobs.race5.latest_return.effective_terminal !== false) {
  throw new Error('latest reconciled return was not annotated nonterminal');
}
if (jobs.genuine.state !== 'done' || !jobs.genuine.terminal_return) {
  throw new Error('genuine NO_ACTION_NEEDED lost terminality');
}
if (jobs['route-abort'].state !== 'partial') {
  throw new Error('ROUTE_ABORTED should remain nonterminal attention');
}
if (jobs.partial.state !== 'partial') {
  throw new Error('PARTIAL behavior regressed');
}
if (out.diagnostics.jobs_reopened_by_return_reconciliation !== 1) {
  throw new Error('reconciliation diagnostic mismatch');
}
if (out.summary.portfolio.done !== 1 || out.summary.portfolio.replaceable !== 1 || out.summary.portfolio.terminal_returns !== 1) {
  throw new Error('portfolio summary did not adopt reconciled terminal semantics');
}

console.log(JSON.stringify({
  ok: true,
  reconciled_state: jobs.race5.state,
  genuine_no_action_needed: jobs.genuine.state,
  route_aborted: jobs['route-abort'].state,
  partial: jobs.partial.state
}, null, 2));
