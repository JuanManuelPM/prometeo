import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const reuse = readJson('coordination/workers/CURRENT_WORKER_REUSE_CONTRACT_V1.json');
const metabolism = readJson('coordination/guide/METABOLISM_POLICY_V1.json');
const pipeline = readJson('coordination/workers/WORKER_PIPELINE_V1.json');
const primary = readJson('coordination/guide/PRIMARY_CHAT_STATE_COMMUNICATION_CONTRACT_V1.json');
const journal = readJson('coordination/chat-sessions/CHAT-PROMETEO-PRIMARY-20261001T234400Z-S07/JOURNAL.json');
const guide = readText('coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md');

const reuseLaw = reuse.laws.find(x => x.id === 'MECHANICAL_CONTINUATION_GATE');
assert.ok(reuseLaw, 'binding worker reuse contract must ratchet mechanical continuation vs human gates');
assert.match(reuseLaw.rule, /known mechanical next transition MUST continue/i);
assert.match(reuseLaw.rule, /local blocked\/waiting unit/i);
assert.match(reuseLaw.rule, /prepared compatible useful work MUST project REFILL_N/i);

const gate = metabolism.mechanical_continuation_gate;
assert.equal(gate?.status, 'BINDING_CANARY');
assert.match(gate.machine_transitions.PASS_WITH_KNOWN_NEXT, /never require a human dot\/continue message/i);
assert.match(gate.machine_transitions.RETURN_WITH_CONSUMER, /GUIDE_INTEGRATOR\/fan-in consumer/i);
assert.match(gate.machine_transitions.RETURN_WITHOUT_CONSUMER, /do not turn missing consumption into a human courier request/i);
assert.match(gate.machine_transitions.COUNTED_RESIDENT_RETURN, /E8\/SUBMIT_NEXT/i);
assert.match(gate.machine_transitions.LOCAL_BLOCK_WITH_INDEPENDENT_SIBLINGS, /local wait is not a global stop/i);
assert.match(gate.machine_transitions.ZERO_LIVE_READY_WORK, /REFILL_N only when prepared compatible useful work exists/i);
assert.match(gate.no_prepared_work_rule, /do not project REFILL/i);
assert.match(gate.silence_rule, /never a blocking condition/i);

const e8 = pipeline.stages.find(x => x.id === 'E8_REALLOCATE');
assert.ok(e8);
assert.match(e8.goal, /without new human routing/i);
assert.match(metabolism.rotation.after_any_return, /continue with the highest-value role/i);
assert.ok(metabolism.rotation.stop_only_when.some(x => /true human decision\/acceptance boundary/i.test(x)));

assert.match(guide, /GUIDE_INTEGRATOR` consumes results incrementally/i);
assert.match(guide, /avoid sending the result back to the human/i);
assert.match(guide, /There is no one-guide-task stopping rule/i);

assert.match(primary.state_rules.RETURNS_UNCONSUMED, /live_worker_count > 0; without a live consumer, do not suppress REFILL_N/i);
assert.match(primary.state_rules.RECOVERY_PRESSURE, /live_worker_count > 0; without a live consumer, do not suppress REFILL_N/i);
assert.match(primary.state_rules.REFILL_N, /claimable_generic_count \+ claimable_specialized_count\) > 0/i);
assert.equal(primary.state_rules.NO_SAFE_WORK, 'otherwise');
assert.match(primary.human_boundary_wait.starts_only_on, /explicit durable state requiring one specific human action/i);
assert.equal(primary.human_boundary_wait.human_silence_alone, 'NOT_A_BOTTLENECK');

const byId = Object.fromEntries(journal.entries.map(x => [x.entry_id, x]));
assert.match(byId.J002?.next_action || '', /first human dot/i, 'recent evidence must preserve the unnecessary continuation wait that motivated the audit');
assert.match(byId.J003?.next_action || '', /second human dot/i, 'recent evidence must preserve the second unnecessary continuation wait');
assert.match(byId.J004?.human_intent_summary || '', /autonomously after the second dot/i, 'later execution must prove those steps were mechanically continuable');
assert.match(byId.J004?.assistant_conclusion || '', /REFILL_N/i, 'zero-live ready-work repair must remain explicit in recent evidence');

const cases = [
  ['unnecessary_human_continuation', gate.machine_transitions.PASS_WITH_KNOWN_NEXT.includes('never require a human dot/continue message')],
  ['pass_auto_continue', /PASS_WITH_KNOWN_NEXT/.test(Object.keys(gate.machine_transitions).join(' '))],
  ['local_vs_global_wait', gate.machine_transitions.LOCAL_BLOCK_WITH_INDEPENDENT_SIBLINGS.includes('not a global stop')],
  ['return_without_consumer', gate.machine_transitions.RETURN_WITHOUT_CONSUMER.includes('independent work moving')],
  ['zero_live_ready_work', primary.state_rules.REFILL_N.includes('capacity_gap > 0') && primary.state_rules.REFILL_N.includes('> 0')],
  ['no_prepared_work_no_refill', primary.state_rules.NO_SAFE_WORK === 'otherwise' && gate.no_prepared_work_rule.includes('do not project REFILL')),
  ['real_human_boundary', gate.human_wait_requires_one_of.length >= 3 && primary.human_boundary_wait.human_silence_alone === 'NOT_A_BOTTLENECK'],
  ['resident_submit_next', gate.machine_transitions.COUNTED_RESIDENT_RETURN.includes('E8/SUBMIT_NEXT') && /without new human routing/i.test(e8.goal)],
  ['return_with_consumer', gate.machine_transitions.RETURN_WITH_CONSUMER.includes('GUIDE_INTEGRATOR') && /avoid sending the result back to the human/i.test(guide)]
];

for (const [name, pass] of cases) assert.equal(pass, true, `${name} continuation case failed`);

console.log(JSON.stringify({
  ok: true,
  cases: Object.fromEntries(cases),
  artificial_wait_evidence: ['S07:J002:first-human-dot', 'S07:J003:second-human-dot'],
  genuine_human_boundary_evidence: ['explicit durable human decision', 'Human Acceptance/promotion/taste/irreversible authority', 'external capacity launch with zero live + prepared compatible work'],
  owners_reused: ['METABOLISM_POLICY_V1', 'GUIDE_INTEGRATOR', 'WORKER_PIPELINE_E8', 'PRIMARY_CHAT_STATE_COMMUNICATION_CONTRACT_V1']
}, null, 2));
