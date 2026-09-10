import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const BASE=process.env.P4_CANARY_BASE||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`${BASE}/tests/fixtures/p4-change-loop-host.html`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__ready===true);
  await page.evaluate(()=>window.__fixture.ui.open(window.__fixture.pageA));
  await page.waitForSelector('#prometeoChangeLoop.open');
  assert.equal(await page.locator('.pcl-title').textContent(),'Calendar');
  assert.equal(await page.locator('.pcl-note').count(),2);
  assert.match(await page.locator('.pcl-body').textContent(),/subir el bloque/);
  assert.match(await page.locator('.pcl-body').textContent(),/conservar el gráfico/);
  assert.match(await page.locator('.pcl-body').textContent(),/IA/);
  assert.equal(await page.locator('[data-act="grant"]').count(),0);

  await page.locator('#pclText').fill('otra observación');await page.locator('[data-act="text"]').click();await page.waitForFunction(()=>window.__fixture.state.texts.length===1);
  assert.deepEqual(await page.evaluate(()=>window.__fixture.state.texts),[['calendar','otra observación']]);

  // Recording expands into a large, explicit active control rather than another tiny puck state.
  await page.locator('[data-act="rec-start"]').click();await page.waitForFunction(()=>window.__fixture.state.recording===true);
  assert.equal(await page.locator('.pcl-rec-dock.on').count(),1);
  await page.locator('[data-act="rec-pause"]').click();await page.waitForFunction(()=>window.__fixture.state.paused===true);
  assert.match(await page.locator('.pcl-rec-dock').textContent(),/Continuar/);
  await page.locator('[data-act="rec-save"]').click();await page.waitForFunction(()=>window.__fixture.state.recording===false);

  // Trabajar produces a disposable launcher and never leaks note literals into the ChatGPT URL.
  await page.locator('[data-act="work"]').click();await page.waitForFunction(()=>window.__fixture.state.opened.includes('chatgpt.com'));
  let launched=await page.evaluate(()=>decodeURIComponent(window.__fixture.state.opened));
  assert.match(launched,/PROMETEO EXECUTE · WI-NEW/);assert.match(launched,/opaque\.test\/packet\/token/);
  assert.doesNotMatch(launched,/subir el bloque|conservar el gráfico|otra observación/);

  // Pensar is separate and gets a private session capability, not an execution packet.
  await page.locator('[data-act="think"]').click();await page.waitForFunction(()=>window.__fixture.state.thinking===true);
  launched=await page.evaluate(()=>decodeURIComponent(window.__fixture.state.opened));
  assert.match(launched,/PROMETEO PENSAR · DS-NEW/);assert.match(launched,/opaque\.test\/session\/token/);

  // Result remains unread until explicit open.
  assert.equal(await page.evaluate(()=>window.__fixture.state.seen),false);
  await page.locator('[data-result="WI-OLD"]').first().click();await page.waitForFunction(()=>window.__fixture.state.seen===true);

  // A -> B -> A remains page-scoped.
  await page.evaluate(()=>window.__fixture.ui.open(window.__fixture.pageB));await page.waitForFunction(()=>document.querySelector('.pcl-title')?.textContent==='PageKit');
  assert.match(await page.locator('.pcl-body').textContent(),/láser más largo/);assert.doesNotMatch(await page.locator('.pcl-body').textContent(),/subir el bloque/);
  await page.evaluate(()=>window.__fixture.ui.open(window.__fixture.pageA));await page.waitForFunction(()=>document.querySelector('.pcl-title')?.textContent==='Calendar');
  assert.match(await page.locator('.pcl-body').textContent(),/subir el bloque/);
  assert.deepEqual(errors,[]);
  console.log('P4 ANYWHERE NOTES BROWSER PASS');
} finally {await browser.close()}
