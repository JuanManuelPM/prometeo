import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = rel => fs.readFileSync(new URL(rel, ROOT), 'utf8');
const index = read('current-tree/control-v11/work-score/index.html');
const app = read('current-tree/control-v11/work-score/app.html');
const historical = JSON.parse(read('current-tree/control-v11/work-score/control-truth-review-b049.json'));
const current = JSON.parse(read('current-tree/control-v11/work-score/runtime-truth-review.json'));
const gitBlobSha = text => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(text)}\\0${text}`).digest('hex');

assert.equal(historical.verdict, 'ACTIVE_RENDERER_TRUTH_GAP_CONFIRMED_FOLLOWUP_DEDUPED');
assert.notEqual(gitBlobSha(app), historical.reviewed_app_sha, 'the B049 finding must remain historical after its owned successor repairs the renderer');
assert.equal(current.verdict, 'RENDERER_TRUTH_INTEGRATION_VERIFIED');
assert.equal(gitBlobSha(index), current.reviewed_shell_sha);
assert.equal(gitBlobSha(app), current.reviewed_renderer_sha);
assert.match(index, /const APP='\.\/app\.html'/);
assert.doesNotMatch(app, /times=\[tl\?\.generated_at,fr\?\.generated_at,al\?\.generated_at,score\?\.generated_at\]/);
assert.match(app, /if\(scoreFresh\)for\(const x of score\?\.launch_measurements/);
assert.match(app, /if\(timelineFresh\)for\(const s of tl\?\.spans/);
assert.equal(historical.required_followup.existing_job_id, 'portfolio-work-score-source-freshness-renderer-integration-v1');

console.log('B049_CONTROL_TRUTH_REVIEW_PASS');
