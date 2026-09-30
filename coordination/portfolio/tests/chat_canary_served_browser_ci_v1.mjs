#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL = process.env.CHAT_CANARY_URL || 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/chat-canary/';
const THREAD_URL = process.env.CHAT_CANARY_THREAD_URL || 'https://juanmanuelpm.github.io/prometeo/coordination/portfolio/evidence/prometeo-autonomous-growth/CHAT_THREAD_MIRROR_CANARY_V1.json';
const OUT_DIR = process.env.CHAT_CANARY_ARTIFACT_DIR || 'artifacts/chat-canary-served-browser-ci';
const PROPAGATION_MS = Number(process.env.CHAT_CANARY_PROPAGATION_MS || 30000);
const SAFE_CANARY_TEXT = 'CANARY_PUBLIC_SAFE_BROWSER_CI_V1';

const views = [
  { id:'desktop', viewport:{width:1365,height:900}, isMobile:false, hasTouch:false },
  { id:'narrow', viewport:{width:390,height:844}, isMobile:true, hasTouch:true }
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const gitBlobSha=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');

async function probe(url){
  try{
    const response=await fetch(url,{cache:'no-store',redirect:'follow',headers:{'cache-control':'no-cache'}});
    const bytes=Buffer.from(await response.arrayBuffer());
    return {url,http_status:response.status,final_url:response.url,bytes:bytes.length,blob_sha:response.ok?gitBlobSha(bytes):null,text:response.ok?bytes.toString('utf8'):null};
  }catch(error){
    return {url,http_status:null,error:error?.message||String(error)};
  }
}

async function waitForPublic(){
  const started=Date.now();
  let pageProbe=null;
  let threadProbe=null;
  do{
    [pageProbe,threadProbe]=await Promise.all([probe(TARGET_URL),probe(THREAD_URL)]);
    let thread=null;
    try{thread=JSON.parse(threadProbe?.text||'null')}catch{}
    if(pageProbe?.http_status===200 && threadProbe?.http_status===200 && thread?.schema==='prometeo.chat-thread-projection/v1'){
      return {pageProbe,threadProbe,thread};
    }
    await sleep(5000);
  }while(Date.now()-started<PROPAGATION_MS);
  let thread=null;
  try{thread=JSON.parse(threadProbe?.text||'null')}catch{}
  return {pageProbe,threadProbe,thread};
}

function expectedMessages(thread){
  const rows=Array.isArray(thread?.messages)?thread.messages.filter(m=>m&&m.archived!==true):[];
  const human=[...rows].reverse().find(m=>String(m.actor_type||'').toUpperCase()==='HUMAN')||rows.find(m=>String(m.actor_type||'').toUpperCase()==='HUMAN');
  const agent=[...rows].reverse().find(m=>['WORKER','ASSISTANT'].includes(String(m.actor_type||'').toUpperCase()))||rows.find(m=>['WORKER','ASSISTANT'].includes(String(m.actor_type||'').toUpperCase()));
  return {human,agent,visible_count:rows.length};
}

async function runView(browser,view,publicState){
  const expected=expectedMessages(publicState.thread);
  const context=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch,locale:'es-AR'});
  const page=await context.newPage();
  const runtime={page_errors:[],console_errors:[],request_failures:[],thread_responses:[],websockets:[]};
  page.on('pageerror',e=>runtime.page_errors.push(e?.message||String(e)));
  page.on('console',m=>{if(m.type()==='error')runtime.console_errors.push(m.text())});
  page.on('requestfailed',r=>runtime.request_failures.push({url:r.url(),error:r.failure()?.errorText||'request_failed'}));
  page.on('response',r=>{if(r.url().includes('CHAT_THREAD_MIRROR_CANARY_V1.json'))runtime.thread_responses.push({url:r.url(),status:r.status(),at:new Date().toISOString()})});
  page.on('websocket',ws=>runtime.websockets.push(ws.url()));

  const result={view:view.id,viewport:view.viewport,criteria:{},runtime};
  try{
    const response=await page.goto(TARGET_URL,{waitUntil:'domcontentloaded',timeout:30000});
    result.navigation_http_status=response?.status()??null;
    result.criteria.navigation_http_ok=result.navigation_http_status===200;

    await page.locator('textarea[data-prometeo-chat-composer-input-v1]').waitFor({state:'visible',timeout:15000});
    await page.waitForFunction(()=>document.querySelectorAll('#thread article.msg').length>0,null,{timeout:15000});
    await page.waitForTimeout(800);

    result.criteria.thread_fetch_observed=runtime.thread_responses.some(x=>x.status===200);
    result.criteria.composer_visible=await page.locator('textarea[data-prometeo-chat-composer-input-v1]').isVisible();
    result.criteria.composer_transport_false=(await page.locator('[data-prometeo-chat-composer-v1]').getAttribute('data-transport-ready'))==='false';
    result.criteria.submit_disabled=await page.locator('button[data-prometeo-chat-composer-submit-v1]').isDisabled();
    result.criteria.ingress_api_loaded=await page.evaluate(()=>Boolean(window.PROMETEO_INGRESS_V1&&typeof window.PROMETEO_INGRESS_V1.submit==='function'));
    result.criteria.input_api_loaded=await page.evaluate(()=>Boolean(window.PROMETEO_CHAT_CANARY_INPUT_V1&&typeof window.PROMETEO_CHAT_CANARY_INPUT_V1.submitText==='function'));
    result.criteria.progress_api_loaded=await page.evaluate(()=>Boolean(window.PrometeoChatCanaryProgress&&typeof window.PrometeoChatCanaryProgress.load==='function'));

    if(expected.human?.message_id){
      const human=page.locator('article[data-message-id="'+expected.human.message_id+'"]');
      result.criteria.expected_human_rendered=await human.count()===1 && (await human.innerText()).includes(String(expected.human.body_text||'').slice(0,120));
    }else{
      result.criteria.expected_human_rendered=false;
      result.missing_expected_human=true;
    }

    if(expected.agent?.message_id){
      const agent=page.locator('article[data-message-id="'+expected.agent.message_id+'"]');
      const text=await agent.count()===1?await agent.innerText():'';
      result.criteria.expected_agent_rendered=await agent.count()===1 && text.includes(String(expected.agent.body_text||'').slice(0,120));
      if(expected.agent.result_ref){
        const debug=agent.locator('.message-debug pre');
        result.criteria.agent_result_ref_traceable=await debug.count()===1 && (await debug.innerText()).includes(expected.agent.result_ref);
      }else result.criteria.agent_result_ref_traceable=true;
    }else{
      result.criteria.expected_agent_rendered=false;
      result.criteria.agent_result_ref_traceable=false;
      result.missing_expected_agent=true;
    }

    const input=page.locator('textarea[data-prometeo-chat-composer-input-v1]');
    await input.fill(SAFE_CANARY_TEXT);
    await page.locator('form[data-prometeo-chat-composer-form-v1]').evaluate(form=>form.requestSubmit());
    await page.waitForTimeout(150);
    result.criteria.fail_closed_preserves_text=(await input.inputValue())===SAFE_CANARY_TEXT;
    const composerStatus=await page.locator('[data-prometeo-chat-composer-status-v1]').innerText();
    const pageStatus=await page.locator('#status').innerText();
    result.composer_status=composerStatus;
    result.page_status=pageStatus;
    result.criteria.auth_boundary_visible=/AUTH_BRIDGE_REQUIRED|SOLO BORRADOR|falta bridge privado|NO ENVIADO/i.test(composerStatus+' '+pageStatus);
    result.criteria.no_false_queued=!/\bQUEUED\b/i.test(composerStatus+' '+pageStatus);

    const beforeReload={
      human:expected.human?.message_id?await page.locator('article[data-message-id="'+expected.human.message_id+'"]').count():0,
      agent:expected.agent?.message_id?await page.locator('article[data-message-id="'+expected.agent.message_id+'"]').count():0
    };
    await page.reload({waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>document.querySelectorAll('#thread article.msg').length>0,null,{timeout:15000});
    await page.waitForTimeout(500);
    const afterReload={
      human:expected.human?.message_id?await page.locator('article[data-message-id="'+expected.human.message_id+'"]').count():0,
      agent:expected.agent?.message_id?await page.locator('article[data-message-id="'+expected.agent.message_id+'"]').count():0
    };
    result.reload={beforeReload,afterReload};
    result.criteria.reload_persists_durable_thread=beforeReload.human===1&&beforeReload.agent===1&&afterReload.human===1&&afterReload.agent===1;
    result.criteria.no_iframes=await page.locator('iframe').count()===0;
    result.criteria.no_websockets=runtime.websockets.length===0;
    result.criteria.no_horizontal_overflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2);

    const servedHtml=publicState.pageProbe?.text||'';
    result.criteria.polling_not_aggressive=/setInterval\(\(\) => load\(\), 10000\)/.test(servedHtml);
    result.criteria.no_obvious_public_secret=!/(github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(servedHtml);

    await page.screenshot({path:path.join(OUT_DIR,view.id+'.png'),fullPage:true});
  }catch(error){
    result.fatal_error=error?.stack||error?.message||String(error);
    try{await page.screenshot({path:path.join(OUT_DIR,view.id+'-fatal.png'),fullPage:true})}catch{}
  }finally{
    await context.close();
  }

  result.criteria.no_uncaught_page_errors=runtime.page_errors.length===0;
  const checks=Object.values(result.criteria);
  result.pass=!result.fatal_error&&checks.length>=18&&checks.every(Boolean);
  return result;
}

