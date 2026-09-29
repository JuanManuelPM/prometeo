// continuity-release-verified-head-trigger: 2026-09-29T16:23Z
// continuity-release-final-trigger: 2026-09-29T16:20Z
// continuity-release-clean-trigger: 2026-09-29T16:14Z
// capability-graph-canary-trigger: 2026-09-29T15:36Z
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const publicUrl=process.env.V11_PUBLIC_URL||'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/';
const outDir=process.env.V11_BROWSER_CI_OUT||'artifacts/mp10-v11-served-browser-ci';
const propagationMs=Number(process.env.V11_PROPAGATION_MS||180000);
const projectContextUrl=new URL('../../coordination/project-context-v1/INDEX.json',publicUrl).href;
const statsUrl=new URL('../../coordination/analytics/control-room-stats-v1/latest.json',publicUrl).href;
const chatSessionsUrl=new URL('../../coordination/chat-sessions/INDEX.json',publicUrl).href;
const previewManifestUrl=new URL('./previews/manifest.json',publicUrl).href;
const scriptUrl=new URL('./v11.js',publicUrl).href;
const diagnosticsUrl=new URL('./diagnostics-v1.js',publicUrl).href;
const continuityUrl=new URL('./continuity-v1.js',publicUrl).href;
const bootstrapUrl=new URL('../../coordination/bootstrap/UNIVERSAL_SESSION_PREFLIGHT_V1.txt',publicUrl).href;
const changeLoopUrl=new URL('../../shared/capture/v1/change-loop.js',publicUrl).href;
const stableControlUrl=new URL('../control/',publicUrl).href;
const indexPath='current-tree/control-v11/index.html';
const scriptPath='current-tree/control-v11/v11.js';
const diagnosticsPath='current-tree/control-v11/diagnostics-v1.js';
const continuityPath='current-tree/control-v11/continuity-v1.js';
const changeLoopPath='shared/capture/v1/change-loop.js';
const stableControlPath='current-tree/control/index.html';

