// PROMETEO Visual Discovery seed collector. Github Actions/Node 20+.
// Executes 50 real requests; never generates fake Pin results.
import fs from "node:fs";
import vm from "node:vm";

const enginePath=process.argv[2]||"engine.js";
const source=fs.readFileSync(enginePath,"utf8");
const start=source.indexOf("const REF=");
const end=source.indexOf("const $=id=>");
if(start<0||end<start)throw Error("Cannot locate source query catalog");
const ctx={};
vm.runInNewContext(source.slice(start,end)+";globalThis.catalog={base,REF};",ctx);
const tasks=ctx.catalog.base.slice(0,50);
if(tasks.length!==50||new Set(tasks.map(t=>t.query)).size!==50)throw Error("50 diverse source queries required");
const api="https://catnohyouxqjjtseaueb.supabase.co/functions/v1/pinterest-image-search-v1";
const report={schema:"prometeo.visual-discovery-seed/v1",created_at:new Date().toISOString(),
 method:"50 actual native Pinterest searches, up to 20 returned per query",
 references:ctx.catalog.REF.map(r=>({id:r.id,source:r.source,terms:r.terms})),
 requests:50,runs:[],items:[],summary:{}};
const seen=new Set();let raw=0,success=0,fail=0;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(let idx=0;idx<tasks.length;idx++){
 const t=tasks[idx],u=new URL(api);u.searchParams.set("q",t.query);
 u.searchParams.set("limit","20");u.searchParams.set("k","pql-v1-7f2b9e31");
 let pins=null,error="";
 const started=Date.now();
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch(u,{signal:AbortSignal.timeout(25000)});
   const data=await response.json();
   if(!response.ok||!data.ok||!Array.isArray(data.results))throw Error(data.error||"HTTP_"+response.status);
   pins=data.results;break;
  }catch(e){error=String(e.message||e);if(attempt===0)await wait(1000)}
 }
 if(pins){
  success++;raw+=pins.length;let added=0;
  for(const pin of pins){
   const img=String(pin.image||""),url=String(pin.source_url||"");
   if(!/^https:\/\/i\.pinimg\.com\//.test(img)||!/^https:\/\/www\.pinterest\.com\/pin\/[A-Za-z0-9_-]+\//.test(url))continue;
   const id=String(pin.id||img);
   if(seen.has(id))continue;seen.add(id);added++;
   const title=String(pin.title||"").slice(0,230);
   const score=25+(/papercraft|ペーパークラフト|paper toy|paperized/i.test(title)?17:0)+(/template|printable|pattern|PDF|型紙|展開図/i.test(title)?15:0);
   report.items.push({id,img,source:url,title,query:t.query,ref:t.ref,score,pixel:null,at:new Date().toISOString()});
  }
  report.runs.push({query:t.query,ref:t.ref,kind:t.kind,ok:true,count:pins.length,added,ms:Date.now()-started});
  console.log("QUERY "+(idx+1)+"/50 PASS raw="+pins.length+" unique="+added+" "+t.query);
 }else{
  fail++;report.runs.push({query:t.query,ref:t.ref,kind:t.kind,ok:false,count:0,error,ms:Date.now()-started});
  console.log("QUERY "+(idx+1)+"/50 FAIL "+error+" "+t.query);
 }
 await wait(650);
}
report.summary={attempted:tasks.length,successes:success,failures:fail,raw,unique:report.items.length,finished_at:new Date().toISOString()};
fs.writeFileSync("seed-50.json",JSON.stringify(report));
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
 "# Visual Discovery 01 | 50 real searches\n\n"+
 "- Attempts: "+tasks.length+"\n- Successful queries: "+success+"\n- Failed queries: "+fail+
 "\n- Raw Pin results: "+raw+"\n- Unique validated Pin IDs: "+report.items.length+"\n");
console.log("COMPLETE_REAL_SEARCH",JSON.stringify(report.summary));
if(success===0)throw Error("Source returned zero successful queries");
