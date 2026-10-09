#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const url=process.env.ATELIER_URL || 'http://127.0.0.1:8765/ui-workspace-v1/visual-system/duotone-atelier-v1/proof.html';
const folder=process.env.ATELIER_EVIDENCE_DIR || 'artifacts/duotone-widget-atelier';
(async()=>{
 fs.mkdirSync(folder,{recursive:true});
 const browser=await chromium.launch({headless:true});
 let tests=0;
 const sizes=[360,390,430,844,1440];
 for(const width of sizes){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto(url,{waitUntil:'networkidle'});
  assert.equal(response.status(),200,'HTTP local candidate '+width);tests++;
  await page.locator('.card').first().waitFor();
  assert.equal(await page.locator('.card').count(),3,'cards '+width);tests++;
  assert.equal(await page.locator('[data-view="home"]').isVisible(),true,'home '+width);tests++;
  const metrics=await page.evaluate(()=>({
   viewport:innerWidth,scroll:document.documentElement.scrollWidth,
   card:document.querySelector('.card').getBoundingClientRect().width,
   meta:parseFloat(getComputedStyle(document.querySelector('.note')).fontSize),
   imgs:[...document.querySelectorAll('.card img')].every(im=>im.complete&&im.naturalWidth>0)
  }));
  assert.ok(metrics.scroll<=metrics.viewport+1,'no global overflow '+width+JSON.stringify(metrics));tests++;
  assert.equal(metrics.imgs,true,'images actually load '+width);tests++;
  assert.ok(metrics.meta>=14,'legible note '+width);tests++;
  if(width===390){const visible=(width-35)/(metrics.card+12);assert.ok(visible>=1.2&&visible<=1.5,'1.2..1.5 cards 390 '+visible);tests++;}
  await page.locator('.card').first().click();
  assert.equal(await page.locator('#project').isVisible(),true,'project '+width);tests++;
  await page.locator('#back').click();
  assert.equal(await page.locator('#home').isVisible(),true,'back '+width);tests++;
  await page.locator('[data-go=chat]').first().click();
  assert.equal(await page.locator('#chat').isVisible(),true,'chat '+width);tests++;
  await page.locator('#chat summary').click();
  assert.equal(await page.locator('#chat details').getAttribute('open'),'','expand response '+width);tests++;
  await page.locator('#invert').click();
  assert.equal(await page.locator('#invert').getAttribute('aria-pressed'),'true','invert '+width);tests++;
  assert.deepEqual(errors,[],'no JS errors '+width);tests++;
  await page.screenshot({path:path.join(folder,'atelier-'+width+'.png'),fullPage:true});tests++;
  await page.close();
 }
 await browser.close();
 console.log('BICOLOR_ATELIER_LOCAL_HTTP_BROWSER_PASS '+tests+' across '+sizes.join(','));
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
