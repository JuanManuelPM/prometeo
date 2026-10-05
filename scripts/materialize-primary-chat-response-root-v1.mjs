#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compilePrimaryChatResponseFanout } from './primary-chat-response-fanout-v1.mjs';

export const PRIMARY_CHAT_PRIVATE_BINDING_SCHEMA='prometeo.primary-chat-private-context-binding-public/v1';
export const PRIMARY_CHAT_CANDIDATE_RETURN_SCHEMA='prometeo.primary-chat-response-candidate-return-public/v1';

const arr=value=>Array.isArray(value)?value:[];
const clone=value=>JSON.parse(JSON.stringify(value));
const uniq=values=>[...new Set(arr(values).map(value=>String(value||'').trim()).filter(Boolean))].sort();
const safeKey=value=>String(value||'').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96)||'request';
const RAW_KEYS=new Set(['text','raw_text','private_text','private_payload','prompt','transcript','messages','capture_transcripts','packet_token','return_token','asset_token']);

function forbiddenPath(value,prefix=''){
  if(!value||typeof value!=='object')return null;
  if(Array.isArray(value)){
    for(let i=0;i<value.length;i+=1){
      const hit=forbiddenPath(value[i],`${prefix}[${i}]`);
      if(hit)return hit;
    }
    return null;
  }
  for(const [key,child] of Object.entries(value)){
    const p=prefix?`${prefix}.${key}`:key;
    if(RAW_KEYS.has(String(key).toLowerCase()))return p;
    const hit=forbiddenPath(child,p);
    if(hit)return hit;
  }
  return null;
}

function cleanBinding(binding={}){
  if(binding?.schema!==PRIMARY_CHAT_PRIVATE_BINDING_SCHEMA)throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZER:PRIVATE_BINDING_SCHEMA_INVALID');
  const workItemId=String(binding.work_item_id||'').trim();
  const transport=String(binding.context_transport||'').trim();
  const lookup=binding.private_packet_lookup;
  const capabilities=uniq(binding.required_capabilities);
  if(!workItemId)throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZER:WORK_ITEM_ID_REQUIRED');
  if(!transport)throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZER:CONTEXT_TRANSPORT_REQUIRED');
  if(!lookup||typeof lookup!=='object'||Array.isArray(lookup))throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZER:PRIVATE_PACKET_LOOKUP_REQUIRED');
  if(!capabilities.includes('github_repository_write'))throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZER:GITHUB_WRITE_CAPABILITY_REQUIRED');
  const lookupCopy={};
  for(const key of ['project_id','table','resolver','key','value']){
    if(lookup[key]!==undefined&&lookup[key]!==null&&String(lookup[key]).trim())lookupCopy[key]=String(lookup[key]).trim().slice(0,320);
  }
  if(!lookupCopy.key||!lookupCopy.value)throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZER:PRIVATE_PACKET_LOOKUP_KEY_VALUE_REQUIRED');
  if(String(lookupCopy.value||'')!==workItemId)throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZER:PRIVATE_LOOKUP_WORK_ITEM_MISMATCH');
  return Object.freeze({
    schema:PRIMARY_CHAT_PRIVATE_BINDING_SCHEMA,
    work_item_id:workItemId,
    context_transport:transport,
    private_packet_lookup:lookupCopy,
    required_capabilities:capabilities,
    raw_text_public:false,
    resolution:'POST_CLAIM_ONLY'
  });
}

