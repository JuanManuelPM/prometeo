#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { deriveHumanTimeLedger } = await import(pathToFileURL(path.join(root, 'scripts/human-time-ledger-v1.mjs')).href);

const openFixture = deriveHumanTimeLedger([
  { type:'HUMAN_ACTION_OBSERVED', at:'2026-10-01T10:00:00Z' },
  { type:'HUMAN_ACTION_REQUIRED', at:'2026-10-01T10:05:00Z', boundary_id:'need-capacity', classification:'NECESSARY_HUMAN_GATE', required_action:'launch 2 shells' },
  { type:'WORKER_SIGNAL', at:'2026-10-01T10:06:00Z' },
  { type:'WORKER_SIGNAL', at:'2026-10-01T10:07:00Z' }
], { asOf:'2026-10-01T10:10:00Z' });
assert.equal(openFixture.primary_chat.human_decision_required, true);
assert.equal(openFixture.primary_chat.human_idle_ms, 10 * 60_000, 'worker signals must not reset the human clock');
assert.equal(openFixture.scale_readiness.human_bottleneck.oldest_open_human_boundary_age_ms, 5 * 60_000);
assert.equal(openFixture.scale_readiness.human_bottleneck.human_boundary_wait_ms, 0, 'open intervals are not invented as completed wait');

const closedFixture = deriveHumanTimeLedger([
  { type:'HUMAN_ACTION_REQUIRED', at:'2026-10-01T11:00:00Z', boundary_id:'approval', classification:'NECESSARY_HUMAN_GATE', required_action:'approve promotion' },
  { type:'WORKER_SIGNAL', at:'2026-10-01T11:01:00Z' },
  { type:'HUMAN_ACTION_OBSERVED', at:'2026-10-01T11:03:00Z', boundary_id:'approval' },
  { type:'HUMAN_ACTION_REQUIRED', at:'2026-10-01T11:04:00Z', boundary_id:'manual-route', classification:'AVOIDABLE_HUMAN_HANDOFF', required_action:'copy a return between chats' },
  { type:'boundary_cleared', at:'2026-10-01T11:06:00Z', boundary_id:'manual-route' },
  { type:'EXTERNAL_UNOBSERVED', at:'2026-10-01T11:07:00Z', source_ref:'external-chat', reason:'no durable start/end pair' }
], { asOf:'2026-10-01T11:10:00Z' });
assert.equal(closedFixture.scale_readiness.human_bottleneck.human_round_trips, 1);
assert.equal(closedFixture.scale_readiness.human_bottleneck.unavoidable_human_gates, 1);
assert.equal(closedFixture.scale_readiness.human_bottleneck.avoidable_human_handoffs, 1);
assert.equal(closedFixture.scale_readiness.human_bottleneck.human_boundary_wait_ms, 5 * 60_000);
assert.equal(closedFixture.scale_readiness.human_bottleneck.human_action_wait_ms, 3 * 60_000);
assert.equal(closedFixture.scale_readiness.human_bottleneck.external_unobserved_count, 1);
assert.equal(closedFixture.scale_readiness.human_bottleneck.external_unobserved_duration_ms, null, 'external chat time must never be guessed');

const silenceFixture = deriveHumanTimeLedger([
  { type:'HUMAN_ACTION_OBSERVED', at:'2026-10-01T08:00:00Z' },
  { type:'WORKER_SIGNAL', at:'2026-10-01T09:59:00Z' }
], { asOf:'2026-10-01T10:00:00Z' });
assert.equal(silenceFixture.primary_chat.human_decision_required, false, 'human silence without an explicit boundary is not a bottleneck');
assert.equal(silenceFixture.scale_readiness.human_bottleneck.human_boundary_wait_ms, 0);
assert.equal(silenceFixture.scale_readiness.human_bottleneck.human_silence_is_bottleneck, false);

console.log('HUMAN_TIME_LEDGER_PASS');
