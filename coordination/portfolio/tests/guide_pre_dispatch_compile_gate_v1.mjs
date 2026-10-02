#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  COMPILED_DISPATCH_AUTHORITY,
  COMPILED_DISPATCH_SCHEMA,
  affectedBlocksForCorrection,
  classifyFailure,
  compileWorkBlockHandoff,
  deriveCapacityRequest,
  orphanAudit,
  validateCompiledDispatchContract
} from '../../../scripts/compiled-dispatch-contract-lib.mjs';
import { compileGuideDispatchSuccessor } from '../../../scripts/guide-recursive-successor-lib.mjs';

const baseOrganism = Object.freeze({
  app_ref: 'organism://prometeo-shell',
  chat_ref: 'chat-object-prometeo-chat-control-main',
  objective_ref: 'objective://prometeo-shell-apps-chats-organism-distributed-work',
  target_node_ref: 'node://target',
  owner_ref: 'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-guide-planner-universal-cognitive-block-v1.json',
  consumer_ref: 'guide-integrator://fixture'
});

function block(id, {deps = [], capability = [], target = id, consumer = 'guide-integrator://fixture', dispatchReady = true} = {}) {
  return {
    block_id: id,
    semantic_key: `fixture:${target}:v1`,
    new_worker_executable: true,
    input_refs: [`evidence://${id}`],
    output_contract: `artifact://${id}/result`,
    allowed_scope: [`scope://${id}`],
    forbidden_scope: ['raw-private-text', 'authority-promotion'],
    done_when: [`${id} observable acceptance passes`],
    evidence_refs: [`evidence://${id}`],
    required_capabilities: capability,
    consumer,
    dependency_ids: deps,
    dispatch_ready: dispatchReady,
    organism_refs: {...baseOrganism, target_node_ref: `node://${target}`, consumer_ref: consumer}
  };
}

function contract({depth = 'P0', blocks = [block('local')], edges = [], ready = null, live = 0, reserve = [], recovery = []} = {}) {
  const readyIds = ready ?? blocks.filter(item => item.dispatch_ready).map(item => item.block_id);
  const prepared = readyIds.length + reserve.length + recovery.length;
  return {
    schema: COMPILED_DISPATCH_SCHEMA,
    authority: COMPILED_DISPATCH_AUTHORITY,
    status: 'PASS',
    planning_depth: depth,
    intent: {
      requested: 'Compile intent into sufficient dispatchable work before asking for capacity.',
      observable_outcome: 'Every dispatched child is self-sufficient and capacity derives from compiled compatible units.',
      request_class: depth === 'P0' ? 'LOCAL' : 'CROSS_SYSTEM',
      non_goals: ['new scheduler', 'new queue', 'new CURRENT'],
      human_success_test: 'A fresh worker can execute its WorkBlock without chat history.'
    },
    organism: {
      app_ref: baseOrganism.app_ref,
      chat_ref: baseOrganism.chat_ref,
      objective_ref: baseOrganism.objective_ref,
      target_node_refs: blocks.map(item => item.organism_refs.target_node_ref),
      parent_refs: ['objective://root'],
      consumer_refs: [...new Set(blocks.map(item => item.consumer))],
      current_refs: ['coordination/workers/CURRENT_WORKER_REUSE_CONTRACT_V1.json'],
      candidate_refs: [],
      owner_refs: ['coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-guide-planner-universal-cognitive-block-v1.json'],
      artifact_refs: []
    },
    reuse_authority: {
      current_owner_ref: 'coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-guide-planner-universal-cognitive-block-v1.json',
      existing_mechanisms: ['CURRENT', 'allocator', 'PIN', 'Guide', 'Metabolism', 'E0-E9', 'POOL', 'recovery'],
      reuse: ['scripts/guide-recursive-successor-lib.mjs', 'coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md'],
      forbidden_duplicates: ['scheduler', 'queue', 'CURRENT', 'planner authority', 'Work Graph'],
      authority_projection_boundary: 'The contract is evidence/gating only; CURRENT/PIN/Work Graph retain execution authority.'
    },
    evidence: {
      known: ['Guide successor compilation already owns consumer/evidence/capability/recursion checks.'],
      unknown: [],
      evidence_refs: ['scripts/guide-recursive-successor-lib.mjs'],
      stale_refs: [],
      fresh_checks: ['HEAD reconciled before mutation'],
      truth_boundary: 'Harness proves deterministic gate semantics, not unattended shell invocation.'
    },
    impact: {
      mutate: ['Guide pre-dispatch compilation path'],
      preserve: ['CURRENT authority', 'PIN authority', 'privacy boundaries'],
      affected_node_refs: blocks.map(item => item.organism_refs.target_node_ref),
      security_privacy: ['raw/private text never enters public projection'],
      rollback_baseline: 'git parent of gate patch',
      scope_limit: 'Guide/Planner derived successor dispatch only.'
    },
    decomposition: {
      blocks,
      dependency_edges: edges,
      parallel_now: blocks.filter(item => item.dependency_ids.length === 0).map(item => item.block_id),
      serial_gates: edges.map(edge => `${edge.from}->${edge.to}`),
      precompilable_downstream: blocks.filter(item => item.dependency_ids.length > 0).map(item => item.block_id),
      fuse_blocks: [],
      useful_capacity: prepared
    },
    handoff_sufficiency: {
      all_children_new_worker_executable: true,
      packet_shape: 'compiled_dispatch_contract_ref+organism_node_refs+work_block',
      no_chat_history_required: true
    },
    qa_recovery: {
      qa_profile: depth === 'P0' ? 'STATIC_SELF_CHECK' : 'PRODUCER+INDEPENDENT_VERIFY+FAN_IN',
      self_checks: ['schema', 'scope', 'done_when'],
      independent_checks: ['consumer verifies output contract'],
      known_failure_branches: ['capability unavailable', 'dependency down', 'partial repair'],
      recovery: 'Rehydrate from durable compiled contract + WorkBlock; do not ask human for recap.',
      hard_boundary_condition: 'Only explicit authority/privacy/physical human action that no safe software path can satisfy.'
    },
    future_branches: {
      ON_PASS: ['consumer', 'closer'],
      ON_PARTIAL: ['known repair', 'integrator'],
      ON_FAIL: ['recovery', 'decompose around blocker'],
      ON_CORRECTION: ['invalidate affected descendants only'],
      ON_SCALE: ['recompute capacity from compiled ready units'],
      ON_DEPENDENCY_DOWN: ['siblings continue', 'repair/reallocation']
    },
    autonomy_closure: {
      autonomous_without_human: ['RETURN -> Integrator', 'Judge -> repair/successor', 'Metabolism -> frontier'],
      return_consumers: [...new Set(blocks.map(item => item.consumer))],
      closer: 'guide-integrator://fixture',
      done_condition: 'All blocking WorkBlocks consumed and independent QA passes.',
      successor_policy: 'Materialize only semantically deduped, compiled, consumer-bound successors.',
      telemetry: ['started_at', 'return', 'consumer disposition', 'capacity derivation'],
      orphan_check: 'Any artifact without APP/CHAT/OBJECTIVE/TARGET/OWNER/CONSUMER binding is non-promotable.'
    },
    capacity_plan: {
      ready_block_ids: readyIds,
      reserve_refs: reserve,
      recovery_refs: recovery,
      live_compatible_count: live,
      capacity_request: Math.max(0, prepared - live)
    }
  };
}

