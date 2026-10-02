#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  COMPILED_DISPATCH_AUTHORITY,
  COMPILED_DISPATCH_SCHEMA,
  compileSpecificationAssurance,
  validateCompiledDispatchContract
} from '../../../scripts/compiled-dispatch-contract-lib.mjs';
import {
  MECHANICAL_ENFORCEMENT_SCHEMA,
  validateMechanicalEnforcement
} from '../../../scripts/compiled-dispatch-mechanical-enforcement-lib.mjs';

const fixturePath = new URL('./fixtures/agentic_adversarial_correction_benchmark_v1.json', import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const requiredClasses = [
  'ORGANISM_BINDING','MECHANICAL_ENFORCEMENT','NO_HUMAN_DISPATCH','PRE_DISPATCH_SUFFICIENCY',
  'CONTEXTUAL_QUESTION_GENERATION','ADVERSARIAL_FIDELITY','NO_MANUAL_MEGAPROMPT_LOOP',
  'AGENTIC_MISSION_GRANULARITY','DYNAMIC_CHILD_SUBCOMPILE','CAPACITY_AFTER_READY_FRONTIER',
  'NO_FAKE_CONTINUATION_GATE','LOCAL_SUCCESS_NOT_SYSTEM_SUCCESS'
];
const baseOrganism = Object.freeze({
  app_ref:'organism://prometeo-shell',
  chat_ref:'chat-object://control',
  objective_ref:'objective://agentic-benchmark',
  target_node_ref:'node://benchmark-target',
  owner_ref:'coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md#GUIDE_PLANNER',
  consumer_ref:'coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md#GUIDE_INTEGRATOR'
});

function baseContract(){
  const block={
    block_id:'benchmark-block',
    semantic_key:'benchmark:agentic-correction:v1',
    new_worker_executable:true,
    input_refs:['evidence://sanitized-input'],
    output_contract:'evidence://benchmark-output',
    allowed_scope:['coordination/portfolio/tests/**'],
    forbidden_scope:['raw-private-text','authority-promotion'],
    done_when:['observable benchmark acceptance passes'],
    evidence_refs:['scripts/compiled-dispatch-contract-lib.mjs'],
    required_capabilities:[],
    consumer:baseOrganism.consumer_ref,
    dependency_ids:[],
    dispatch_ready:true,
    organism_refs:{...baseOrganism}
  };
  return {
    schema:COMPILED_DISPATCH_SCHEMA,
    authority:COMPILED_DISPATCH_AUTHORITY,
    status:'PASS',
    planning_depth:'P1',
    intent:{
      requested:'Compile bounded agentic work without losing human intent.',
      observable_outcome:'A fresh worker executes the bounded mission and durable system evidence verifies the result.',
      request_class:'CROSS_SYSTEM',
      non_goals:['new scheduler','raw private prompt persistence'],
      human_success_test:'A reviewer can verify the durable result and system-boundary evidence.'
    },
    organism:{
      app_ref:baseOrganism.app_ref,
      chat_ref:baseOrganism.chat_ref,
      objective_ref:baseOrganism.objective_ref,
      target_node_refs:[baseOrganism.target_node_ref],
      parent_refs:['objective://root'],
      consumer_refs:[baseOrganism.consumer_ref],
      current_refs:['coordination/workers/CURRENT_WORKER_REUSE_CONTRACT_V1.json'],
      candidate_refs:[],
      owner_refs:[baseOrganism.owner_ref],
      artifact_refs:[]
    },
    reuse_authority:{
      current_owner_ref:baseOrganism.owner_ref,
      existing_mechanisms:['CURRENT','allocator','PIN','Guide','Metabolism','E0-E9'],
      reuse:['scripts/compiled-dispatch-contract-lib.mjs'],
      forbidden_duplicates:['scheduler','queue','CURRENT','planner authority'],
      authority_projection_boundary:'Evidence gate only; Work Graph/PIN/CURRENT retain authority.'
    },
    evidence:{
      known:['sanitized benchmark fixture'],unknown:[],
      evidence_refs:['scripts/compiled-dispatch-contract-lib.mjs'],
      stale_refs:[],fresh_checks:['current source inspected'],truth_boundary:'Benchmark evidence only.'
    },
    impact:{
      mutate:['test fixture only'],preserve:['routing authority','privacy boundary'],
      affected_node_refs:[baseOrganism.target_node_ref],security_privacy:['no raw private conversation'],
      rollback_baseline:'git parent',scope_limit:'bounded verification benchmark'
    },
    decomposition:{
      blocks:[block],dependency_edges:[],parallel_now:['benchmark-block'],serial_gates:[],
      precompilable_downstream:[],fuse_blocks:[],useful_capacity:1
    },
    handoff_sufficiency:{
      all_children_new_worker_executable:true,
      packet_shape:'compiled_dispatch_contract_ref+organism_node_refs+work_block',
      no_chat_history_required:true
    },
    qa_recovery:{
      qa_profile:'STATIC_SELF_CHECK',self_checks:['schema','scope','done_when'],
      independent_checks:['consumer verifies output'],known_failure_branches:['repair','recovery'],
      recovery:'Rehydrate from durable contract; no human recap.',
      hard_boundary_condition:'Only real authority/privacy/physical boundary.'
    },
    future_branches:{
      ON_PASS:['consumer'],ON_PARTIAL:['known repair'],ON_FAIL:['recovery'],
      ON_CORRECTION:['invalidate affected descendants'],ON_SCALE:['derive capacity from ready units'],
      ON_DEPENDENCY_DOWN:['continue siblings']
    },
    autonomy_closure:{
      autonomous_without_human:['RETURN -> Integrator','Integrator -> successor/repair'],
      return_consumers:[baseOrganism.consumer_ref],closer:baseOrganism.consumer_ref,
      done_condition:'Benchmark result consumed and QA passes.',
      successor_policy:'Only compiled, deduped, consumer-bound successors materialize.',
      mechanical_enforcement:{
        schema:MECHANICAL_ENFORCEMENT_SCHEMA,
        gates:[{
          gate_id:'SUCCESSOR_MATERIALIZATION',
          validator_ref:'scripts/guide-recursive-successor-lib.mjs',
          fail_closed:true,
          before_claim_ready:true,
          failure_codes:['MECHANICAL_SUCCESSOR_GATE_MISSING']
        }]
      },
      telemetry:['started_at','return'],orphan_check:'All six organism bindings required.'
    },
    capacity_plan:{
      ready_block_ids:['benchmark-block'],reserve_refs:[],recovery_refs:[],
      live_compatible_count:0,capacity_request:1
    }
  };
}

function applyBaselineMutation(contract,mutation){
  switch(mutation){
    case'NONE':return;
    case'DELETE_BLOCK_ORGANISM_APP_REF':delete contract.decomposition.blocks[0].organism_refs.app_ref;return;
    case'PROSE_ONLY_SUCCESSOR_POLICY':
      contract.autonomy_closure.successor_policy='Please remember to enforce the important rule described elsewhere.';
      delete contract.autonomy_closure.mechanical_enforcement;
      return;
    case'EMPTY_AUTONOMOUS_WITHOUT_HUMAN':contract.autonomy_closure.autonomous_without_human=[];return;
    case'EMPTY_BLOCK_INPUT_REFS':contract.decomposition.blocks[0].input_refs=[];return;
    case'REQUIRE_CHAT_HISTORY':contract.handoff_sufficiency.no_chat_history_required=false;return;
    case'PROSE_CHILD_DIRECT_MATERIALIZATION':contract.autonomy_closure.successor_policy='Runtime children may materialize directly when useful.';return;
    case'INFLATE_CAPACITY_REQUEST':contract.capacity_plan.capacity_request=2;return;
    case'EMPTY_ON_PASS_BRANCH':contract.future_branches.ON_PASS=[];return;
    default:throw new Error(`unknown baseline mutation: ${mutation}`);
  }
}

assert.equal(fixture.schema,'prometeo.agentic-adversarial-correction-fixture/v1');
assert.equal(fixture.sanitization.raw_private_conversation,false);
assert.equal(fixture.sanitization.hidden_reasoning,false);
assert.equal(fixture.cases.length,requiredClasses.length);
assert.deepEqual(
  [...new Set(fixture.cases.map(item=>item.runtime_correction_class))].sort(),
  [...requiredClasses].sort()
);
assert.equal(new Set(fixture.cases.map(item=>item.case_id)).size,fixture.cases.length);
for(const item of fixture.cases){
  assert.equal(typeof item.acceptance,'string');
  assert(item.acceptance.length>20,`${item.case_id}: observable acceptance required`);
  assert(Array.isArray(item.evidence_refs)&&item.evidence_refs.length>0,`${item.case_id}: durable evidence refs required`);
  assert.equal(item.evidence_refs.some(ref=>/chat-sessions|private|prompt-body/i.test(ref)),false,`${item.case_id}: private/raw evidence ref forbidden`);
}
assert.equal(validateCompiledDispatchContract(baseContract()).pass,true,'benchmark base contract must be structurally valid');
assert.equal(validateMechanicalEnforcement(baseContract()).pass,true,'benchmark base contract must have executable mechanical enforcement');

const results=[];
let falsePositiveConstraints=0;
let falsePositiveViolations=0;
for(const item of fixture.cases){
  const contract=baseContract();
  applyBaselineMutation(contract,item.baseline_mutation);
  const structuralValidation=validateCompiledDispatchContract(contract);
  const mechanicalValidation=validateMechanicalEnforcement(contract);
  const baselineAnticipated=structuralValidation.pass===false||mechanicalValidation.pass===false;
  const assurance=compileSpecificationAssurance(contract,item.specification_signals);
  const emittedIds=assurance.questions.map(question=>question.id);
  const expectedIds=item.spec_detection_question_ids;
  const specificationAnticipated=expectedIds.length>0&&expectedIds.every(id=>emittedIds.includes(id));
  if(expectedIds.length>0){
    falsePositiveConstraints+=expectedIds.length;
    const negativeIds=compileSpecificationAssurance(baseContract(),{}).questions.map(question=>question.id);
    for(const id of expectedIds)if(negativeIds.includes(id))falsePositiveViolations+=1;
  }
  results.push({
    case_id:item.case_id,
    runtime_correction_class:item.runtime_correction_class,
    baseline_anticipated:baselineAnticipated,
    specification_assurance_anticipated:specificationAnticipated,
    anticipated_before_dispatch:baselineAnticipated||specificationAnticipated,
    baseline_errors:[...structuralValidation.errors,...mechanicalValidation.errors],
    mechanical_enforcement_errors:mechanicalValidation.errors,
    emitted_spec_question_ids:emittedIds
  });
}
const baselineCount=results.filter(item=>item.baseline_anticipated).length;
const specificationCount=results.filter(item=>item.specification_assurance_anticipated).length;
const combinedCount=results.filter(item=>item.anticipated_before_dispatch).length;
const missed=results.filter(item=>!item.anticipated_before_dispatch).map(item=>item.runtime_correction_class);
const summary={
  benchmark_id:fixture.benchmark_id,
  correction_classes_total:results.length,
  baseline_anticipated_before_dispatch:baselineCount,
  specification_assurance_anticipated_before_dispatch:specificationCount,
  anticipated_before_dispatch:combinedCount,
  missed,
  false_positive_constraints:{tested:falsePositiveConstraints,violated:falsePositiveViolations},
  results
};
assert.equal(falsePositiveViolations,0,'contextual questions must not fire in negative controls');
assert(combinedCount>baselineCount,'Specification Assurance must add pre-dispatch coverage beyond the structural baseline');
assert(combinedCount<results.length,'benchmark must expose residual shared misses instead of manufacturing a perfect score');
assert.deepEqual(
  missed.sort(),
  ['DYNAMIC_CHILD_SUBCOMPILE','NO_FAKE_CONTINUATION_GATE','NO_HUMAN_DISPATCH'].sort(),
  'mechanical enforcement must leave the miss set while unrelated residual misses remain visible'
);
console.log('AGENTIC_ADVERSARIAL_CORRECTION_BENCHMARK_PASS');
console.log(JSON.stringify(summary,null,2));
