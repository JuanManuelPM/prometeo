#!/usr/bin/env node
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const arr=v=>Array.isArray(v)?v:[];
const uniq=v=>[...new Set(arr(v).filter(Boolean).map(String))];
const parseTime=v=>Date.parse(v||'')||0;

function normalizePrimaryChatResponseRequest(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  if(value.schema!=='prometeo.primary-chat-response-request-public-projection/v1')return null;
  const requestId=String(value.request_id||'').trim();
  if(!requestId||String(value.routing||'')!=='CURRENT_WORK_GRAPH'||String(value.priority||'')!=='HIGH')return null;
  if(Number(value.requested_candidate_count)!==4||value.counts_are_targets_not_claims!==true||value.raw_text_public!==false)return null;
  return {
    schema:'prometeo.primary-chat-response-request-public-projection/v1',
    request_id:requestId.slice(0,160),
    created_at:value.created_at?String(value.created_at).slice(0,64):null,
    request_class:'ANSWER',
    priority:'HIGH',
    priority_trigger:String(value.priority_trigger||'EXPLICIT_HUMAN_RESPONDER_ACTION').slice(0,120),
    routing:'CURRENT_WORK_GRAPH',
    requested_candidate_count:4,
    requested_exam_count:Number(value.requested_exam_count||2),
    requested_synthesizer_count:Number(value.requested_synthesizer_count||1),
    human_routing_actions_target:0,
    counts_are_targets_not_claims:true,
    raw_text_public:false,
    authority:'SANITIZED_DERIVED_REQUEST_ONLY',
    chat_object_id:value.chat_object_id?String(value.chat_object_id).slice(0,160):null,
    public_thread_path:value.public_thread_path?String(value.public_thread_path).slice(0,320):null
  };
}

function normalizeItem(item, now=Date.now()){
  if(!item||typeof item!=='object')return null;
  const work=String(item.work_item_id||'').trim();
  const opportunity=String(item.opportunity_id||'').trim();
  const claimPath=String(item.claim_path||'').trim();
  const sourcePath=String(item.source_path||'').trim();
  if(!work||!opportunity||!claimPath||!sourcePath)return null;
  if(!opportunity.startsWith('page-change-'))return null;
  if(claimPath!==`coordination/opportunities/claims/${opportunity}.json`)return null;
  const expires=parseTime(item.expires_at);
  if(expires&&expires<=now)return null;
  const caps=uniq(item.required_capabilities);
  const contextTransport=String(item.context_transport||'').trim();
  const privatePacketLookup=item.private_packet_lookup&&typeof item.private_packet_lookup==='object'&&!Array.isArray(item.private_packet_lookup)
    ? item.private_packet_lookup
    : null;
  const primaryChatResponseRequest=normalizePrimaryChatResponseRequest(item.primary_chat_response_request);
  if(!contextTransport||!privatePacketLookup)return null;
  if(item.kind==='PRIMARY_CHAT_RESPONSE_ROOT'&&!primaryChatResponseRequest)return null;
  return {
    opportunity_id:opportunity,
    work_item_id:work,
    project_id:String(item.project_id||'prometeo-page-change'),
    page_id:item.page_id?String(item.page_id):null,
    title:String(item.title||`Page Change ${work}`).slice(0,180),
    mission:String(item.mission||'Execute the owned Page Change packet.').slice(0,220),
    kind:String(item.kind||'PAGE_CHANGE_EXECUTION'),
    value_class:String(item.value_class||'PRODUCT_VALUE'),
    priority:Number.isFinite(Number(item.priority))?Number(item.priority):96,
    source_path:sourcePath,
    required_capabilities:caps,
    forbidden_worker_ids:uniq(item.forbidden_worker_ids).slice(0,16),
    context_transport:contextTransport,
    private_packet_lookup:privatePacketLookup,
    ...(primaryChatResponseRequest?{primary_chat_response_request:primaryChatResponseRequest}:{}),
    return_path:item.return_path?String(item.return_path):null,
    expires_at:item.expires_at||null,
    state:'ready',
    claim_mode:'OPPORTUNITY_CLAIM_CREATE',
    claim_path:claimPath,
    claim_payload_shape:{
      schema:'prometeo.opportunity-claim/v1',
      worker_id:'<worker_id>',
      opportunity_id:opportunity,
      claimed_at:'<now_iso>'
    },
    post_claim_validate:true
  };
}

export function applyPageChangeFrontier(allocator={}, frontier={}, {now=Date.now()}={}){
  if(frontier?.schema!=='prometeo.page-change-worker-frontier/v1'){
    return {...allocator,page_change_frontier:{status:'IGNORED_SCHEMA',schema:frontier?.schema||null,count:0}};
  }
  const candidates=arr(frontier.items).map(x=>normalizeItem(x,now)).filter(Boolean);
  const existingClaims=new Set(arr(allocator.queue_ready).map(x=>x.claim_path).filter(Boolean));
  const fresh=candidates.filter(x=>!existingClaims.has(x.claim_path));
  const queue=[...fresh,...arr(allocator.queue_ready)];
  const batch=[...fresh.map(x=>({lane:'queue_ready',...x})),...arr(allocator.batch_candidates)];
  const dedupe=(rows,key='claim_path')=>{
    const seen=new Set(),out=[];
    for(const row of rows){const k=row?.[key]||row?.opportunity_id||row?.job_id||JSON.stringify(row);if(seen.has(k))continue;seen.add(k);out.push(row)}
    return out;
  };
  return {
    ...allocator,
    queue_ready:dedupe(queue).slice(0,40),
    batch_candidates:dedupe(batch).slice(0,40),
    page_change_frontier:{
      status:'MERGED',
      schema:frontier.schema,
      generated_at:frontier.generated_at||null,
      truth_boundary:frontier.truth_boundary||null,
      count:fresh.length,
      work_item_ids:fresh.map(x=>x.work_item_id)
    }
  };
}

export function runCli(argv=process.argv.slice(2)){
  const [allocatorPath,frontierPath,outPath=allocatorPath]=argv;
  if(!allocatorPath||!frontierPath)throw new Error('usage: apply-page-change-frontier.mjs <allocator.json> <page-change-frontier.json> [out.json]');
  const allocator=JSON.parse(fs.readFileSync(allocatorPath,'utf8'));
  const frontier=JSON.parse(fs.readFileSync(frontierPath,'utf8'));
  const out=applyPageChangeFrontier(allocator,frontier);
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
  process.stdout.write(`page-change frontier ${out.page_change_frontier.status} merged=${out.page_change_frontier.count}\n`);
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{runCli()}catch(error){process.stderr.write(String(error?.stack||error)+'\n');process.exitCode=1}
}
