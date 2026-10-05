#!/usr/bin/env node
import assert from 'node:assert/strict';
import {applyPageChangeFrontier} from '../../../scripts/apply-page-change-frontier.mjs';
import {buildClaimFrontier} from '../../../scripts/build-claim-frontier.mjs';

const now=Date.parse('2026-09-28T21:00:00Z');
const allocator={
  schema:'prometeo.fast-allocator/v3',
  generated_at:'2026-09-28T21:00:00Z',
  source_sha:'abc',
  preferred_order:['ready','queue_ready','role_ready','recovery'],
  ready:[],queue_ready:[],role_ready:[],recovery:[],batch_candidates:[]
};
const privateLiteral='THIS_MUST_NEVER_APPEAR';
const frontier={
  schema:'prometeo.page-change-worker-frontier/v1',
  generated_at:'2026-09-28T21:00:00Z',
  truth_boundary:'SANITIZED_DISCOVERY_ONLY_PRIVATE_PACKET_AFTER_CLAIM',
  items:[{
    work_item_id:'WI-TEST',
    opportunity_id:'page-change-WI-TEST',
    project_id:'prometeo-page-change',
    page_id:'spaces-lab',
    title:'Actualizar Spaces',
    mission:'Consumir packet privado postclaim y actualizar.',
    kind:'PRIMARY_CHAT_RESPONSE_ROOT',
    value_class:'SYSTEM_MULTIPLIER',
    priority:980,
    source_path:'coordination/workspaces/PAGE_CHANGE_WORKER_PROTOCOL_V1.md',
    required_capabilities:['github_repository_write','connected_supabase_prometeo'],
    forbidden_worker_ids:['builder-worker-1'],
    context_transport:'SUPABASE_CONNECTED_PROJECT',
    private_packet_lookup:{project_id:'catnohyouxqjjtseaueb',table:'prometeo_execution_packets',key:'work_item_id',value:'WI-TEST'},
    primary_chat_response_request:{
      schema:'prometeo.primary-chat-response-request-public-projection/v1',
      request_id:'rr-live-test',
      created_at:'2026-10-05T02:00:00Z',
      request_class:'ANSWER',
      priority:'HIGH',
      priority_trigger:'EXPLICIT_HUMAN_RESPONDER_ACTION',
      routing:'CURRENT_WORK_GRAPH',
      requested_candidate_count:4,
      requested_exam_count:2,
      requested_synthesizer_count:1,
      human_routing_actions_target:0,
      counts_are_targets_not_claims:true,
      raw_text_public:false,
      authority:'SANITIZED_DERIVED_REQUEST_ONLY',
      prompt:privateLiteral
    },
    return_path:'coordination/executions/WI-TEST/RETURN.json',
    expires_at:'2026-10-01T00:00:00Z',
    claim_path:'coordination/opportunities/claims/page-change-WI-TEST.json'
  }]
};
const merged=applyPageChangeFrontier(allocator,frontier,{now});
assert.equal(merged.page_change_frontier.status,'MERGED');
assert.equal(merged.page_change_frontier.count,1);
assert.equal(merged.queue_ready.length,1);
assert.equal(merged.queue_ready[0].claim_mode,'OPPORTUNITY_CLAIM_CREATE');
assert.equal(merged.queue_ready[0].work_item_id,'WI-TEST');
assert.equal(merged.queue_ready[0].kind,'PRIMARY_CHAT_RESPONSE_ROOT');
assert.equal(merged.queue_ready[0].priority,980);
assert.deepEqual(merged.queue_ready[0].required_capabilities,['github_repository_write','connected_supabase_prometeo']);
assert.deepEqual(merged.queue_ready[0].forbidden_worker_ids,['builder-worker-1']);
assert.equal(merged.queue_ready[0].primary_chat_response_request.request_id,'rr-live-test');
assert.equal(merged.queue_ready[0].primary_chat_response_request.schema,'prometeo.primary-chat-response-request-public-projection/v1');
assert.equal('prompt' in merged.queue_ready[0].primary_chat_response_request,false);

const compact=buildClaimFrontier(merged);
assert.equal(compact.candidate_count,1);
const c=compact.candidates[0];
assert.equal(c.work_item_id,'WI-TEST');
assert.equal(c.context_transport,'SUPABASE_CONNECTED_PROJECT');
assert.equal(c.private_packet_lookup.value,'WI-TEST');
assert.equal(c.primary_chat_response_request.request_id,'rr-live-test');
assert.equal(c.primary_chat_response_request.raw_text_public,false);
assert.equal(c.return_path,'coordination/executions/WI-TEST/RETURN.json');
assert.deepEqual(c.forbidden_worker_ids,['builder-worker-1']);
assert.ok(!JSON.stringify(compact).includes(privateLiteral));
assert.ok(!('packet_url' in c));
assert.ok(!('capture_transcripts' in c));

const expired=applyPageChangeFrontier(allocator,{...frontier,items:[{...frontier.items[0],expires_at:'2026-09-28T20:59:59Z'}]},{now});
assert.equal(expired.page_change_frontier.count,0);

const missingTransport=applyPageChangeFrontier(allocator,{...frontier,items:[{...frontier.items[0],context_transport:null}]},{now});
assert.equal(missingTransport.page_change_frontier.count,0,'private transport must be explicit; no hidden Supabase default');

const missingLookup=applyPageChangeFrontier(allocator,{...frontier,items:[{...frontier.items[0],private_packet_lookup:null}]},{now});
assert.equal(missingLookup.page_change_frontier.count,0,'private lookup must be explicit');

const alternate=applyPageChangeFrontier(allocator,{...frontier,items:[{
  ...frontier.items[0],
  work_item_id:'WI-ALT',
  opportunity_id:'page-change-WI-ALT',
  claim_path:'coordination/opportunities/claims/page-change-WI-ALT.json',
  required_capabilities:['github_repository_write','trusted_private_context_bridge'],
  context_transport:'TRUSTED_PRIVATE_CONTEXT_BRIDGE',
  private_packet_lookup:{resolver:'trusted-bridge-v1',key:'work_item_id',value:'WI-ALT'}
}]},{now});
assert.equal(alternate.page_change_frontier.count,1);
assert.equal(alternate.queue_ready[0].context_transport,'TRUSTED_PRIVATE_CONTEXT_BRIDGE');
assert.deepEqual(alternate.queue_ready[0].required_capabilities,['github_repository_write','trusted_private_context_bridge']);
assert.equal(alternate.queue_ready[0].private_packet_lookup.value,'WI-ALT');

const duplicate=applyPageChangeFrontier({...allocator,queue_ready:[merged.queue_ready[0]]},frontier,{now});
assert.equal(duplicate.page_change_frontier.count,0);

console.log('page_change_worker_frontier_v1 PASS');
