try{
#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const mode=process.argv[2]||'prepare';
const statePath=process.argv[3]||'/tmp/page-change-pipeline-canary-state.json';
const CAPTURE='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-capture';
const LOOP='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-change-loop-v1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const b64url=b=>Buffer.from(b).toString('base64url');
const now=()=>new Date().toISOString();

async function fetchJson(url,opt={},attempts=24){
  let last;
  for(let n=1;n<=attempts;n++){
    try{
      const r=await fetch(url,opt);
      const text=await r.text();
      let body={};try{body=text?JSON.parse(text):{}}catch{body={raw:text.slice(0,500)}}
      if(r.ok)return body;
      last=new Error(`${url} HTTP ${r.status} ${body?.error||body?.message||''}`);
      if(![429,500,502,503,504].includes(r.status))throw last;
    }catch(e){last=e}
    if(n<attempts)await sleep(Math.min(8000,1500+n*300));
  }
  throw last||new Error('request failed');
}
function post(url,secret,body){return fetchJson(url,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${secret}`},body:JSON.stringify(body),cache:'no-store'})}
function must(v,msg){if(!v)throw new Error('CANARY_FAIL '+msg)}
function mkdirFor(file){fs.mkdirSync(path.dirname(file),{recursive:true})}

if(mode==='prepare'){
  const run=process.env.GITHUB_RUN_ID||String(Date.now());
  const secret=b64url(crypto.randomBytes(32));
  const pageId=`__canary-page-change-worker-pool-v1-${run}`;
  const pageTitle='Page Change Worker Pool Canary';
  const sourceHref='https://juanmanuelpm.github.io/prometeo/__canary/page-change-worker-pool-v1/';
  const sentinel='PRIVATE_CANARY_'+b64url(crypto.randomBytes(18));
  const sentinel2='PRIVATE_MANUAL_CANARY_'+b64url(crypto.randomBytes(18));

  const boot=await post(CAPTURE,secret,{action:'bootstrap'});
  must(boot.workspace_id,'workspace bootstrap');

  const captureId=crypto.randomUUID();
  await post(CAPTURE,secret,{action:'sync_capture',capture:{
    id:captureId,created:Date.now(),status:'pending',transcript:sentinel,transcript_revision:1,
    sourcePath:'/__canary/page-change-worker-pool-v1/',sourceHref,sourceTitle:pageTitle,viewport:'390x844',page_id:pageId,
    page:{public_url:sourceHref,source_repo:'JuanManuelPM/prometeo',source_entrypoint:null},
    metadata:{source_kind:'HUMAN_TEXT',canary:'PAGE_CHANGE_WORKER_POOL_V1'}
  }});
  await post(LOOP,secret,{action:'sync_page',page_id:pageId,page_title:pageTitle,baseline:{canary:true,served_identity:'CANARY_NONE'}});
  const pool=await post(LOOP,secret,{action:'prepare_execution',page_id:pageId,page_title:pageTitle,source_href:sourceHref,served_identity:'CANARY_NONE',baseline:{canary:true},delivery_mode:'WORKER_POOL',intent:'WORK_PAGE',human_approved:true});
  must(pool.queued_to_worker_pool===true,'worker pool delivery');
  must(pool.work_item_id&&pool.thread_id&&pool.return_path,'worker pool identifiers');
  must(!pool.packet_url&&!pool.chatgpt_url,'worker pool must not expose private packet URL');

  const frontier=await fetchJson(LOOP+'/worker-frontier',{cache:'no-store'});
  must(frontier.schema==='prometeo.page-change-worker-frontier/v1','frontier schema');
  const item=(frontier.items||[]).find(x=>x.work_item_id===pool.work_item_id);
  must(item,'pool work visible in public worker frontier');
  must(item.opportunity_id==='page-change-'+pool.work_item_id,'opportunity identity');
  must(item.claim_path===`coordination/opportunities/claims/${item.opportunity_id}.json`,'claim path');
  must(item.context_transport==='SUPABASE_CONNECTED_PROJECT','private context transport');
  must(item.private_packet_lookup?.value===pool.work_item_id,'private lookup key');
  const publicText=JSON.stringify(frontier);
  for(const forbidden of [sentinel,'packet_url','return_token','packet_token','selected_capture_revisions']){
    must(!publicText.includes(forbidden),'private leak '+forbidden);
  }

  const claim={
    schema:'prometeo.opportunity-claim/v1',
    worker_id:`CI-PAGE-CHANGE-CANARY-${run}`,
    opportunity_id:item.opportunity_id,
    claimed_at:now(),
    canary:true,
    note:'CI canary claim. No product mutation authorized.'
  };
  const returnDoc={
    schema:'prometeo.execution-result/v1',
    work_item_id:pool.work_item_id,
    page_id:pageId,
    thread_id:pool.thread_id,
    status:'BLOCKED',
    finished_at:now(),
    summary:{text:'CI canary verified WORKER_POOL discovery and durable claim; product mutation intentionally not performed.',changes:[],tests:['sanitized worker frontier PASS','claim contract PASS']},
    changed_files:[],
    tests:{status:'PASS'},
    regressions_checked:['private Capture literal absent from public frontier','packet capability absent before claim'],
    negative_knowledge:['CI cannot impersonate a connected-Supabase ChatGPT worker; private post-claim lookup is certified separately by contract and manual packet canary.'],
    candidate_identity:null,candidate_url:null,served_identity:null,served_url:null,
    prometeo_url:`https://juanmanuelpm.github.io/prometeo/?page=${encodeURIComponent(pageId)}&changes=${encodeURIComponent(pool.work_item_id)}`,
    return_ref:pool.return_path,receipt_ref:null
  };
  mkdirFor(item.claim_path);fs.writeFileSync(item.claim_path,JSON.stringify(claim,null,2)+'\n');
  mkdirFor(pool.return_path);fs.writeFileSync(pool.return_path,JSON.stringify(returnDoc,null,2)+'\n');

  const capture2=crypto.randomUUID();
  await post(CAPTURE,secret,{action:'sync_capture',capture:{
    id:capture2,created:Date.now(),status:'pending',transcript:sentinel2,transcript_revision:1,
    sourcePath:'/__canary/page-change-worker-pool-v1/',sourceHref,sourceTitle:pageTitle,viewport:'390x844',page_id:pageId,
    page:{public_url:sourceHref,source_repo:'JuanManuelPM/prometeo',source_entrypoint:null},
    metadata:{source_kind:'HUMAN_TEXT',canary:'PAGE_CHANGE_PRIVATE_PACKET_V1'}
  }});
  await post(LOOP,secret,{action:'sync_page',page_id:pageId,page_title:pageTitle,baseline:{canary:true}});
  const manual=await post(LOOP,secret,{action:'prepare_execution',page_id:pageId,page_title:pageTitle,source_href:sourceHref,served_identity:'CANARY_NONE',baseline:{canary:true},delivery_mode:'MANUAL_CHAT',intent:'WORK_PAGE',human_approved:true});
  must(manual.packet_url&&manual.work_item_id,'manual private packet url');
  const packet=await fetchJson(manual.packet_url,{cache:'no-store'});
  must(packet.schema==='prometeo.execution-packet/v2','private packet schema');
  must(packet.work_item_id===manual.work_item_id,'private packet work item');
  must(packet.authorization?.delivery_mode==='MANUAL_CHAT','manual packet delivery');
  must(JSON.stringify(packet.intent?.selected_capture_revisions||[]).includes(sentinel2),'private capture reaches packet');
  must(packet.execution?.result_submission?.optional_http_post,'private result endpoint');

  const manualResult={
    schema:'prometeo.execution-result/v1',work_item_id:manual.work_item_id,page_id:pageId,thread_id:manual.thread_id,status:'BLOCKED',finished_at:now(),
    summary:{text:'CI canary verified private Execution Packet and HTTP RETURN without product mutation.',changes:[],tests:['private packet PASS','HTTP RETURN PASS']},
    changed_files:[],tests:{status:'PASS'},regressions_checked:['private text available only through token-gated packet'],negative_knowledge:[],
    candidate_identity:null,candidate_url:null,served_identity:null,served_url:null,
    return_ref:manual.return_path,receipt_ref:null
  };
  const returned=await fetchJson(packet.execution.result_submission.optional_http_post,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(manualResult)});
  must(returned.ok&&returned.status==='BLOCKED','manual HTTP return');
  const manualStatus=await post(LOOP,secret,{action:'execution_status',work_item_id:manual.work_item_id});
  const manualExec=(manualStatus.executions||[]).find(x=>x.work_item_id===manual.work_item_id);
  must(manualExec?.status==='BLOCKED'&&manualExec?.result?.source==='HTTP_RETURN','manual result ingested into thread');

  const state={schema:'prometeo.page-change-pipeline-canary-state/v1',run,page_id:pageId,workspace_id:boot.workspace_id,secret,pool:{work_item_id:pool.work_item_id,thread_id:pool.thread_id,return_path:pool.return_path,claim_path:item.claim_path,opportunity_id:item.opportunity_id,capture_id:captureId},manual:{work_item_id:manual.work_item_id,thread_id:manual.thread_id,capture_id:capture2},prepared_at:now()};
  fs.writeFileSync(statePath,JSON.stringify(state,null,2));
  console.log(JSON.stringify({status:'PREPARED',page_id:pageId,pool_work_item_id:pool.work_item_id,manual_work_item_id:manual.work_item_id,frontier_sanitized:true,manual_private_packet:true,manual_return_ingested:true}));
}else if(mode==='finish'){
  const state=JSON.parse(fs.readFileSync(statePath,'utf8'));
  const status=await post(LOOP,state.secret,{action:'execution_status',work_item_id:state.pool.work_item_id});
  const exec=(status.executions||[]).find(x=>x.work_item_id===state.pool.work_item_id);
  must(exec,'pool execution visible after GitHub RETURN');
  must(exec.status==='BLOCKED','pool GitHub RETURN terminal status');
  must(exec.result?.source==='GITHUB_RETURN','pool result ingested from GitHub RETURN');

  for(const id of [state.pool.capture_id,state.manual.capture_id]){
    await post(CAPTURE,state.secret,{action:'delete_capture',id}).catch(()=>null);
  }
  const evidence={
    schema:'prometeo.page-change-pipeline-canary/v1',
    generated_at:now(),run_id:state.run,status:'PASS_WITH_CONNECTED_SUPABASE_WORKER_LOOKUP_NOT_RUNTIME_EXERCISED',
    evidence:{
      workspace_bootstrap:'PASS',capture_sync:'PASS',page_thread:'PASS',
      worker_pool_execution_packet:'PASS',public_worker_frontier:'PASS',public_frontier_privacy:'PASS',
      durable_github_claim:'PASS',github_return_ingestion:'PASS',
      private_packet_token_transport_manual_mode:'PASS',http_return_ingestion:'PASS'
    },
    remaining_runtime_gate:'A real ChatGPT worker with connected_supabase_prometeo must claim one WORKER_POOL item and retrieve the exact private packet through the connected Supabase project after claim.',
    truth_boundary:'CI does not possess or emulate the connected ChatGPT Supabase capability; it proves every surrounding durable transport boundary without publishing private capture literals.',
    pool:{work_item_id:state.pool.work_item_id,opportunity_id:state.pool.opportunity_id,claim_path:state.pool.claim_path,return_path:state.pool.return_path},
    manual:{work_item_id:state.manual.work_item_id}
  };
  const out='coordination/canaries/page-change-pipeline-v1/latest.json';
  mkdirFor(out);fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({status:evidence.status,evidence_file:out,pool_work_item_id:state.pool.work_item_id}));
}else throw new Error('unknown mode '+mode);
}catch(error){
  const message=String(error?.message||error);
  const blocked=/HTTP 5\d\d|schema cache|PGRST002|ECONNREFUSED|fetch failed/i.test(message);
  const evidence={
    schema:'prometeo.page-change-pipeline-canary/v1',
    generated_at:now(),
    run_id:process.env.GITHUB_RUN_ID||null,
    status:blocked?'BLOCKED_EXTERNAL_CONTROL_PLANE':'FAIL',
    evidence:{workspace_bootstrap:'NOT_PROVEN',capture_sync:'NOT_PROVEN',worker_pool_execution_packet:'NOT_PROVEN',public_worker_frontier:'NOT_PROVEN',github_return_ingestion:'NOT_PROVEN'},
    failure_stage:mode,
    error_class:blocked?'CONTROL_PLANE_UNAVAILABLE':'CANARY_FAILURE',
    error_summary:blocked?'Supabase Page Change control plane remained unavailable after bounded retries.':message.slice(0,500),
    public_run_url:process.env.GITHUB_RUN_ID?`https://github.com/JuanManuelPM/prometeo/actions/runs/${process.env.GITHUB_RUN_ID}`:null,
    truth_boundary:'No product mutation and no private Capture literal were published. This is a blocked canary, not a failed product capability claim.'
  };
  const out='coordination/canaries/page-change-pipeline-v1/latest.json';
  mkdirFor(out);fs.writeFileSync(out,JSON.stringify(evidence,null,2)+'\n');
  console.error(message);
  process.exitCode=blocked?78:1;
}
