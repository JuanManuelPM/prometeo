#!/usr/bin/env node
import assert from 'node:assert/strict';
import { authorityGateEvents, canonicalizeHumanEvents, buildHumanTimeProjection } from '../../../scripts/apply-human-time-ledger.mjs';

const gatePath='coordination/portfolio/authority-gates/demo.json';
const gateRows=[{path:gatePath,doc:{schema:'prometeo.portfolio-authority-gate/v1',job_id:'demo',status:'OPEN',opened_at:'2026-10-01T10:00:00Z',required_authority:{requirement:'approve canonical binding'}}}];
const gateEvents=authorityGateEvents(gateRows);
assert.equal(gateEvents.length,1);
assert.equal(gateEvents[0].correlation_id,'authority-gate:demo');
assert.equal(gateEvents[0].evidence_ref,gatePath);

const duplicate={...gateEvents[0]};
const orphan={type:'HUMAN_ACTION_OBSERVED',at:'2026-10-01T10:02:00Z',boundary_id:'authority-gate:orphan',correlation_id:'authority-gate:orphan',evidence_ref:'coordination/inbox/messages/orphan.json'};
const canonical=canonicalizeHumanEvents([gateEvents[0],duplicate,orphan]);
assert.equal(canonical.events.length,1,'duplicate must merge and orphan close must not mutate ledger state');
assert.equal(canonical.duplicate_events_merged,1);
assert.equal(canonical.orphan_events.length,1,'orphan must be retained observably');
assert.equal(canonical.orphan_events[0].correlation_id,'authority-gate:orphan');

const projection=buildHumanTimeProjection({events:[gateEvents[0],duplicate,orphan,{type:'WORKER_SIGNAL',at:'2026-10-01T10:03:00Z',correlation_id:'worker:w1:start',evidence_ref:'coordination/workers/started/w1.json'}],asOf:'2026-10-01T10:05:00Z'});
assert.equal(projection.schema,'prometeo.human-time-ledger-projection/v1');
assert.equal(projection.primary_chat.human_decision_required,true);
assert.equal(projection.primary_chat.pending_human_actions.length,1);
assert.equal(projection.primary_chat.pending_human_actions[0].correlation_id,'authority-gate:demo');
assert.equal(projection.primary_chat.pending_human_actions[0].evidence_ref,gatePath);
assert.equal(projection.scale_readiness.human_bottleneck.open_human_boundaries,1);
assert.equal(projection.human_touch_budget.observed_required_actions,1);
assert.equal(projection.orphan_events.length,1);
assert.equal(projection.duplicate_events_merged,1);
assert.ok(projection.evidence_refs.includes(gatePath));
assert.ok(projection.evidence_refs.includes('coordination/workers/started/w1.json'));
assert.equal(projection.primary_chat.last_worker_signal_at,'2026-10-01T10:03:00Z');
assert.equal(projection.primary_chat.last_human_action_at,null,'worker activity must not impersonate human activity');
console.log('HUMAN_TIME_LEDGER_CONSUMER_WIRING_PASS');
