import {chromium} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";import path from "node:path";import http from "node:http";
const root=process.cwd(),port=8765;
const mime={".html":"text/html",".json":"application/json",".mjs":"text/javascript"};
const server=http.createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 let file=path.join(root,pathname.endsWith("/")?pathname+"index.html":pathname);
 if(!file.startsWith(root)){res.writeHead(403);res.end();return}
 fs.readFile(file,(e,buf)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"text/plain"});res.end(buf)})
});
await new Promise(done=>server.listen(port,"127.0.0.1",done));
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const folder=path.join(root,"artifacts/av-factory");fs.mkdirSync(folder,{recursive:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
let pass=0,fail=0;
async function verify(label,cb){try{await cb();pass++;console.log("PASS",label)}catch(e){fail++;console.log("FAIL",label,e.message)}}
await verify("Overview stages and 27 verifiable decisions",async()=>{
 await page.goto("http://127.0.0.1:"+port+"/presentacion/fabrica/");
 await page.waitForFunction(()=>window.__flowQA?.getNodeCount()===27);
 assert.equal(await page.evaluate(()=>window.__flowQA.getStageCount()),6);
 await page.evaluate(()=>window.__flowQA.selectStage("C"));
 assert.equal(await page.evaluate(()=>window.__flowQA.current()),"C");
 await page.screenshot({path:path.join(folder,"flow-stage-1440.png")});
});
await verify("Full graph has exactly 36 directed edges",async()=>{
 await page.goto("http://127.0.0.1:"+port+"/presentacion/fabrica/mapa-completo.html");
 await page.waitForFunction(()=>window.__graphQA?.nodes()===27);
 assert.equal(await page.evaluate(()=>window.__graphQA.edges()),36);
 await page.evaluate(()=>window.__graphQA.select("C07"));
 assert.match(await page.locator("#detailText").innerText(),/NOT_RUN/);
 await page.screenshot({path:path.join(folder,"flow-full-1440.png")});
});
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await verify("Narrow mobile graph renders without JS errors",async()=>{
 await mobile.goto("http://127.0.0.1:"+port+"/presentacion/fabrica/mapa-completo.html");
 await mobile.waitForFunction(()=>window.__graphQA?.nodes()===27);
 await mobile.screenshot({path:path.join(folder,"flow-mobile-390.png")});
});
await page.route("https://www.youtube.com/iframe_api",route=>route.fulfill({status:200,contentType:"application/javascript",body:"(()=>{window.YT={PlayerState:{PLAYING:1,ENDED:0},Player:class{constructor(id,o){this.o=o;this.t=0;this.s=-1;this.at=Date.now();const f=document.createElement('iframe');f.src='about:blank';f.title='YT test double';document.getElementById(id).appendChild(f);setTimeout(()=>o.events.onReady({target:this}),10)}loadVideoById(v){this.t=v.startSeconds;this.at=Date.now();this.s=1;this.o.events.onStateChange({data:1})}playVideo(){this.s=1;this.at=Date.now()}stopVideo(){this.s=2}getCurrentTime(){return this.t+(this.s===1?(Date.now()-this.at)/1000:0)}getPlayerState(){return this.s}mute(){}unMute(){}}};window.onYouTubeIframeAPIReady?.()})();"}));
await verify("Two controls, valid segment start and restart on reentry",async()=>{
 await page.goto("http://127.0.0.1:"+port+"/presentacion/fabrica/ejemplos/masculinidad/");
 await page.waitForFunction(()=>window.__presentationQA?.ready());
 assert.equal(await page.locator("button.arrow").count(),2);
 assert.equal(await page.evaluate(()=>window.__presentationQA.recipe().filter(x=>x.kind==="video").length),3);
 await page.screenshot({path:path.join(folder,"sample-cover-1440.png")});
 await page.locator("#next").click();
 await page.waitForTimeout(380);
 assert.equal(await page.evaluate(()=>window.__presentationQA.index()),1);
 let t=await page.evaluate(()=>window.__presentationQA.videoTime());
 assert.ok(t>=65&&t<67,t);
 await page.locator("#next").click();
 await page.locator("#previous").click();
 await page.waitForTimeout(380);
 t=await page.evaluate(()=>window.__presentationQA.videoTime());
 assert.ok(t>=65&&t<67,t);
});
await verify("Timed text slide advances to exact second clip",async()=>{
 await page.locator("#next").click();
 assert.equal(await page.evaluate(()=>window.__presentationQA.index()),2);
 await page.waitForTimeout(7000);
 assert.equal(await page.evaluate(()=>window.__presentationQA.index()),3);
 let t=await page.evaluate(()=>window.__presentationQA.videoTime());
 assert.ok(t>=261&&t<265,t);
});
await browser.close();await new Promise(done=>server.close(done));
console.log(JSON.stringify({pass,fail,realYoutubeTested:false,testEnvironment:"deterministic Playwright mock"}));
if(fail)process.exitCode=1;
