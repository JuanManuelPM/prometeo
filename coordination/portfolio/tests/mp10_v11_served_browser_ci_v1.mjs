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
const previewManifestUrl=new URL('./previews/manifest.json',publicUrl).href;
const scriptUrl=new URL('./v11.js',publicUrl).href;
const changeLoopUrl=new URL('../../shared/capture/v1/change-loop.js',publicUrl).href;
const stableControlUrl=new URL('../control/',publicUrl).href;
const indexPath='current-tree/control-v11/index.html';
const scriptPath='current-tree/control-v11/v11.js';
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

  evidence.served_identity={index:indexIdentity,v11_js:scriptIdentity,change_loop:changeIdentity,stable_control:stableIdentity};
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

  const servedIndexText=servedIndex.toString('utf8');
  const servedScriptText=servedScript.toString('utf8');
  const servedChangeText=servedChange.toString('utf8');
  assert.match(servedIndexText,/id="notesBtn"/,'object drawer must expose universal Notes');
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
    assert.match((await state.textContent())||'',/Sin enviar/i);
    const postsBefore=evidence.requests.filter(r=>r.method==='POST').length;
    await command.fill('verificación CI · no enviar');
    await page.waitForTimeout(350);
    const postsAfter=evidence.requests.filter(r=>r.method==='POST').length;
    assert.equal(postsAfter,postsBefore,'editing command text must not submit work');
    assert.match((await state.textContent())||'',/Sin enviar/i,'editing without HACER must remain unsent');
    pass('command_dom_fail_closed',{maxlength:6000,button:'HACER',posts_before:postsBefore,posts_after:postsAfter,state:(await state.textContent())?.trim()});
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
