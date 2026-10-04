import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const html = fs.readFileSync(path.join(repo, 'current-tree/control-v11/work-score/index.html'), 'utf8');
const audit = JSON.parse(fs.readFileSync(path.join(here, 'work-score-last-good-stale-audit-v1.json'), 'utf8'));

assert.equal(audit.status, 'AUDIT_COMPLETE');
assert.equal(audit.block_id, 'B018');
assert.equal(audit.findings.length, 3);
assert.match(html, /Math\.max\(\.\.\.times\)/, 'overall stamp must still expose the audited newest-source masking behavior');
assert.match(html, /catch\{notes\.push\(k\)\}/, 'failed refresh must still retain prior in-memory source object as audited');
assert.match(html, /now-t<=15\*60000/, '15-minute worker inclusion window must still be present for the audited liveness mismatch');
assert.ok(audit.findings.some(x => x.id === 'B018-F1-MAX_TIMESTAMP_MASKS_STALE_SOURCE' && x.status === 'CONFIRMED'));
assert.ok(audit.findings.some(x => x.id === 'B018-F2-LAST_GOOD_RETAINED_BUT_UNLABELED' && x.status === 'CONFIRMED'));
assert.ok(audit.findings.some(x => x.id === 'B018-F3-WORKER-LIVENESS-WINDOW_TOO_WIDE' && x.status === 'CONFIRMED'));

console.log('work-score-last-good-stale-audit: PASS (3 confirmed findings)');
