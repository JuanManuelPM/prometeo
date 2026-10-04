import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = rel => fs.readFileSync(new URL(rel, ROOT), 'utf8');
const blob = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\\0${text}`).digest('hex');

const manifest = JSON.parse(read('current-tree/control-v11/work-score/control-candidate-b055.json'));
const index = read('current-tree/control-v11/work-score/index.html');
const app = read('current-tree/control-v11/work-score/app.html');
const reviewText = read('current-tree/control-v11/work-score/runtime-truth-review.json');
const review = JSON.parse(reviewText);

assert.equal(manifest.schema, 'prometeo.work-score-control-candidate/v1');
assert.equal(manifest.candidate_status, 'READY_FOR_COMBINED_TESTS');
assert.equal(manifest.consumer, 'portfolio-10wc-pre-run-b057');
assert.equal(blob(index), manifest.candidate_bytes.shell.sha);
assert.equal(blob(app), manifest.candidate_bytes.renderer.sha);
assert.equal(blob(reviewText), manifest.candidate_bytes.truth_review.sha);
assert.equal(review.verdict, 'RENDERER_TRUTH_INTEGRATION_VERIFIED');
assert.equal(review.reviewed_renderer_sha, manifest.candidate_bytes.renderer.sha);

assert.match(index, /const APP='\.\/app\.html'/);
assert.doesNotMatch(app, /times=\[tl\?\.generated_at,fr\?\.generated_at,al\?\.generated_at,score\?\.generated_at\]/);
assert.match(app, /if\(scoreFresh\)for\(const x of score\?\.launch_measurements/);
assert.match(app, /if\(timelineFresh\)for\(const s of tl\?\.spans/);
assert.match(app, /now-t>=6\*60000/);
assert.ok(manifest.gates.every(g => g.status === 'PASS'));
assert.match(manifest.truth_boundary, /not a publish manifest/i);
assert.match(manifest.truth_boundary, /not Human Accepted/i);

console.log('B055_CONTROL_CANDIDATE_MERGE_PASS');
