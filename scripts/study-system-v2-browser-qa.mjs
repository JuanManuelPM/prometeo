import { chromium } from 'playwright';
import fs from 'node:fs';

const base=process.env.QA_URL||'http://127.0.0.1:4173/pages/study-system-v2-generic.html';
const out='qa-artifacts';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const fail=(m)=>{throw new Error(m)};

async function desktop(){
 const ctx=await browser.newContext({viewport:{width:1440,height:960}}),page=await ctx.newPage();
 await page.goto(base,{waitUntil:'networkidle'});
 await page.waitForSelector('.module');
 if(await page.locator('[data-module]').count()!==5)fail('desktop module count');
 if(await page.locator('.topic').count()!==4)fail('first module topic count');
 if(await page.locator('.drawer.open').count())fail('practice consumes theory space by default');
 await page.locator('[data-open-topic]').first().click();
 await page.waitForSelector('.topic.open .topicBody');
 const explanation=await page.locator('.topic.open .explanation').first().innerText();
 if(explanation.length<120)fail('open theory explanation too shallow');
 await page.locator('[data-master]').first().click();
 await page.reload({waitUntil:'networkidle'});await page.waitForSelector('.module');
 if(!(await page.locator('[data-master].done').first().count()))fail('mastery persistence');
 await page.locator('#practice').click();
 if(!(await page.locator('.drawer.open').count()))fail('practice drawer did not open');
 if(await page.locator('.practiceItem').count()!==10)fail('practice count');
 await page.locator('#closePractice').click();
 await page.locator('#sources').click();
 if(!(await page.locator('#sourceOverlay.open').count()))fail('source inspector');
 await page.locator('#closeSources').click();
 const before=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg'));
 await page.locator('#theme').click();
 const after=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg'));
 if(before===after)fail('theme toggle');
 await page.screenshot({path:`${out}/study-system-desktop.png`,fullPage:true});
 // Whiteboard integration: open, draw one short stroke with a mouse, close, verify thumbnail.
 await page.locator('[data-open-topic]').first().click().catch(()=>{});
 const wb=page.locator('[data-wb]').first();await wb.click();
 const frame=page.frameLocator('#board iframe');await frame.locator('.wbRoot').waitFor({timeout:10000});
 const canvas=frame.locator('.wbCanvas');const box=await canvas.boundingBox();
 if(!box)fail('whiteboard canvas');
 await page.mouse.move(box.x+80,box.y+110);await page.mouse.down();await page.mouse.move(box.x+220,box.y+170,{steps:8});await page.mouse.up();
 await frame.locator('.wbClose').click();
 await page.waitForTimeout(1200);
 if(await page.locator('#board.open').count())fail('whiteboard close');
 if(!(await page.locator('[data-wb].hasDrawing').first().count()))fail('whiteboard thumbnail return');
 await ctx.close();
}

async function mobile(){
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await ctx.newPage();
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.module');
 if(await page.locator('.drawer.open').count())fail('mobile drawer open by default');
 const dock=await page.locator('.practiceDock').boundingBox();if(!dock||dock.y<650)fail('mobile practice not collapsed to bottom control');
 const head=page.locator('.topicHead').first();await head.click();await page.waitForSelector('.topic.open .topicBody');
 const body=await page.locator('.topic.open .topicBody').boundingBox();if(!body||body.width<340)fail('mobile theory width');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);if(overflow)fail('mobile horizontal overflow');
 await page.locator('#practice').click();if(!(await page.locator('.drawer.open').count()))fail('mobile practice sheet');
 const sheet=await page.locator('.drawer.open').boundingBox();if(!sheet||sheet.height>630||sheet.height<350)fail('mobile practice sheet geometry');
 await page.locator('#closePractice').click();
 await page.screenshot({path:`${out}/study-system-mobile.png`,fullPage:true});
 await ctx.close();
}

try{await desktop();await mobile();console.log('PASS browser QA',base)}finally{await browser.close()}