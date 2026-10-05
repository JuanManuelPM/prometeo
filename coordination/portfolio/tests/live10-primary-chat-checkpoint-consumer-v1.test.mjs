import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('current-tree/control-v11/chat-canary/progress-v1.js','utf8');
new Function(src);
const start=src.indexOf('function compileLive10Checkpoint');
const end=src.indexOf('\n\n  function renderLive10Checkpoint',start);
assert.ok(start>=0&&end>start,'LIVE10 checkpoint compiler missing');
const fnText=src.slice(start,end);
const compile=new Function(
  "const STALE_MS=120000;"+
  "const LIVE10_TARGET_PRODUCTIVE_UNITS=60;"+
  "const LIVE10_MILESTONES=Object.freeze([10,25,50,75,100]);"+
  "const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};"+
  "const asDate=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d:null};"+
  fnText+
  ";return compileLive10Checkpoint;"
)();

const base={
  schema:'prometeo.worker-batch-status/v1',
  batch_id:'PROMETEO-LIVE10-V1',
  generated_at:'2026-10-05T01:51:44.143Z',
  status:'ACTIVE',
  slots_total:10,slots_claimed:6,workers_beaconed:8,workers_terminal:2,live_recent:3,
  action:{kind:'REFILL_EXACT',count:4,reason:'ADMISSION_SHORTFALL'}
};
const now=Date.parse('2026-10-05T01:52:30Z');
const four=compile({...base,productive_units_total:4},now);
assert.equal(four.latest_founded_pct,null);
assert.equal(four.next_milestone_pct,10);
assert.equal(four.next_milestone_units,6);
assert.equal(four.human_reply_required,false);
assert.match(four.next_automatic_action,/E8\/SUBMIT_NEXT/);

const six=compile({...base,productive_units_total:6},now);
assert.equal(six.latest_founded_pct,10);
assert.equal(six.next_milestone_pct,25);
assert.equal(six.next_milestone_units,15);

const full=compile({...base,productive_units_total:60,status:'COMPLETE',live_recent:0,action:{kind:'NONE'}},now);
assert.equal(full.latest_founded_pct,100);
assert.equal(full.next_milestone_pct,null);

const stale=compile({...base,productive_units_total:6,generated_at:'2026-10-05T01:40:00Z'},now);
assert.equal(stale.stale,true);

assert.ok(src.includes("if (live10) host.append(renderLive10Checkpoint(live10));"));
assert.ok(src.includes("getJson(LIVE10_BATCH_URL)"));
assert.ok(!Object.keys(four).some(k=>/prompt|credential|worker_id|transcript/i.test(k)));

console.log('live10-primary-chat-checkpoint-consumer: PASS');
