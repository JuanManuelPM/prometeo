#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot=path.resolve(process.argv[2]||'.');
const pagesRoot=path.resolve(process.argv[3]||'/tmp/prometeo-gh-pages');
const rel={
  index:'current-tree/control-v11/chat-canary/index.html',
  input:'current-tree/control-v11/chat-canary/input-module-v1.js',
  progress:'current-tree/control-v11/chat-canary/progress-v1.js',
  units:'coordination/portfolio/derived/INTERACTIVE_WORK_UNITS_V1.json'
};
const read=(root,p)=>fs.readFileSync(path.join(root,p),'utf8');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const mainIndex=read(repoRoot,rel.index);
const pagesIndex=read(pagesRoot,rel.index);
const input=read(repoRoot,rel.input);
const pagesInput=read(pagesRoot,rel.input);
const progress=read(repoRoot,rel.progress);
const pagesProgress=read(pagesRoot,rel.progress);
const units=JSON.parse(read(repoRoot,rel.units));

for(const [name,a,b] of [
  ['index',mainIndex,pagesIndex],
  ['input',input,pagesInput],
  ['progress',progress,pagesProgress]
]){
  assert.equal(a,b,`${name} main/gh-pages bytes must match`);
}
const ingressPos=mainIndex.indexOf('src="../ingress-v1.js"');
const inputPos=mainIndex.indexOf('src="./input-module-v1.js"');
const progressPos=mainIndex.indexOf('src="./progress-v1.js"');
const globalPos=mainIndex.indexOf('PROMETEO_CHAT_CANARY_INPUT_V1');
const mountPos=mainIndex.indexOf('composerApi.mount');
assert.ok(ingressPos>=0&&inputPos>ingressPos&&progressPos>inputPos&&globalPos>progressPos&&mountPos>globalPos,'script/mount order must be ingress -> input -> progress -> reviewed global -> mount');
assert.match(mainIndex,/id="chatComposer"/);
assert.match(mainIndex,/id="chat-canary-progress"/);
assert.doesNotMatch(mainIndex,/<(?:form|input|textarea)\b/i,'index must keep input markup inside reviewed module');
assert.doesNotMatch(mainIndex,/\b(?:EventSource|WebSocket|ReadableStream|setInterval\s*\()\b/,'no streaming/automatic polling in index');
assert.doesNotMatch(mainIndex,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i,'index must not bypass ingress with direct mutation');
assert.match(mainIndex,/experiment_stats/,'message widget renderer required');
assert.match(mainIndex,/work_unit_progress/,'work-unit message widget renderer required');
assert.match(mainIndex,/source_surface/,'message source provenance renderer required');
assert.match(input,/PROMETEO_INGRESS_V1/);
assert.match(input,/BOUNDARY_AUTH_REQUIRED/);
assert.match(input,/result\.queued === true/);
assert.match(input,/validDurableRef/);
assert.match(progress,/INTERACTIVE_WORK_UNITS_V1/);
assert.match(progress,/WU-CHAT-CANARY-DURABLE-MESSAGE-V1/);
assert.doesNotMatch(progress,/setInterval\s*\(/);
const wu=(units.work_units||[]).find(x=>x?.work_unit_id==='WU-CHAT-CANARY-DURABLE-MESSAGE-V1');
assert.ok(wu,'durable chat canary Work Unit required');
assert.ok(Array.isArray(wu.steps)&&wu.steps.length>=6,'explicit weighted stages required');
assert.equal(wu.steps.reduce((n,s)=>n+Number(s.weight||0),0),100,'weights must total 100');
const out={
  schema:'prometeo.chat-canary-integration-test/v1',
  overall:'PASS',
  work_unit:{work_unit_id:wu.work_unit_id,progress:wu.progress,current_stage:wu.current_stage,status:wu.status},
  parity:{
    index:{sha256:digest(mainIndex),bytes:Buffer.byteLength(mainIndex)},
    input:{sha256:digest(input),bytes:Buffer.byteLength(input)},
    progress:{sha256:digest(progress),bytes:Buffer.byteLength(progress)}
  },
  boundaries:{direct_mutation:false,streaming:false,automatic_polling:false,embedded_input_markup:false}
};
console.log(JSON.stringify(out,null,2));
