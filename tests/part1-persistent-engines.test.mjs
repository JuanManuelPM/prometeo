import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../',import.meta.url).pathname;
function load(p,c){vm.createContext(c);vm.runInContext(fs.readFileSync(p,'utf8'),c,{filename:p});}
const mem=new Map(),rev=new Map();
const P={
 read:(ns,id,{defaultValue=null}={})=>mem.has(ns+':'+id)?structuredClone(mem.get(ns+':'+id)):defaultValue,
 readRecord:(ns,id,{defaultValue=null}={})=>mem.has(ns+':'+id)?{data:structuredClone(mem.get(ns+':'+id)),revision:rev.get(ns+':'+id)||0}:defaultValue,
 write:(ns,id,data,{baseRevision=0}={})=>{const k=ns+':'+id,current=rev.get(k)||0;if(baseRevision!==current)throw Object.assign(new Error('stale'),{code:'PROMETEO_STALE_STATE_WRITE'});mem.set(k,structuredClone(data));rev.set(k,current+1);return{revision:current+1}}
};
function fakeEngine(kind){return {create:(config,seed)=>{let state={kind,id:config.id,studentId:seed.studentId,currentNodeId:'a',n:seed.n||0};return{getState:()=>structuredClone(state),dispatch:a=>{state={...state,n:state.n+1,last:a.type};return structuredClone(state)},progress:()=>({done:state.n,total:2,ratio:state.n/2})}}}}
const c={console,structuredClone,Date,globalThis:null,PrometeoPersistence:P,PrometeoClasses:fakeEngine('class'),PrometeoStudentWorld:fakeEngine('world')};c.globalThis=c;c.window=c;
load(root+'shared/classes/runtime/v1/class-runtime.js',c);load(root+'shared/student-world/runtime/v1/student-world-runtime.js',c);
const cr=c.PrometeoClassRuntime.create({id:'algebra'},{studentId:'jose'});assert.equal(cr.status().revision,1);cr.dispatch({type:'ANSWER'});assert.equal(mem.get('class-state:jose:algebra').n,1);assert.equal(cr.status().revision,2);
P.write('class-state','jose:algebra',{kind:'class',id:'algebra',studentId:'jose',currentNodeId:'a',n:9},{baseRevision:2});assert.throws(()=>cr.dispatch({type:'ANSWER'}),e=>e.code==='PROMETEO_STALE_STATE_WRITE');assert.equal(cr.getState().n,1,'in-memory state rolls back on persistence conflict');cr.reload();assert.equal(cr.getState().n,9);cr.dispose();
const wr=c.PrometeoStudentWorldRuntime.create({id:'world-math'},{studentId:'jose'});wr.dispatch({type:'COMPLETE'});assert.equal(mem.get('student-world-state:jose:world-math').n,1);wr.dispose();
console.log(JSON.stringify({ok:true,tests:['class-durable-resume','class-cas-conflict','class-runtime-rollback','class-reload-after-conflict','student-world-durable-resume','separate-namespaces']},null,2));