#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET_URL = process.env.ALUMNOS_ADOPTION_URL || 'https://juanmanuelpm.github.io/prometeo/__candidate/portfolio-alumnos-student-world-route-adoption-candidate-v1/G000001/';
const EXPECTED_BLOB = process.env.ALUMNOS_ADOPTION_EXPECTED_BLOB || '6488c296f8f4793cb45087207c01747af13dd1bf';
const EXPECTED_DONOR_BLOB = process.env.ALUMNOS_ADOPTION_DONOR_BLOB || 'fa069bf02362243afd5cf04676de8cf2b2fc852c';
const OUT_DIR = process.env.ALUMNOS_ADOPTION_ARTIFACT_DIR || 'artifacts/alumnos-student-world-route-adoption-browser-ci';
const PROPAGATION_MS = Number(process.env.ALUMNOS_ADOPTION_PROPAGATION_MS || 30000);
const AUTHORITY_MARKER = 'CANDIDATE_ADOPTION_PATCH_NOT_CURRENT_NOT_HUMAN_ACCEPTED_NOT_SERVED';

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

async function waitForCandidate(){
  const started=Date.now();
  let last=null;
  do{
    last=await probe(TARGET_URL);
    if(last.http_status===200 && last.blob_sha===EXPECTED_BLOB) return last;
    await sleep(5000);
  }while(Date.now()-started<PROPAGATION_MS);
  return last;
}

async function resolveToggle(page){
  let toggle=page.getByRole('button',{name:/rutas.*jos/i}).first();
  if(await toggle.count()) return toggle;
  toggle=page.locator('button').filter({hasText:/jos/i}).first();
  if(await toggle.count()) return toggle;
  return null;
}

async function visible(locator){
  try{return await locator.isVisible()}catch{return false}
}

async function runView(browser,view,candidate,donor,study,algebra){
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
    candidate_http_status:candidate?.http_status??null,
    candidate_blob:candidate?.blob_sha??null,
    donor_blob:donor?.blob_sha??null,
    criteria:{},
    runtime,
    targets:{study,algebra,donor}
  };

  result.criteria.candidate_http_ok=candidate?.http_status===200;
  result.criteria.candidate_source_identity=candidate?.blob_sha===EXPECTED_BLOB;
  result.criteria.donor_http_ok=donor?.http_status===200;
  result.criteria.donor_source_identity=donor?.blob_sha===EXPECTED_DONOR_BLOB;
  result.criteria.study_target_resolves=study?.http_status!==null&&study.http_status<400;
  result.criteria.algebra_target_resolves=algebra?.http_status!==null&&algebra.http_status<400;

  try{
    const response=await page.goto(TARGET_URL,{waitUntil:'domcontentloaded',timeout:30000});
    result.navigation_http_status=response?.status()??null;
    result.criteria.navigation_http_ok=result.navigation_http_status===200;

    const html=await page.content();
    result.criteria.authority_marker_present=html.includes(AUTHORITY_MARKER);

    const studyLink=page.locator(`a[href="${STUDY_URL}"]`).first();
    const algebraLink=page.locator(`a[href="${ALGEBRA_URL}"]`).first();
    result.criteria.study_link_present=await studyLink.count()===1;
    result.criteria.algebra_link_present=await algebraLink.count()===1;

    const toggle=await resolveToggle(page);
    if(!toggle){
      result.criteria.route_toggle_present=false;
      result.criteria.route_open_close=false;
      result.criteria.escape_closes=false;
      result.criteria.resize_not_stranded=false;
      result.fatal_product_boundary='ROUTE_TOGGLE_NOT_FOUND';
    }else{
      result.criteria.route_toggle_present=true;
      await toggle.waitFor({state:'visible',timeout:10000});
      result.toggle_text=(await toggle.innerText()).trim();
      result.toggle_aria_controls=await toggle.getAttribute('aria-controls');

      await page.screenshot({path:path.join(OUT_DIR,view.id+'-initial.png'),fullPage:true});

      if(await toggle.getAttribute('aria-expanded')==='true') await toggle.click();

      await toggle.click();
      await page.waitForTimeout(120);
      const expandedOpen=await toggle.getAttribute('aria-expanded');
      const openLinksVisible=(await visible(studyLink))&&(await visible(algebraLink));
      await page.screenshot({path:path.join(OUT_DIR,view.id+'-open.png'),fullPage:true});

      await toggle.click();
      await page.waitForTimeout(120);
      const expandedClosed=await toggle.getAttribute('aria-expanded');
      result.criteria.route_open_close=expandedOpen==='true'&&expandedClosed==='false'&&openLinksVisible;

      await toggle.click();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(120);
      result.criteria.escape_closes=(await toggle.getAttribute('aria-expanded'))==='false';

      await toggle.click();
      await page.setViewportSize({width:Math.max(320,view.viewport.width-40),height:view.viewport.height});
      await page.waitForTimeout(120);
      const box=await toggle.boundingBox();
      result.resize={toggle_box:box,expanded:await toggle.getAttribute('aria-expanded')};
      result.criteria.resize_not_stranded=Boolean(box&&box.width>0&&box.height>0)&&
        (await toggle.getAttribute('aria-expanded'))==='true'&&
        (await visible(studyLink))&&(await visible(algebraLink));
      await page.screenshot({path:path.join(OUT_DIR,view.id+'-resized-open.png'),fullPage:true});
    }
  }catch(error){
    result.fatal_error=error?.stack||error?.message||String(error);
    try{await page.screenshot({path:path.join(OUT_DIR,view.id+'-fatal.png'),fullPage:true})}catch{}
  }finally{
    await context.close();
  }

  result.criteria.no_uncaught_page_errors=runtime.page_errors.length===0;
  const checks=Object.values(result.criteria);
  result.pass=!result.fatal_error&&!result.fatal_product_boundary&&checks.length>=14&&checks.every(Boolean);
  return result;
}

