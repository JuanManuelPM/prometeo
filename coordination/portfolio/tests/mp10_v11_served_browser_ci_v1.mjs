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
const indexPath='current-tree/control-v11/index.html';
const scriptPath='current-tree/control-v11/v11.js';

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
  assert.equal(response.status(),200,`${label} must return HTTP 200`);
  return {response,json:await response.json()};
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
  const servedIndex=await indexResponse.body();
  const sourceIndex=fs.readFileSync(indexPath);
  assert.equal(sha256(servedIndex),sha256(sourceIndex),'served index.html must match checked-out source bytes');
  pass('served_index_source_identity',{sha256:sha256(sourceIndex),bytes:sourceIndex.length});

  const scriptResponse=await desktop.request.get(scriptUrl,{timeout:20000,failOnStatusCode:false,headers:{'cache-control':'no-cache','pragma':'no-cache'}});
  assert.equal(scriptResponse.status(),200);
  const servedScript=await scriptResponse.body();
  const sourceScript=fs.readFileSync(scriptPath);
  assert.equal(sha256(servedScript),sha256(sourceScript),'served v11.js must match checked-out source bytes');
  pass('served_v11_js_source_identity',{sha256:sha256(sourceScript),bytes:sourceScript.length});

  const browserUrl=new URL(publicUrl);
  browserUrl.searchParams.set('_prometeo_browser',String(Date.now()));
  const response=await page.goto(browserUrl.href,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response?.status(),200,'desktop browser navigation must return 200');
  await page.waitForTimeout(3500);
  pass('desktop_navigation',{status:response?.status(),final_url:page.url()});

  const command=page.locator('#commandInputV11');
  const send=page.locator('#commandSendV11');
  const state=page.locator('#commandStateV11');
  await command.waitFor({state:'visible'});
  await send.waitFor({state:'visible'});
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

  assert.equal(await page.locator('iframe').count(),0,'V11 must not embed live previews via iframe');
  const preview=await requestJson(desktop.request,previewManifestUrl,'preview manifest');
  assert.equal(preview.json.schema,'prometeo.static-preview-manifest/v1');
  assert.ok(Array.isArray(preview.json.surfaces)&&preview.json.surfaces.length>0);
  assert.ok(preview.json.surfaces.every(row=>row.state!=='AVAILABLE'||String(row.preview_path||'').endsWith('.png')));
  pass('static_previews_no_live_iframe',{iframe_count:0,surface_count:preview.json.surfaces.length,manifest_schema:preview.json.schema});

  const projectContext=await requestJson(desktop.request,projectContextUrl,'project context');
  assert.equal(projectContext.json.schema,'prometeo.project-context-index/v1');
  assert.equal(projectContext.json.projection_status,'NON_AUTHORITATIVE_PROJECTION');
  assert.ok(Number.isInteger(projectContext.json.project_count));
  assert.equal(projectContext.json.project_count,projectContext.json.projects.length);
  pass('project_context_truthful',{project_count:projectContext.json.project_count,projection_status:projectContext.json.projection_status});

  const stats=await requestJson(desktop.request,statsUrl,'stats projection');
  assert.equal(stats.json.schema,'prometeo.control-room-stats/v1');
  assert.equal(stats.json.authority,'OBSERVABILITY_ONLY');
  assert.ok(Array.isArray(stats.json.truth_boundaries));
  assert.ok(stats.json.truth_boundaries.some(x=>String(x).includes('Missing evidence is unknown')));
  pass('stats_truthful',{authority:stats.json.authority,source_mode:stats.json.source_mode,truth_boundaries:stats.json.truth_boundaries});

  const desktopShot=path.join(outDir,'v11-desktop.png');
  await page.screenshot({path:desktopShot,fullPage:true});
  evidence.screenshots.push('v11-desktop.png');
  save();

  const narrow=await browser.newContext({viewport:{width:390,height:844}});
  const narrowPage=await narrow.newPage();
  const narrowResponse=await narrowPage.goto(browserUrl.href,{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(narrowResponse?.status(),200);
  await narrowPage.waitForTimeout(2500);
  await narrowPage.locator('#commandInputV11').waitFor({state:'visible'});
  const geometry=await narrowPage.evaluate(()=>({
    innerWidth:window.innerWidth,
    scrollWidth:document.documentElement.scrollWidth,
    bodyScrollWidth:document.body.scrollWidth
  }));
  assert.ok(geometry.scrollWidth<=geometry.innerWidth+2,`narrow layout overflows viewport: ${JSON.stringify(geometry)}`);
  const narrowShot=path.join(outDir,'v11-narrow.png');
  await narrowPage.screenshot({path:narrowShot,fullPage:true});
  evidence.screenshots.push('v11-narrow.png');
  pass('narrow_layout',{viewport:{width:390,height:844},geometry});
  await narrow.close();

  evidence.ui_source_overall='PASS';
  evidence.authenticated_transport={
    state:'BOUNDARY_NOT_EXERCISED',
    pass:false,
    reason:'This CI intentionally does not submit a private command or claim wake/auth transport without credentials and owned private packet evidence.'
  };
  evidence.overall='PASS_WITH_AUTH_BOUNDARY';
  evidence.completed_at=new Date().toISOString();
  save();
  console.log('mp10_v11_served_browser_ci_v1: PASS_WITH_AUTH_BOUNDARY');
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
