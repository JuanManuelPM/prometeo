#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { mergePrimaryChatMessages } from './lib/primary-chat-mirror-merge.mjs';
import { compilePrimaryChatResponseJudgeFanout, validateIndependentCandidateReturns } from './primary-chat-response-judge-v1.mjs';
import { synthesizePrimaryChatResponse, validateIndependentExamReturns } from './primary-chat-response-synthesis-v1.mjs';
import { compilePrimaryChatResponseProgress } from './primary-chat-response-progress-v1.mjs';

const CANDIDATE_SCHEMA='prometeo.primary-chat-response-candidate-return-public/v1';
const EXAM_SCHEMA='prometeo.primary-chat-response-exam-return-public/v1';
const JUDGE_CONTRACT_REF='coordination/guide/PRIMARY_CHAT_RESPONSE_JUDGE_CONTRACT_V1.json';
const THREAD_REL='coordination/portfolio/evidence/prometeo-autonomous-growth/CHAT_THREAD_MIRROR_CANARY_V1.json';
const RETURNS_ROOT_REL='coordination/portfolio/returns';
const DERIVED_ROOT_REL='coordination/portfolio/derived/prometeo-autonomous-growth';
const RESPONSE_STATE_ROOT_REL='coordination/portfolio/evidence/prometeo-autonomous-growth/primary-chat/response-state';

const arr=v=>Array.isArray(v)?v:[];
const clone=v=>JSON.parse(JSON.stringify(v));
const uniq=v=>[...new Set(arr(v).map(x=>String(x??'').trim()).filter(Boolean))].sort();
const safeKey=v=>String(v??'').replace(/[^A-Za-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,96)||'request';

function readJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function stableJson(value){return JSON.stringify(value,null,2)+'\n';}
function writeImmutableOrEqual(file,value){
  const next=stableJson(value);
  if(fs.existsSync(file)){
    const current=fs.readFileSync(file,'utf8');
    if(current!==next) throw new Error(`PRIMARY_CHAT_RESPONSE_IMMUTABLE_CONFLICT:${file}`);
    return false;
  }
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,next,{flag:'wx'});
  return true;
}
function writeReplaceIfChanged(file,value){
  const next=stableJson(value);
  if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')===next)return false;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,next);
  return true;
}

function responseReturnRows(repoRoot){
  const root=path.join(repoRoot,RETURNS_ROOT_REL);
  if(!fs.existsSync(root))return [];
  const rows=[];
  for(const dir of fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()&&x.name.startsWith('portfolio-primary-chat-response-')).sort((a,b)=>a.name.localeCompare(b.name))){
    const dirPath=path.join(root,dir.name);
    for(const entry of fs.readdirSync(dirPath,{withFileTypes:true}).filter(x=>x.isFile()&&/^RETURN-.*\.json$/i.test(x.name)).sort((a,b)=>a.name.localeCompare(b.name))){
      const rel=path.posix.join(RETURNS_ROOT_REL,dir.name,entry.name);
      try{
        const value=readJson(path.join(dirPath,entry.name));
        if((value?.schema===CANDIDATE_SCHEMA||value?.schema===EXAM_SCHEMA)&&String(value?.return_ref||'')===rel)rows.push({rel,value});
      }catch{}
    }
  }
  return rows;
}

function newestFirst(a,b){
  const at=Date.parse(a?.returned_at||'')||0, bt=Date.parse(b?.returned_at||'')||0;
  if(at!==bt)return bt-at;
  return String(b?.return_ref||'').localeCompare(String(a?.return_ref||''));
}

function validCandidateSelection(rows,requestId){
  const buckets=[1,2,3,4].map(n=>rows.filter(x=>Number(x.candidate_ordinal)===n).sort(newestFirst));
  if(buckets.some(x=>!x.length))return null;
  for(const a of buckets[0])for(const b of buckets[1])for(const c of buckets[2])for(const d of buckets[3]){
    const candidate=[a,b,c,d];
    if(validateIndependentCandidateReturns(candidate,requestId).pass)return candidate;
  }
  return null;
}

function validExamSelection(rows,requestId){
  const one=rows.filter(x=>Number(x.exam_ordinal)===1).sort(newestFirst);
  const two=rows.filter(x=>Number(x.exam_ordinal)===2).sort(newestFirst);
  for(const a of one)for(const b of two){
    const exams=[a,b];
    if(validateIndependentExamReturns(exams,requestId).pass)return exams;
  }
  return null;
}

