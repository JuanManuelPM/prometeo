#!/usr/bin/env node
// Built-in Node only. Replays the actual inline script with a minimal DOM adapter.
// NOT a substitute for a real browser or verified Demo Engine V6 video.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const file=process.argv[2] || 'tv/chat/scene/index.html';
const html=fs.readFileSync(file,'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert(match,'scene script missing');
const source=match[1];
const one={schema:'prometeo.tv-public-scene/v1',revision:10,label:'PROMETEO',title:'Escena válida',items:[{title:'Tarjeta segura',text:'Se conserva'}]};
const bad={...one,revision:11,title:'Escena malformada',items:[null]};
const next={...one,revision:12,title:'Escena recuperada',items:[{title:'Siguiente tarjeta',text:'El flujo sigue'}]};
const fixtures=[one,bad,next];
function el(){return {children:[],textContent:'',append(...children){this.children.push(...children)},replaceChildren(){this.children=[]}}}
const els=Object.fromEntries(['eyebrow','title','subtitle','items','state'].map(x=>[x,el()]));
const ctx={document:{hidden:false,getElementById:id=>els[id],createElement:el,addEventListener(){}},fetch:async()=>({ok:true,json:async()=>fixtures.shift()}),AbortController,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>{},Date,Error,String,Number,Array};
vm.createContext(ctx);
const instrumented=source.replace('update();setInterval(update,15000);','globalThis.__update=update;update();setInterval(update,15000);');
assert.notEqual(instrumented,source,'update hook anchor missing');
vm.runInContext(instrumented,ctx,{filename:file});
async function until(predicate){for(let i=0;i<50;i++){await new Promise(resolve=>setImmediate(resolve));if(predicate())return;}throw Error('scene async update timeout')}
await until(()=>els.state.textContent.includes('revisión 10'));
assert.equal(els.items.children.length,1);
assert.equal(els.title.textContent,'Escena válida');
await ctx.__update();
assert.equal(els.items.children.length,1,'Invalid scene erased last good card');
assert.equal(els.title.textContent,'Escena válida','Invalid scene changed last good title');
assert.match(els.state.textContent,/SCENE_ITEM_INVALID/,'Stable error code not visible');
await ctx.__update();
assert.equal(els.items.children.length,1);
assert.equal(els.items.children[0].children[0].textContent,'Siguiente tarjeta');
assert.equal(els.title.textContent,'Escena recuperada');
console.log('PASS scene regression: valid → reject malformed without losing visible state → valid recovery');
