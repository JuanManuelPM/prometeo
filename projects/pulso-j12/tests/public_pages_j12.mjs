import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const pageBase='https://juanmanuelpm.github.io/prometeo';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const out='projects/pulso-j12/validation';await fs.mkdir(out,{recursive:true});
const proof={state:'UNKNOWN',checks:[],errors:[]};
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
page.on('pageerror',e=>proof.errors.push(e.message));
const check=(name,ok,details)=>{proof.checks.push({name,pass:!!ok,details});assert.ok(ok,name+' '+JSON.stringify(details));};
try {
  await page.goto(pageBase+'/tv/chat/relevo/retomar/#pulso-j12',{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>!!document.querySelector('[data-project="pulso-j12"]'),null,{timeout:40000});
  const card=page.locator('[data-project="pulso-j12"]');
  check('actual project appears in living catalog',await card.isVisible());
  await card.click();
  check('project selected and history state kept',await card.getAttribute('aria-pressed')==='true');
  const link=page.locator('a[href="/prometeo/experiments/emblem-001-pulso/PULSO_JUGAR.html"]');
  check('published game is the project destination',await link.count()>0);
  const publicRegistry=await page.evaluate(async()=>{const response=await fetch('./reentrada.json?proof='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('registry HTTP '+response.status);return response.json();});
  const verified=publicRegistry.public_receipts?.find(r=>r.id==='j12_pulso_served_20261010_v1');
  check('public SERVED_VERIFIED receipt present',verified?.state==='SERVED_VERIFIED',verified);
  check('served blob SHA anchored to exact bytes',verified?.version_sha==='af35726605e3a8379e4787b6890ca35db2dcf111',verified?.version_sha);
  check('no browser exceptions',proof.errors.length===0,proof.errors);
  await page.screenshot({path:out+'/catalog-mobile.png',fullPage:false});
  proof.state='PASS';
} catch(e) {proof.state='FAIL';proof.failure=String(e.stack||e);await page.screenshot({path:out+'/catalog-FAILED.png'}).catch(()=>{});}
finally{await context.close();await browser.close();await fs.writeFile(out+'/catalog-proof.json',JSON.stringify(proof,null,2));}
console.log(JSON.stringify({state:proof.state,checks:proof.checks.map(x=>x.name),failure:proof.failure,errors:proof.errors}));
if(proof.state!=='PASS')process.exitCode=1;
