// Pruebas deterministas de motor en DOM y PixiJS simulados.
// No sustituyen las pruebas con PixiJS real + Chromium en desktop/celular.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import vm from 'node:vm';
const here=dirname(fileURLToPath(import.meta.url));
const F={
 forest:resolve(here,'../../bosque-de-las-cartas/v1/index.html'),
 optic:resolve(here,'../../optica-de-pixeles/v1/index.html'),
 mushroom:resolve(here,'../../jardin-de-micelio/v1/index.html')
};
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get(o,k){return k in o?o[k]:(()=>{})},set(o,k,v){o[k]=v;return true}});
function harness(file,{pixi=false}={}){
 const html=readFileSync(file,'utf8');
 const js=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean).pop();
 if(!js)throw Error('No hay script ejecutable');
 const elements=new Map(),listeners=new Map(),frames=[],ticker=[],warnings=[];let made=0;
 const get=id=>{
  if(elements.has(id))return elements.get(id);
  const el={id,style:{},dataset:{},attributes:{},children:[],value:{camera:0,parallax:70,blur:0,particles:28,speed:1,scale:1}[id]??0,width:1100,height:620,textContent:'',hidden:false,isConnected:true,
   classList:{toggle(){},add(){},remove(){}},
   addEventListener(type,fn){const key=id+':'+type;listeners.set(key,[...(listeners.get(key)||[]),fn])},
   dispatch(type,extra={}){for(const fn of listeners.get(id+':'+type)||[])fn({...extra,target:el,preventDefault(){}})},
   click(){el.dispatch('click')},setAttribute(name,value){el.attributes[name]=value},
   getBoundingClientRect(){return{left:0,top:0,width:1100,height:620}},
   getContext(){return ctx},appendChild(x){el.children.push(x);x.isConnected=true},removeChild(x){el.children=el.children.filter(v=>v!==x)},replaceChildren(...x){el.children=x},focus(){},setPointerCapture(){},toDataURL(){return'data:image/png;base64,YQ=='}
  };
  elements.set(id,el);return el;
 };
 const document={getElementById:get,createElement:()=>get('created'+ ++made),hidden:false,addEventListener(type,fn){listeners.set('document:'+type,[...(listeners.get('document:'+type)||[]),fn])},
  querySelectorAll(s){
   if(s==='input[type=range]')return ['camera','parallax','blur','particles','speed','scale'].map(get);
   if(s==='[data-preset]')return ['calma','bruma','vendaval'].map(x=>{const a=get('preset-'+x);a.dataset.preset=x;return a});
   if(s==='[data-dir]')return ['left','right','up','down'].map(x=>{const a=get('dir-'+x);a.dataset.dir=x;return a});
   return[];
  }
 };
 class C{constructor(){this.children=[];this.filters=[];this.scale={set(){}};this.x=0;this.y=0}addChild(...n){this.children.push(...n)}removeChild(x){this.children=this.children.filter(i=>i!==x)}}
 class S{constructor(texture){this.texture=texture;this.x=0;this.y=0;this.rotation=0;this.anchor={set(){}};this.position={set(){}};this.scale={set(){}}}destroy(){}}
 class Anim extends S{constructor(frames){super(frames[0]);this.currentFrame=0}gotoAndStop(n){this.currentFrame=n}}
 class T{constructor(o){this.source=o?.source??{update(){}}}static from(){return new T({source:{update(){}}})}}
 class App{constructor(){this.stage=new C();this.renderer={resize(){}};this.canvas=get('appCanvas');this.ticker={maxFPS:60,add(f){ticker.push(f)}}}async init(){}destroy(){}}
 const PIXI={Application:App,Container:C,Sprite:S,AnimatedSprite:Anim,Texture:T,Rectangle:class{},BlurFilter:class{}};
 const window={PIXI:pixi?PIXI:undefined,innerWidth:1200,addEventListener(){}};
 const Image=class{set src(_){queueMicrotask(()=>this.onload?.())}};
 const globals={window,document,PIXI:pixi?PIXI:undefined,Image,ResizeObserver:class{observe(){}},matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>frames.push(fn),performance:{now:()=>0},structuredClone:x=>JSON.parse(JSON.stringify(x)),devicePixelRatio:1,innerWidth:1200,Blob,URL:{createObjectURL:()=>'blob:mock',revokeObjectURL(){}},console:{log(){},warn(...a){warnings.push(a.join(' '))},error(...a){warnings.push(a.join(' '))}}};
 vm.runInNewContext(js,globals,{timeout:3000,filename:file});
 return {window,get,document,warnings,ticker,frames,async settle(){for(let i=0;i<35;i++)await Promise.resolve()},tick(n=1){for(let i=0;i<n;i++){const cb=frames.shift();cb?.(16.667+i*16.667)}}};
}
test('Bosque: juego inicial, una carta al avanzar y reinicio (Canvas DOM simulado)',async()=>{
 const h=harness(F.forest);await h.settle();const game=h.window.__PIXILAB__;
 assert.ok(game,'Debe exponer interfaz de inspección');
 assert.equal(game.getState().letters.filter(Boolean).length,0);
 game.goTo(530,408);h.tick(260);
 assert.equal(game.getState().letters[0],true);
 game.restart();assert.equal(game.getState().letters.filter(Boolean).length,0);
});
test('Bosque: PixiJS se inicializa en mock de su API (NO prueba GPU)',async()=>{
 const h=harness(F.forest,{pixi:true});await h.settle();
 assert.match(h.window.__PIXILAB__.getState().engine,/PixiJS/);
 assert.ok(h.ticker.length>0);
});
test('Óptica: un paso en pausa incrementa el estado exactamente una vez',async()=>{
 const h=harness(F.optic);await h.settle();const game=h.window.__OPTICA__;
 const old=game.getState().steps;game.pause();game.step();
 assert.equal(game.getState().steps,old+1);assert.equal(game.getState().paused,true);
});
test('Óptica: slider de partículas y filtro alteran el modelo en ruta Pixi mock',async()=>{
 const h=harness(F.optic,{pixi:true});await h.settle();const game=h.window.__OPTICA__;
 assert.match(game.getState().engine,/PixiJS/);
 h.get('particles').value=0;h.get('particles').dispatch('input');
 assert.equal(game.getState().particles,0);
 h.get('blur').value=4;h.get('blur').dispatch('input');
 assert.equal(game.getState().cfg.blur,4);
});
test('Micelio: crece en dos ramas, no atraviesa roca y deshace',async()=>{
 const h=harness(F.mushroom);await h.settle();const game=h.window.__MICELIO__;
 assert.equal(game.getState().nodes.length,1);
 assert.equal(game.grow(2,4),true);assert.equal(game.grow(1,3),true);
 assert.equal(game.getState().nodes.length,3);
 assert.equal(game.grow(5,0),false);
 game.undo();assert.equal(game.getState().nodes.length,2);
});
test('Micelio: los tres árboles se pueden conectar en una partida reproducible',async()=>{
 const h=harness(F.mushroom,{pixi:true});await h.settle();const game=h.window.__MICELIO__;
 const moves=[[2,4],[3,4],[4,4],[4,3],[4,2],[4,1],[5,4],[6,4],[7,4],[7,3],[8,3],[9,3],[9,2],[9,4],[10,4],[10,5],[10,6]];
 moves.forEach(([x,y])=>assert.equal(game.grow(x,y),true,'Crecer '+x+','+y));
 const state=game.getState();
 assert.equal(state.connected.length,3);assert.equal(state.status,'won');assert.equal(state.nodes.length,18);
 game.reset();assert.equal(game.getState().status,'playing');assert.equal(game.getState().nodes.length,1);
});