async function main(){
  await mkdir(OUT_DIR,{recursive:true});
  const publicState=await waitForPublic();
  const expected=expectedMessages(publicState.thread);
  const evidence={
    schema:'prometeo.chat-canary-served-browser-ci/v1',
    generated_at:new Date().toISOString(),
    target_url:TARGET_URL,
    thread_url:THREAD_URL,
    authority:'TECHNICAL_SERVED_BROWSER_VERIFICATION_ONLY_NO_MESSAGE_CURRENT_SERVED_OR_HUMAN_ACCEPTED_PROMOTION',
    public_page:{http_status:publicState.pageProbe?.http_status??null,bytes:publicState.pageProbe?.bytes??null,blob_sha:publicState.pageProbe?.blob_sha??null},
    public_thread:{http_status:publicState.threadProbe?.http_status??null,bytes:publicState.threadProbe?.bytes??null,blob_sha:publicState.threadProbe?.blob_sha??null,schema:publicState.thread?.schema??null,updated_at:publicState.thread?.updated_at??null},
    expected:{human_message_id:expected.human?.message_id||null,agent_message_id:expected.agent?.message_id||null,visible_message_count:expected.visible_count},
    views:[],
    status:'PENDING'
  };

  const browser=await chromium.launch({headless:true});
  try{
    for(const view of views)evidence.views.push(await runView(browser,view,publicState));
  }finally{
    await browser.close();
  }

  evidence.status=publicState.pageProbe?.http_status===200&&publicState.threadProbe?.http_status===200&&
    publicState.thread?.schema==='prometeo.chat-thread-projection/v1'&&
    evidence.views.every(v=>v.pass)?'PASS':'FAIL';
  evidence.summary={
    desktop_pass:evidence.views.find(v=>v.view==='desktop')?.pass||false,
    narrow_pass:evidence.views.find(v=>v.view==='narrow')?.pass||false,
    auth_boundary_expected:true,
    authenticated_transport_certified:false,
    worker_liveness_certified:false
  };
  await writeFile(path.join(OUT_DIR,'evidence.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log(JSON.stringify(evidence,null,2));
  process.exit(evidence.status==='PASS'?0:1);
}

await main();