function jobFromCandidate({block,handoff,requestProjection,requestProjectionRef,privateBinding,rootContractRef}){
  const suffix=String(block.candidate_ordinal).padStart(2,'0');
  const requestKey=safeKey(requestProjection.request_id);
  const jobId=`portfolio-primary-chat-response-${requestKey}-c${suffix}`;
  const sourceRef=`coordination/portfolio/derived/prometeo-autonomous-growth/${jobId}.json`;
  const requiredCapabilities=uniq([...arr(block.required_capabilities),...privateBinding.required_capabilities]);
  return {
    schema:'prometeo.portfolio-derived-job/v1',
    job_id:jobId,
    dedupe_key:`prometeo:primary-chat:response:${requestProjection.request_id}:candidate:${block.candidate_ordinal}:v1`,
    project_id:'prometeo-autonomous-growth',
    campaign_id:'PROMETEO-PRIMARY-CHAT-INDEPENDENCE-V1',
    title:`Primary Chat · response candidate ${block.candidate_ordinal}/4 · ${requestProjection.request_id}`,
    kind:'primary_chat_response_candidate',
    value_class:'SYSTEM_MULTIPLIER',
    priority:979,
    seed_status:'ready',
    required_capabilities:requiredCapabilities,
    dependency_ids:[],
    consumer:block.consumer,
    mission:`After the ordinary atomic portfolio claim succeeds, resolve exactly work_item_id ${privateBinding.work_item_id} through the declared private adapter. Produce candidate ${block.candidate_ordinal}/4 for request ${requestProjection.request_id}; persist one durable sanitized ${PRIMARY_CHAT_CANDIDATE_RETURN_SCHEMA} RETURN. Do not publish raw prompt text and do not claim synthesis/final response authority.`,
    definition_of_done:[
      `One independently reconstructible candidate response exists for request ${requestProjection.request_id}, ordinal ${block.candidate_ordinal}.`,
      `RETURN schema is ${PRIMARY_CHAT_CANDIDATE_RETURN_SCHEMA}, request_id matches, candidate_ordinal=${block.candidate_ordinal}, durable=true and worker identity is recorded only by the actual claimant.`,
      'Private payload is resolved only after claim using the exact declared work_item_id and adapter.',
      'Public artifacts contain sanitized response/evidence only; raw private prompt, capture transcript and private tokens remain absent.',
      'Completion re-enters E8/SUBMIT_NEXT; four durable independent candidate returns are consumed by C006, not by the human.'
    ],
    evidence:uniq([
      ...arr(block.evidence_refs),
      requestProjectionRef,
      rootContractRef,
      sourceRef,
      'scripts/primary-chat-response-fanout-v1.mjs',
      'coordination/guide/PRIMARY_CHAT_RESPONSE_FANOUT_CONTRACT_V1.json',
      'coordination/workspaces/PAGE_CHANGE_WORKER_PROTOCOL_V1.md'
    ]),
    allowed_scope:uniq(block.allowed_scope),
    forbidden_scope:uniq([
      ...arr(block.forbidden_scope),
      'public raw/private prompt persistence',
      'pre-claim private packet lookup',
      'new scheduler/queue/CURRENT/authority',
      'single-worker final answer masquerading as multi-worker synthesis'
    ]),
    primary_chat_response:{
      schema:'prometeo.primary-chat-response-candidate-job-binding/v1',
      request_id:requestProjection.request_id,
      candidate_ordinal:block.candidate_ordinal,
      candidate_count_target:4,
      request_projection_ref:requestProjectionRef,
      expected_return_schema:PRIMARY_CHAT_CANDIDATE_RETURN_SCHEMA,
      counts_are_targets_not_claims:true,
      raw_text_public:false
    },
    private_context_binding:clone(privateBinding),
    compiled_dispatch_handoff:clone(handoff.packet),
    truth_boundary:'READY means claimable compiled candidate work only. It proves no worker ran and no response exists until an independently durable RETURN is written.'
  };
}

export function compilePrimaryChatResponseRootMaterialization({
  root_contract,
  root_contract_ref,
  request_projection,
  request_projection_ref,
  template_work_block_id,
  private_context_binding
}={}){
  const privateBinding=cleanBinding(private_context_binding);
  const fanout=compilePrimaryChatResponseFanout({
    root_contract,
    root_contract_ref,
    request_projection,
    request_projection_ref,
    template_work_block_id
  });
  if(fanout.pass!==true) return {pass:false,status:'FAIL',errors:fanout.errors||[]};
  if(String(request_projection?.request_id||'')!==String(fanout.response_fanout.request_id||'')){
    return {pass:false,status:'FAIL',errors:['REQUEST_ID_FANOUT_MISMATCH']};
  }
  const requestArtifact={
    schema:'prometeo.primary-chat-response-request-materialization/v1',
    request_id:request_projection.request_id,
    work_item_id:privateBinding.work_item_id,
    request_projection:clone(request_projection),
    request_projection_ref,
    compiled_dispatch_contract_ref:root_contract_ref,
    candidate_job_ids:fanout.candidate_blocks.map(block=>`portfolio-${block.block_id}`),
    candidate_count_target:4,
    counts_are_targets_not_claims:true,
    workers_claimed:0,
    returns_received:0,
    raw_text_public:false,
    authority:'EVIDENCE_ONLY_PORTFOLIO_PIN_REMAINS_EXECUTION_AUTHORITY'
  };
  const jobs=fanout.candidate_blocks.map((block,index)=>jobFromCandidate({
    block,
    handoff:fanout.handoffs[index],
    requestProjection:request_projection,
    requestProjectionRef:request_projection_ref,
    privateBinding,
    rootContractRef:root_contract_ref
  }));
  const serialized=JSON.stringify({requestArtifact,jobs});
  const leak=forbiddenPath({requestArtifact,jobs});
  if(leak) return {pass:false,status:'FAIL',errors:[`PUBLIC_MATERIALIZATION_FORBIDDEN_FIELD:${leak}`]};
  if(serialized.includes('PROMETEO_RESPONSE_REQUEST_V1 '))return {pass:false,status:'FAIL',errors:['PRIVATE_ENVELOPE_PREFIX_LEAK']};
  return {
    pass:true,
    status:'PASS',
    request_artifact:requestArtifact,
    jobs,
    fanout:fanout.response_fanout,
    compiled_contract:fanout.contract
  };
}

