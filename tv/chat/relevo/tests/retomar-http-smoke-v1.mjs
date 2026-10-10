#!/usr/bin/env node
/**
 * PR #77 candidate proof: real Chromium NAVIGATION over local HTTP, no deployment.
 * Only GitHub API is mocked deterministically. HTML, reentrada.json, STATE_V1.json,
 * five owners and Pages-style /prometeo/ URLs are real bytes from this checkout.
 * MOCK SHA matches local source intentionally. Never claim served production.
 * Usage: node tv/chat/relevo/tests/retomar-http-smoke-v1.mjs
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';

const root=process.cwd();
const artifacts=path.join(root,'artifacts/retomar-pr77-http');
await mkdir(artifacts,{recursive:true});
const reentry=JSON.parse(await readFile(path.join(root,'tv/chat/relevo/retomar/reentrada.json'),'utf8'));
const state=JSON.parse(await readFile(path.join(root,'tv/chat/relevo/STATE_V1.json'),'utf8'));
assert.ok(reentry.projects.length>=5,'The five founding owner mappings must remain');
assert.ok(state.history?.length>=3,'Cross-chat history absent from checked out owner');
const sources=new Map();
for(const p of reentry.projects){
  assert.equal(p.source_branch,'gh-pages','Unexpected source branch in local test; update fixture and document');
  assert.match(p.source_path,/^[A-Za-z0-9_./-]+$/);
  assert.ok(!p.source_path.split('/').includes('..'));
  const bytes=await readFile(path.join(root,p.source_path));
  const hash=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  sources.set(p.source_path,{sha:hash,bytes});
}
const faults={api403:false,servedDiff:false,state503:false};
const errors=[],checks=[];
function pass(message){checks.push(message);console.log('PASS',message)}
function send(res,status,body,type='text/plain; charset=utf-8'){
  res.writeHead(status,{'content-type':type,'cache-control':'no-store','access-control-allow-origin':'*'});
  res.end(body);
}
const server=createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://127.0.0.1').pathname;
    if(!pathname.startsWith('/prometeo/'))return send(res,404,'Outside application');
    let relative=decodeURIComponent(pathname.slice('/prometeo/'.length));
    if(relative.endsWith('/'))relative+='index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep))return send(res,403,'Forbidden');
    if(faults.state503&&relative==='tv/chat/relevo/STATE_V1.json')return send(res,503,'Source temporarily unavailable');
    const result=await stat(file);
    if(!result.isFile())return send(res,404,'Not a file');
    let bytes=await readFile(file);
    if(faults.servedDiff&&relative==='tv/chat/relevo/STATE_V1.json')bytes=Buffer.concat([bytes,Buffer.from('CHANGED')]);
    const type=relative.endsWith('.html')?'text/html; charset=utf-8':relative.endsWith('.json')?'application/json; charset=utf-8':relative.endsWith('.js')?'application/javascript; charset=utf-8':'text/plain; charset=utf-8';
    send(res,200,bytes,type);
  }catch(e){send(res,404,'Local file missing: '+e.code)}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const origin='http://127.0.0.1:'+server.address().port;
const url=origin+'/prometeo/tv/chat/relevo/retomar/';
let browser;
try{
  const htmlResponse=await fetch(url);
  assert.equal(htmlResponse.status,200);
  assert.match(await htmlResponse.text(),/<title>Prometeo · Proyectos<\/title>/);
  pass('Candidate checkout served via HTTP 200, not Pages production');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [360,390,844,1440]){
    const ctx=await browser.newContext({viewport:{width,height:820},deviceScaleFactor:1});
    const page=await ctx.newPage();
    page.on('pageerror',e=>errors.push(width+': '+e.message));
    await page.route('https://api.github.com/repos/JuanManuelPM/prometeo/**',async route=>{
      const u=new URL(route.request().url());
      const response=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
      if(faults.api403)return response({message:'Simulated rate limit'},403);
      if(u.pathname.endsWith('/commits'))return response([{
        sha:'1111111111111111111111111111111111111111',
        html_url:'https://github.com/JuanManuelPM/prometeo/commit/1111111111111111111111111111111111111111',
        commit:{message:'CI fixture: test only, NOT a real change',committer:{date:'2026-10-09T18:09:51Z'}}
      }]);
      const marker='/contents/';
      if(u.pathname.includes(marker)){
        const requested=decodeURIComponent(u.pathname.split(marker)[1]);
        const owner=sources.get(requested);
        return owner?response({sha:owner.sha}):response({},404);
      }
      if(u.pathname.endsWith('/pulls/75'))return response({
        state:'open',draft:true,head:{sha:'2222222222222222222222222222222222222222'},
        updated_at:'2026-10-09T18:09:51Z'
      });
      return response({},404);
    });
    const response=await page.goto(url,{waitUntil:'domcontentloaded'});
    assert.equal(response.status(),200);
    await page.waitForFunction(n=>document.querySelectorAll('.project').length===n,reentry.projects.length);
    await page.waitForFunction(()=>document.querySelectorAll('#relayRows a').length>=3);
    await page.waitForFunction(()=>document.querySelector('#liveProofRows')?.textContent.includes('Archivo servido'));
    await page.locator('.evidence-drawer summary').click();
    assert.equal(await page.locator('.project').count(),reentry.projects.length);
    assert.ok((await page.locator('#relayRows').innerText()).includes('Argentina'));
    assert.ok((await page.locator('#liveProofRows').innerText()).includes('COINCIDE byte a byte'));
    assert.ok(!(await page.locator('#liveProofRows').innerText()).includes('Cotejando respuesta'));
    const overflow=await page.evaluate(()=>({
      vw:innerWidth,scroll:document.documentElement.scrollWidth,
      offenders:[...document.querySelectorAll('body *')].map(el=>{
        const r=el.getBoundingClientRect(),c=getComputedStyle(el);
        return {tag:el.tagName,cl:String(el.className).slice(0,85),id:el.id,
          right:Math.round(r.right),left:Math.round(r.left),width:Math.round(r.width),
          display:c.display,overflow:c.overflowX};
      }).filter(x=>x.right>innerWidth+2&&x.display!=='none').sort((a,b)=>b.right-a.right).slice(0,15)
    }));
    if(overflow.scroll>width+1)console.error('J10_OVERFLOW_DIAGNOSTIC',width,JSON.stringify(overflow));
    assert.ok(overflow.scroll<=width+1,'Body overflow at '+width);
    assert.deepEqual(await page.locator('#track .project h2').allTextContents(),
      reentry.projects.map(p=>p.label),'All catalog projects must be rendered in order');
    if(width<=390){
      assert.ok(await page.locator('#track').evaluate(n=>n.scrollWidth>n.clientWidth),'Horizontal gallery does not scroll');
      await page.locator('#track').evaluate(n=>n.scrollTo({left:n.scrollWidth,behavior:'instant'}));
      assert.ok(await page.locator('#track').evaluate(n=>n.scrollLeft>0),'Gallery cannot be swiped/scrolled');
    }
    // This is source history from another chat, not an invented raw conversation.
    const titles=await page.locator('#relayRows a').allTextContents();
    assert.ok(titles.some(t=>t.includes('Salto 1')),'No HOP1 in real checked-out history');
    await page.screenshot({path:path.join(artifacts,'candidate-http-'+width+'.png'),fullPage:true});
    await page.getByRole('button',{name:'Facultad'}).click();
    assert.equal(await page.locator('#relayHistory').isHidden(),true);
    await page.waitForFunction(()=>document.querySelector('#liveProofRows').textContent.includes('Archivo servido'));
    assert.ok((await page.locator('#liveProofRows').innerText()).includes('COINCIDE byte a byte'),'Second owner SHA mismatch');
    pass(width+'px: HTTP navigation, real owners and history, Argentina, source bytes, gallery, responsive DOM');
    if(width===390){
      await page.getByRole('button',{name:'Persistencia'}).click();
      await page.waitForFunction(()=>document.querySelector('#liveProofRows').textContent.includes('Archivo servido'));
      faults.servedDiff=true;
      await page.locator('#verifyAgain').click();
      await page.waitForFunction(()=>document.querySelector('#liveProofRows').textContent.includes('DIFIERE'));
      pass('HTTP served-byte mismatch explicitly shown');
      faults.servedDiff=false;faults.api403=true;
      await page.locator('#verifyAgain').click();
      await page.waitForFunction(()=>document.querySelector('#liveProofRows').textContent.includes('GitHub HTTP 403'));
      assert.ok((await page.locator('#liveProofRows').innerText()).includes('NO VERIFICADOS'));
      pass('GitHub 403 yields UNVERIFIED, not invented release');
      faults.api403=false;faults.state503=true;
      await page.getByRole('button',{name:'Facultad'}).click();
      await page.getByRole('button',{name:'Persistencia'}).click();
      await page.waitForFunction(()=>document.querySelector('#relayRows').textContent.includes('Historial no verificado'));
      assert.equal(await page.locator('#relayRows a').count(),0);
      pass('Owner HTTP 503 does not fabricate relay history');
      faults.state503=false;
    }
    await ctx.close();
  }
  assert.deepEqual(errors,[],'Uncaught browser JS exceptions');
  pass('No uncaught browser pageerrors');
}finally{
  await browser?.close();
  server.close();await once(server,'close');
  await writeFile(path.join(artifacts,'result.json'),JSON.stringify({
    suite:'prometeo.retomar.pr77.http-candidate.v1',result:errors.length?'FAIL':'PASS',
    origin:'HTTP_LOCAL_CHECKOUT',production_verified:false,github_api:'CONTROLLED_FIXTURE',
    source_state_last_hop:state.last_hop,source_history_count:state.history.length,
    candidate_paths:reentry.projects.map(p=>p.source_path),
    widths:[360,390,844,1440],checks,errors,
    non_claims:['No release','No deployed Pages verification','No authenticated composer','No proof of GitHub API live availability','No real CI until Actions run succeeds']
  },null,2));
}
console.log('HTTP_CANDIDATE_BROWSER_PASS',checks.length);