// A. local simple -> compact contract -> one self-sufficient block.
const local = contract();
assert.equal(validateCompiledDispatchContract(local).pass, true);
assert.equal(local.decomposition.blocks.length, 1);
const localPacket = compileWorkBlockHandoff(local, 'local', 'receipt://local#compiled_dispatch_contract');
assert.equal(localPacket.pass, true);
assert.equal(localPacket.packet.work_block.new_worker_executable, true);
assert.equal(Object.keys(localPacket.packet).sort().join(','), 'compiled_dispatch_contract_ref,organism_node_refs,work_block');

// B. complex multi-lane -> independent blocks + fan-in; worker identity cannot change semantics.
const complexBlocks = [
  block('producer', {target:'shell'}),
  block('verifier', {deps:['producer'], target:'shell-qa'}),
  block('integrator', {deps:['producer','verifier'], target:'organism-fanin'})
];
const complex = contract({
  depth: 'P3',
  blocks: complexBlocks,
  edges: [
    {from:'producer', to:'verifier'},
    {from:'producer', to:'integrator'},
    {from:'verifier', to:'integrator'}
  ],
  ready: ['producer'],
  live: 1
});
assert.equal(validateCompiledDispatchContract(complex).pass, true);
const producerPacketA = compileWorkBlockHandoff(complex, 'producer', 'receipt://complex#compiled_dispatch_contract');
const producerPacketB = compileWorkBlockHandoff(JSON.parse(JSON.stringify(complex)), 'producer', 'receipt://complex#compiled_dispatch_contract');
assert.deepEqual(producerPacketA.packet, producerPacketB.packet, 'same WorkBlock must be semantically stable across workers');

// C. human correction invalidates only affected descendants.
assert.deepEqual(affectedBlocksForCorrection(complex, ['verifier']), ['integrator','verifier']);
assert.deepEqual(affectedBlocksForCorrection(complex, ['producer']), ['integrator','producer','verifier']);

