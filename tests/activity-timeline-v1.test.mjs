import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { compileActivityTimeline } from '../scripts/build-activity-timeline.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = 'PROMETEO-525-20261003-1900-A';
const packetPath = path.join(repoRoot, 'coordination', 'launch-packets', runId, 'PACKET.json');
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));

assert.equal(packet.expected_workers, 5);
assert.equal(packet.expected_human_launches, 5);
assert.equal(packet.slots.length, 5);
assert.equal(new Set(packet.slots.map(x => x.slot_id)).size, 5, 'five slots unique');
assert.deepEqual(packet.lifecycle_contract.states, ['PLANNED','LAUNCHED','OBSERVED_WORKING','RESULT','VERIFIED','CONSUMED']);
assert.equal(packet.safety_contract.unknown_policy, 'UNKNOWN_STAYS_UNKNOWN');
assert.equal(packet.safety_contract.missing_consumer_is_consumable, false);
assert.equal(packet.safety_contract.missing_capability_is_compatible, false);
assert.equal(packet.safety_contract.fifty_worker_simulation_can_fabricate_work, false);
assert.equal(packet.safety_contract.historical_thresholds_authority, 'CANDIDATE_ONLY');
assert.equal(packet.safety_contract.raw_private_prompt_public, false);
assert.equal(packet.safety_contract.observation_boundary_terminates_worker, false);
assert.ok(packet.common_capsule.machine_contract.capacity_simulations.includes(50));
assert.equal(packet.common_capsule.machine_contract.capacity_guard, 'NO_SYNTHETIC_WORK_TO_FILL_CAPACITY');
assert.ok(!JSON.stringify(packet).includes('raw_private_prompt_text'));

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prometeo-activity-timeline-'));
fs.mkdirSync(path.join(root, 'coordination', 'chat-sessions', 'CHAT-TEST'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'workers', 'exams'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'portfolio', 'returns', 'result-only'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'portfolio', 'returns', 'verified-consumed'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'guide', 'receipts', 'guide-test'), { recursive: true });
fs.mkdirSync(path.join(root, 'coordination', 'launch-packets', runId), { recursive: true });

const fixturePacket = structuredClone(packet);
fixturePacket.created_at = '2026-10-03T11:50:00Z';
fixturePacket.planned_start_at = '2026-10-03T12:00:00Z';
fixturePacket.timeline_projection.planned_start_at = '2026-10-03T12:00:00Z';
fixturePacket.timeline_projection.human_observation_boundary_at = '2026-10-03T12:10:00Z';
fs.writeFileSync(path.join(root, 'coordination', 'launch-packets', runId, 'PACKET.json'), JSON.stringify(fixturePacket, null, 2));

fs.writeFileSync(path.join(root, 'coordination', 'chat-sessions', 'CHAT-TEST', 'JOURNAL.json'), JSON.stringify({
  schema: 'prometeo.chat-session-journal/v1',
  session_id: 'CHAT-TEST',
  entries: [
    { entry_id: 'J001', created_at: '2026-10-03T12:00:00Z', human_intent_summary: 'Resumen público sanitizado.', assistant_conclusion: 'Checkpoint durable.' },
    { entry_id: 'J002', created_at: '2026-10-03T12:10:00Z', human_intent_summary: 'Segundo checkpoint.', assistant_conclusion: 'Resultado parcial.' }
  ]
}, null, 2));

fs.writeFileSync(path.join(root, 'coordination', 'portfolio', 'returns', 'result-only', 'RETURN.json'), JSON.stringify({
  worker_id: 'wc-result-only',
  returned_at: '2026-10-03T12:09:00Z',
  project_id: 'prometeo',
  job_id: 'job-result-only',
  outcome: 'VERIFIED',
  productive_unit_counted: true
}, null, 2));

fs.writeFileSync(path.join(root, 'coordination', 'portfolio', 'returns', 'verified-consumed', 'RETURN.json'), JSON.stringify({
  worker_id: 'wc-explicit',
  returned_at: '2026-10-03T12:08:00Z',
  job_id: 'job-explicit',
  verification: { verified_at: '2026-10-03T12:11:00Z', ref: 'verify://explicit' },
  integration: { consumed_at: '2026-10-03T12:12:00Z', consumer: 'S05' }
}, null, 2));

fs.writeFileSync(path.join(root, 'coordination', 'guide', 'receipts', 'guide-test', 'RECEIPT.json'), JSON.stringify({
  worker_id: 'wc-working',
  created_at: '2026-10-03T12:11:00Z',
  guide_work_id: 'guide-test',
  status: 'DONE'
}, null, 2));

