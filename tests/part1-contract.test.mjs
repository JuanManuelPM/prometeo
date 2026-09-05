import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function eventTarget(){const l={};return {addEventListener:(t,f)=>((l[t]??=[]).push(f)),removeEventListener:(t,f)=>{l[t]=(l[t]||[]).filter(x=>x!==f)},dispatchEvent:e=>(l[e.type]||[]).forEach(f=>f(e))};}
function load(path,ctx){vm.createContext(ctx);vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});}

const root=new URL('../',import.meta.url).pathname;
let nav={state:'IDLE',currentNode:'__home__',path:[],selectedIndex:0,selected:'root',paletteOffset:0,history:[]};
const win={...eventTarget(),console,Date,Math,JSON,structuredClone,setTimeout,clearTimeout,queueMicrotask,MutationObserver:class{observe(){} disconnect(){}},CustomEvent:class{constructor(type,o={}){this.type=type;this.detail=o.detail}},globalThis:null};win.globalThis=win;win.window=win;
const fakeWorld={closest:s=>s==='.world'?fakeWorld:null};
const doc={...eventTarget(),body:{},getElementById:id=>id==='worldStage'?{}:null,querySelector:s=>{if(s.includes('data-node-kind="page"'))return null;return null;}};win.document=doc;
win.__PROMETEO_BUILD__='PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901';
win.__PROMETEO_V53__={getState:()=>structuredClone(nav),home:()=>nav.currentNode==='__home__',left:()=>{},right:()=>{},up:()=>{nav.selectedIndex=Math.max(0,nav.selectedIndex-1)},down:()=>{nav.selectedIndex++}};

let gesture=null;const focus=[];let seq=0;
win.PrometeoOwnership={
  acquireGesture:(owner,meta={})=>{if(gesture)throw Object.assign(new Error('conflict'),{code:'PROMETEO_INPUT_OWNER_CONFLICT'});gesture={id:`g-${++seq}`,owner,...meta};return gesture},
  releaseGesture:t=>{if(gesture?.id!==t?.id)return false;gesture=null;return true},
  acquireFocus:(owner,opt={})=>{const t={id:`f-${++seq}`,owner,...opt};focus.push(t);return t},
  releaseFocus:t=>{const top=focus.at(-1);if(top?.id!==t?.id)throw Object.assign(new Error('order'),{code:'PROMETEO_FOCUS_LEASE_ORDER'});focus.pop();return {released:true}},
  snapshot:()=>({gesture,focus:[...focus]})
};
const mem=new Map();
win.PrometeoPersistence={
  write:(ns,id,data)=>{mem.set(`${ns}:${id}`,structuredClone(data));return {revision:1}},
  read:(ns,id,{defaultValue=null}={})=>mem.has(`${ns}:${id}`)?structuredClone(mem.get(`${ns}:${id}`)):defaultValue
};
load(root+'shared/shell/v53-adapter/v1/v53-shell-adapter.js',win);
const S=win.PrometeoV53ShellAdapter;
assert.equal((await S.waitReady()).getState().currentNode,'__home__');
const snap=S.semanticSnapshot();assert.equal(snap.schema,'prometeo.v53-semantic-return/v1');assert.deepEqual(Array.from(snap.path),[]);
const shell=S.mount({persist:true,restore:false});assert.equal(shell.kind,'V53_EXISTING_SHELL_ADAPTER');assert.equal(shell.status().terminalOpen,false);shell.persistNow();
const saved=win.PrometeoPersistence.read('navigator','v53-semantic-state',{version:'1'});assert.equal(saved.currentNode,'__home__');
assert.equal(win.PrometeoOwnership.snapshot().focus.length,0);
shell.destroy();
console.log(JSON.stringify({ok:true,tests:['adapter-ready','semantic-snapshot','persistence','no-phantom-focus']},null,2));