function examTemplate(){
  return {
    block_id:'primary-chat-response-exam-template',
    semantic_key:'primary-chat:response:exam-template:v1',
    new_worker_executable:true,
    dispatch_ready:true,
    input_refs:[],
    output_contract:'prometeo.primary-chat-response-exam-return-public/v1',
    allowed_scope:['coordination/portfolio/'],
    forbidden_scope:['public raw/private prompt persistence','new scheduler/queue/CURRENT/authority'],
    done_when:['One durable independent exam RETURN is persisted.'],
    evidence_refs:[JUDGE_CONTRACT_REF],
    required_capabilities:['github_repository_write','repository_test_runtime'],
    consumer:'coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md#GUIDE_INTEGRATOR',
    dependency_ids:[],
    organism_refs:{
      target_node_ref:'organism://prometeo/primary-chat',
      owner_ref:'coordination/guide/PRIMARY_CHAT_RESPONSE_JUDGE_CONTRACT_V1.json',
      app_ref:'current-tree/control-v11/chat-canary/',
      chat_ref:'chat-object-prometeo-chat-control-main',
      objective_ref:'objective://prometeo/primary-chat-live-response'
    }
  };
}

function jobFromExamBlock(block){
  const requestId=String(block.request_id);
  const suffix=String(block.exam_ordinal).padStart(2,'0');
  const jobId=`portfolio-primary-chat-response-${safeKey(requestId)}-exam-${suffix}`;
  const sourceRef=`${DERIVED_ROOT_REL}/${jobId}.json`;
  return {
    schema:'prometeo.portfolio-derived-job/v1',
    job_id:jobId,
    dedupe_key:`prometeo:primary-chat:response:${requestId}:exam:${block.exam_ordinal}:v1`,
    project_id:'prometeo-autonomous-growth',
    campaign_id:'PROMETEO-PRIMARY-CHAT-INDEPENDENCE-V1',
    title:`Primary Chat · response exam ${block.exam_ordinal}/2 · ${requestId}`,
    kind:'primary_chat_response_exam',
    value_class:'SYSTEM_MULTIPLIER',
    priority:980,
    seed_status:'ready',
    required_capabilities:uniq(block.required_capabilities),
    dependency_ids:[],
    consumer:block.consumer,
    mission:`Independently judge all four durable sanitized candidate RETURN refs for request ${requestId}. Persist exactly one durable ${EXAM_SCHEMA} RETURN for exam ${block.exam_ordinal}/2 with a ranking permutation 1..4. Do not publish raw/private prompt text and do not claim final-response authority.`,
    definition_of_done:[
      ...arr(block.done_when),
      `RETURN schema=${EXAM_SCHEMA}, request_id=${requestId}, exam_ordinal=${block.exam_ordinal}.`,
      'RETURN records the actual claimant worker_id, its durable return_ref, durable_return=true, raw_text_public=false, outcome=VERIFIED|DONE|PASS, ranking as a permutation of 1..4, and sanitized evidence refs.',
      'Completion re-enters E8/SUBMIT_NEXT; final synthesis remains deterministic C007 work after two independent exam RETURNs.'
    ],
    evidence:uniq([...arr(block.evidence_refs),sourceRef,'scripts/primary-chat-response-judge-v1.mjs']),
    allowed_scope:uniq(block.allowed_scope),
    forbidden_scope:uniq(block.forbidden_scope),
    primary_chat_response:{
      schema:'prometeo.primary-chat-response-exam-job-binding/v1',
      request_id:requestId,
      exam_ordinal:block.exam_ordinal,
      exam_count_target:2,
      candidate_count_observed:4,
      candidate_return_refs:clone(block.runtime_binding?.candidate_return_refs||[]),
      expected_return_schema:EXAM_SCHEMA,
      counts_are_targets_not_claims:true,
      raw_text_public:false
    },
    truth_boundary:'READY means ordinary claimable exam work only. Atomic allocator/PIN remains execution authority; this file proves no worker ran and no exam RETURN exists.'
  };
}

function deterministicTimestamp(rows,requestId){
  const times=rows.map(x=>Date.parse(x?.returned_at||'')).filter(Number.isFinite);
  if(times.length)return new Date(Math.max(...times)).toISOString();
  const hit=String(requestId).match(/(\d{8}T\d{6}Z)/);
  if(hit){
    const s=hit[1];
    const iso=`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(9,11)}:${s.slice(11,13)}:${s.slice(13,15)}Z`;
    if(Number.isFinite(Date.parse(iso)))return new Date(iso).toISOString();
  }
  return '1970-01-01T00:00:00.000Z';
}