// D. dependency/capability failure keeps siblings conceptually available and follows ordered dispositions.
assert.equal(classifyFailure({capability_unavailable:true, recovery_available:true}), 'CAPABILITY_REALLOCATION');
assert.equal(classifyFailure({known_repair:true, capability_unavailable:true}), 'KNOWN_REPAIR');
assert.equal(classifyFailure({hard_boundary_proven:true}), 'HARD_BOUNDARY');

// E. REFILL N is impossible until N compatible prepared units exist.
const scale3 = contract({depth:'P3', blocks:[block('a'), block('b'), block('c')], ready:['a','b','c'], live:0});
assert.deepEqual(deriveCapacityRequest(scale3), {pass:true, capacity_request:3, prepared_units:3, live_compatible_count:0});
const lyingScale = JSON.parse(JSON.stringify(scale3));
lyingScale.capacity_plan.ready_block_ids = ['a','b'];
lyingScale.decomposition.useful_capacity = 2;
lyingScale.capacity_plan.capacity_request = 3;
const lyingResult = validateCompiledDispatchContract(lyingScale);
assert.equal(lyingResult.pass, false);
assert(lyingResult.errors.some(error => error.startsWith('CAPACITY:request_mismatch')));

// F. worker without history gets exact WorkBlock/done_when from minimal handoff.
assert.equal(localPacket.packet.work_block.done_when[0], 'local observable acceptance passes');
assert.equal(localPacket.packet.organism_node_refs.objective_ref, baseOrganism.objective_ref);

// G. semantic duplicate intent is rejected before dispatch.
const duplicate = contract({blocks:[block('a',{target:'same'}), block('b',{target:'same'})], ready:['a','b']});
const duplicateResult = validateCompiledDispatchContract(duplicate);
assert.equal(duplicateResult.pass, false);
assert(duplicateResult.errors.some(error => error.startsWith('E7:semantic_duplicate:')));

// H. orphan cannot promote.
const orphaned = contract();
delete orphaned.decomposition.blocks[0].organism_refs.consumer_ref;
assert.equal(orphanAudit(orphaned).promotion_ready, false);
assert.equal(validateCompiledDispatchContract(orphaned).pass, false);

// I. planner/worker death: durable serialized state is sufficient to resume; no chat required.
const reincarnated = JSON.parse(JSON.stringify(complex));
assert.equal(validateCompiledDispatchContract(reincarnated).pass, true);
assert.equal(compileWorkBlockHandoff(reincarnated, 'producer', 'receipt://complex#compiled_dispatch_contract').pass, true);

// Universal pre-dispatch wrapper: no PASS contract => no successor materialization.
const successorSpec = {
  work_block_id: 'local',
  root_ref: 'objective://root',
  parent_ref: 'receipt://parent',
  project_id: 'prometeo-autonomous-growth',
  dedupe_key: 'fixture:compiled-dispatch:local:v1',
  dependency_ids: [],
  gate: {kind:'COMPILED_DISPATCH_CONTRACT', outcome:'PASS'},
  consumer: 'guide-integrator://fixture',
  value_class: 'SYSTEM_MULTIPLIER',
  priority: 100,
  required_capabilities: [],
  evidence_refs: ['evidence://local'],
  target: 'node://local',
  problem: 'execute compiled local block',
  acceptance: ['local observable acceptance passes'],
  definition_of_done: ['local observable acceptance passes']
};
const blocked = compileGuideDispatchSuccessor(successorSpec, {root_ref:'objective://root', parent_ref:'receipt://parent'});
assert.equal(blocked.materialize, false);
assert.equal(blocked.stop_reason, 'COMPILED_DISPATCH_CONTRACT_REF_REQUIRED');
const allowed = compileGuideDispatchSuccessor(successorSpec, {
  root_ref:'objective://root',
  parent_ref:'receipt://parent',
  compiled_dispatch_contract: local,
  compiled_dispatch_contract_ref: 'receipt://local#compiled_dispatch_contract',
  created_at: '2026-10-02T01:30:00Z'
});
assert.equal(allowed.materialize, true);
assert.equal(allowed.compile_gate.status, 'PASS');
assert.equal(allowed.child.work_block_id, 'local');
assert.equal(allowed.child.compiled_dispatch_contract_ref, 'receipt://local#compiled_dispatch_contract');
assert.equal(allowed.child.organism_refs.objective_ref, baseOrganism.objective_ref);

console.log('GUIDE_PRE_DISPATCH_COMPILE_GATE_PASS');
console.log(JSON.stringify({
  A_local_block: 'PASS',
  B_multilane_fanin: 'PASS',
  C_correction_descendants: 'PASS',
  D_capability_reallocation: 'PASS',
  E_capacity_gate: 'PASS',
  F_fresh_worker_handoff: 'PASS',
  G_semantic_dedupe: 'PASS',
  H_orphan_audit: 'PASS',
  I_recovery_from_durable_state: 'PASS',
  scale_fixture_capacity_request: deriveCapacityRequest(scale3).capacity_request
}));