export function materializePrimaryChatResponseRoot({
  repo_root='.',
  root_contract,
  root_contract_ref,
  request_projection,
  request_projection_ref,
  template_work_block_id,
  private_context_binding
}={}){
  const compiled=compilePrimaryChatResponseRootMaterialization({
    root_contract,
    root_contract_ref,
    request_projection,
    request_projection_ref,
    template_work_block_id,
    private_context_binding
  });
  if(compiled.pass!==true)return compiled;
  const requestKey=safeKey(request_projection.request_id);
  const requestDir=path.join(repo_root,'coordination/portfolio/evidence/prometeo-autonomous-growth/primary-chat/requests',requestKey);
  fs.mkdirSync(requestDir,{recursive:true});
  const requestPath=path.join(requestDir,'REQUEST.json');
  fs.writeFileSync(requestPath,JSON.stringify(compiled.request_artifact,null,2)+'\n',{flag:'wx'});
  const jobPaths=[];
  for(const job of compiled.jobs){
    const jobPath=path.join(repo_root,'coordination/portfolio/derived/prometeo-autonomous-growth',job.job_id+'.json');
    fs.writeFileSync(jobPath,JSON.stringify(job,null,2)+'\n',{flag:'wx'});
    jobPaths.push(jobPath);
  }
  return {...compiled,request_path:requestPath,job_paths:jobPaths};
}

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'))}

export function runCli(argv=process.argv.slice(2)){
  const [repoRoot='.',requestPath,bindingPath]=argv;
  if(!requestPath||!bindingPath)throw new Error('usage: materialize-primary-chat-response-root-v1.mjs <repo-root> <request-projection.json> <private-binding-public.json>');
  const receiptPath=path.join(repoRoot,'coordination/guide/receipts/portfolio-guide-planner-universal-cognitive-block-v1/RECEIPT-DISPATCH-COMPILER-DOGFOOD-V1.json');
  const receipt=readJson(receiptPath);
  const root=receipt.compiled_dispatch_contract;
  const templateId=root?.capacity_plan?.ready_block_ids?.[0];
  const result=materializePrimaryChatResponseRoot({
    repo_root:repoRoot,
    root_contract:root,
    root_contract_ref:'coordination/guide/receipts/portfolio-guide-planner-universal-cognitive-block-v1/RECEIPT-DISPATCH-COMPILER-DOGFOOD-V1.json#compiled_dispatch_contract',
    request_projection:readJson(requestPath),
    request_projection_ref:path.relative(repoRoot,requestPath).replaceAll('\\','/'),
    template_work_block_id:templateId,
    private_context_binding:readJson(bindingPath)
  });
  if(result.pass!==true)throw new Error('PRIMARY_CHAT_ROOT_MATERIALIZATION_FAIL '+JSON.stringify(result.errors||[]));
  process.stdout.write(JSON.stringify({
    schema:'prometeo.primary-chat-response-root-materialization-result/v1',
    request_id:result.request_artifact.request_id,
    request_path:result.request_path,
    job_paths:result.job_paths,
    candidates_prepared:result.jobs.length,
    workers_claimed:0,
    raw_text_public:false
  },null,2)+'\n');
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{runCli()}catch(error){process.stderr.write(String(error?.stack||error)+'\n');process.exitCode=1}
}