const runtime = {
  schema: 'prometeo.worker-runtime/v1',
  batches: [{
    batch_id: 'RUN-PROMETEO-525-20261003-1900-A',
    workers: [
      {
        worker_id: 'wc-launched',
        state: 'ACTIVE',
        first_event_at: '2026-10-03T12:13:00Z',
        last_event_at: '2026-10-03T12:14:00Z',
        productive_units: 0,
        repo: { beacon_ref: 'beacon://launched' }
      },
      {
        worker_id: 'wc-working',
        state: 'ACTIVE',
        first_event_at: '2026-10-03T12:01:00Z',
        last_event_at: '2026-10-03T12:14:30Z',
        started: { at: '2026-10-03T12:02:00Z' },
        productive_units: 2,
        repo: { beacon_ref: 'beacon://working' }
      },
      {
        worker_id: 'wc-old-active',
        state: 'ACTIVE',
        first_event_at: '2026-10-03T11:00:00Z',
        last_event_at: '2026-10-03T11:30:00Z',
        started: { at: '2026-10-03T11:02:00Z' },
        productive_units: 1
      },
      {
        worker_id: 'wc-result',
        state: 'CLOSED',
        first_event_at: '2026-10-03T12:03:00Z',
        last_event_at: '2026-10-03T12:07:00Z',
        started: { at: '2026-10-03T12:04:00Z' },
        close: { terminal: true, at: '2026-10-03T12:07:00Z', result_ref_or_null: 'result://durable' },
        productive_units: 1
      }
    ]
  }]
};

const out = compileActivityTimeline(runtime, root, '2026-10-03T12:15:00Z', 8);
assert.equal(out.schema, 'prometeo.activity-timeline/v1');
assert.equal(out.cycle.seconds, 1800);
assert.equal(out.cycle.human_burst_seconds, 300);
assert.match(out.cycle.meaning, /worker lifetime is not capped/i);
assert.equal(out.coverage.raw_prompt_text_public, false);
assert.equal(out.coverage.arbitrary_external_ai_sessions, 'UNOBSERVED_UNTIL_RECORDER_ADAPTER_EXISTS');
assert.equal(out.counts.planned_runs, 1);
assert.equal(out.events.filter(x => x.type === 'PLANNED').length, 5);

const launched = out.spans.find(x => x.actor_id === 'wc-launched');
const working = out.spans.find(x => x.actor_id === 'wc-working');
const oldActive = out.spans.find(x => x.actor_id === 'wc-old-active');
const result = out.spans.find(x => x.actor_id === 'wc-result');
assert.equal(launched.status, 'LAUNCHED', 'LAUNCHED != OBSERVED_WORKING');
assert.equal(working.status, 'OBSERVED_WORKING');
assert.equal(oldActive.status, 'STALE', 'old ACTIVE != WORKING');
assert.equal(result.status, 'RESULT');
assert.ok(Date.parse(working.end_at) > Date.parse(fixturePacket.timeline_projection.human_observation_boundary_at), '25m/human boundary does not terminate worker');

const resultOnlyEvents = out.events.filter(x => x.actor_id === 'wc-result-only');
assert.deepEqual(resultOnlyEvents.map(x => x.type), ['RESULT'], 'RESULT != VERIFIED even if legacy outcome says VERIFIED without verification evidence');
const explicitEvents = out.events.filter(x => x.actor_id === 'wc-explicit').map(x => x.type);
assert.deepEqual(explicitEvents, ['RESULT','VERIFIED','CONSUMED'], 'VERIFIED != CONSUMED and both require explicit evidence');
assert.ok(out.events.every(x => !Object.hasOwn(x, 'raw_text')));

const pagePath = path.join(repoRoot, 'current-tree', 'control-v11', 'cycle', 'index.html');
const page = fs.readFileSync(pagePath, 'utf8');
const selectorMatch = page.match(/\/\* LAST_GOOD_SELECTOR_START \*\/([\s\S]*?)\/\* LAST_GOOD_SELECTOR_END \*\//);
assert.ok(selectorMatch, 'last-good selector helper missing');
const context = {};
vm.createContext(context);
vm.runInContext(`${selectorMatch[1]}; this.preferNewest = preferNewest;`, context);
const staleRemote = { generated_at: '2026-10-03T12:00:00Z', marker: 'remote-old' };
const newerCached = { generated_at: '2026-10-03T12:05:00Z', marker: 'cached-new' };
assert.equal(context.preferNewest(staleRemote, newerCached).model.marker, 'cached-new', 'last-good survives stale source');

fs.rmSync(root, { recursive: true, force: true });
console.log('PASS activity-timeline-v1 + PROMETEO-525 preparation');
