#!/usr/bin/env node
/**
 * POST-PUBLISH observation of what is ACTUALLY served today, not PR77 candidate.
 * Never promotes a branch, never authorizes release, never writes to Pages.
 * This probes current gh-pages baseline from GitHub Actions browser/network.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const dir=path.join(process.cwd(),'artifacts/retomar-public-baseline');
await mkdir(dir,{recursive:true});
const pageUrl='https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/';
const stateUrl='https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/STATE_V1.json';
const registryUrl='https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/reentrada.json';
const apiUrl='https://api.github.com/repos/JuanManuelPM/prometeo/contents/tv/chat/relevo/retomar/index.html?ref=gh-pages';
const evidence={suite:'prometeo.retomar.public-BASELINE.v1',candidate_served_claim:false,
  observed_url:pageUrl,source_branch:'gh-pages',checks:[],errors:[],outcome:'UNKNOWN'};
const note=(k,v)=>{evidence[k]=v;console.log(k,JSON.stringify(v))};
let browser;
try {
  let [resp,gh,stateResp,registryResp]=await Promise.all([
    fetch(pageUrl,{headers:{'cache-control':'no-cache'}}),
    fetch(apiUrl,{headers:{accept:'application/vnd.github+json','user-agent':'prometeo-ci-readonly'}}),
    fetch(stateUrl,{headers:{'cache-control':'no-cache'}}),
    fetch(registryUrl,{headers:{'cache-control':'no-cache'}})
  ]);
  // Pages/CDN propagation is asynchronous after the merge. Retry *real* bytes.
  const newSha=(await gh.clone().json()).sha;
  for(let attempt=0;attempt<18;attempt++){
    const b=Buffer.from(await resp.clone().arrayBuffer());
    const candidate=createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
    if(candidate===newSha)break;
    if(attempt===17)throw Error('PAGES_PROPAGATION_TIMEOUT: expected '+newSha+', served '+candidate);
    await new Promise(resolve=>setTimeout(resolve,10000));
    resp=await fetch(pageUrl+'?served-check='+newSha.slice(0,10)+'-'+(attempt+1),{headers:{'cache-control':'no-cache'}});
  }
  note('http_status',{page:resp.status,github_api:gh.status,state:stateResp.status});
  assert.equal(resp.status,200,'Public page HTTP not 200');
  assert.equal(gh.status,200,'Cannot verify production source SHA from GitHub');
  assert.equal(stateResp.status,200,'Published state JSON HTTP not 200');
  assert.equal(registryResp.status,200,'Published project registry HTTP not 200');
  const bytes=Buffer.from(await resp.arrayBuffer());
  const sha=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  const blob=await gh.json();
  note('published_blob',{computed:sha,github:blob.sha,equal:sha===blob.sha});
  assert.equal(sha,blob.sha,'Published page differs from gh-pages current HTML source; version not verified');
  const state=await stateResp.json();
  note('published_cross_chat_state',{last_hop:state.last_hop,history_count:state.history?.length});
  assert.ok(Number.isInteger(state.last_hop)&&state.history?.length>=3,'Public state misses historical hops');
  const registry=await registryResp.json();
  const hop8Receipt=registry.public_receipts?.find(r=>r.id==='persistencia-hop8-pr83-20261010');
  assert.ok(state.last_hop>=8&&state.history.some(h=>h.hop===8&&h.episode_ref?.includes('HOP-008-')),
   'New independent chat HOP8 not durable on public Pages');
  assert.ok(registry.projects?.length>=5&&hop8Receipt?.source_url==='https://github.com/JuanManuelPM/prometeo/pull/83',
   'PR83 delivery not represented by real public project receipt');
  note('published_hop8_receipt',{id:hop8Receipt.id,status:hop8Receipt.state,project_id:hop8Receipt.project_id,source_url:hop8Receipt.source_url});
  // PR89: verify the actual served public projection, not a local fixture.
  // This publishes the PR88 dossier, NOT the unapproved PR88 redesign.
  const artisticReceipt=registry.public_receipts?.find(r=>r.id==='widgets-archivo-habitado-pr88-tested-20261010');
  const dossiers=registry.work_dossiers?.filter(w=>w.work_id==='archivo-habitado-pr88')||[];
  assert.equal(registry.projects.length,5,'Project history unexpectedly replaced or duplicated');
  assert.equal(dossiers.length,1,'Public PR88 dossier absent or duplicated');
  assert.equal(artisticReceipt?.state,'TESTED','Candidate cannot claim published artifact');
  assert.equal(artisticReceipt?.project_id,'widgets');
  assert.equal(dossiers[0].state,'TESTED');
  assert.equal(dossiers[0].art?.width,256);
  assert.equal(dossiers[0].art?.height,171);
  assert.equal(dossiers[0].request_at_utc,null,'No reliable original message timestamp');
  assert.equal(dossiers[0].chat_started_at_utc,null);
  assert.equal(dossiers[0].chat_ended_at_utc,null);
  note('published_pr88_dossier',{id:dossiers[0].work_id,project_id:dossiers[0].project_id,state:dossiers[0].state,
    image_dimensions:[dossiers[0].art.width,dossiers[0].art.height],raw_chat_timestamps:'UNKNOWN',redesign_served:false});
  evidence.checks.push('PR88 real candidate dossier and truthful TESTED receipt available from PUBLIC JSON');
  evidence.checks.push('HOP8 independent chat episode and PR83 receipt available on PUBLIC Pages');
  evidence.checks.push('Public response 200 + exact byte SHA vs GH Pages source','Public STATE contains persisted cross-chat hops');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [360,390,480,844,1440]){
    const context=await browser.newContext({viewport:{width,height:width===480?1800:830},deviceScaleFactor:width<=480?2:1,isMobile:width<=480,hasTouch:width<=480});
    const page=await context.newPage();
    const errs=[];
    page.on('pageerror',e=>errs.push(e.message));
    const nav=await page.goto(pageUrl,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(nav.status(),200,'Browser public navigation failed');
    await page.waitForFunction(()=>document.querySelectorAll('#track .project').length===5,{timeout:20000});
    // A DOM placeholder is not a visually finished app. Wait for live owner history and actual cover bytes.
    await page.waitForFunction(hop=>{
      const feed=document.querySelector('#activityRows');
      return feed && feed.querySelectorAll('article').length>=5 &&
        feed.textContent.includes('Relevo '+hop);
    },state.last_hop,{timeout:30000});
    await page.waitForFunction(()=>{
      const feed=document.querySelector('#activityRows');
      return !!feed&&feed.textContent.includes('La pantalla detecta proyectos nuevos');
    },null,{timeout:30000});
    await page.waitForFunction(()=>{
      const panel=document.querySelector('#workArchive');
      const img=panel?.querySelector('.work-art img');
      return panel&&!panel.hidden&&
       panel.textContent.includes('Archivo Habitado')&&
       panel.textContent.includes('Ciudad Isométrica')&&
       panel.textContent.includes('Observatorio Monumental')&&
       panel.textContent.includes('NO está publicado ni aprobado')&&
       img&&img.complete&&img.naturalWidth===256&&img.naturalHeight===171;
    },null,{timeout:30000});
    assert.match(await page.locator('#activityRows').innerText(),/Archivo Habitado/);
    assert.match(await page.locator('#workArchive').textContent(),/14:29/);
    assert.match(await page.locator('#workArchive').textContent(),/hora desconocida/);
    assert.equal(await page.locator('#track .project').count(),5);
    const responsive=await page.evaluate(()=>({
      inner:innerWidth,client:document.documentElement.clientWidth,
      visual:visualViewport?.width,scale:visualViewport?.scale,
      dark:getComputedStyle(document.body).backgroundColor,
      card:document.querySelector('#track .project').getBoundingClientRect().width,
      typeCovers:document.querySelectorAll('#track .cover-lettering').length,
      imageCovers:document.querySelectorAll('#track .cover img').length,
      title:parseFloat(getComputedStyle(document.querySelector('#activityRows article strong')).fontSize),
      date:parseFloat(getComputedStyle(document.querySelector('#activityRows article time')).fontSize)
    }));
    assert.equal(responsive.inner,width,'Actual mobile browser is rendering a shrunk desktop viewport');
    assert.equal(responsive.client,width,'Layout viewport CSS does not match device');
    assert.ok(Math.abs(responsive.visual-width)<2,'Visual viewport does not match device');
    assert.ok(Math.abs(responsive.scale-1)<.01,'Unexpected browser zoom');
    assert.equal(responsive.dark,'rgb(11, 12, 15)','Old light theme remains SERVED');
    assert.equal(responsive.typeCovers,4,'Rejected CSS pattern / SVG is still served');
    assert.equal(responsive.imageCovers,1,'Authentic PR88 raster illustration not served');
    if(width<=480){
      assert.ok(responsive.card>=width*.84,'Cards look like mini desktop tiles');
      assert.ok(responsive.title>=22&&responsive.date>=17,'Activity/date text remains too small');
    }
    note('published_PR92_dark_responsive_'+width,responsive);
    evidence.checks.push(width+'px: SERVED black theme, real viewport & zoom, large cards, authentic raster + four typographic covers');
    // The published baseline may be either the old responsive skin or the
    // future PR91 release. Once PR91 is served, enforce true mobile usability.
    if(await page.locator('.activity-sort-note').count()){
      const layout=await page.evaluate(()=>({
        rail:document.querySelector('#track').scrollWidth>document.querySelector('#track').clientWidth,
        cardWidth:document.querySelector('#track .project').getBoundingClientRect().width,
        feed:[...document.querySelectorAll('#activityRows article')].map(e=>({
          at:Date.parse(e.dataset.occurredAt),
          when:e.querySelector('time')?.textContent,
          titleFont:parseFloat(getComputedStyle(e.querySelector('strong')).fontSize),
          dateFont:parseFloat(getComputedStyle(e.querySelector('time')).fontSize)
        })),
        collapsed:document.querySelector('#workArchive .work-expanded')?.open===false
      }));
      assert.ok(layout.rail,'Served project rail is not horizontally swipeable');
      assert.ok(layout.collapsed,'Served dossier still overwhelms home');
      assert.ok(layout.feed.length>=5&&layout.feed.every((e,i)=>Number.isFinite(e.at)&&/Argentina/.test(e.when)&&
        (i===0||layout.feed[i-1].at>=e.at)),'Served activity lacks dates or newest-first order');
      if(width===390){
        assert.ok(layout.cardWidth>=width*.78,'Served project card is too small');
        assert.ok(layout.feed.every(e=>e.titleFont>=18&&e.dateFont>=14),'Served activity uses miniature text');
      }
      evidence.checks.push(width+'px: PUBLIC PR91 readability, chronology and expandable dossier');
    }
    evidence.checks.push(width+'px: PUBLIC PR88 dossier + 1-bit PNG decoded 256x171 + no false publication');
    note('published_pr88_dom_'+width,{visible:true,image_loaded:true,project_count:5});
    evidence.checks.push(width+'px: PUBLIC receipt of PR83 rendered in real Chromium');
    await page.waitForFunction(()=>{
      const cover=document.querySelector('#track .project .cover img');
      return !!cover && cover.complete && cover.naturalWidth>0 && cover.naturalHeight>0;
    },null,{timeout:30000});
    assert.ok(await page.evaluate(()=>{
      const title=document.querySelector('main h1');
      const feed=document.querySelector('#activityRows');
      return title?.textContent.trim()==='Proyectos' && feed.querySelectorAll('article').length>=5;
    }),'Public project screen still loading or wrong title');
    const readyImageCount=await page.locator('#track img').evaluateAll(nodes=>nodes.filter(n=>n.complete&&n.naturalWidth>0).length);
    note('ready_public_visual_'+width,{loaded_covers:readyImageCount,history_hop:state.last_hop,events:await page.locator('#activityRows article').count()});
    assert.ok(readyImageCount>=1,'Cover art still blank in public browser');
    evidence.checks.push(width+'px: PUBLIC loaded authentic raster preview and persisted live activity');
    assert.ok(await page.getByRole('button',{name:'Persistencia'}).count(),'Missing persistence card');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Public global horizontal overflow');
    if(width===390){
      await page.locator('#track [data-project="facultad"]').click();
      assert.match(page.url(),/#facultad$/,'Public project navigation missing');
      await page.goBack({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('[data-project="persistencia"]')?.getAttribute('aria-pressed')==='true');
      evidence.checks.push('390px: PUBLIC browser Back returned to previous project');
    }
    await page.screenshot({path:path.join(dir,'public-existing-'+width+'.png'),fullPage:true});
    assert.deepEqual(errs,[],'Browser JS errors');
    evidence.checks.push(width+'px: PUBLIC real Chromium DOM, 5 cards, no overflow');
    await context.close();
  }
  evidence.outcome='PUBLIC_PR92_DARK_MOBILE_SERVED_VERIFIED_PR88_ARTWORK_REMAINS_CANDIDATE';
} catch(e){
  evidence.outcome='BLOCKED';
  evidence.errors.push(String(e.stack||e));
  console.error(e);
  process.exitCode=1;
} finally {
  await browser?.close();
  await writeFile(path.join(dir,'result.json'),JSON.stringify(evidence,null,2));
}
