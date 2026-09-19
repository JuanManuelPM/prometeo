import { chromium } from 'playwright';

const url=process.argv[2];
if(!url) throw new Error('usage: node tests/cat-lab-browser-v1.mjs <url>');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto(url,{waitUntil:'networkidle'});
const chapters=await page.locator('[data-catlab-chapter]').count();
if(chapters!==4) throw new Error('expected 4 chapters, got '+chapters);

const notes=page.locator('#cat-notes');
await notes.fill('persist-check');
await page.reload({waitUntil:'networkidle'});
if((await page.locator('#cat-notes').inputValue())!=='persist-check') throw new Error('notes did not persist');

const palettes=page.locator('[data-palette]');
if(await palettes.count()<2) throw new Error('palette controls missing');
await palettes.nth(1).click();
const paletteBefore=await page.evaluate(()=>document.body.dataset.palette||'');
if(!paletteBefore) throw new Error('body dataset palette not set');
await page.reload({waitUntil:'networkidle'});
const paletteAfter=await page.evaluate(()=>document.body.dataset.palette||'');
if(paletteAfter!==paletteBefore) throw new Error('palette did not persist');

const rate=page.locator('#tts-rate');
const tag=await rate.evaluate(el=>el.tagName.toLowerCase());
if(tag==='select'){
  const opts=await rate.locator('option').all();
  if(opts.length>1){ const val=await opts[opts.length-1].getAttribute('value'); if(val!==null) await rate.selectOption(val); }
}else{
  await rate.evaluate(el=>{const min=Number(el.min||0.5),max=Number(el.max||2);el.value=String(Math.min(max,Math.max(min,1.35)));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
}
const rateBefore=await rate.inputValue();
await page.reload({waitUntil:'networkidle'});
const rateAfter=await page.locator('#tts-rate').inputValue();
if(rateAfter!==rateBefore) throw new Error('tts rate did not persist');

await page.locator('#cat-notes').focus();
await page.keyboard.press('ArrowDown');
await page.keyboard.type('x');
if(!(await page.locator('#cat-notes').inputValue()).endsWith('x')) throw new Error('keyboard input was hijacked');

for(const id of ['#tts-play','#cat-radio-play']){
  const el=page.locator(id);
  await el.click();
  await page.waitForTimeout(100);
  const pressed=await el.getAttribute('aria-pressed');
  if(!['true','false'].includes(String(pressed))) throw new Error(id+' missing boolean aria-pressed');
}

await page.setViewportSize({width:390,height:844});
await page.waitForTimeout(100);
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
if(overflow>4) throw new Error('mobile horizontal overflow '+overflow+'px');
if(errors.length) throw new Error('page errors: '+errors.join(' | '));
await browser.close();
console.log(JSON.stringify({ok:true,url,chapters,palette:paletteAfter,rate:rateAfter}));
