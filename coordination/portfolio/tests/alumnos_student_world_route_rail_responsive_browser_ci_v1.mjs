#!/usr/bin/env node
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';

const TARGET_URL = process.env.ALUMNOS_ROUTE_CANARY_URL || 'https://juanmanuelpm.github.io/prometeo/__canary/portfolio-alumnos-student-world-live-route-bridge-v1/';
const EXPECTED_BLOB = process.env.ALUMNOS_ROUTE_EXPECTED_BLOB || '0cb9aa0450884ceb6d298a95056f7d90df9229d8';
const SETTLE_MS = 250;

const gitBlobSha = bytes => createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function publicBlob(){
  let last=null;
  for(let i=0;i<7;i++){
    const response=await fetch(TARGET_URL,{cache:'no-store',headers:{'cache-control':'no-cache'}});
    const bytes=Buffer.from(await response.arrayBuffer());
    last={status:response.status,blob:response.ok?gitBlobSha(bytes):null};
    if(last.status===200&&last.blob===EXPECTED_BLOB)return last;
    await sleep(5000);
  }
  return last;
}

async function geometry(page,label){
  return await page.evaluate(label=>{
    const rail=document.getElementById('routes');
    const toggle=document.getElementById('routeToggle');
    const rr=rail.getBoundingClientRect();
    const tr=toggle.getBoundingClientRect();
    return {
      label,
      viewport:innerWidth,
      rail_width:rr.width,
      rail_left:rr.left,
      toggle_right:tr.right,
      delta_px:Math.abs(tr.right-rr.left),
      open:rail.classList.contains('open'),
      expanded:toggle.getAttribute('aria-expanded'),
      inline_right:toggle.style.right,
      authority:document.querySelector('meta[name="prometeo-authority"]')?.content||null
    };
  },label);
}

const publicState=await publicBlob();
if(publicState.status!==200||publicState.blob!==EXPECTED_BLOB){
  console.error(JSON.stringify({status:'BOUNDARY',code:'PUBLIC_CANARY_NOT_PROPAGATED',publicState,expected_blob:EXPECTED_BLOB},null,2));
  process.exit(2);
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:500,height:800}});
const errors=[];
page.on('pageerror',e=>errors.push(e?.message||String(e)));
await page.goto(TARGET_URL,{waitUntil:'domcontentloaded',timeout:30000});

await page.click('#routeToggle');
await page.waitForTimeout(SETTLE_MS);
const open500=await geometry(page,'open-500');

await page.setViewportSize({width:360,height:800});
await page.waitForTimeout(SETTLE_MS);
const resized360=await geometry(page,'resize-open-360');

await page.keyboard.press('Escape');
await page.waitForTimeout(SETTLE_MS);
const escape360=await geometry(page,'escape-360');

await page.click('#routeToggle');
await page.waitForTimeout(SETTLE_MS);
const reopen360=await geometry(page,'reopen-360');

await browser.close();

const checks={
  authority_preserved:[open500,resized360,escape360,reopen360].every(x=>x.authority==='CANDIDATE_NOT_CURRENT_NOT_SERVED'),
  open_500_aligned:open500.open&&open500.expanded==='true'&&open500.delta_px<1&&Math.abs(open500.rail_width-300)<1,
  resize_360_aligned:resized360.open&&resized360.expanded==='true'&&resized360.delta_px<1&&Math.abs(resized360.rail_width-300)<1,
  escape_closes:!escape360.open&&escape360.expanded==='false'&&escape360.inline_right==='0px',
  click_reopens_360:reopen360.open&&reopen360.expanded==='true'&&reopen360.delta_px<1,
  no_page_errors:errors.length===0
};
const status=Object.values(checks).every(Boolean)?'PASS':'FAIL';
console.log(JSON.stringify({schema:'prometeo.alumnos-student-world-route-rail-responsive-browser-ci/v1',status,expected_blob:EXPECTED_BLOB,publicState,checks,measurements:{open500,resized360,escape360,reopen360},errors},null,2));
process.exit(status==='PASS'?0:1);
