import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const target=process.env.CNY001_TARGET_URL||'https://juanmanuelpm.github.io/prometeo/pages/canary/CNY001/';
const revision='381213c7697f3d59683a2ff30715442f5685d6b4';
const raw=`https://raw.githubusercontent.com/JuanManuelPM/prometeo/${revision}/pages/canary/CNY001/index.html`;
const outDir='artifacts/cny001-public-js-reachability';
fs.mkdirSync(outDir,{recursive:true});
const sha256=s=>crypto.createHash('sha256').update(s).digest('hex');

async function load(browser,viewport,name){
  const mobile=name==='narrow';
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  const consoleErrors=[]; const pageErrors=[];
  page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text())});
  page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
  const response=await page.goto(target,{waitUntil:'domcontentloaded',timeout:45000});
  const httpStatus=response?.status()??null;
  await page.locator('#js-status').waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#js-status')?.textContent==='JS_OK',{timeout:10000});
  const dom=await page.evaluate(()=>({
    plate:document.querySelector('#canary')?.getAttribute('data-plate')||null,
    authority:document.querySelector('#canary')?.getAttribute('data-authority')||null,
    humanAccepted:document.querySelector('meta[name="prometeo-human-accepted"]')?.getAttribute('content')||null,
    status:document.querySelector('meta[name="prometeo-status"]')?.getAttribute('content')||null,
    jsStatus:document.querySelector('#js-status')?.textContent||null,
    jsDataset:document.documentElement.dataset.js||null,
    title:document.title,
    bodyWidth:document.body.scrollWidth,
    documentWidth:document.documentElement.scrollWidth,
    viewportWidth:window.innerWidth,
    visualViewportWidth:window.visualViewport?.width??null,
    href:location.href
  }));
  if(httpStatus!==200) throw new Error(`${name}:HTTP_${httpStatus}`);
  if(dom.plate!=='CNY001') throw new Error(`${name}:PLATE_MISMATCH:${dom.plate}`);
  if(dom.authority!=='CANARY_ONLY_NO_CURRENT_NO_HUMAN_ACCEPTED') throw new Error(`${name}:AUTHORITY_MISMATCH:${dom.authority}`);
  if(dom.humanAccepted!=='false') throw new Error(`${name}:HUMAN_ACCEPTED_MISMATCH:${dom.humanAccepted}`);
  if(dom.status!=='candidate-canary') throw new Error(`${name}:STATUS_MISMATCH:${dom.status}`);
  if(dom.jsStatus!=='JS_OK'||dom.jsDataset!=='ok') throw new Error(`${name}:JS_RUNTIME_NOT_OK`);
  if(dom.href!==target) throw new Error(`${name}:UNEXPECTED_FINAL_URL:${dom.href}`);
  const observedViewportMatchesRequest=Math.abs(dom.viewportWidth-viewport.width)<=1;
  const clipping=dom.documentWidth>dom.viewportWidth+1 || dom.bodyWidth>dom.viewportWidth+1;
  const screenshot=path.join(outDir,`${name}.png`);
  await page.screenshot({path:screenshot,fullPage:true});
  await context.close();
  return {name,requested_viewport:viewport,mobile_emulation:mobile,http_status:httpStatus,dom,observed_viewport_matches_request:observedViewportMatchesRequest,clipping,console_errors:consoleErrors,page_errors:pageErrors,screenshot};
}

let browser;
try{
  const [publicRes,rawRes]=await Promise.all([fetch(target),fetch(raw)]);
  const [publicText,rawText]=await Promise.all([publicRes.text(),rawRes.text()]);
  if(publicRes.status!==200) throw new Error(`PUBLIC_HTTP_${publicRes.status}`);
  if(rawRes.status!==200) throw new Error(`EXPECTED_REVISION_HTTP_${rawRes.status}`);
  const publicSha=sha256(publicText), expectedRevisionSha=sha256(rawText);
  if(publicSha!==expectedRevisionSha) throw new Error(`PUBLIC_REVISION_MISMATCH:${publicSha}:${expectedRevisionSha}`);
  browser=await chromium.launch({headless:true});
  const desktop=await load(browser,{width:1280,height:800},'desktop');
  const narrow=await load(browser,{width:390,height:844},'narrow');
  const result={
    schema:'prometeo.cny001-public-js-reachability/v1',
    outcome:'PASS',
    checked_at:new Date().toISOString(),
    target_url:target,
    expected_publication_revision:revision,
    public_sha256:publicSha,
    expected_revision_sha256:expectedRevisionSha,
    revision_identity:'BYTE_IDENTICAL_TO_EXPECTED_PUBLICATION_REVISION',
    desktop,narrow,
    narrow_surface_status:narrow.clipping?'CLIPPING_OBSERVED':'NO_CLIPPING_OBSERVED',
    authority:'VERIFICATION_ONLY_NO_REGISTRY_NO_CURRENT_NO_HUMAN_ACCEPTED_NO_SERVED'
  };
  fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} catch(error){
  const result={schema:'prometeo.cny001-public-js-reachability/v1',outcome:'FAIL',checked_at:new Date().toISOString(),target_url:target,expected_publication_revision:revision,error:String(error?.stack||error)};
  fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(result,null,2)+'\n');
  console.error(JSON.stringify(result,null,2));
  process.exitCode=1;
} finally { if(browser) await browser.close(); }
