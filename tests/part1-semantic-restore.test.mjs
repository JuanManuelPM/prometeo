import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=new URL('../',import.meta.url).pathname;
const listeners={};const doc={body:{},addEventListener:(t,f)=>((listeners[t]??=[]).push(f)),removeEventListener(){},getElementById:id=>id==='worldStage'?{}:null,querySelector:s=>s.includes('data-node-kind="page"')&&nav.currentNode==='page-x'?{}:null};
const ctx={console,structuredClone,Date,Math,JSON,setTimeout,clearTimeout,queueMicrotask,document:doc,MutationObserver:class{observe(){}disconnect(){}},globalThis:null,addEventListener(){}};ctx.globalThis=ctx;ctx.window=ctx;
let focus=[],seq=0;ctx.PrometeoOwnership={snapshot:()=>({focus:[...focus]}),acquireFocus:(owner,opt={})=>{const t={id:`f${++seq}`,owner,...opt};focus.push(t);return t},releaseFocus:t=>{assert.equal(focus.at(-1)?.id,t.id);focus.pop();return{released:true}},acquireGesture:(owner,opt)=>({id:'g1',owner,...opt}),releaseGesture:()=>true};ctx.PrometeoPersistence={write:()=>({}),read:()=>null};
let nav={state:'IDLE',currentNode:'random',path:['random'],selectedIndex:4,selected:null,paletteOffset:0,history:[{node:'__home__',selectedIndex:0}]};
const route={
 '__home__':{0:['prometeo',['prometeo']]},
 'prometeo':{1:['projects',['prometeo','projects']]},
 'projects':{2:['page-x',['prometeo','projects','page-x']]}
};
ctx.__PROMETEO_BUILD__='PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901';
ctx.__PROMETEO_V53__={
 getState:()=>structuredClone(nav),home:()=>nav.currentNode==='__home__',
 left:()=>{if(!nav.history.length){nav={...nav,currentNode:'__home__',path:[],selectedIndex:0,history:[]};return;}const s=nav.history.pop();nav={...nav,currentNode:s.node,path:s.path||[],selectedIndex:s.selectedIndex||0,history:[...nav.history]};},
 right:()=>{const dest=route[nav.currentNode]?.[nav.selectedIndex];if(!dest)return;const old={node:nav.currentNode,path:[...nav.path],selectedIndex:nav.selectedIndex,paletteOffset:0};nav.history.push(old);nav={...nav,currentNode:dest[0],path:dest[1],selectedIndex:0,history:[...nav.history]};},
 up:()=>{nav.selectedIndex=Math.max(0,nav.selectedIndex-1)},down:()=>{nav.selectedIndex++}
};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'shared/shell/v53-adapter/v1/v53-shell-adapter.js','utf8'),ctx);
nav={state:'IDLE',currentNode:'__home__',path:[],selectedIndex:0,selected:'prometeo',paletteOffset:0,history:[]};
const target={schema:'prometeo.v53-semantic-return/v1',build:ctx.__PROMETEO_BUILD__,currentNode:'page-x',path:['prometeo','projects','page-x'],selectedIndex:0,history:[{node:'__home__',selectedIndex:0,paletteOffset:0},{node:'prometeo',selectedIndex:1,paletteOffset:0},{node:'projects',selectedIndex:2,paletteOffset:0}]};
const restored=await ctx.PrometeoV53ShellAdapter.restoreSemantic(target);assert.equal(restored.currentNode,'page-x');assert.equal(restored.history.length,3);
const shell=ctx.PrometeoV53ShellAdapter.mount({persist:false});shell.reconcile();assert.equal(focus.length,1);assert.equal(focus[0].owner,'v53.terminal');
nav.currentNode='projects';shell.reconcile();assert.equal(focus.length,0);shell.destroy();
console.log(JSON.stringify({ok:true,tests:['semantic-route-replay','no-pixel-restore','terminal-focus-acquire-release']},null,2));
