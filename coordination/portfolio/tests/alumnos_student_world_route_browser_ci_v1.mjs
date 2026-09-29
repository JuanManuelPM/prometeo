#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL = process.env.ALUMNOS_ROUTE_CANARY_URL || 'https://juanmanuelpm.github.io/prometeo/__canary/portfolio-alumnos-student-world-live-route-bridge-v1/';
const EXPECTED_BLOB = process.env.ALUMNOS_ROUTE_EXPECTED_BLOB || 'f7c31e2edc4aa8b7affcf0d25c60a9856f1def72';
const OUT_DIR = process.env.ALUMNOS_ROUTE_ARTIFACT_DIR || 'artifacts/alumnos-student-world-route-browser-ci';
const PROPAGATION_MS = Number(process.env.ALUMNOS_ROUTE_PROPAGATION_MS || 30000);

const DONOR_URL = 'https://juanmanuelpm.github.io/prometeo/pages/PROMETEO_STUDENT_WORLD_MAP_FIXED_OPEN_ME.html';
const STUDY_URL = 'https://juanmanuelpm.github.io/jose-study/';
const ALGEBRA_URL = 'https://juanmanuelpm.github.io/prometeo/pages/JOSE_RECUPERACION_ALGEBRA_FINAL.html';

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
    return {url,http_status:response.status,final_url:response.url,bytes:bytes.length,blob_sha:response.ok?gitBlobSha(bytes):null};
  }catch(error){
    return {url,http_status:null,error:error?.message||String(error)};
  }
}

async function probeCanary(){
  const started=Date.now();
  let last=null;
  do{
    last=await probe(TARGET_URL);
    if(last.http_status===200) return {...last,expected_blob:EXPECTED_BLOB,matched_expected:last.blob_sha===EXPECTED_BLOB};
    await sleep(5000);
  }while(Date.now()-started<PROPAGATION_MS);
  return {...last,expected_blob:EXPECTED_BLOB,matched_expected:false};
}

