import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildFastAllocator } from '../../../scripts/build-fast-allocator.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const buildFeed = path.join(repoRoot, '.github/scripts/build-live-feed.mjs');
const buildFrontier = path.join(repoRoot, 'scripts/build-claim-frontier.mjs');
const semantics = JSON.parse(fs.readFileSync(path.join(repoRoot, 'coordination/portfolio/RETURN_OUTCOME_SEMANTICS_V1.json'), 'utf8'));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-terminal-supersession-'));
const old = '2026-09-18T00:00:00Z';

const write = (rel, value) => {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};

write('coordination/portfolio/RETURN_OUTCOME_SEMANTICS_V1.json', semantics);
write('coordination/portfolio/PORTFOLIO.json', {
  schema: 'prometeo.portfolio/v1',
  projects: [{
    project_id: 'prometeo-autonomous-growth',
    label: 'growth',
    jobs: [
      {
        job_id: 'portfolio-eff050-live-runtime-observation-v1',
        dedupe_key: 'workers:capability-fit:representative-js-live-runtime-observation:v1',
        seed_status: 'ready',
        required_capabilities: [],
        priority: 90
      },
      {
        job_id: 'unknown-stale-superseded',
        dedupe_key: 'test:unknown-stale-superseded',
        seed_status: 'ready',
        required_capabilities: [],
        priority: 80
      },
      {
        job_id: 'legit-route-abort-recovery',
        dedupe_key: 'test:legit-route-abort-recovery',
        seed_status: 'ready',
        required_capabilities: [],
        priority: 70
      }
    ]
  }]
});

const pin = (jobId, workerId) => ({
  schema: 'prometeo.portfolio-pin/v1',
  job_id: jobId,
  generation: 1,
  worker_id: workerId,
  claimed_at: old,
  expires_at: '2026-09-18T00:10:00Z'
});
write('coordination/portfolio/pins/portfolio-eff050-live-runtime-observation-v1/G000001.json', pin('portfolio-eff050-live-runtime-observation-v1', 'w-eff050'));
write('coordination/portfolio/pins/unknown-stale-superseded/G000001.json', pin('unknown-stale-superseded', 'w-unknown'));
write('coordination/portfolio/pins/legit-route-abort-recovery/G000001.json', pin('legit-route-abort-recovery', 'w-route'));

write(
  'coordination/portfolio/returns/portfolio-eff050-live-runtime-observation-v1/RETURN-wc-20260918T212308Z-77e90881-G000001-STALE_SUPERSEDED.json',
  {
    schema: 'prometeo.portfolio-return/v1',
    return_id: 'RETURN-wc-20260918T212308Z-77e90881-G000001-STALE_SUPERSEDED',
    job_id: 'portfolio-eff050-live-runtime-observation-v1',
    worker_id: 'w-eff050',
    generation: 1,
    returned_at: old,
    outcome: 'STALE_SUPERSEDED',
    summary: 'Objective already durably satisfied.'
  }
);
write('coordination/portfolio/returns/unknown-stale-superseded/RETURN-UNKNOWN.json', {
  schema: 'prometeo.portfolio-return/v1',
  return_id: 'RETURN-UNKNOWN',
  job_id: 'unknown-stale-superseded',
  worker_id: 'w-unknown',
  generation: 1,
  returned_at: old,
  outcome: 'STALE_SUPERSEDED',
  summary: 'Unknown historical spelling must not silently become terminal.'
});
write('coordination/portfolio/returns/legit-route-abort-recovery/RETURN-ROUTE.json', {
  schema: 'prometeo.portfolio-return/v1',
  return_id: 'RETURN-ROUTE',
  job_id: 'legit-route-abort-recovery',
  worker_id: 'w-route',
  generation: 1,
  returned_at: old,
  outcome: 'ROUTE_ABORTED',
  summary: 'Routing stale; acceptance criteria remain unresolved.'
});

const feedPath = path.join(root, 'feed.json');
const feedRun = spawnSync(process.execPath, [buildFeed, root, feedPath], { encoding: 'utf8' });
if (feedRun.status !== 0) throw new Error(feedRun.stderr || feedRun.stdout);

const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));
const jobs = Object.fromEntries(feed.projects.flatMap(project => project.jobs).map(job => [job.job_id, job]));

if (jobs['portfolio-eff050-live-runtime-observation-v1']?.state !== 'done') {
  throw new Error(`reviewed EFF050 STALE_SUPERSEDED did not become terminal: ${jobs['portfolio-eff050-live-runtime-observation-v1']?.state}`);
}
if (jobs['unknown-stale-superseded']?.state !== 'replaceable') {
  throw new Error(`unknown STALE_SUPERSEDED must remain recoverable: ${jobs['unknown-stale-superseded']?.state}`);
}
if (jobs['legit-route-abort-recovery']?.state !== 'replaceable') {
  throw new Error(`ROUTE_ABORTED stale owner must preserve recovery: ${jobs['legit-route-abort-recovery']?.state}`);
}

const allocator = buildFastAllocator(feed, { status: 'OK', metrics: {}, reasons: [] }, { recoveryPolicies: [], roleContext: null });
const recoveryIds = new Set(allocator.recovery.map(item => item.job_id));
if (recoveryIds.has('portfolio-eff050-live-runtime-observation-v1')) {
  throw new Error('terminally superseded EFF050 leaked into allocator recovery');
}
if (!recoveryIds.has('unknown-stale-superseded')) {
  throw new Error('unknown stale supersession lost legitimate recovery');
}
if (!recoveryIds.has('legit-route-abort-recovery')) {
  throw new Error('ROUTE_ABORTED lost legitimate recovery');
}

const allocatorPath = path.join(root, 'allocator.json');
const frontierPath = path.join(root, 'claim-frontier.json');
fs.writeFileSync(allocatorPath, JSON.stringify(allocator, null, 2));
const frontierRun = spawnSync(process.execPath, [buildFrontier, allocatorPath, frontierPath], { encoding: 'utf8' });
if (frontierRun.status !== 0) throw new Error(frontierRun.stderr || frontierRun.stdout);

const frontier = JSON.parse(fs.readFileSync(frontierPath, 'utf8'));
const frontierIds = new Set((frontier.candidates || []).map(item => item.job_id).filter(Boolean));
if (frontierIds.has('portfolio-eff050-live-runtime-observation-v1')) {
  throw new Error('terminally superseded EFF050 leaked into compact claim frontier');
}
if (!frontierIds.has('unknown-stale-superseded') || !frontierIds.has('legit-route-abort-recovery')) {
  throw new Error('legitimate recovery candidates were lost from compact claim frontier');
}

console.log(JSON.stringify({
  ok: true,
  terminal_eff050_state: jobs['portfolio-eff050-live-runtime-observation-v1'].state,
  unknown_stale_state: jobs['unknown-stale-superseded'].state,
  route_abort_state: jobs['legit-route-abort-recovery'].state,
  allocator_recovery: [...recoveryIds].sort(),
  frontier_candidates: [...frontierIds].sort()
}, null, 2));
