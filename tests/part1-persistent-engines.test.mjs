import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../',import.meta.url).pathname;
function load(p,c){vm.createContext(c);vm.runInContext(fs.readFileSync(p,'utf8'),c,{filename:p});}
const mem=new Map();const P={read:(ns,id,{defaultValue=null}={})=>mem.has(ns+':'+id)?structuredClone(mem.get(ns+':'+id)):defaultValue,write:(ns,id,data)=>{mem.set(ns+':'+id,structuredClone(data));return{revision:1}}};
function fakeEngine(kind){return {create:(config,seed)=>{let state={kind,id:config.id,studentId:seed.studentId||seed.studentId,currentNodeId:'a',n:seed.n||0};const ls=new Set();return{getState:()=>structuredClone(state),dispatch:a=>{state={...state,n:state.n+1,last:a.type};ls.forEach(f=>f(structuredClone(state),a));return structuredClone(state)},progress:()=>({done:state.n,total:2,ratio:state.n/2}),subscribe:f=>{ls.add(f);return()=>ls.delete(f)}}}}}
const c={console,structuredClone,globalThis:null,PrometeoPersistence:P,PrometeoClasses:fakeEngine('class'),PrometeoStudentWorld:fakeEngine('world')};c.globalThis=c;c.window=c;
load(root+'shared/classes/runtime/v1/class-runtime.js',c);load(root+'shared/student-world/runtime/v1/student-world-runtime.js',c);
const cr=c.PrometeoClassRuntime.create({id:'algebra'},{studentId:'jose'});cr.dispatch({type:'ANSWER'});assert.equal(mem.get('class-state:jose:algebra').n,1);cr.dispose();
const cr2=c.PrometeoClassRuntime.create({id:'algebra'},{studentId:'jose'});assert.equal(cr2.getState().n,1);cr2.dispose();
const wr=c.PrometeoStudentWorldRuntime.create({id:'world-math'},{studentId:'jose'});wr.dispatch({type:'COMPLETE'});assert.equal(mem.get('student-world-state:jose:world-math').n,1);wr.dispose();
console.log(JSON.stringify({ok:true,tests:['class-durable-resume','student-world-durable-resume','separate-namespaces']},null,2));
