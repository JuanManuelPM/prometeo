#!/usr/bin/env python3
"""Chromium DOM smoke on the actual retomar/index.html source from a repo checkout.
This is an offline browser test with controlled fake GitHub and Pages responses.
It does NOT prove the deployed URL, GitHub API availability or Demo Engine V6.
Run: python tv/chat/relevo/tests/retomar-browser-smoke-v1.py
Requires Python playwright + Chromium; override CHROMIUM_PATH if needed.
"""
import hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

html=(Path(__file__).resolve().parent.parent/'retomar/index.html').read_text()
paths=['tv/chat/relevo/STATE_V1.json','pages/psicologia-evolutiva/index.html',
       'ui-workspace-v1/current.json','tv/chat/state.json','tv/chat/relevo/VIDEO_2_IDEAS_INDEX_V1.json']
labels=['Persistencia','Facultad','Widgets','TV','Experiencias']
projects=[dict(id=x.lower(),label=x,tag='Proyecto',description='Fuente '+x,
               source_branch='gh-pages',source_path=p,link='/prometeo/'+p) for x,p in zip(labels,paths)]
state=dict(last_hop=3,history=[
 dict(hop=n,result='VERIFIED_READ_WRITE',lesson='Evidencia del relevo',
      date_utc='2026-10-09T17:43:50Z',episode_ref='tv/chat/relevo/episodes/HOP-003-20261009-SOURCE-TO-SERVED.md')
 for n in (1,2,3)])
body={p:json.dumps(state) if p==paths[0] else 'owner:'+p for p in paths}
def blob_sha(s):
 b=s.encode();return hashlib.sha1(('blob '+str(len(b))+'\0').encode()+b).hexdigest()
fixture={'reentry':dict(projects=projects,primary_mission=dict(exact_prompt='Continuar desde fuentes'),
                        next_experiment=dict(candidate=dict(pull_request='https://github.com/JuanManuelPM/prometeo/pull/75'))),
         'state':state,'body':body,'sha':{p:blob_sha(v) for p,v in body.items()},
         'fault':dict(diff=False,rate=False,state=False)}
fetch_mock=r"""(f)=>{
 window.__fixture=f;
 window.fetch=async input=>{
  const u=String(input), f=window.__fixture;
  const resp=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json'}});
  if(u==='./reentrada.json')return resp(f.reentry);
  if(u==='../STATE_V1.json')return f.fault.state?resp({},503):resp(f.state);
  if(u.startsWith('https://api.github.com/repos/JuanManuelPM/prometeo/')){
   if(f.fault.rate)return resp({},403);
   const q=new URL(u), p=q.pathname;
   if(p.endsWith('/commits'))return resp([{sha:'abc123123456789',html_url:'https://github.com/JuanManuelPM/prometeo/commit/abc123123456789',commit:{message:'Owner updated',committer:{date:'2026-10-09T17:43:50Z'}}}]);
   if(p.includes('/contents/'))return resp({sha:f.sha[decodeURIComponent(p.split('/contents/')[1])]});
   if(p.endsWith('/pulls/75'))return resp({state:'open',draft:true,head:{sha:'abc'},updated_at:'2026-10-09T17:43:50Z'});
   return resp({},404);
  }
  if(u.startsWith('/prometeo/')){
   const p=u.slice(10).split('?')[0];if(!(p in f.body))return resp({},404);
   return new Response(f.body[p]+(f.fault.diff?'CHANGED':''));
  }
  return resp({},404);
 };
}"""
checks=[]
def check(condition,message):
 assert condition,message
 checks.append(message)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
                            headless=True,args=['--no-sandbox'])
 def make_page(width):
  page=browser.new_page(viewport=dict(width=width,height=820))
  page.goto('about:blank')
  page.expose_function('__digest',lambda data:list(hashlib.sha1(bytes(data)).digest()))
  page.evaluate(fetch_mock,fixture)
  page.evaluate("Object.defineProperty(window,'crypto',{configurable:true,value:{subtle:{digest:async(_,data)=>new Uint8Array(await window.__digest(Array.from(new Uint8Array(data)))).buffer}}})")
  page.set_content(html)
  page.wait_for_function("document.querySelectorAll('#relayRows a').length===3")
  page.wait_for_function("document.querySelector('#liveProofRows').textContent.includes('Archivo servido')")
  page.locator('.evidence-drawer summary').click()
  return page
 for width in (360,390,844,1440):
  page=make_page(width)
  check(page.locator('.project').count()==5,f'{width}: projects')
  check(page.locator('#relayRows a').count()==3,f'{width}: relay events')
  check('Argentina' in page.locator('#relayRows').inner_text(),f'{width}: AR dates')
  check('COINCIDE byte a byte' in page.locator('#liveProofRows').inner_text(),f'{width}: blob checksum mock')
  check('Cotejando respuesta' not in page.locator('#liveProofRows').inner_text(),f'{width}: no stale loading')
  check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{width}: no global overflow')
  page.get_by_role('button',name='Facultad').click()
  check(page.locator('#relayHistory').is_hidden(),f'{width}: relay panel scoped')
  page.close()
 page=make_page(390)
 page.evaluate('window.__fixture.fault.diff=true');page.locator('#verifyAgain').click()
 page.wait_for_function("document.querySelector('#liveProofRows').textContent.includes('DIFIERE')")
 check(True,'hash mismatch displayed')
 page.evaluate('window.__fixture.fault.diff=false;window.__fixture.fault.rate=true')
 page.locator('#verifyAgain').click()
 page.wait_for_function("document.querySelector('#liveProofRows').textContent.includes('GitHub HTTP 403')")
 check('NO VERIFICADOS' in page.locator('#liveProofRows').inner_text(),'403 not verified')
 page.evaluate('window.__fixture.fault.rate=false;window.__fixture.fault.state=true')
 page.get_by_role('button',name='Facultad').click()
 page.get_by_role('button',name='Persistencia').click()
 page.wait_for_function("document.querySelector('#relayRows').textContent.includes('Historial no verificado')")
 check(page.locator('#relayRows a').count()==0,'503 no invented relay history')
 page.close();browser.close()
print('CHROMIUM_OFFLINE_DOM_PASS',len(checks),'/',len(checks))
