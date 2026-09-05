import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../',import.meta.url).pathname;const c={console,structuredClone,Date,Math,JSON,globalThis:null};c.globalThis=c;c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(root+'shared/runtime/persistence/v1/persistence.js','utf8'),c);
const P=c.PrometeoPersistence;
const a=P.stage('x','y',{n:1}),b=P.stage('x','y',{n:2});P.commit(a);assert.throws(()=>P.commit(b),e=>e.code==='PROMETEO_STALE_STATE_COMMIT');assert.equal(P.readRecord('x','y').revision,1);assert.equal(P.read('x','y').n,1);
P.write('x','y',{n:3},{baseRevision:1});assert.equal(P.readRecord('x','y').revision,2);assert.throws(()=>P.write('x','y',{n:4},{baseRevision:1}),e=>e.code==='PROMETEO_STALE_STATE_WRITE');
P.registerMigration('m','1','2',d=>({...d,a:1}));P.write('m','z',{x:1},{version:'1'});assert.equal(P.read('m','z',{version:'2'}).a,1);
assert.equal(P.status().receiptDurability,'SESSION_DIAGNOSTIC_ONLY_PART2_LEDGER_PENDING');
console.log(JSON.stringify({ok:true,tests:['commit-time-cas','stage-time-cas','read-record-revision','deterministic-migration','no-false-durable-receipt-claim']},null,2));