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
const review = JSON.parse(read('current-tree/control-v11/work-score/runtime-truth-review.json'));
const gitBlobSha = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\0${text}`).digest('hex');

assert.equal(review.schema, 'prometeo.work-score-runtime-truth-review/v1');
assert.equal(review.verdict, 'RENDERER_TRUTH_GAP_CONFIRMED');
assert.equal(gitBlobSha(index), review.reviewed_index_sha, 'review must be bound to the exact renderer bytes it audited');
assert.match(index, /times=\[tl\?\.generated_at,fr\?\.generated_at,al\?\.generated_at,score\?\.generated_at\]/);
assert.match(index, /gt=times\.length\?Math\.max\(\.\.\.times\):NaN/);
assert.match(index, /for\(const x of score\?\.launch_measurements\|\|\[\]\)/);
assert.doesNotMatch(index, /freshness-model\.mjs/);

const now = '2026-10-04T16:40:00Z';
const mixed = aggregateRequiredSourceFreshness({
  allocator: { generated_at: '2026-10-04T16:39:55Z' },
  scoreboard: { generated_at: '2026-10-04T16:37:00Z' }
}, { now, staleAfterMs: 30_000, required: ['allocator', 'scoreboard'] });
assert.equal(mixed.status, 'STALE');
assert.equal(classifyWorkerEvidence('2026-10-04T16:33:30Z', { now }).contributes_live_capacity, false);

console.log('PASS B048 runtime truth review: renderer integration gap confirmed');
