import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const core = fs.readFileSync(path.join(repo, 'scripts/build-fast-allocator-core-v3.mjs'), 'utf8');
const wrapper = fs.readFileSync(path.join(repo, 'scripts/build-fast-allocator.mjs'), 'utf8');
const dependent = JSON.parse(fs.readFileSync(path.join(repo, 'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-10wc-pre-run-b025.json'), 'utf8'));

assert.deepEqual(dependent.dependency_ids, [
  'portfolio-10wc-pre-run-b001',
  'portfolio-10wc-pre-run-b002'
]);

const readyStart = core.indexOf('const ready = jobs');
const recoveryStart = core.indexOf('\n  const recovery = jobs', readyStart);
assert.ok(readyStart >= 0 && recoveryStart > readyStart, 'ready candidate pipeline must be locatable');
const readyPipeline = core.slice(readyStart, recoveryStart);
assert.match(readyPipeline, /\['ready', 'partial'\]\.includes\(job\.state\)/);
assert.equal(readyPipeline.includes('dependency_ids'), false, 'READY pipeline currently has no dependency_ids gate');
assert.equal(readyPipeline.includes('dependencyRecoveryGate'), false, 'READY pipeline currently does not invoke dependencyRecoveryGate');

const replacementGateMarker = "if (String(job?.state || '').toLowerCase() !== 'replaceable' || !arr(job?.dependency_ids).length) return job;";
assert.ok(wrapper.includes(replacementGateMarker), 'wrapper dependency gate is currently scoped to replaceable recovery jobs');

console.log('AUDIT B019 FINDING: READY candidate filtering trusts upstream state and has no local dependency_ids enforcement');
