import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base=process.env.PROMETEO_CANARY_URL||'http://127.0.0.1:8000/prometeo/candidate/calendar-habits-custom-trackers-v1/?view=habits';
const outDir=process.env.PROMETEO_CANARY_OUT||'artifacts/calendar-habits-browser-canary';
fs.mkdirSync(outDir,{recursive:true});
const evidence={
  schema:'prometeo.browser-canary-evidence/v1',
  observed_at:new Date().toISOString(),
  target:base,
  browser:'chromium-playwright',
  authority_boundary:'verification-only; no Current/Human Accepted/Served promotion',
  checks:{},
  console_errors:[],
  page_errors:[],
  overall:'RUNNING'
};
const save=()=>fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
const mark=(name,details=true)=>{evidence.checks[name]={result:'PASS',details};save()};
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  page.on('pageerror',e=>{evidence.page_errors.push(String(e));save()});
  page.on('console',msg=>{if(msg.type()==='error'){evidence.console_errors.push(msg.text());save()}});
  await page.goto(base,{waitUntil:'networkidle',timeout:30000});
  await page.waitForSelector('#habitTrackerManage',{timeout:15000});

  const initial=await page.evaluate(()=>window.PrometeoHabitTrackerConfig.getConfig());
  assert.equal(initial.trackers.length,0,'fresh profile must not receive mandatory trackers');
  mark('fresh_profile_has_zero_mandatory_trackers',{count:initial.trackers.length});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.habitTrackerConfig),'indexeddb-meta');
  mark('indexeddb_is_canonical_on_fresh_profile');

  await page.click('#habitTrackerManage');
  await page.fill('#habitTrackerDialog [data-add] input[name="label"]','Leer');
  await page.selectOption('#habitTrackerDialog [data-add] select[name="kind"]','positive');
  await page.selectOption('#habitTrackerDialog [data-add] select[name="group"]','extras');
  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.click('#habitTrackerDialog [data-add] button[type="submit"]')
  ]);
  await page.waitForSelector('#habitTrackerManage');
  let cfg=await page.evaluate(()=>window.PrometeoHabitTrackerConfig.getConfig());
  const tracker=cfg.trackers.find(t=>t.label==='Leer');
  assert.ok(tracker,'added tracker must survive reload');
  mark('add_and_indexeddb_reload',{tracker_id:tracker.id});

  await page.click('#habitTrackerManage');
  const row=page.locator(`.tracker-config-row[data-tracker-id="${tracker.id}"]`);
  await row.locator('input[aria-label="Nombre"]').fill('Lectura');
  await row.locator('select[aria-label="Tipo"]').selectOption('negative');
  await row.locator('select[aria-label="Grupo"]').selectOption('routine');
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),row.getByRole('button',{name:'GUARDAR'}).click()]);
  await page.waitForSelector('#habitTrackerManage');
  cfg=await page.evaluate(()=>window.PrometeoHabitTrackerConfig.getConfig());
  let edited=cfg.trackers.find(t=>t.id===tracker.id);
  assert.equal(edited?.label,'Lectura');
  assert.equal(edited?.kind,'negative');
  assert.equal(edited?.group,'routine');
  mark('rename_and_classification_persist',{tracker_id:tracker.id,label:edited.label,kind:edited.kind,group:edited.group});

  await page.click('#habitTrackerManage');
  const archiveRow=page.locator(`.tracker-config-row[data-tracker-id="${tracker.id}"]`);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),archiveRow.getByRole('button',{name:'ARCHIVAR'}).click()]);
  await page.waitForSelector('#habitTrackerManage');
  cfg=await page.evaluate(()=>window.PrometeoHabitTrackerConfig.getConfig());
  assert.equal(cfg.trackers.find(t=>t.id===tracker.id)?.archived,true);
  mark('archive_persists_reload',{tracker_id:tracker.id});

  await page.click('#habitTrackerManage');
  const restoreRow=page.locator(`.tracker-config-row[data-tracker-id="${tracker.id}"]`);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),restoreRow.getByRole('button',{name:'RESTAURAR'}).click()]);
  await page.waitForSelector('#habitTrackerManage');
  cfg=await page.evaluate(()=>window.PrometeoHabitTrackerConfig.getConfig());
  assert.equal(cfg.trackers.find(t=>t.id===tracker.id)?.archived,false);
  mark('restore_persists_reload',{tracker_id:tracker.id});

  await page.getByRole('button',{name:'DINERO'}).click();
  await page.waitForSelector('#moneySpace:not([hidden])');
  assert.equal(await page.locator('#activeTitle').textContent(),'Dinero');
  await page.click('#moneyAdd');
  assert.ok(await page.locator('#moneyEditor').evaluate(el=>el.open||el.hasAttribute('open')),'money editor should open');
  await page.click('#moneyEditorCancel');
  mark('money_surface_interactive');

  await page.getByRole('button',{name:'CALENDARIO'}).click();
  await page.waitForSelector('#calendarSpace:not([hidden])');
  assert.equal(await page.locator('#activeTitle').textContent(),'Calendario');
  const frame=page.frameLocator('#romanticCalendarFrame');
  await frame.locator('body').waitFor({state:'attached',timeout:15000});
  mark('calendar_surface_interactive');

  await page.getByRole('button',{name:'HÁBITOS'}).click();
  await page.screenshot({path:path.join(outDir,'habits-indexeddb.png'),fullPage:true});

  await context.close();

  const fallbackConfig={
    schema:'prometeo.habit-tracker-config/v1',
    revision:1,
    updated_at:new Date().toISOString(),
    trackers:[{
      id:'tracker-fallback',
      label:'Fallback',
      group:'extras',
      kind:'positive',
      archived:true,
      source:'user',
      created_at:new Date().toISOString(),
      updated_at:new Date().toISOString()
    }]
  };
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844}});
  await fallbackContext.addInitScript(config=>{
    localStorage.setItem('prometeo-habit-tracker-config-v1',JSON.stringify(config));
    try{Object.defineProperty(window,'indexedDB',{get(){throw new Error('CANARY_BLOCKED_INDEXEDDB')},configurable:true})}catch{}
  },fallbackConfig);
  const fallbackPage=await fallbackContext.newPage();
  fallbackPage.on('pageerror',e=>{evidence.page_errors.push('fallback: '+String(e));save()});
  await fallbackPage.goto(base,{waitUntil:'networkidle',timeout:30000});
  await fallbackPage.waitForSelector('#habitTrackerManage',{timeout:15000});
  assert.equal(await fallbackPage.evaluate(()=>document.documentElement.dataset.habitTrackerConfig),'local-mirror');
  const fallbackLoaded=await fallbackPage.evaluate(()=>window.PrometeoHabitTrackerConfig.getConfig());
  const fallbackTracker=fallbackLoaded.trackers.find(t=>t.id==='tracker-fallback');
  assert.ok(fallbackTracker&&fallbackTracker.archived===true,'local fallback tracker must survive blocked IndexedDB');
  mark('local_fallback_survives_blocked_indexeddb',{tracker_id:'tracker-fallback',archived:true});
  await fallbackPage.reload({waitUntil:'networkidle'});
  await fallbackPage.waitForSelector('#habitTrackerManage',{timeout:15000});
  const fallbackReloaded=await fallbackPage.evaluate(()=>window.PrometeoHabitTrackerConfig.getConfig());
  assert.equal(fallbackReloaded.trackers.find(t=>t.id==='tracker-fallback')?.archived,true);
  mark('local_fallback_survives_reload');
  await fallbackPage.screenshot({path:path.join(outDir,'habits-fallback-mobile.png'),fullPage:true});
  await fallbackContext.close();

  evidence.overall='PASS';
  evidence.completed_at=new Date().toISOString();
  save();
  console.log('calendar_habits_custom_trackers_browser_canary_v1: PASS');
}catch(error){
  evidence.overall='FAIL';
  evidence.completed_at=new Date().toISOString();
  evidence.error={message:String(error?.message||error),stack:String(error?.stack||'')};
  save();
  console.error(error);
  process.exitCode=1;
}finally{
  await browser.close();
}
