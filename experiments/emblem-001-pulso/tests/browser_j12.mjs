import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const BASE=process.env.PULSO_ORIGIN||'http://127.0.0.1:8765';
const OUT='experiments/emblem-001-pulso/validation/j12-ci';
await fs.mkdir(OUT,{recursive:true});
const reports=[];const browser=await chromium.launch({headless:true,args:['--no-sandbox']});let failed=false;
for(const v of [{w:390,h:844,name:'portrait',touch:true},{w:844,h:390,name:'landscape',touch:true},{w:1440,h:900,name:'desktop',touch:false}]){
 const context=await browser.newContext({viewport:{width:v.w,height:v.h},hasTouch:v.touch,isMobile:v.touch,deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage();const errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
 const record={viewport:v.name,checks,errors};reports.push(record);
 const check=(name,ok,detail)=>{checks.push({name,ok});assert.ok(ok,v.name+'/'+name+' '+JSON.stringify(detail||''));};
 try{
 for(const file of ['index.html','PULSO_JUGAR.html']){
  const url=BASE+'/experiments/emblem-001-pulso/'+file+'?test=1';
  const response=await page.goto(url,{waitUntil:'load',timeout:30000});
  check(file+' HTTP200',response?.status()===200,response?.status());
  await page.waitForFunction(()=>!!window.__PULSO_TEST__,null,{timeout:12000});
  check(file+' fits width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  check(file+' start visible',await page.locator('#play').isVisible());
  if(file==='index.html')await page.screenshot({path:OUT+'/'+v.name+'-menu.png'});
  await page.locator('#play').click();
  const first=await page.evaluate(()=>window.__PULSO_TEST__.snapshot());
  check(file+' phase playing',first.phase==='playing');
  if(v.touch){
   const stick=await page.locator('#stick').boundingBox(),boost=await page.locator('#turbo').boundingBox();
   check(file+' visible touch controls',!!stick&&!!boost&&stick.y>=0&&boost.y>=0&&stick.y+stick.height<=v.h+2&&boost.y+boost.height<=v.h+2,{stick,boost});
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:Math.round(stick.x+stick.width*.84),y:Math.round(stick.y+stick.height*.5)},{id:2,x:Math.round(boost.x+boost.width*.5),y:Math.round(boost.y+boost.height*.5)}]});
   await page.waitForTimeout(2050);
   const moved=await page.evaluate(()=>window.__PULSO_TEST__.snapshot());
   check(file+' two-touch movement',moved.blue.x>first.blue.x+15,[first.blue.x,moved.blue.x]);
   check(file+' turbo consumed',moved.blue.boost<99,moved.blue.boost);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await cdp.detach();
  }else{
   await page.keyboard.down('d');await page.waitForTimeout(2050);await page.keyboard.up('d');
   const moved=await page.evaluate(()=>window.__PULSO_TEST__.snapshot());
   check(file+' keyboard movement',moved.blue.x>first.blue.x+30,[first.blue.x,moved.blue.x]);
  }
  await page.locator('#pause').click();
  const paused=await page.evaluate(()=>window.__PULSO_TEST__.snapshot());
  check(file+' pause',paused.phase==='paused'&&await page.locator('#resume').isVisible());
  await page.waitForTimeout(180);
  check(file+' clock freeze',paused.remaining===(await page.evaluate(()=>window.__PULSO_TEST__.snapshot())).remaining);
  await page.locator('#resume').click();
  check(file+' resume',(await page.evaluate(()=>window.__PULSO_TEST__.snapshot())).phase==='playing');
  await page.evaluate(()=>window.__PULSO_TEST__.forceGoal('blue'));
  check(file+' goal',await page.locator('#blueScore').innerText()==='1');
  await page.evaluate(()=>window.__PULSO_TEST__.forceEnd());
  check(file+' final',(await page.locator('#result').innerText()).includes('FINAL'));
  await page.locator('#play').click();
  check(file+' replay',(await page.evaluate(()=>window.__PULSO_TEST__.snapshot())).score.blue===0);
  if(file==='index.html')await page.screenshot({path:OUT+'/'+v.name+'-playing.png'});
 }
 check('no runtime errors',errors.length===0,errors);
 }catch(e){failed=true;record.failure=String(e.stack||e);await page.screenshot({path:OUT+'/'+v.name+'-FAILED.png'}).catch(()=>{});}
 await context.close();
}
await browser.close();await fs.writeFile(OUT+'/report.json',JSON.stringify({state:failed?'FAIL':'PASS',reports},null,2));
console.log(JSON.stringify({state:failed?'FAIL':'PASS',reports:reports.map(r=>({viewport:r.viewport,checks:r.checks.length,failure:r.failure,errors:r.errors}))}));
if(failed)process.exitCode=1;
