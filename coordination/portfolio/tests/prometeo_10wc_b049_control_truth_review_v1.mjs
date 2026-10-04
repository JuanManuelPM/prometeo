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
const prior = JSON.parse(read('current-tree/control-v11/work-score/runtime-truth-review.json'));
const review = JSON.parse(read('current-tree/control-v11/work-score/control-truth-review-b049.json'));
const gitBlobSha = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\\0${text}`).digest('hex');

assert.equal(review.schema, 'prometeo.work-score-control-truth-review/v1');
assert.equal(review.verdict, 'ACTIVE_RENDERER_TRUTH_GAP_CONFIRMED_FOLLOWUP_DEDUPED');
assert.equal(gitBlobSha(index), review.reviewed_shell_sha);
assert.equal(gitBlobSha(app), review.reviewed_app_sha);

assert.match(index, /const APP='\.\/app\.html'/);
assert.doesNotMatch(index, /score\?\.launch_measurements/);
assert.doesNotMatch(index, /times=\[tl\?\.generated_at,fr\?\.generated_at,al\?\.generated_at,score\?\.generated_at\]/);

assert.notEqual(gitBlobSha(index), prior.reviewed_index_sha, 'B048 exact-byte review must self-invalidate after shell split');
assert.match(app, /times=\[tl\?\.generated_at,fr\?\.generated_at,al\?\.generated_at,score\?\.generated_at\]/);
assert.match(app, /gt=times\.length\?Math\.max\(\.\.\.times\):NaN/);
assert.match(app, /for\(const x of score\?\.launch_measurements\|\|\[\]\)/);

const now = '2026-10-04T16:59:00Z';
const mixed = aggregateRequiredSourceFreshness({
  allocator: { generated_at: '2026-10-04T16:58:55Z' },
  scoreboard: { generated_at: '2026-10-04T16:56:00Z' }
}, { now, staleAfterMs: 30_000, required: ['allocator', 'scoreboard'] });
assert.equal(mixed.status, 'STALE');
assert.equal(classifyWorkerEvidence('2026-10-04T16:52:30Z', { now }).contributes_live_capacity, false);

console.log('B049_CONTROL_TRUTH_REVIEW_PASS');