async function runView(browser,view,canary){
  const context=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch,locale:'es-AR'});
  const page=await context.newPage();
  const runtime={page_errors:[],console_errors:[],request_failures:[]};
  page.on('pageerror',e=>runtime.page_errors.push(e?.message||String(e)));
  page.on('console',m=>{if(m.type()==='error')runtime.console_errors.push(m.text())});
  page.on('requestfailed',r=>runtime.request_failures.push({url:r.url(),error:r.failure()?.errorText||'request_failed'}));

  const result={
    view:view.id,
    viewport:view.viewport,
    target_url:TARGET_URL,
    canary_http_status:canary.http_status,
    canary_blob:canary.blob_sha||null,
    criteria:{},
    runtime
  };

  const [study,algebra,donor]=await Promise.all([probe(STUDY_URL),probe(ALGEBRA_URL),probe(DONOR_URL)]);
  result.targets={study,algebra,donor};
  result.criteria.study_target_resolves=study.http_status!==null&&study.http_status<400;
  result.criteria.algebra_target_resolves=algebra.http_status!==null&&algebra.http_status<400;
  result.criteria.donor_target_resolves=donor.http_status!==null&&donor.http_status<400;
  result.criteria.canary_http_ok=canary.http_status===200;
  result.criteria.canary_source_identity=canary.http_status===200&&canary.blob_sha===EXPECTED_BLOB;

  try{
    const response=await page.goto(TARGET_URL,{waitUntil:'domcontentloaded',timeout:30000});
    result.navigation_http_status=response?.status()??null;
    await page.screenshot({path:path.join(OUT_DIR,view.id+'-initial.png'),fullPage:true});

    if(result.navigation_http_status!==200){
      result.criteria.donor_embedded=false;
      result.criteria.route_toggle_open_close=false;
      result.criteria.escape_closes=false;
      result.criteria.resize_not_stranded=false;
      result.fatal_product_boundary='CANARY_HTTP_'+String(result.navigation_http_status);
    }else{
      await page.waitForSelector('#routeToggle',{timeout:10000});
      const iframe=page.locator('#world');
      const iframeSrc=await iframe.getAttribute('src');
      result.iframe_src=iframeSrc;
      result.criteria.donor_embedded=iframeSrc===DONOR_URL;

      const toggle=page.locator('#routeToggle');
      const routes=page.locator('#routes');
      await toggle.click();
      const opened=await routes.evaluate(el=>el.classList.contains('open'));
      const expandedOpen=await toggle.getAttribute('aria-expanded');
      await page.screenshot({path:path.join(OUT_DIR,view.id+'-open.png'),fullPage:true});

      await toggle.click();
      const closed=!(await routes.evaluate(el=>el.classList.contains('open')));
      const expandedClosed=await toggle.getAttribute('aria-expanded');
      result.criteria.route_toggle_open_close=opened&&closed&&expandedOpen==='true'&&expandedClosed==='false';

      await toggle.click();
      await page.keyboard.press('Escape');
      result.criteria.escape_closes=!(await routes.evaluate(el=>el.classList.contains('open')))&&await toggle.getAttribute('aria-expanded')==='false';

      await toggle.click();
      await page.setViewportSize({width:Math.max(320,view.viewport.width-40),height:view.viewport.height});
      const afterResizeOpen=await routes.evaluate(el=>el.classList.contains('open'));
      const right=await toggle.evaluate(el=>getComputedStyle(el).right);
      result.resize={open:afterResizeOpen,toggle_right:right};
      result.criteria.resize_not_stranded=afterResizeOpen&&right!=='0px';

      const hrefs=await page.locator('a.route').evaluateAll(nodes=>nodes.map(a=>a.href));
      result.route_hrefs=hrefs;
      result.criteria.route_targets_exact=hrefs.includes(STUDY_URL)&&hrefs.includes(ALGEBRA_URL);
      await page.screenshot({path:path.join(OUT_DIR,view.id+'-resized-open.png'),fullPage:true});
    }
  }catch(error){
    result.fatal_error=error?.stack||error?.message||String(error);
    try{await page.screenshot({path:path.join(OUT_DIR,view.id+'-fatal.png'),fullPage:true})}catch{}
  }finally{
    await context.close();
  }

  result.criteria.runtime_errors_captured=true;
  result.criteria.no_uncaught_page_errors=runtime.page_errors.length===0;
  const checks=Object.values(result.criteria);
  result.pass=!result.fatal_error&&!result.fatal_product_boundary&&checks.length>=10&&checks.every(Boolean);
  return result;
}

async function main(){
  await mkdir(OUT_DIR,{recursive:true});
  const canary=await probeCanary();
  const evidence={
    schema:'prometeo.alumnos-student-world-route-browser-ci/v1',
    generated_at:new Date().toISOString(),
    target_url:TARGET_URL,
    expected_blob:EXPECTED_BLOB,
    public_canary:canary,
    authority:'TECHNICAL_VERIFICATION_ONLY_NO_CURRENT_CATALOG_HUMAN_ACCEPTED_OR_SERVED_PROMOTION',
    views:[],
    status:'PENDING'
  };

  const browser=await chromium.launch({headless:true});
  try{
    for(const view of views) evidence.views.push(await runView(browser,view,canary));
  }finally{
    await browser.close();
  }

  evidence.status=canary.http_status===200&&canary.blob_sha===EXPECTED_BLOB&&evidence.views.every(v=>v.pass)?'PASS':'FAIL';
  evidence.summary={
    canary_http_ok:canary.http_status===200,
    canary_source_match:canary.blob_sha===EXPECTED_BLOB,
    desktop_pass:evidence.views.find(v=>v.view==='desktop')?.pass||false,
    narrow_pass:evidence.views.find(v=>v.view==='narrow')?.pass||false
  };
  await writeFile(path.join(OUT_DIR,'evidence.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log(JSON.stringify(evidence,null,2));
  process.exit(evidence.status==='PASS'?0:1);
}

await main();
