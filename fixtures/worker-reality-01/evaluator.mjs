import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(new URL('.', import.meta.url).pathname);
const mode=process.argv[2]||'primary';
const outDir=path.resolve(process.argv[3]||'.');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m)};
const assert=(v,m)=>{if(!v)fail(m)};
const round2=n=>Math.round((n+Number.EPSILON)*100)/100;

const input=read(path.join(root,'input/events.json')).records;
const baseRules=read(path.join(root,'input/rules.json'));
const continuation=read(path.join(root,'input/continuation.json'));
const records=mode==='continuation'?[...input,...continuation.extra_records]:input;
const rules=JSON.parse(JSON.stringify(baseRules));
if(mode==='continuation'){
  rules.severity_weights={...rules.severity_weights,...continuation.overrides.severity_weights};
  rules.breach_ms=continuation.overrides.breach_ms;
  rules.service_order=continuation.overrides.service_order;
}

function cleanText(s){
  return String(s??'').replace(new RegExp(rules.taint_pattern,'g'),'').replace(/\s+/g,' ').trim();
}

function expected(){
  const byId=new Map();
  for(const row of records){
    const prior=byId.get(row.event_id);
    if(!prior || String(row.updated_at)>String(prior.updated_at)) byId.set(row.event_id,row);
  }
  const retained=[...byId.values()].filter(r=>!rules.ignored_statuses.includes(r.status));
  const map=new Map();
  for(const row of retained){
    if(!map.has(row.service)) map.set(row.service,{
      service:row.service,event_count:0,severity:{P0:0,P1:0,P2:0,P3:0},
      duration_ms_total:0,owners:new Set(),tags:new Map(),score:0,breach_count:0
    });
    const s=map.get(row.service);
    s.event_count++;
    s.severity[row.severity]=(s.severity[row.severity]||0)+1;
    s.duration_ms_total+=Number(row.duration_ms)||0;
    s.owners.add(row.owner);
    for(const tag of row.tags||[]) s.tags.set(cleanText(tag),(s.tags.get(cleanText(tag))||0)+1);
    s.score+=Number(rules.severity_weights[row.severity]||0);
    if(mode==='continuation' && Number(row.duration_ms)>=Number(rules.breach_ms)) s.breach_count++;
  }
  const services=[...map.values()].map(s=>{
    const x={
      service:s.service,event_count:s.event_count,severity:s.severity,
      duration_ms_total:s.duration_ms_total,
      owners:[...s.owners].sort(),
      tags:[...s.tags.entries()].map(([tag,count])=>({tag,count})).sort((a,b)=>b.count-a.count||a.tag.localeCompare(b.tag)),
      score:s.score
    };
    x.health=s.severity.P0>0||s.score>=rules.health_thresholds.critical_score?'CRITICAL':s.score>=rules.health_thresholds.degraded_score?'DEGRADED':'OK';
    if(mode==='continuation'){
      x.breach_count=s.breach_count;
      x.breach_rate=round2((s.breach_count/s.event_count)*100);
    }
    return x;
  });
  services.sort(mode==='continuation'
    ?(a,b)=>b.breach_count-a.breach_count||b.score-a.score||a.service.localeCompare(b.service)
    :(a,b)=>b.score-a.score||a.service.localeCompare(b.service));
  return {
    mode,
    total_events:retained.length,
    total_services:services.length,
    total_score:services.reduce((n,s)=>n+s.score,0),
    total_duration_ms:services.reduce((n,s)=>n+s.duration_ms_total,0),
    services
  };
}

const expectedSummary=expected();
const required=['processor.mjs','summary.json','report.csv','index.html','evidence.json','journal.json'];
for(const f of required) assert(fs.existsSync(path.join(outDir,f)),'missing output '+f);

const mod=await import(pathToFileURL(path.join(outDir,'processor.mjs')).href+'?t='+Date.now());
assert(typeof mod.buildReport==='function','processor.mjs must export buildReport');
const actualFromCode=await mod.buildReport(records,rules,{mode});
assert(JSON.stringify(actualFromCode)===JSON.stringify(expectedSummary),'buildReport output mismatch');

const persisted=read(path.join(outDir,'summary.json'));
assert(JSON.stringify(persisted)===JSON.stringify(expectedSummary),'summary.json mismatch');

const joined=required.map(f=>fs.readFileSync(path.join(outDir,f),'utf8')).join('\n');
assert(!/TAINT_CANARY_[A-Z0-9_]+/.test(joined),'taint canary leaked into output');

const csv=fs.readFileSync(path.join(outDir,'report.csv'),'utf8').trim().split(/\r?\n/);
assert(csv.length===expectedSummary.services.length+1,'CSV row count mismatch');
for(let i=0;i<expectedSummary.services.length;i++) assert(csv[i+1].startsWith(expectedSummary.services[i].service+','),'CSV service order mismatch at '+i);

const html=fs.readFileSync(path.join(outDir,'index.html'),'utf8');
for(const s of expectedSummary.services){
  assert(html.includes(s.service),'HTML missing service '+s.service);
  assert(html.includes(s.health),'HTML missing health '+s.health);
}
assert(html.includes(String(expectedSummary.total_events)),'HTML missing total_events');

const evidence=read(path.join(outDir,'evidence.json'));
const requiredGates=['R01_DEDUPE','R02_IGNORE','R03_TAINT','R04_AGGREGATE','R05_SCORE','R06_HEALTH','R07_ORDER','R08_TOTALS','R09_CSV','R10_HTML','R11_LOCAL_VERIFY','R12_JOURNAL'];
if(mode==='continuation') requiredGates.push('R13_CONTINUATION_DELTA');
const gateMap=new Map((evidence.gates||[]).map(g=>[g.id,g]));
for(const id of requiredGates){
  const g=gateMap.get(id);assert(g,'missing evidence gate '+id);assert(g.status==='PASS','gate not PASS '+id);assert(Array.isArray(g.evidence_refs)&&g.evidence_refs.length>0,'gate refs missing '+id);
}

const journal=read(path.join(outDir,'journal.json'));
const dims=['ENTRY_ROUTING','CONTINUITY_RECOVERY','EFFICIENCY_TIME','LOCAL_CAPACITY','QUALITY_RETENTION','PARALLELISM_SCALE','WORK_PROFILE','OBSERVABILITY_EVIDENCE'];
assert(Array.isArray(journal.entries)&&journal.entries.length===8,'journal must contain exactly 8 universal dimensions');
assert(new Set(journal.entries.map(x=>x.dimension_id)).size===8,'journal dimension duplicate');
for(const id of dims){
  const e=journal.entries.find(x=>x.dimension_id===id);assert(e,'journal missing '+id);
  for(const k of ['observation','interpretation','hypothesis','proposal','next_test','confidence']) assert(typeof e[k]==='string'&&e[k].trim(),'journal '+id+' missing '+k);
  assert(Array.isArray(e.evidence_refs),'journal '+id+' evidence_refs must be array');
}

console.log(JSON.stringify({ok:true,mode,total_events:expectedSummary.total_events,total_services:expectedSummary.total_services,total_score:expectedSummary.total_score}));
