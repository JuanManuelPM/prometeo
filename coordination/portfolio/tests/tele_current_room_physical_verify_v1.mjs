import fs from 'node:fs';
import { chromium, devices } from 'playwright';

const LIVE='https://juanmanuelpm.github.io/prometeo/experiments/prometeo-live/';
const OUT='artifacts/tele-current-room-physical-verify/evidence.json';
fs.mkdirSync('artifacts/tele-current-room-physical-verify',{recursive:true});
const evidence={schema:'prometeo.tele-current-room-browser-pair/v1',generated_at:new Date().toISOString(),live_url:LIVE,checks:[],overall:'FAIL'};
const add=(name,ok,detail={})=>evidence.checks.push({name,ok,...detail});
let browser;
try {
  browser=await chromium.launch({headless:true});
  const tvCtx=await browser.newContext({viewport:{width:1440,height:900}});
  const phoneCtx=await browser.newContext({...devices['Pixel 7']});
  const tv=await tvCtx.newPage();
  const phone=await phoneCtx.newPage();

  const tvResp=await tv.goto(LIVE,{waitUntil:'domcontentloaded',timeout:60000});
  add('PUBLIC_TV_LOAD',!!tvResp?.ok(),{status:tvResp?.status()??null});
  await tv.waitForFunction(()=>/^TV-[A-Z2-9]{6}$/.test(document.querySelector('#tvPairCode')?.textContent||''),null,{timeout:30000});
  const pair=await tv.locator('#tvPairLink').getAttribute('href');
  if(!pair||!pair.includes('#')) throw new Error('PAIR_LINK_MISSING');
  add('ROOM_CREATED',true);
  await tv.locator('#tvQr canvas, #tvQr img').first().waitFor({state:'visible',timeout:15000});
  add('QR_RENDERED',true);

  try { await phone.goto(pair,{waitUntil:'domcontentloaded',timeout:60000}); }
  catch { throw new Error('REMOTE_NAVIGATION_FAILED'); }
  await phone.waitForFunction(()=>document.querySelector('#conn')?.textContent?.includes('conectado'),null,{timeout:30000});
  add('REMOTE_JOINED',true);
  await tv.waitForFunction(()=>document.querySelector('.tvPairBtn')?.classList.contains('connected'),null,{timeout:30000});
  add('TV_SEES_REMOTE',true);

  await phone.locator('[data-layout="split"]').click();
  await tv.waitForFunction(()=>document.querySelector('#grid')?.classList.contains('split'),null,{timeout:15000});
  add('LAYOUT_SPLIT_E2E',true);

  const marker='PROMETEO-TELE-CI-'+Date.now();
  await phone.locator('#text').fill(marker);
  await phone.locator('#showText').click();
  await tv.waitForFunction(m=>document.querySelector('#tvOverlayText')?.textContent===m&&document.querySelector('.tvRemoteOverlay')?.classList.contains('show'),marker,{timeout:15000});
  add('OVERLAY_E2E',true);
  await phone.locator('#clearText').click();
  await tv.waitForFunction(()=>!document.querySelector('.tvRemoteOverlay')?.classList.contains('show'),null,{timeout:15000});
  add('OVERLAY_CLEAR_E2E',true);

  await phone.locator('#media').fill('https://example.com/');
  await phone.locator('#openMedia').click();
  await tv.waitForFunction(()=>document.querySelector('#tvMedia')?.classList.contains('show')&&!!document.querySelector('#tvMedia iframe'),null,{timeout:15000});
  add('MEDIA_OPEN_E2E',true);
  await phone.locator('#closeMedia').click();
  await tv.waitForFunction(()=>!document.querySelector('#tvMedia')?.classList.contains('show'),null,{timeout:15000});
  add('MEDIA_CLOSE_E2E',true);

  const framesBefore=await tv.locator('#grid iframe').count();
  if(framesBefore>0){
    const before=await tv.locator('#grid iframe').first().getAttribute('src');
    await phone.locator('#refresh').click();
    await tv.waitForFunction(prev=>{const s=document.querySelector('#grid iframe')?.getAttribute('src')||'';return s!==prev&&s.includes('remote_refresh=')},before,{timeout:15000});
    add('REFRESH_E2E',true,{surface_count:framesBefore});
  } else add('REFRESH_E2E',false,{reason:'NO_MOUNTED_SURFACE'});

  await tv.evaluate(()=>document.querySelector('.tvPairPanel')?.classList.remove('show'));
  await phone.locator('#pair').click();
  await tv.waitForFunction(()=>document.querySelector('.tvPairPanel')?.classList.contains('show'),null,{timeout:15000});
  add('PAIR_SHOW_E2E',true);

  await phone.locator('#home').click();
  await tv.waitForFunction(()=>!document.querySelector('#tvMedia')?.classList.contains('show')&&!document.querySelector('.tvRemoteOverlay')?.classList.contains('show'),null,{timeout:15000});
  add('HOME_E2E',true);

  await phone.waitForFunction(()=>document.querySelector('#latency')?.textContent?.includes('ms'),null,{timeout:15000});
  const remoteSurfaceCount=await phone.locator('#surfaces .surface:not([disabled])').count();
  add('TV_STATE_RETURNED',remoteSurfaceCount>0,{surface_count:remoteSurfaceCount});
  evidence.overall=evidence.checks.every(c=>c.ok)?'PASS':'PARTIAL';
} catch (e) {
  evidence.error={code:String(e?.message||e).replace(/https?:\/\/\S+/g,'<redacted-url>').replace(/t=[^&\s#]+/g,'t=<redacted>')};
} finally {
  evidence.completed_at=new Date().toISOString();
  fs.writeFileSync(OUT,JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({overall:evidence.overall,checks:evidence.checks,error:evidence.error||null}));
  if(browser) await browser.close();
}
if(evidence.overall!=='PASS') process.exitCode=1;
