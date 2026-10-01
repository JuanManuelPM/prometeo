#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE='https://juanmanuelpm.github.io/prometeo/__candidate/portfolio-alumnos-student-world-jose-catalog-route-extension-candidate-v1/G000001/';
const TARGET_URL=process.env.ALUMNOS_JOSE_CATALOG_URL||BASE;
const EXPECTED_INDEX_BLOB=process.env.ALUMNOS_JOSE_CATALOG_INDEX_BLOB||'9a7e304ee2209f7e3c5f5978a4f5db1da77caee8';
const EXPECTED_MANIFEST_BLOB=process.env.ALUMNOS_JOSE_CATALOG_MANIFEST_BLOB||'2e8cd6287ccececf6ca3f22e878f64f8f2aa87ba';
const EXPECTED_DIFF_BLOB=process.env.ALUMNOS_JOSE_CATALOG_DIFF_BLOB||'4681156eb48ec11de3f62974ab7998ef53547fb4';
const OUT_DIR=process.env.ALUMNOS_JOSE_CATALOG_ARTIFACT_DIR||'artifacts/alumnos-student-world-jose-catalog-route-extension-browser-ci';
const PROPAGATION_MS=Number(process.env.ALUMNOS_JOSE_CATALOG_PROPAGATION_MS||180000);
const AUTHORITY='CANDIDATE_ONLY_NOT_CURRENT_NOT_HUMAN_ACCEPTED_NOT_SERVED';
const DONOR_BLOB='6488c296f8f4793cb45087207c01747af13dd1bf';
const ROUTES=[
  ['José Study','https://juanmanuelpm.github.io/jose-study/','existing_verified'],
  ['Álgebra · Recuperación','https://juanmanuelpm.github.io/prometeo/pages/JOSE_RECUPERACION_ALGEBRA_FINAL.html','existing_verified'],
  ['Química · José','https://juanmanuelpm.github.io/prometeo/pages/Prometeo/JOSE_QUIMICA_FINAL.html','extension'],
  ['Field Atlas · Index Laws','https://juanmanuelpm.github.io/prometeo/pages/JOSE_FIELD_ATLAS_INDEX_LAWS_v02_SINGLE_FILE.html','extension'],
  ['Clase · Index Laws','https://juanmanuelpm.github.io/prometeo/pages/Prometeo/PROMETEO_JOSE_CLASE_INDEX_LAWS_V4.html','extension'],
  ['Tarea PC','https://juanmanuelpm.github.io/prometeo/pages/Prometeo/PROMETEO_TAREA_PC_FINAL.html','extension']
];
const VIEWS=[
  {id:'desktop',viewport:{width:1365,height:900},isMobile:false,hasTouch:false},
  {id:'narrow',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const gitBlobSha=bytes=>createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
async function probe(url){
  try{
    const r=await fetch(url,{cache:'no-store',redirect:'follow',headers:{'cache-control':'no-cache'}});
    const bytes=Buffer.from(await r.arrayBuffer());
    return {url,http_status:r.status,final_url:r.url,bytes:bytes.length,blob_sha:r.ok?gitBlobSha(bytes):null};
  }catch(error){return {url,http_status:null,error:error?.message||String(error)}}
}
async function waitExact(url,blob){
  const start=Date.now(); let last=null;
  do{last=await probe(url); if(last.http_status===200&&last.blob_sha===blob)return last; await sleep(5000)}while(Date.now()-start<PROPAGATION_MS);
  return last;
}
async function runView(browser,view,staticEvidence){
  const context=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch,locale:'es-AR'});
  const page=await context.newPage();
  const runtime={page_errors:[],console_errors:[],request_failures:[]};
  page.on('pageerror',e=>runtime.page_errors.push(e?.message||String(e)));
  page.on('console',m=>{if(m.type()==='error')runtime.console_errors.push(m.text())});
  page.on('requestfailed',r=>runtime.request_failures.push({url:r.url(),error:r.failure()?.errorText||'request_failed'}));
  const result={view:view.id,viewport:view.viewport,criteria:{},runtime,routes:[]};
  try{
    const response=await page.goto(TARGET_URL,{waitUntil:'domcontentloaded',timeout:30000});
    result.navigation_http_status=response?.status()??null;
    result.criteria.navigation_http_ok=result.navigation_http_status===200;
    result.criteria.index_blob_exact=staticEvidence.index?.blob_sha===EXPECTED_INDEX_BLOB;
    result.criteria.manifest_blob_exact=staticEvidence.manifest?.blob_sha===EXPECTED_MANIFEST_BLOB;
    result.criteria.diff_blob_exact=staticEvidence.diff?.blob_sha===EXPECTED_DIFF_BLOB;
    result.criteria.authority_meta_exact=(await page.locator('meta[name="prometeo-authority"]').getAttribute('content'))===AUTHORITY;
    result.criteria.donor_meta_exact=(await page.locator('meta[name="prometeo-donor-blob"]').getAttribute('content'))===DONOR_BLOB;
    const header=page.locator('#catalogRoutes');
    result.criteria.route_header_present=await header.count()===1;
    result.criteria.route_header_visible=await header.isVisible();
    const iframe=page.locator('iframe[title="Student World José donor exacto preservado"]');
    result.criteria.donor_iframe_present=await iframe.count()===1;
    result.criteria.donor_iframe_visible=await iframe.isVisible();
    result.criteria.donor_iframe_local=(await iframe.getAttribute('src'))==='./donor.html';
    for(const [label,href,kind] of ROUTES){
      const link=page.getByRole('link',{name:label,exact:true});
      const item={label,expected_href:href,expected_kind:kind,count:await link.count()};
      if(item.count===1){
        item.href=await link.getAttribute('href');
        item.kind=await link.getAttribute('data-route-kind');
        item.visible=await link.isVisible();
      }
      item.pass=item.count===1&&item.href===href&&item.kind===kind&&item.visible===true;
      result.routes.push(item);
    }
    result.criteria.exact_six_routes=result.routes.length===6&&result.routes.every(r=>r.pass);
    result.criteria.preserved_existing_routes=result.routes.slice(0,2).every(r=>r.pass);
    result.criteria.catalog_extensions=result.routes.slice(2).every(r=>r.pass);
    const box=await header.boundingBox();
    result.criteria.header_reachable=Boolean(box&&box.width>0&&box.height>0);
    result.criteria.no_uncaught_page_errors=runtime.page_errors.length===0;
    await page.screenshot({path:path.join(OUT_DIR,`${view.id}.png`),fullPage:true});
  }catch(error){
    result.fatal_error=error?.stack||error?.message||String(error);
    try{await page.screenshot({path:path.join(OUT_DIR,`${view.id}-fatal.png`),fullPage:true})}catch{}
  }finally{await context.close()}
  const checks=Object.values(result.criteria);
  result.pass=!result.fatal_error&&checks.length>=15&&checks.every(Boolean);
  return result;
}

