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
  assert.equal(await page.locator('.pcl-item').count(),2);
  assert.match(await page.locator('.pcl-body').textContent(),/subir el bloque/);
  assert.match(await page.locator('.pcl-body').textContent(),/conservar el gráfico/);
  assert.equal(await page.locator('.pcl-result.unread').count(),1);

  // One-time persistent project grant.
  await page.locator('[data-act="grant"]').click();await page.waitForFunction(()=>window.__fixture.state.grant===true);
  await page.locator('#pclText').fill('otra observación');await page.locator('[data-act="text"]').click();await page.waitForFunction(()=>window.__fixture.state.texts.length===1);
  assert.deepEqual(await page.evaluate(()=>window.__fixture.state.texts),[['calendar','otra observación']]);

  // HACER produces the minimal disposable-chat launcher.
  await page.locator('[data-act="hacer"]').click();await page.waitForFunction(()=>window.__fixture.state.opened.includes('chatgpt.com'));
  const launched=await page.evaluate(()=>decodeURIComponent(window.__fixture.state.opened));
  assert.match(launched,/PROMETEO EXECUTE · WI-NEW/);assert.match(launched,/opaque\.test\/packet\/token/);
  assert.doesNotMatch(launched,/subir el bloque|conservar el gráfico|otra observación/);

  // Result is unread until the human explicitly opens it.
  assert.equal(await page.evaluate(()=>window.__fixture.state.seen),false);
  await page.locator('[data-result="WI-OLD"]').first().click();await page.waitForFunction(()=>window.__fixture.state.seen===true);
  assert.equal(await page.locator('.pcl-result.unread').count(),0);

  // A -> B -> A opens page-scoped threads, never a mixed note list.
  await page.evaluate(()=>window.__fixture.ui.open(window.__fixture.pageB));await page.waitForFunction(()=>document.querySelector('.pcl-title')?.textContent==='PageKit');
  assert.match(await page.locator('.pcl-body').textContent(),/láser más largo/);assert.doesNotMatch(await page.locator('.pcl-body').textContent(),/subir el bloque/);
  await page.evaluate(()=>window.__fixture.ui.open(window.__fixture.pageA));await page.waitForFunction(()=>document.querySelector('.pcl-title')?.textContent==='Calendar');
  assert.match(await page.locator('.pcl-body').textContent(),/subir el bloque/);
  assert.deepEqual(errors,[]);
  console.log('P4 PAGE CHANGE LOOP BROWSER PASS');
} finally {await browser.close()}
