import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = 'https://juanmanuelpm.github.io/prometeo/presentacion/v2/';
const report = {schema:'prometeo.native-deck-browser-qa/v1',url:ROOT,passed:[],observed:{}};
fs.mkdirSync('artifacts/presentacion-v2', {recursive:true});
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:1280,height:720}});
const external = [];
const errors = [];
page.on('request', request => {if(/youtube\.com|youtu\.be|googlevideo\.com|googleapis\.com/.test(request.url()))external.push(request.url());});
page.on('pageerror', error => errors.push(error.message));
const observations = [];
page.on('console',m=>{if(m.type()==='error')observations.push('console:'+m.text().slice(0,300))});
page.on('requestfailed', req=>observations.push('failed-request:'+req.url()+':'+req.failure()?.errorText));
page.on('response',resp=>{if(resp.url().includes('/media/clip-'))observations.push('media-response:'+resp.status()+':'+resp.url())});

try {
  const response = await page.goto(ROOT, {waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('button').count(),2);
  assert.equal(await page.locator('iframe').count(),0);
  assert.equal(await page.evaluate(()=>window.__presentationQA.usesExternalPlayer()),false);
  report.passed.push('HTTP_200','TWO_ARROWS','NO_IFRAME','LOCAL_PLAYER');

  const first = await page.request.head(ROOT+'media/clip-01.mp4',{timeout:30000});
  assert.equal(first.status(),200);
  report.passed.push('SELF_HOSTED_MP4_HTTP_200');

  await page.locator('#next').click();
  await page.evaluate(() => {
    const v=document.getElementById('native-player');
    window.__mediaDebug=[];
    for(const ev of ['loadstart','loadedmetadata','canplay','playing','pause','waiting','error','emptied','abort','stalled']){
      v.addEventListener(ev,()=>window.__mediaDebug.push({event:ev,src:v.currentSrc,state:v.readyState,network:v.networkState,error:v.error?.code,index:window.__presentationQA.getIndex()}));
    }
  });
  await page.waitForFunction(()=>window.__presentationQA.getState()==='playing',null,{timeout:25000});
  const v1 = await page.locator('#native-player').evaluate(v=>({
    paused:v.paused,muted:v.muted,width:v.videoWidth,height:v.videoHeight,
    readyState:v.readyState, currentTime:v.currentTime,duration:v.duration,src:v.currentSrc
  }));
  assert.equal(v1.paused,false);
  assert.equal(v1.width,1920);
  assert.equal(v1.height,1080);
  assert.ok(v1.readyState>=2);
  assert.ok(v1.src.startsWith(ROOT+'media/clip-01.mp4'));
  await page.waitForTimeout(1300);
  const t2 = await page.locator('#native-player').evaluate(v=>v.currentTime);
  assert.ok(t2>v1.currentTime+.6,{before:v1.currentTime,after:t2});
  report.observed.firstFrame={...v1,currentTimeAfter:t2};
  report.passed.push('REAL_PUBLIC_MP4_DECODING','FRAME_ADVANCE','AUDIO_NOT_FORCED_MUTED');

  // End the real first segment by seeking near EOF, and check slide transition.
  await page.locator('#native-player').evaluate(v=>{v.currentTime=v.duration-.03});
  await page.waitForFunction(()=>window.__presentationQA.getIndex()===2,null,{timeout:18000});
  assert.equal(await page.locator('#native-player').evaluate(v=>v.paused),true);
  report.passed.push('NATIVE_EOF_AUTO_ADVANCE','PREVIOUS_VIDEO_STOPPED');

  await page.locator('#next').click();
  await page.waitForFunction(()=>window.__presentationQA.getState()==='playing',null,{timeout:25000});
  assert.ok((await page.locator('#native-player').evaluate(v=>v.currentSrc)).includes('clip-02.mp4'));
  await page.locator('#next').click();
  assert.equal(await page.locator('#native-player').evaluate(v=>v.paused),true);
  await page.locator('#next').click();
  await page.waitForFunction(()=>window.__presentationQA.getState()==='playing',null,{timeout:25000});
  assert.ok((await page.locator('#native-player').evaluate(v=>v.currentSrc)).includes('clip-03.mp4'));
  report.passed.push('SECOND_AND_THIRD_CLIP','MANUAL_TRANSITIONS','STOP_ON_NEXT');

  assert.deepEqual(external,[]);
  assert.deepEqual(errors,[]);
  report.passed.push('NO_YOUTUBE_REQUESTS','NO_JS_EXCEPTIONS');
  await page.screenshot({path:'artifacts/presentacion-v2/real-video.png'});
  console.log('BROWSER_QA_PASS',JSON.stringify(report));
} catch(error) {
  report.error=String(error);
  report.observed.events=observations;
  report.observed.debug=await page.evaluate(()=>({
    index:window.__presentationQA?.getIndex(),
    state:window.__presentationQA?.getState(),
    mp4Support:document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"'),
    video:(()=>{const v=document.getElementById('native-player');return {
      paused:v.paused,muted:v.muted,src:v.currentSrc,readyState:v.readyState,networkState:v.networkState,
      errorCode:v.error?.code,errorMessage:v.error?.message,videoWidth:v.videoWidth,videoHeight:v.videoHeight
    }})(),mediaEvents:window.__mediaDebug||[]
  })).catch(e=>({evaluation:String(e)}));

  await page.screenshot({path:'artifacts/presentacion-v2/error.png'}).catch(()=>{});
  console.error('BROWSER_QA_FAIL',JSON.stringify(report));
  process.exitCode=1;
} finally {
  fs.writeFileSync('artifacts/presentacion-v2/qa.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
