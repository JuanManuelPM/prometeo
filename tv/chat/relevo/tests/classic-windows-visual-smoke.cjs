#!/usr/bin/env node
/* Visual-only acceptance for Prometeo's existing screen. Uses actual HTML,
 * CSS, original SVG and public-projection bytes over local HTTP. No fake work. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createServer}=require('node:http');
const {once}=require('node:events');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'artifacts/classic-windows');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const projection=JSON.parse(await fs.readFile(path.join(root,'tv/chat/relevo/retomar/reentrada.json'),'utf8'));
 const server=createServer(async(req,res)=>{
  try{
   const p=new URL(req.url,'http://127.0.0.1').pathname;
   if(!p.startsWith('/prometeo/')){res.writeHead(403);return res.end();}
   let local=decodeURIComponent(p.slice('/prometeo/'.length));
   if(local.endsWith('/'))local+='index.html';
   const absolute=path.resolve(root,local);
   if(!absolute.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
   const bytes=await fs.readFile(absolute);
   const ext=path.extname(local),mime={'.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.js':'text/javascript'}[ext]||'text/plain';
   res.writeHead(200,{'content-type':mime+'; charset=utf-8','cache-control':'no-store'});res.end(bytes);
  }catch(e){res.writeHead(404);res.end('not found');}
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const width of [360,390,844,1440]){
   const ctx=await browser.newContext({viewport:{width,height:860},deviceScaleFactor:1});
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const seenAssets=new Map();
   page.on('response',r=>{if(/classic-desktop.css|botanical-desk-v1.svg/.test(r.url()))seenAssets.set(r.url().split('/').pop(),r.status())});
   await page.route('https://api.github.com/**',r=>r.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"message":"unavailable in isolated browser test"}'}));
   await page.goto('http://127.0.0.1:'+server.address().port+'/prometeo/tv/chat/relevo/retomar/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(n=>document.querySelectorAll('#track .project').length===n,projection.projects.length,{timeout:15000});
   await page.waitForFunction(()=>document.querySelector('#activityRows article')&&document.querySelector('#workDesk'),null,{timeout:15000});
   const geometry=await page.evaluate(()=>{
    const q=s=>document.querySelector(s),g=s=>getComputedStyle(q(s)),r=s=>q(s).getBoundingClientRect();
    return {
     screen:innerWidth,client:document.documentElement.clientWidth,overflow:document.documentElement.scrollWidth,
     bg:g('body').backgroundColor,wall:g('body').backgroundImage,
     headline:g('.entry-note').display,atlas:g('.j10-atlas').display,
     panelBg:g('.activity').backgroundColor,corner:g('#track').borderTopLeftRadius,
     cardCorner:g('.project').borderTopLeftRadius,cardWidth:r('.project').width,
     activityY:r('.activity').top,workY:r('#workDesk').top,
     activityFont:parseFloat(g('#activityRows article strong').fontSize),
     titleText:q('#activityTitle').textContent,
     projects:q('#track').children.length
    };
   });
   assert.equal(geometry.client,width,'incorrect mobile viewport');
   assert.ok(geometry.overflow<=width+2,'unexpected horizontal overflow: '+JSON.stringify(geometry));
   assert.equal(geometry.bg,'rgb(174, 187, 184)','botanical desktop color not applied');
   assert.match(geometry.wall,/botanical-desk-v1\.svg/);
   assert.equal(geometry.headline,'none','obsolete introduction still visible');
   assert.equal(geometry.atlas,'none','obsolete promotional hero still visible');
   assert.equal(geometry.corner,'1px','window frames lost sharp edges');
   assert.equal(geometry.cardCorner,'1px','rounded marketing cards returned');
   assert.equal(geometry.panelBg,'rgb(232, 229, 219)','windows lost paper background');
   assert.ok(geometry.activityFont>=14,'functional activity too small');
   assert.equal(geometry.projects,projection.projects.length);
   assert.equal(seenAssets.get('classic-desktop.css'),200,'stylesheet did not load');
   assert.equal(seenAssets.get('botanical-desk-v1.svg'),200,'botanical wallpaper did not load');
   if(width>=901) assert.ok(Math.abs(geometry.activityY-geometry.workY)<8,'desktop windows should share row');
   if(width<=900) assert.ok(geometry.workY>geometry.activityY,'mobile panels should stack');
   const selected=page.locator('#track [data-project="facultad"]');
   await selected.click();
   assert.match(page.url(),/#facultad$/,'project navigation broken');
   await page.goBack({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#track [data-project="persistencia"]')?.getAttribute('aria-pressed')==='true',null,{timeout:10000});
   await page.screenshot({path:path.join(out,'desk-'+width+'.png'),fullPage:true});
   assert.equal(errors.length,0,'runtime errors '+errors.join('; '));
   console.log('PASS '+width+'px: botanical wallpaper, square paper windows, compact cards, existing data and browser navigation',JSON.stringify(geometry));
   await ctx.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error('VISUAL CANDIDATE FAIL',e);process.exitCode=1});