async function main(){
  await mkdir(OUT_DIR,{recursive:true});
  const [candidate,donor,study,algebra]=await Promise.all([
    waitForCandidate(),
    probe(DONOR_URL),
    probe(STUDY_URL),
    probe(ALGEBRA_URL)
  ]);

  const evidence={
    schema:'prometeo.alumnos-student-world-route-adoption-browser-ci/v1',
    generated_at:new Date().toISOString(),
    target_url:TARGET_URL,
    expected_candidate_blob:EXPECTED_BLOB,
    expected_donor_blob:EXPECTED_DONOR_BLOB,
    authority:'TECHNICAL_CANDIDATE_VERIFICATION_ONLY_NO_CURRENT_CATALOG_HUMAN_ACCEPTED_OR_SERVED_PROMOTION',
    candidate,
    donor,
    targets:{study,algebra},
    views:[],
    status:'PENDING'
  };

  const browser=await chromium.launch({headless:true});
  try{
    for(const view of views) evidence.views.push(await runView(browser,view,candidate,donor,study,algebra));
  }finally{
    await browser.close();
  }

  evidence.status=candidate?.http_status===200&&candidate?.blob_sha===EXPECTED_BLOB&&
    donor?.http_status===200&&donor?.blob_sha===EXPECTED_DONOR_BLOB&&
    evidence.views.every(v=>v.pass)?'PASS':'FAIL';
  evidence.summary={
    candidate_http_ok:candidate?.http_status===200,
    candidate_source_match:candidate?.blob_sha===EXPECTED_BLOB,
    donor_source_match:donor?.blob_sha===EXPECTED_DONOR_BLOB,
    desktop_pass:evidence.views.find(v=>v.view==='desktop')?.pass||false,
    narrow_pass:evidence.views.find(v=>v.view==='narrow')?.pass||false
  };

  await writeFile(path.join(OUT_DIR,'evidence.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log(JSON.stringify(evidence,null,2));
  process.exit(evidence.status==='PASS'?0:1);
}

await main();
