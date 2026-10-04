import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const audit = JSON.parse(fs.readFileSync(path.join(here, 'work-score-last-good-stale-audit-v1.json'), 'utf8'));

assert.equal(audit.status, 'AUDIT_COMPLETE');
assert.equal(audit.block_id, 'B018');
assert.equal(audit.source_path, 'current-tree/control-v11/work-score/index.html');
assert.match(audit.source_sha, /^[0-9a-f]{40}$/);
assert.equal(audit.findings.length, 3);
assert.ok(audit.findings.some(x => x.id === 'B018-F1-MAX_TIMESTAMP_MASKS_STALE_SOURCE' && x.status === 'CONFIRMED'));
assert.ok(audit.findings.some(x => x.id === 'B018-F2-LAST_GOOD_RETAINED_BUT_UNLABELED' && x.status === 'CONFIRMED'));
assert.ok(audit.findings.some(x => x.id === 'B018-F3-WORKER-LIVENESS-WINDOW_TOO_WIDE' && x.status === 'CONFIRMED'));
assert.ok(audit.downstream?.B034_freshness_regression?.length >= 3);

console.log('work-score-last-good-stale-audit: PASS (historical evidence stable)');
