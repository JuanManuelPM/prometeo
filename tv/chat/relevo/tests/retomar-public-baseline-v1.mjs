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
  const [resp,gh,stateResp,registryResp]=await Promise.all([
    fetch(pageUrl,{headers:{'cache-control':'no-cache'}}),
    fetch(apiUrl,{headers:{accept:'application/vnd.github+json','user-agent':'prometeo-ci-readonly'}}),
    fetch(stateUrl,{headers:{'cache-control':'no-cache'}}),
    fetch(registryUrl,{headers:{'cache-control':'no-cache'}})
  ]);
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
  evidence.checks.push('HOP8 independent chat episode and PR83 receipt available on PUBLIC Pages');
  evidence.checks.push('Public response 200 + exact byte SHA vs GH Pages source','Public STATE contains persisted cross-chat hops');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:830},deviceScaleFactor:1});
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
    evidence.checks.push(width+'px: PUBLIC loaded real SVG preview and persisted live activity');
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
  evidence.outcome='BASELINE_SERVED_VERIFIED';
} catch(e){
  evidence.outcome='BLOCKED';
  evidence.errors.push(String(e.stack||e));
  console.error(e);
  process.exitCode=1;
} finally {
  await browser?.close();
  await writeFile(path.join(dir,'result.json'),JSON.stringify(evidence,null,2));
}
