#!/usr/bin/env node
// Regression tests for El bosque de las cartas. No external npm packages required.
// Run: node --test tests.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const html=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'index.html'),'utf8');
const source=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(source,'embedded main game script missing');

test('Contratos del widget: DOM real, atlas, Pixi 8, fallback',()=>{
  assert.ok(html.includes('new PIXI.Application()'));
  assert.ok(html.includes('new PIXI.AnimatedSprite(frames)'));
  assert.ok(html.includes('cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.js'));
  assert.ok(html.includes('startCanvas(art)'));
  for(const id of ['scene','score','zone','complete','restart','again','renderer'])assert.ok(html.includes('id="'+id+'"'));
  assert.ok(!/\blocalStorage\b|\bsendBeacon\b/.test(source),'the widget must not track user state');
  new vm.Script(source);
});

async function harness(withPixi=false){
  let tick,clock=0,drawCount=0,letters=[],warnings=[],eventHandlers={};
  const store=new Map(),frameQueue=[];
  const canvasCtx=new Proxy({},{get:()=>()=>{drawCount++},set:()=>true});
  function node(id){
    if(store.has(id))return store.get(id);
    const elem={id,hidden:true,textContent:'',isConnected:true,dataset:{},style:{},
      clientWidth:1000,clientHeight:560,width:1000,height:560,handlers:{},
      addEventListener(n,fn){(this.handlers[n]??=[]).push(fn)},
      dispatch(n,v={}){for(const f of this.handlers[n]||[])f(v)},
      setAttribute(){},focus(){},setPointerCapture(){},appendChild(el){this.child=el},
      replaceChildren(){this.child=null},getContext(){return canvasCtx},
      getBoundingClientRect(){return {left:0,top:0,width:1000,height:560}}
    };store.set(id,elem);return elem;
  }
  const doc={getElementById:node,createElement:()=>node('test-canvas'),
    querySelectorAll:()=>[],addEventListener(n,fn){(eventHandlers[n]??=[]).push(fn)}};
  const img=class{set src(v){this.url=v;this.onload?.()}};
  let rafCallback;
  class Display{
    constructor(){this.visible=true;this.currentFrame=0;this.anchor={set(){}};this.scale={x:1,set(x){this.x=x}};
      this.position={set:(x,y)=>{this.x=x;this.y=y}};this.children=[];}
    addChild(...all){this.children.push(...all);}
    gotoAndStop(i){this.currentFrame=i}
  }
  class App{
    constructor(){this.stage=new Display();this.renderer={resize(){}};this.canvas=node('pixi-canvas');
      this.ticker={add(f){tick=f},maxFPS:60};}
    async init(){}
    destroy(){}
  }
  const PIXI={Application:App,Container:Display,Sprite:Display,AnimatedSprite:Display,
    Texture:class{constructor(o){Object.assign(this,o)}static from(a){return {source:{image:a}}}},
    Rectangle:class{constructor(...a){this.bounds=a}},BlurFilter:class{}};
  const w={PIXI:withPixi?PIXI:null,addEventListener(){}};
  const context={window:w,document:doc,Image:img,ResizeObserver:class{observe(){}},
    matchMedia:()=>({matches:false}),performance:{now:()=>clock},devicePixelRatio:1,innerWidth:1200,
    requestAnimationFrame:fn=>frameQueue.push(fn),
    console:{error:(e)=>warnings.push(String(e)),warn:(e)=>warnings.push(String(e)),log(){}},
  };
  vm.runInNewContext(source,context,{timeout:3000});
  for(let i=0;i<30;i++)await Promise.resolve();
  const state=()=>JSON.parse(JSON.stringify(w.__PIXILAB__.getState()));
  function advance(frames=1){
    for(let i=0;i<frames;i++){clock+=1000/60;
      if(withPixi){assert.ok(tick,'ticker did not start');tick({deltaMS:1000/60})}
      else{rafCallback=frameQueue.shift();assert.ok(rafCallback,'rAF did not start');rafCallback(clock)}
    }
  }
  return {state,advance,go:(x,y)=>w.__PIXILAB__.goTo(x,y),reset:w.__PIXILAB__.restart,dom:node,
    dispatchKey:(n,key)=>{for(const f of eventHandlers[n]||[])f({key,preventDefault(){}})},warnings,art:()=>drawCount};
}

for(const engine of ['Canvas 2D','PixiJS'])test('Caminata, cartas, puerta, reinicio: '+engine,async()=>{
  const h=await harness(engine==='PixiJS');const initial=h.state();
  assert.equal(initial.x,115);assert.deepEqual(initial.letters,[false,false,false]);
  h.advance(20);assert.equal(h.state().x,initial.x,'idle mouse does not move the character');
  // Puerta sin cartas: caminar hasta el final NO habilita el cierre.
  h.go(2260,440);h.advance(800);assert.equal(h.state().completed,false);
  // Camino invertido: se pueden recoger las cartas en cualquier orden.
  h.go(1920,417);h.advance(190);assert.equal(h.state().letters[2],true);
  h.go(1210,451);h.advance(240);assert.equal(h.state().letters[1],true);
  h.go(530,408);h.advance(240);assert.equal(h.state().letters[0],true);
  assert.deepEqual(h.state().letters,[true,true,true]);
  assert.equal(h.dom('score').textContent,'3 / 3 cartas');
  h.go(2250,450);h.advance(550);
  assert.equal(h.state().completed,true);assert.equal(h.dom('complete').hidden,false);
  h.reset();assert.equal(h.state().x,115);assert.deepEqual(h.state().letters,[false,false,false]);
  assert.equal(h.dom('score').textContent,'0 / 3 cartas');
  assert.equal(h.warnings.length,0);
});

test('Teclado: soltar detiene; clic mueve sin arrastre',async()=>{
 const h=await harness();
 h.dispatchKey('keydown','d');h.advance(45);assert.ok(h.state().x>125);
 h.dispatchKey('keyup','d');const x=h.state().x;h.advance(30);assert.equal(h.state().x,x);
 h.dom('scene').dispatch('pointerdown',{button:0,clientX:850,clientY:420});
 h.advance(80);assert.ok(h.state().x>x);
 assert.equal(h.warnings.length,0);
});