fs.mkdirSync(outDir,{recursive:true});
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const evidence={
  schema:'prometeo.mp10-v11-served-browser-ci/v1',
  observed_at:new Date().toISOString(),
  public_url:publicUrl,
  authority_boundary:'served/source/UI verification only; authenticated Page Change transport and fresh-worker wake are separate and never inferred',
  promotion_boundary:'no Current, Served or Human Accepted mutation',
  checks:{},
  requests:[],
  page_errors:[],
  console_errors:[],
  authenticated_transport:{state:'NOT_TESTED_BOUNDARY',pass:false},
  screenshots:[],
  overall:'RUNNING'
};
const evidencePath=path.join(outDir,'evidence.json');
const save=()=>fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
const pass=(name,details=true)=>{evidence.checks[name]={result:'PASS',details};save()};
const fail=(name,details)=>{evidence.checks[name]={result:'FAIL',details};save()};
const requestJson=async (request,url,label)=>{
  const response=await request.get(url,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  let json=null,error=null;
  try{json=await response.json()}catch(err){error=String(err?.message||err)}
  return {response,status:response.status(),json,error,label};
};

let browser;
try{
  browser=await chromium.launch({headless:true});
  const desktop=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await desktop.newPage();

  page.on('request',req=>{
    evidence.requests.push({method:req.method(),url:req.url(),resource_type:req.resourceType()});
    save();
  });
  page.on('pageerror',error=>{
    evidence.page_errors.push(String(error?.message||error));
    save();
  });
  page.on('console',message=>{
    if(message.type()==='error'){
      evidence.console_errors.push(message.text());
      save();
    }
  });

  const propagationDeadline=Date.now()+propagationMs;
  evidence.propagation_attempts=[];
  let preflightStatus=null;
  do{
    const verifyUrl=new URL(publicUrl);
    verifyUrl.searchParams.set('_prometeo_verify',String(Date.now()));
    const response=await desktop.request.get(verifyUrl.href,{timeout:15000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
    preflightStatus=response.status();
    evidence.propagation_attempts.push({status:preflightStatus,at:new Date().toISOString()});
    save();
    if(preflightStatus===200) break;
    if(Date.now()<propagationDeadline) await page.waitForTimeout(5000);
  }while(Date.now()<propagationDeadline);
  assert.equal(preflightStatus,200,'public V11 must propagate to HTTP 200 within bounded window');
  pass('public_v11_http_200',{status:preflightStatus,attempts:evidence.propagation_attempts.length,window_ms:propagationMs});

  const indexResponse=await desktop.request.get(publicUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(indexResponse.status(),200);
  const hardFailures=[];
  const servedIndex=await indexResponse.body();
  const sourceIndex=fs.readFileSync(indexPath);
  const indexIdentity={
    served_sha256:sha256(servedIndex),
    source_sha256:sha256(sourceIndex),
    source_bytes:sourceIndex.length,
    served_bytes:servedIndex.length
  };
  indexIdentity.match=indexIdentity.served_sha256===indexIdentity.source_sha256;
  if(indexIdentity.match) pass('served_index_source_identity',indexIdentity);
  else {
    fail('served_index_source_identity',indexIdentity);
    hardFailures.push('served_index_source_identity');
  }

  const scriptResponse=await desktop.request.get(scriptUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(scriptResponse.status(),200);
  const servedScript=await scriptResponse.body();
  const sourceScript=fs.readFileSync(scriptPath);
  const scriptIdentity={
    served_sha256:sha256(servedScript),
    source_sha256:sha256(sourceScript),
    source_bytes:sourceScript.length,
    served_bytes:servedScript.length
  };
  scriptIdentity.match=scriptIdentity.served_sha256===scriptIdentity.source_sha256;
  if(scriptIdentity.match) pass('served_v11_js_source_identity',scriptIdentity);
  else {
    fail('served_v11_js_source_identity',scriptIdentity);
    hardFailures.push('served_v11_js_source_identity');
  }
  const diagnosticsResponse=await desktop.request.get(diagnosticsUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(diagnosticsResponse.status(),200);
  const servedDiagnostics=await diagnosticsResponse.body();
  const sourceDiagnostics=fs.readFileSync(diagnosticsPath);
  const diagnosticsIdentity={served_sha256:sha256(servedDiagnostics),source_sha256:sha256(sourceDiagnostics),source_bytes:sourceDiagnostics.length,served_bytes:servedDiagnostics.length};
  diagnosticsIdentity.match=diagnosticsIdentity.served_sha256===diagnosticsIdentity.source_sha256;
  if(diagnosticsIdentity.match) pass('served_diagnostics_source_identity',diagnosticsIdentity);
  else {fail('served_diagnostics_source_identity',diagnosticsIdentity);hardFailures.push('served_diagnostics_source_identity')}

  const continuityResponse=await desktop.request.get(continuityUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(continuityResponse.status(),200);
  const servedContinuity=await continuityResponse.body();
  const sourceContinuity=fs.readFileSync(continuityPath);
  const continuityIdentity={served_sha256:sha256(servedContinuity),source_sha256:sha256(sourceContinuity),source_bytes:sourceContinuity.length,served_bytes:servedContinuity.length};
  continuityIdentity.match=continuityIdentity.served_sha256===continuityIdentity.source_sha256;
  if(continuityIdentity.match) pass('served_continuity_source_identity',continuityIdentity);
  else {fail('served_continuity_source_identity',continuityIdentity);hardFailures.push('served_continuity_source_identity')}

  const bootstrapResponse=await desktop.request.get(bootstrapUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(bootstrapResponse.status(),200);
  const servedBootstrap=await bootstrapResponse.text();
  assert.match(servedBootstrap,/CURRENT_TREE_V2/);
  assert.match(servedBootstrap,/ORGANISM/);
  assert.match(servedBootstrap,/CONTINUE/);
  assert.match(servedBootstrap,/COMPATIBLE_DELTA/);
  assert.match(servedBootstrap,/EXPERIMENT/);
  assert.match(servedBootstrap,/REPLAN/);
  assert.match(servedBootstrap,/DESTRUCTIVE_RESET/);
  assert.match(servedBootstrap,/must not silently erase|NO borra silenciosamente|MUST NOT SILENTLY ERASE/i);
  pass('universal_session_preflight_served',{organism:true,request_classification:true,lineage_preserved:true});

  const changeResponse=await desktop.request.get(changeLoopUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(changeResponse.status(),200);
  const servedChange=await changeResponse.body();
  const sourceChange=fs.readFileSync(changeLoopPath);
  const changeIdentity={served_sha256:sha256(servedChange),source_sha256:sha256(sourceChange),source_bytes:sourceChange.length,served_bytes:servedChange.length};
  changeIdentity.match=changeIdentity.served_sha256===changeIdentity.source_sha256;
  if(changeIdentity.match) pass('served_change_loop_source_identity',changeIdentity);
  else {fail('served_change_loop_source_identity',changeIdentity);hardFailures.push('served_change_loop_source_identity')}

  const stableResponse=await desktop.request.get(stableControlUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(stableResponse.status(),200);
  const servedStable=await stableResponse.body();
  const sourceStable=fs.readFileSync(stableControlPath);
  const stableIdentity={served_sha256:sha256(servedStable),source_sha256:sha256(sourceStable),source_bytes:sourceStable.length,served_bytes:servedStable.length};
  stableIdentity.match=stableIdentity.served_sha256===stableIdentity.source_sha256;
  if(stableIdentity.match) pass('stable_control_route_source_identity',stableIdentity);
  else {fail('stable_control_route_source_identity',stableIdentity);hardFailures.push('stable_control_route_source_identity')}

  evidence.served_identity={index:indexIdentity,v11_js:scriptIdentity,diagnostics:diagnosticsIdentity,continuity:continuityIdentity,change_loop:changeIdentity,stable_control:stableIdentity};
  save();

  const stablePage=await desktop.newPage();
  const stableProbe=new URL(stableControlUrl);
  stableProbe.searchParams.set('view','espacios');
  stableProbe.searchParams.set('_prometeo_stable',String(Date.now()));
  const stableNav=await stablePage.goto(stableProbe.href,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(stableNav?.status(),200,'stable control alias must return 200');
  await stablePage.waitForURL(/\/current-tree\/control-v11\//,{timeout:12000});
  assert.equal(new URL(stablePage.url()).searchParams.get('view'),'espacios','stable alias must preserve semantic query');
  pass('stable_control_redirect',{entry:stableProbe.href,final_url:stablePage.url()});
  await stablePage.close();

  const browserUrl=new URL(publicUrl);
  browserUrl.searchParams.set('_prometeo_browser',String(Date.now()));
  const response=await page.goto(browserUrl.href,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response?.status(),200,'desktop browser navigation must return 200');
  await page.waitForTimeout(3500);
  pass('desktop_navigation',{status:response?.status(),final_url:page.url()});

  await page.waitForFunction(()=>!!window.PROMETEO_DIAGNOSTICS_V1,{timeout:10000});
  const diagSecret='CI_DIAGNOSTIC_SECRET_'+Date.now();
  const diagPacket=await page.evaluate(secret=>{
    const d=window.PROMETEO_DIAGNOSTICS_V1;
    d.record({kind:'http',source:'ci-canary',status:503,method:'GET',url:location.origin+'/prometeo/__diagnostic_canary__.json?token='+secret,message:'HTTP 503 synthetic canary'});
    d.open();
    return d.snapshot();
  },diagSecret);
  const diagText=JSON.stringify(diagPacket);
  assert.equal(diagPacket.schema,'prometeo.control-diagnostic-packet/v1');
  assert.equal(diagPacket.privacy.note_bodies_included,false);
  assert.equal(diagPacket.privacy.request_headers_included,false);
  assert.equal(diagPacket.privacy.query_strings_in_urls_included,false);
  assert.equal(diagText.includes(diagSecret),false,'diagnostic packet must strip query-string secrets');
  assert.ok(diagPacket.recent_events.some(x=>x.source==='ci-canary'&&x.status===503&&String(x.url||'').endsWith('/prometeo/__diagnostic_canary__.json')));
  await page.locator('#diagTerminal.on').waitFor({state:'visible',timeout:5000});
  assert.equal(await page.locator('#diagCopy').count(),1);
  pass('diagnostic_terminal_privacy_and_copy_packet',{schema:diagPacket.schema,secret_redacted:true,recent_events:diagPacket.recent_events.length});
  await page.evaluate(()=>window.PROMETEO_DIAGNOSTICS_V1.close());

  await desktop.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(publicUrl).origin});
  await page.waitForFunction(()=>!!window.PROMETEO_CONTINUITY_V1,{timeout:10000});
  await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.tab[data-view="historial"]')?.click()});
  await page.locator('#continuityCenter').waitFor({state:'visible',timeout:12000});
  assert.equal(await page.locator('.tab[data-view="chats"]').isVisible(),false,'Chats must not be a visible primary tab');
  assert.equal(await page.locator('.tab[data-view="trabajo"]').isVisible(),false,'Trabajo must not be a visible primary tab');
  const continuityPacket=await page.evaluate(()=>window.PROMETEO_CONTINUITY_V1.continuityPacket(null));
  assert.equal(continuityPacket.schema,'prometeo.project-continuity-packet/v1');
  assert.ok(continuityPacket.current_snapshot.tree,'continuity packet must include Current Tree snapshot');
  assert.ok(continuityPacket.current_snapshot.organism,'continuity packet must include Organism snapshot');
  assert.ok(continuityPacket.current_snapshot.work_contexts,'continuity packet must include Work Context projection');
  assert.equal(continuityPacket.privacy.local_note_bodies_included,false);
  assert.equal(continuityPacket.privacy.private_prompt_text_included,false);
  await page.locator('#continuityNew').click();
  await page.waitForTimeout(250);
  const copiedNew=await page.evaluate(()=>navigator.clipboard.readText());
  assert.match(copiedNew,/UNIVERSAL_SESSION_PREFLIGHT_V1/);
  assert.match(copiedNew,/ORGANISM/);
  assert.match(copiedNew,/CONTINUE \/ COMPATIBLE_DELTA \/ EXPERIMENT \/ REPLAN \/ DESTRUCTIVE_RESET/);
  assert.match(copiedNew,/No le pidas que reconstruya contexto ya durable/i);
  await page.locator('#continuityAdopt').click();
  await page.waitForTimeout(250);
  const copiedAdopt=await page.evaluate(()=>navigator.clipboard.readText());
  assert.match(copiedAdopt,/ADOPTAR ESTE CHAT EXISTENTE V1/);
  assert.match(copiedAdopt,/sin pedirme que resuma lo anterior/i);
  pass('continuity_center_export_and_bootstrap',{history_is_primary:true,chats_tab_hidden:true,work_tab_hidden:true,packet_has_organism:true,private_data_excluded:true,new_chat_bootstrap:true,adopt_existing_chat:true});

  await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.tab[data-view="chats"]')?.click()});
  const sessionCard=page.locator('[data-chat-session="CHAT-PROMETEO-CONTROL-20260929T145300Z-S01"]');
  await sessionCard.waitFor({state:'visible',timeout:20000});
  assert.match(await sessionCard.innerText(),/PIN-PROMETEO-CTRL-S01-7F4C/);
  await sessionCard.locator('[data-chat-journal]').click();
  await sessionCard.locator('[data-chat-journal-body]').waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>document.querySelector('[data-chat-journal-body="CHAT-PROMETEO-CONTROL-20260929T145300Z-S01"]')?.innerText.includes('J003'),null,{timeout:10000});
  await sessionCard.locator('[data-chat-continue]').click();
  await page.waitForTimeout(300);
  const copiedContinue=await page.evaluate(()=>navigator.clipboard.readText());
  assert.match(copiedContinue,/PREDECESSOR_SESSION_ID: CHAT-PROMETEO-CONTROL-20260929T145300Z-S01/);
  assert.match(copiedContinue,/PREDECESSOR_SESSION_PIN: PIN-PROMETEO-CTRL-S01-7F4C/);
  assert.match(copiedContinue,/Creá un SESSION_ID y SESSION_PIN frescos/);
  const chatIndexProbe=await requestJson(desktop.request,chatSessionsUrl,'chat sessions');
  assert.equal(chatIndexProbe.status,200);
  assert.equal(chatIndexProbe.json?.schema,'prometeo.chat-session-index/v1');
  assert.equal(chatIndexProbe.json?.projection_status,'NON_AUTHORITATIVE_PUBLIC_PROJECTION');
  assert.ok(Array.isArray(chatIndexProbe.json?.sessions)&&chatIndexProbe.json.sessions.some(x=>x.session_id==='CHAT-PROMETEO-CONTROL-20260929T145300Z-S01'));
  pass('chat_session_journal_and_continue',{session_id:'CHAT-PROMETEO-CONTROL-20260929T145300Z-S01',journal_visible:true,continue_copied:true,private_projection:true});

  const servedIndexText=servedIndex.toString('utf8');
  const servedScriptText=servedScript.toString('utf8');
  const servedDiagnosticsText=servedDiagnostics.toString('utf8');
  const servedChangeText=servedChange.toString('utf8');
  assert.match(servedIndexText,/id="notesBtn"/,'object drawer must expose universal Notes');
  assert.match(servedIndexText,/id="diagBtn"/,'Control Room must expose the hidden diagnostics terminal');
  assert.match(servedIndexText,/class="tab legacy-tab" data-view="chats"/,'Chats must remain only as hidden legacy route');
  assert.match(servedIndexText,/class="tab legacy-tab" data-view="trabajo"/,'Trabajo must remain only as hidden legacy route');
  assert.match(servedIndexText,/id="continuityBtn"/,'Control Room must expose global continuity entry');
  assert.match(servedIndexText,/continuity-v1\.js/,'Control Room must load continuity module');
  assert.match(servedIndexText,/diagnostics-v1\.js/,'diagnostics must load before the data layer');
  assert.match(servedDiagnosticsText,/PROMETEO_DIAGNOSTIC_PACKET_V1/);
  assert.match(servedDiagnosticsText,/query_strings_in_urls_included:false/);
  assert.match(servedDiagnosticsText,/request_headers_included:false/);
  assert.match(servedDiagnosticsText,/window\.fetch=async function/);
  assert.doesNotMatch(servedIndexText,/href="\.\.\/\.\.\/notes\/"[^>]*>Notas<\/a>/,'side Notes app must not remain primary navigation');
  assert.match(servedScriptText,/PROMETEO_V11_OPEN_NODE_NOTES/);
  assert.match(servedScriptText,/contextHistoryFor/);
  assert.match(servedScriptText,/addEventListener\('popstate'/);
  assert.match(servedChangeText,/Modo local-first: texto y audio se guardan en este dispositivo/);
  assert.match(servedChangeText,/remoteAvailable=false/);
  assert.match(servedChangeText,/Contexto · misma lineage/);
  assert.match(servedChangeText,/#prometeoChangeLoop\{[^}]*z-index:60/);
  pass('universal_shell_finish_static_contract',{object_notes:true,side_notes_removed:true,exact_back:true,context_projection:true,local_first:true,notes_above_host_chrome:true});

  const desktopShot=path.join(outDir,'v11-desktop.png');
  await page.screenshot({path:desktopShot,fullPage:true});
  evidence.screenshots.push('v11-desktop.png');
  save();

  await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.tab[data-view="trabajo"]')?.click()});
  await page.waitForTimeout(200);
  const command=page.locator('#commandInputV11');
  const send=page.locator('#commandSendV11');
  const state=page.locator('#commandStateV11');
  const commandPresent=await command.count()>0 && await command.isVisible().catch(()=>false);
  const sendPresent=await send.count()>0 && await send.isVisible().catch(()=>false);
  if(!commandPresent||!sendPresent){
    const details={
      command_count:await command.count(),
      send_count:await send.count(),
      state_count:await state.count(),
      expected:{command:'#commandInputV11',send:'#commandSendV11',state:'#commandStateV11'}
    };
    fail('command_dom_fail_closed',details);
    hardFailures.push('command_dom_fail_closed');
  }else{
    assert.equal(await command.getAttribute('maxlength'),'6000');
    assert.equal((await send.textContent())?.trim(),'HACER');
    const initialState=((await state.textContent())||'').trim();
    assert.doesNotMatch(initialState,/queued|en cola|enviando/i);
    const postsBefore=evidence.requests.filter(r=>r.method==='POST').length;
    await command.fill('verificación CI · no enviar');
    await page.waitForTimeout(350);
    const postsAfter=evidence.requests.filter(r=>r.method==='POST').length;
    const editedState=((await state.textContent())||'').trim();
    assert.equal(postsAfter,postsBefore,'editing command text must not submit work');
    assert.doesNotMatch(editedState,/queued|en cola|enviando/i,'editing without HACER must remain unsent');
    pass('command_dom_fail_closed',{maxlength:6000,button:'HACER',posts_before:postsBefore,posts_after:postsAfter,initial_state:initialState,edited_state:editedState});
  }

  await page.route('**/functions/v1/prometeo-change-loop-v1**',route=>route.abort('failed'));
  await page.evaluate(()=>{
    localStorage.removeItem('prometeo.capture.workspace.secret.v1');
    localStorage.removeItem('prometeo.capture.workspace.secret.v2');
    scrollTo(0,0);
    document.querySelector('.tab[data-view="espacios"]')?.click();
  });
  const noteButtons=page.locator('#workspacesV11 [data-notes]');
  await noteButtons.first().waitFor({state:'visible',timeout:20000});
  const pageId=await noteButtons.first().getAttribute('data-notes');
  assert.ok(pageId,'a page-scoped note button must carry page identity');
  await noteButtons.first().evaluate(el=>el.click());
  await page.locator('#prometeoChangeLoop.open').waitFor({state:'visible',timeout:10000});
  await page.locator('#pclText').waitFor({state:'visible',timeout:10000});
  const initialLocalText=(await page.locator('#prometeoChangeLoop').innerText()).toLowerCase();
  assert.match(initialLocalText,/local-first|notas nuevas/);
  const sentinel='CI_LOCAL_ONLY_'+Date.now();
  await page.locator('#pclText').fill(sentinel);
  await page.locator('[data-act="text"]').click();
  await page.waitForFunction(value=>document.querySelector('#prometeoChangeLoop')?.innerText.includes(value),sentinel,{timeout:10000});
  const routed=new URL(page.url());
  assert.equal(routed.searchParams.get('view'),'espacios');
  assert.equal(routed.searchParams.get('page'),pageId);
  assert.equal(routed.searchParams.get('panel'),'notes');
  assert.equal(page.url().includes(sentinel),false,'private note text must never enter URL');
  pass('local_first_capture_and_exact_back',{page_id:pageId,route:{view:routed.searchParams.get('view'),page:routed.searchParams.get('page'),panel:routed.searchParams.get('panel')},private_text_in_url:false});

  await page.evaluate(()=>{
    localStorage.removeItem('prometeo.capture.workspace.secret.v1');
    localStorage.removeItem('prometeo.capture.workspace.secret.v2');
  });
  await page.reload({waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#prometeoChangeLoop.open').waitFor({state:'visible',timeout:20000});
  await page.waitForFunction(value=>document.querySelector('#prometeoChangeLoop')?.innerText.includes(value),sentinel,{timeout:12000});
  assert.equal(new URL(page.url()).searchParams.get('page'),pageId);
  pass('exact_back_reload_restores_local_capture',{page_id:pageId,persisted:true});

  await page.goBack({waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).searchParams.get('panel'),null,'Back must leave the semantic notes panel state');
  assert.equal(await page.locator('#prometeoChangeLoop.open').count(),0,'Back must close Notes when route no longer requests it');
  await page.goForward({waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('#prometeoChangeLoop.open').waitFor({state:'visible',timeout:12000});
  await page.waitForFunction(value=>document.querySelector('#prometeoChangeLoop')?.innerText.includes(value),sentinel,{timeout:12000});
  assert.equal(new URL(page.url()).searchParams.get('panel'),'notes');
  pass('exact_back_browser_history',{page_id:pageId,back_closed:true,forward_restored:true});

  const narrow=await browser.newContext({viewport:{width:390,height:844}});
  const narrowPage=await narrow.newPage();
  const narrowResponse=await narrowPage.goto(browserUrl.href,{waitUntil:'domcontentloaded',timeout:45000});
  const narrowStatus=narrowResponse?.status()??null;
  await narrowPage.waitForTimeout(2500);
  const narrowShot=path.join(outDir,'v11-narrow.png');
  await narrowPage.screenshot({path:narrowShot,fullPage:true});
  evidence.screenshots.push('v11-narrow.png');
  const geometry=await narrowPage.evaluate(()=>({
    innerWidth:window.innerWidth,
    scrollWidth:document.documentElement.scrollWidth,
    bodyScrollWidth:document.body.scrollWidth
  }));
  if(narrowStatus===200 && geometry.scrollWidth<=geometry.innerWidth+2){
    pass('narrow_layout',{status:narrowStatus,viewport:{width:390,height:844},geometry});
  }else{
    fail('narrow_layout',{status:narrowStatus,viewport:{width:390,height:844},geometry});
    hardFailures.push('narrow_layout');
  }
  await narrow.close();

  const iframeCount=await page.locator('iframe').count();
  const preview=await requestJson(desktop.request,previewManifestUrl,'preview manifest');
  const previewRows=Array.isArray(preview.json?.surfaces)?preview.json.surfaces:[];
  const previewOk=iframeCount===0
    && preview.status===200
    && preview.json?.schema==='prometeo.static-preview-manifest/v1'
    && previewRows.length>0
    && previewRows.every(row=>row.state!=='AVAILABLE'||String(row.preview_path||'').endsWith('.png'));
  const previewDetails={iframe_count:iframeCount,status:preview.status,manifest_schema:preview.json?.schema||null,surface_count:previewRows.length,json_error:preview.error};
  if(previewOk) pass('static_previews_no_live_iframe',previewDetails);
  else { fail('static_previews_no_live_iframe',previewDetails); hardFailures.push('static_previews_no_live_iframe'); }

  const projectContext=await requestJson(desktop.request,projectContextUrl,'project context');
  const projectRows=Array.isArray(projectContext.json?.projects)?projectContext.json.projects:[];
  const projectOk=projectContext.status===200
    && projectContext.json?.schema==='prometeo.project-context-index/v1'
    && projectContext.json?.projection_status==='NON_AUTHORITATIVE_PROJECTION'
    && Number.isInteger(projectContext.json?.project_count)
    && projectContext.json.project_count===projectRows.length;
  const projectDetails={status:projectContext.status,schema:projectContext.json?.schema||null,project_count:projectContext.json?.project_count??null,rows:projectRows.length,projection_status:projectContext.json?.projection_status||null,json_error:projectContext.error};
  if(projectOk) pass('project_context_truthful',projectDetails);
  else { fail('project_context_truthful',projectDetails); hardFailures.push('project_context_truthful'); }

  const stats=await requestJson(desktop.request,statsUrl,'stats projection');
  const statsTruth=Array.isArray(stats.json?.truth_boundaries)?stats.json.truth_boundaries:[];
  const statsOk=stats.status===200
    && stats.json?.schema==='prometeo.control-room-stats/v1'
    && stats.json?.authority==='OBSERVABILITY_ONLY'
    && statsTruth.some(x=>String(x).includes('Missing evidence is unknown'));
  const statsDetails={status:stats.status,schema:stats.json?.schema||null,authority:stats.json?.authority||null,source_mode:stats.json?.source_mode||null,truth_boundaries:statsTruth,json_error:stats.error};
  if(statsOk) pass('stats_truthful',statsDetails);
  else { fail('stats_truthful',statsDetails); hardFailures.push('stats_truthful'); }

  evidence.authenticated_transport={
    state:'BOUNDARY_NOT_EXERCISED',
    pass:false,
    reason:'This CI intentionally does not submit a private command or claim wake/auth transport without credentials and owned private packet evidence.'
  };
  evidence.completed_at=new Date().toISOString();
  if(hardFailures.length){
    evidence.ui_source_overall='FAIL';
    evidence.overall='FAIL';
    evidence.hard_failures=hardFailures;
    save();
    console.error('mp10_v11_served_browser_ci_v1: FAIL',hardFailures.join(','));
    process.exitCode=1;
  }else{
    evidence.ui_source_overall='PASS';
    evidence.overall='PASS_WITH_AUTH_BOUNDARY';
    save();
    console.log('mp10_v11_served_browser_ci_v1: PASS_WITH_AUTH_BOUNDARY');
  }
}catch(error){
  evidence.ui_source_overall='FAIL';
  evidence.overall='FAIL';
  evidence.completed_at=new Date().toISOString();
  evidence.error={message:String(error?.message||error),stack:String(error?.stack||'')};
  fail('terminal',evidence.error);
  save();
  console.error(error);
  process.exitCode=1;
}finally{
  if(browser) await browser.close();
}
