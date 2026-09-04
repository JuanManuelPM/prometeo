import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url).pathname;
function load(path,c){vm.createContext(c);vm.runInContext(fs.readFileSync(path,'utf8'),c,{filename:path});}
function target(){const l={};return {addEventListener:(t,f)=>((l[t]??=[]).push(f)),dispatchEvent:e=>(l[e.type]||[]).forEach(f=>f(e)),focus(){},remove(){this.removed=true}}}
function el(tag){const x={tagName:tag.toUpperCase(),className:'',hidden:false,dataset:{},children:[],style:{},...target(),appendChild(c){this.children.push(c);return c},setAttribute(k,v){this[k]=v}};return x;}
const doc={currentScript:{src:'https://example.test/shared/pagekit/host/v2/pagekit-host.js'},baseURI:'https://example.test/',createElement:el};
let focus=[];let seq=0;
const ctx={console,structuredClone,URL,CustomEvent:class{constructor(type,o={}){this.type=type;this.detail=o.detail}},queueMicrotask,document:doc,globalThis:null};ctx.globalThis=ctx;ctx.window=ctx;
ctx.PrometeoOwnership={snapshot:()=>({focus:[...focus]}),acquireFocus:(owner,opt={})=>{const parent=focus.at(-1);if(parent&&opt.parentLeaseId!==parent.id)throw Object.assign(new Error('parent'),{code:'PROMETEO_FOCUS_PARENT_REQUIRED'});const t={id:`f${++seq}`,owner,...opt};focus.push(t);return t},releaseFocus:t=>{assert.equal(focus.at(-1)?.id,t.id);focus.pop();return{released:true}}};
load(root+'shared/pagekit/host/v2/pagekit-host.js',ctx);
const container=el('div');const h=ctx.PrometeoPageKitHostV2.create({container,version:'v37',stateKey:'lesson-1'});assert.equal(h.status.opened,false);h.open();assert.equal(focus.length,1);const frame=h.frame;h.close();assert.equal(focus.length,0);assert.equal(h.frame,frame);assert.equal(frame.removed,undefined);h.setMode('presentation').open();assert.equal(h.status.mode,'presentation');h.close();h.destroy();assert.equal(container.children.length,1);
assert.throws(()=>ctx.PrometeoPageKitHostV2.create({container,version:'bad',stateKey:'x'}));
console.log(JSON.stringify({ok:true,tests:['pagekit-close-preserves-frame','focus-lease','modes','version-pin']},null,2));
