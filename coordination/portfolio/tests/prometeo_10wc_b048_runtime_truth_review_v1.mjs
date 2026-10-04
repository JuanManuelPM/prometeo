import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {
  aggregateRequiredSourceFreshness,
  classifyWorkerEvidence
} from '../../../current-tree/control-v11/work-score/freshness-model.mjs';

const ROOT = new URL('../../../', import.meta.url);
const read = rel => fs.readFileSync(new URL(rel, ROOT), 'utf8');
const index = read('current-tree/control-v11/work-score/index.html');
const app = read('current-tree/control-v11/work-score/app.html');
const review = JSON.parse(read('current-tree/control-v11/work-score/runtime-truth-review.json'));
const gitBlobSha = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\\0${text}`).digest('hex');

assert.equal(review.schema, 'prometeo.work-score-runtime-truth-review/v1');
assert.equal(review.verdict, 'RENDERER_TRUTH_INTEGRATION_VERIFIED');
assert.equal(gitBlobSha(index), review.reviewed_shell_sha);
assert.equal(gitBlobSha(app), review.reviewed_renderer_sha);
assert.match(index, /const APP='\.\/app\.html'/);

assert.doesNotMatch(app, /times=\[tl\?\.generated_at,fr\?\.generated_at,al\?\.generated_at,score\?\.generated_at\]/);
assert.match(app, /xs\.every\(x=>x\.status==='FRESH'\)/);
assert.match(app, /LAST_GOOD_ERROR/);
assert.match(app, /if\(scoreFresh\)for\(const x of score\?\.launch_measurements/);
assert.match(app, /if\(timelineFresh\)for\(const s of tl\?\.spans/);
assert.match(app, /now-t>=6\*60000/);

const now = '2026-10-04T17:04:00Z';
const mixed = aggregateRequiredSourceFreshness({
  allocator: { generated_at: '2026-10-04T17:03:55Z' },
  scoreboard: { generated_at: '2026-10-04T17:01:00Z' }
}, { now, staleAfterMs: 30_000, required: ['allocator', 'scoreboard'] });
assert.equal(mixed.status, 'STALE');
assert.equal(classifyWorkerEvidence('2026-10-04T16:57:30Z', { now }).contributes_live_capacity, false);

console.log('PASS B048 runtime truth review: renderer integration verified');