async function main(){
  await mkdir(OUT_DIR,{recursive:true});
  const [index,manifest,diff,donor,...routeTargets]=await Promise.all([
    waitExact(TARGET_URL,EXPECTED_INDEX_BLOB),
    waitExact(new URL('manifest.json',TARGET_URL).href,EXPECTED_MANIFEST_BLOB),
    waitExact(new URL('diff.json',TARGET_URL).href,EXPECTED_DIFF_BLOB),
    probe(new URL('donor.html',TARGET_URL).href),
    ...ROUTES.map(([,href])=>probe(href))
  ]);
  const staticEvidence={index,manifest,diff,donor,route_targets:routeTargets};
  const evidence={
    schema:'prometeo.alumnos-student-world-jose-catalog-route-extension-browser-ci/v1',
    generated_at:new Date().toISOString(),
    authority:'TECHNICAL_CANDIDATE_VERIFICATION_ONLY_NO_CURRENT_CATALOG_HUMAN_ACCEPTED_OR_SERVED_PROMOTION',
    expected:{index_blob:EXPECTED_INDEX_BLOB,manifest_blob:EXPECTED_MANIFEST_BLOB,diff_blob:EXPECTED_DIFF_BLOB,donor_blob:DONOR_BLOB},
    static:staticEvidence,
    views:[],
    status:'PENDING'
  };
  try{
    const browser=await chromium.launch({headless:true});
    try{for(const view of VIEWS)evidence.views.push(await runView(browser,view,staticEvidence))}
    finally{await browser.close()}
  }catch(error){evidence.browser_launch_error=error?.stack||error?.message||String(error)}
  evidence.summary={
    index_exact:index?.http_status===200&&index?.blob_sha===EXPECTED_INDEX_BLOB,
    manifest_exact:manifest?.http_status===200&&manifest?.blob_sha===EXPECTED_MANIFEST_BLOB,
    diff_exact:diff?.http_status===200&&diff?.blob_sha===EXPECTED_DIFF_BLOB,
    donor_exact:donor?.http_status===200&&donor?.blob_sha===DONOR_BLOB,
    route_targets_resolve:routeTargets.length===6&&routeTargets.every(r=>r.http_status!==null&&r.http_status<400),
    desktop_pass:evidence.views.find(v=>v.view==='desktop')?.pass||false,
    narrow_pass:evidence.views.find(v=>v.view==='narrow')?.pass||false
  };
  evidence.status=Object.values(evidence.summary).every(Boolean)?'PASS':'FAIL';
  await writeFile(path.join(OUT_DIR,'evidence.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
  console.log(JSON.stringify(evidence,null,2));
  process.exit(evidence.status==='PASS'?0:1);
}

await main();
