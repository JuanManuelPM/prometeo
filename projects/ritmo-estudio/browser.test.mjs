import assert from 'node:assert/strict';
import { chromium } from 'playwright';
// Real remote GitHub Pages only. Do not run this during PR as if it were published.
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url='https://juanmanuelpm.github.io/prometeo/projects/ritmo-estudio/?proof='+Date.now();
  const nav=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(nav.status(),200,'New project page HTTP');
  await page.locator('input[name="rounds"]').fill('2');
  await page.locator('input[name="focusMinutes"]').fill('20');
  await page.locator('input[name="breakMinutes"]').fill('5');
  await page.getByRole('button',{name:'Armar plan desde ahora'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#blocks li').length===3);
  assert.match(await page.locator('#status').innerText(),/45 min en total/);
  assert.match(await page.locator('#blocks').innerText(),/ART/);
  await page.locator('#projectLog summary').click();
  await page.waitForFunction(()=>document.querySelector('#projectHistory')?.textContent?.includes('Versiones'));
  assert.match(await page.locator('#projectHistory').innerText(),/Decisiones/);
  assert.match(await page.locator('#projectHistory').innerText(),/Investigación/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No overflow');
  const home=await page.goto('https://juanmanuelpm.github.io/prometeo/tv/chat/relevo/retomar/?proof='+Date.now(),{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(home.status(),200,'Main catalog HTTP');
  await page.waitForFunction(()=>!!document.querySelector('#track [data-project="ritmo-estudio"]'),null,{timeout:30000});
  assert.ok((await page.locator('#track [data-project="ritmo-estudio"]').innerText()).includes('Ritmo de estudio'));
  assert.deepEqual(errors,[],'Browser exceptions');
  results.push({width,page_http:200,main_http:200,schedule_blocks:3,project:'ritmo-estudio',status:'PASS'});
  await page.close();
 }
}finally{await browser.close()}
console.log('SERVED_CHROMIUM_VERIFIED '+JSON.stringify(results));
