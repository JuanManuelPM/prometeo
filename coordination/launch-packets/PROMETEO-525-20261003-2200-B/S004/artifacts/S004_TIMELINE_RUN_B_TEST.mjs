import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { compileActivityTimeline } from '../../../../../scripts/build-activity-timeline.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../../..');
const runId = 'PROMETEO-525-20261003-2200-B';
const packet = JSON.parse(fs.readFileSync(path.resolve(here, '../../PACKET.json'), 'utf8'));

assert.equal(packet.status, 'ARMED');
assert.equal(packet.authority_mode, 'SYNTHETIC_BENCHMARK_SLOT_CLAIM');
assert.equal(packet.expected_workers, 5);
assert.equal(packet.timeline_projection.human_boundary_terminates_workers, false);
assert.deepEqual(packet.lifecycle_contract.states, ['PLANNED','LAUNCHED','OBSERVED_WORKING','RESULT','VERIFIED','CONSUMED']);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-s004-run-b-'));
fs.mkdirSync(path.join(root, 'coordination', 'launch-packets', runId), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'portfolio', 'returns', 'explicit'), { recursive: true });
fs.writeFileSync(path.join(root, 'coordination', 'launch-packets', runId, 'PACKET.json'), JSON.stringify(packet, null, 2));
fs.writeFileSync(path.join(root, 'coordination', 'portfolio', 'returns', 'explicit', 'RETURN.json'), JSON.stringify({
  worker_id: 'wc-explicit',
  returned_at: '2026-10-04T01:40:00Z',
  verification: { verified_at: '2026-10-04T01:41:00Z', ref: 'verify://explicit' },
  integration: { consumed_at: '2026-10-04T01:42:00Z', consumer: 'S05' }
}, null, 2));

const runtime = { batches: [{ batch_id: `RUN-${runId}`, workers: [
  { worker_id: 'wc-launched', state: 'ACTIVE', first_event_at: '2026-10-04T01:50:00Z', last_event_at: '2026-10-04T01:59:00Z', productive_units: 0, repo: { beacon_ref: 'beacon://launched' } },
  { worker_id: 'wc-working', state: 'ACTIVE', first_event_at: '2026-10-04T01:10:00Z', last_event_at: '2026-10-04T01:59:30Z', started: { at: '2026-10-04T01:11:00Z' }, productive_units: 1, repo: { beacon_ref: 'beacon://working' } },
  { worker_id: 'wc-old-active', state: 'ACTIVE', first_event_at: '2026-10-04T01:00:00Z', last_event_at: '2026-10-04T01:20:00Z', started: { at: '2026-10-04T01:01:00Z' }, productive_units: 1 },
  { worker_id: 'wc-result', state: 'CLOSED', first_event_at: '2026-10-04T01:05:00Z', last_event_at: '2026-10-04T01:35:00Z', started: { at: '2026-10-04T01:06:00Z' }, close: { terminal: true, at: '2026-10-04T01:35:00Z', result_ref_or_null: 'result://durable' }, productive_units: 1 }
] }] };

const out = compileActivityTimeline(runtime, root, '2026-10-04T02:00:00Z', 8);
assert.equal(out.events.filter(x => x.type === 'PLANNED').length, 5);
assert.equal(out.spans.find(x => x.actor_id === 'wc-launched').status, 'LAUNCHED');
assert.equal(out.spans.find(x => x.actor_id === 'wc-working').status, 'OBSERVED_WORKING');
assert.equal(out.spans.find(x => x.actor_id === 'wc-old-active').status, 'STALE');
assert.equal(out.spans.find(x => x.actor_id === 'wc-result').status, 'RESULT');
assert.ok(Date.parse(out.spans.find(x => x.actor_id === 'wc-working').end_at) > Date.parse(packet.timeline_projection.human_observation_boundary_at));
assert.deepEqual(out.events.filter(x => x.actor_id === 'wc-explicit').map(x => x.type), ['RESULT','VERIFIED','CONSUMED']);
assert.equal(out.coverage.raw_prompt_text_public, false);
assert.equal(out.coverage.arbitrary_external_ai_sessions, 'UNOBSERVED_UNTIL_RECORDER_ADAPTER_EXISTS');
assert.match(out.cycle.meaning, /worker lifetime is not capped/i);

const page = fs.readFileSync(path.join(repoRoot, 'current-tree', 'control-v11', 'cycle', 'index.html'), 'utf8');
const selector = page.match(/\/\* LAST_GOOD_SELECTOR_START \*\/([\s\S]*?)\/\* LAST_GOOD_SELECTOR_END \*\//);
assert.ok(selector, 'last-good selector helper missing');
const context = {};
vm.createContext(context);
vm.runInContext(`${selector[1]}; this.preferNewest = preferNewest;`, context);
assert.equal(context.preferNewest({ generated_at: '2026-10-04T01:00:00Z', marker: 'remote-old' }, { generated_at: '2026-10-04T01:05:00Z', marker: 'cached-new' }).model.marker, 'cached-new');

fs.rmSync(root, { recursive: true, force: true });
console.log('PASS S004 RUN B lifecycle + human-boundary + privacy + explicit-evidence + last-good');
