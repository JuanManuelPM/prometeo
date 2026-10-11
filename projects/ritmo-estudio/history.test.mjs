import assert from 'node:assert/strict';
import {HISTORY_KEY,HISTORY_LIMIT,readFinished,recordFinished,clearFinished} from './history.mjs';
function memoryStorage() {
  const rows=new Map();
  return {
    getItem: key => rows.has(key) ? rows.get(key) : null,
    setItem: (key,value) => rows.set(key,String(value)),
    removeItem: key => rows.delete(key)
  };
}
function item(n, date='2026-10-11T00:40:00.000Z') {
  return {id:'session_'+String(n).padStart(8,'0'),session:1,plannedMinutes:25,finishedAtUtc:date};
}
let count=0;
function check(fn){fn();count++;}
const storage=memoryStorage();
check(()=>assert.deepEqual(readFinished(storage),[]));
check(()=>assert.equal(recordFinished(storage,item(1)).length,1));
check(()=>assert.equal(readFinished(storage)[0].plannedMinutes,25));
check(()=>assert.equal(recordFinished(storage,item(1)).length,1));
check(()=>assert.deepEqual(readFinished(storage)[0],item(1)));
check(()=>assert.equal(recordFinished(storage,item(2,'2026-10-11T00:41:00.000Z'))[0].id,item(2).id));
check(()=>assert.throws(()=>recordFinished(storage,{...item(3),plannedMinutes:0}),/Duración/));
check(()=>assert.throws(()=>recordFinished(storage,{...item(3),finishedAtUtc:'mañana'}),/Fecha/));
check(()=>assert.throws(()=>recordFinished(storage,{...item(3),id:'<script>'}),/ID/));
check(()=>assert.throws(()=>recordFinished(storage,{...item(3),session:13}),/Sesión/));
check(()=>{storage.setItem(HISTORY_KEY,'{mal json'); assert.throws(()=>readFinished(storage),SyntaxError)});
check(()=>{storage.setItem(HISTORY_KEY,JSON.stringify({unknown:1}));assert.throws(()=>readFinished(storage),/formato/)});
check(()=>{storage.removeItem(HISTORY_KEY);assert.deepEqual(readFinished(storage),[])});
check(()=>{for(let i=0;i<HISTORY_LIMIT+3;i++)recordFinished(storage,item(i));assert.equal(readFinished(storage).length,HISTORY_LIMIT)});
check(()=>{clearFinished(storage);assert.equal(storage.getItem(HISTORY_KEY),null)});
check(()=>{const blocked={getItem(){throw Error('blocked')}};assert.throws(()=>readFinished(blocked),/blocked/)});
check(()=>{const blocked={getItem:()=>null,setItem(){throw Error('quota')}};assert.throws(()=>recordFinished(blocked,item(4)),/quota/)});
check(()=>{const old=[item(5),item(5)];storage.setItem(HISTORY_KEY,JSON.stringify(old));assert.throws(()=>readFinished(storage),/repetidos/)});
console.log('HISTORY_PASS '+count+' tests: local-only, sorted, duplicated, invalid/corrupt, quota, retention, clear');