function finalMessage(thread,finalResponse,finalRef,when){
  const rich=finalResponse.rich_response;
  const prose=arr(rich?.prose).map(x=>String(x??'').trim()).filter(Boolean);
  return {
    message_id:`MSG-PROMETEO-RESPONSE-${safeKey(finalResponse.request_id)}`,
    chat_object_id:thread.chat_object_id,
    actor_type:'ASSISTANT',
    actor_ref:'PROMETEO_GUIDE_CURRENT',
    source_surface:'PROMETEO',
    input_origin:'GUIDE_AUTOMATIC_RETURN_FANIN',
    body_kind:'TEXT',
    body_text:prose.join('\n\n')||'Respuesta integrada disponible.',
    created_at:when,
    published_at:when,
    status:'PUBLISHED',
    request_id:finalResponse.request_id,
    result_ref:finalRef,
    evidence_refs:uniq(finalResponse.evidence_refs),
    rich_response:clone(rich),
    privacy:'PUBLIC_SANITIZED_CANARY'
  };
}

export function advancePrimaryChatResponsePipeline({repo_root='.'}={}){
  const rows=responseReturnRows(repo_root);
  const byRequest=new Map();
  for(const {value} of rows){
    const requestId=String(value?.request_id??'').trim();
    if(!requestId)continue;
    if(!byRequest.has(requestId))byRequest.set(requestId,{candidates:[],exams:[]});
    byRequest.get(requestId)[value.schema===CANDIDATE_SCHEMA?'candidates':'exams'].push(value);
  }

  const threadPath=path.join(repo_root,THREAD_REL);
  let thread=readJson(threadPath);
  const report={schema:'prometeo.primary-chat-response-pipeline-advance/v1',requests_seen:byRequest.size,exam_jobs_created:0,final_responses_created:0,thread_messages_added:0,requests:[]};

  for(const requestId of [...byRequest.keys()].sort()){
    const group=byRequest.get(requestId);
    const candidates=validCandidateSelection(group.candidates,requestId);
    let examJobs=[];
    if(candidates){
      const compiled=compilePrimaryChatResponseJudgeFanout({request_id:requestId,candidate_returns:candidates,exam_template:examTemplate(),judge_contract_ref:JUDGE_CONTRACT_REF});
      if(compiled.pass!==true)throw new Error(`PRIMARY_CHAT_RESPONSE_JUDGE_COMPILE_FAILED:${requestId}:${(compiled.errors||[]).join(',')}`);
      examJobs=compiled.exam_blocks.map(jobFromExamBlock);
      for(const job of examJobs){
        const file=path.join(repo_root,DERIVED_ROOT_REL,`${job.job_id}.json`);
        if(writeImmutableOrEqual(file,job))report.exam_jobs_created+=1;
      }
    }

    const exams=validExamSelection(group.exams,requestId);
    let finalResponse=null, finalRef=null;
    if(candidates&&exams){
      const synthesis=synthesizePrimaryChatResponse({request_id:requestId,candidate_returns:candidates,exam_returns:exams});
      if(synthesis.pass!==true)throw new Error(`PRIMARY_CHAT_RESPONSE_SYNTHESIS_FAILED:${requestId}:${(synthesis.errors||[]).join(',')}`);
      const stateDir=path.posix.join(RESPONSE_STATE_ROOT_REL,safeKey(requestId));
      finalRef=path.posix.join(stateDir,'FINAL_RESPONSE.json');
      const when=deterministicTimestamp([...candidates,...exams],requestId);
      finalResponse={...clone(synthesis.final_response),durable_return:true,return_ref:finalRef,synthesized_at:when};
      if(writeImmutableOrEqual(path.join(repo_root,finalRef),finalResponse))report.final_responses_created+=1;
      const merged=mergePrimaryChatMessages(thread,[finalMessage(thread,finalResponse,finalRef,when)]);
      thread=merged.thread;
      report.thread_messages_added+=merged.added;
    }

    const progress=compilePrimaryChatResponseProgress({request_id:requestId,candidate_returns:group.candidates,exam_returns:group.exams,synthesis_return:finalResponse});
    const progressRef=path.posix.join(RESPONSE_STATE_ROOT_REL,safeKey(requestId),'PROGRESS.json');
    if(progress.pass===true)writeReplaceIfChanged(path.join(repo_root,progressRef),progress.progress);
    report.requests.push({request_id:requestId,candidates_valid:Boolean(candidates),candidate_returns_observed:group.candidates.length,exam_jobs_ready:examJobs.length,exams_valid:Boolean(exams),exam_returns_observed:group.exams.length,final_response_ready:Boolean(finalResponse),progress_ref:progressRef,...(finalRef?{final_response_ref:finalRef}:{})});
  }

  const current=fs.readFileSync(threadPath,'utf8');
  const next=stableJson(thread);
  if(current!==next)fs.writeFileSync(threadPath,next);
  return report;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const result=advancePrimaryChatResponsePipeline({repo_root:process.argv[2]||'.'});
  console.log(JSON.stringify(result,null,2));
}
