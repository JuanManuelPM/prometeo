/**
 * Three.js specialist source contract suite.
 * Usage from this directory: node --test qa-contracts.test.mjs
 * Node >=20. No npm packages, browser or remote network required.
 * Important: Passing DOES NOT certify live WebGL or mobile UX.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const text=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const kitSource=text('./kit.js');
const source={
 sendero:text('../../sendero-vivo/v1/index.html'),
 estudio:text('../../estudio-de-mundos/v1/index.html'),
 jardin:text('../../jardin-de-ecos/v1/index.html'),
};
const sandbox={globalThis:{}};
runInNewContext(kitSource,sandbox);
const K=sandbox.globalThis.PrometeoThreeKit;
const js=src=>{const match=src.match(/<script type="module">([\s\S]*?)<\/script>/);assert.ok(match,'module script not found');return match[1]};
function parseSourceModule(code){new Function(code)} // dynamic import is syntactically valid.
function extractFn(code,name){
 const start=code.indexOf('function '+name+'(');
 assert.ok(start>=0,'Function '+name+' missing');
 let begin=code.indexOf('{',start),level=0,i=begin;
 for(;i<code.length;i++){if(code[i]==='{')level++;if(code[i]==='}'&&!--level)break}
 return code.slice(start,i+1);
}

test('KIT 01: archivo compartido válido y exporta contratos',()=>{
 assert.equal(typeof K.makeWorld,'function');
 assert.equal(typeof K.bindOrbit,'function');
 assert.equal(typeof K.route,'function');
 assert.equal(typeof K.download,'function');
});
test('KIT 02: generación por semilla determinista',()=>{
 for(let i=0;i<200;i++) assert.equal(K.rnd(42,i,-i,9),K.rnd(42,i,-i,9));
 assert.notEqual(K.rnd(42,2,4,0),K.rnd(43,2,4,0));
 assert.equal(K.height(2,9,42),K.height(2,9,42));
});
test('KIT 03: A* llega a destino y no atraviesa celda ocupada',()=>{
 const path=K.route([0,0],[6,2],(x,z)=>x===2&&z===0,42,2);
 assert.ok(path?.length);
 assert.deepEqual(path.at(-1),[6,2]);
 assert.equal(path.some(p=>p[0]===2&&p[1]===0),false);
});
test('KIT 04: A* no corta una esquina doblemente bloqueada',()=>{
 const f=(x,z)=>(x===2&&z===0)||(x===0&&z===2);
 const p=K.route([0,0],[2,2],f,42,2);
 assert.ok(p?.length,'a valid detour must exist');
 assert.notDeepEqual(p[0],[2,2],'forbidden initial diagonal');
});
test('KIT 05: A* imposible termina en null',()=>{
 assert.equal(K.route([0,0],[2,2],()=>true,42,2),null);
});
test('SOURCES 06: las tres experiencias parsean y son HTML autónomos',()=>{
 for(const [name,src] of Object.entries(source)){
  assert.match(src,/<!doctype html>/i,name);
  assert.match(src,/lang="es-AR"/);
  assert.match(src,/name="viewport"/);
  assert.match(src,/shared\/v1\/kit\.js/);
  assert.match(src,/three@0\.160\.1\/build\/three\.module\.js/);
  assert.doesNotMatch(src,/\blocalStorage\b/,'iframe sandbox may not have storage access');
  parseSourceModule(js(src));
 }
});
test('SENDERO 07: controles manual + tap/ruta + cámara por separado',()=>{
 const s=source.sendero;
 assert.match(s,/data-move="w"/);
 assert.match(s,/P\.bindKeys/);
 assert.match(s,/onTap:tap/);
 assert.match(s,/P\.route/);
 assert.match(s,/route=\[\]/);
 assert.match(s,/orbit\.update/);
});
test('SENDERO 08: objetivos de tres santuarios y exportación importación',()=>{
 const s=source.sendero;
 for(const id of ['aurora','umbra','lumen']) assert.ok(s.includes(id));
 assert.match(s,/found\.size===3/);
 assert.match(s,/prometeo\.sendero\/v1/);
 assert.match(s,/importState/);
 assert.match(s,/P\.download/);
});
test('SENDERO 09: export/import de faroles limpia mallas viejas',()=>{
 const s=source.sendero;
 assert.match(s,/beaconMeshes=\[\]/);
 assert.match(s,/beaconMeshes\.push\(g\)/);
 assert.match(s,/world\.scene\.remove\(old\)/);
});
test('ESTUDIO 10: dos escenas y métricas del renderer no simuladas',()=>{
 const s=source.estudio;
 assert.match(s,/views\.A=\{view:P\.makeRenderer/);
 assert.match(s,/views\.B=\{view:P\.makeRenderer/);
 assert.match(s,/renderer\.info\.render/);
});
test('ESTUDIO 11: deshacer, rehacer, exportar, importar',()=>{
 const s=source.estudio;
 assert.match(s,/history=history\.slice\(0,cursor\+1\)/);
 assert.match(s,/cursor--/);assert.match(s,/cursor\+\+/);
 assert.match(s,/prometeo\.world-lab\/v1/);
 assert.match(s,/P\.download/);
});
test('JARDIN 12: grafo es resoluble con nueve enlaces válidos y sin tocar barreras',()=>{
 const script=js(source.jardin);
 const prefix=script.slice(script.indexOf('const nodes=['),script.indexOf('let T,w,view,meshes='));
 const edges=[['S','A'],['S','B'],['A','C'],['B','D'],['C','E'],['D','F'],['E','R1'],['F','R2'],['D','R3']].map(([a,b])=>({a,b}));
 const ctx={P:{clamp:K.clamp},edges};
 const logic=runInNewContext(prefix+'\n'+extractFn(script,'key')+'\n'+extractFn(script,'collides')+'\n'+extractFn(script,'powered')+'\n({byId,collides,powered})',ctx);
 for(const {a,b} of edges){
  const A=logic.byId[a],B=logic.byId[b];
  assert.ok(Math.hypot(A.x-B.x,A.z-B.z)<=11.2);
  assert.ok(!logic.collides(A,B));
 }
 for(const id of ['R1','R2','R3'])assert.ok(logic.powered().has(id));
});
test('JARDIN 13: crecimiento GPU y presupuesto de conexiones',()=>{
 const s=source.jardin;
 assert.match(s,/edges\.length>=MAX/);
 assert.match(s,/uGrowth/);assert.match(s,/TubeGeometry/);
 assert.match(s,/ShaderMaterial/);
 assert.match(s,/#include <tonemapping_fragment>\\n#include <colorspace_fragment>/);
});
test('JARDIN 14: importación transaccional preserva progreso si falla',()=>{
 const s=source.jardin;
 assert.match(s,/Transacción: hasta acá el mundo anterior sigue intacto/);
 assert.match(s,/seen\.has\(k\)/);
 assert.match(s,/clearEdges\(\);lit=new Set\(\["S"\]\);for\(const \[a,b\] of validated\)/);
});
test('JARDIN 15: reiniciar cancela el antiguo loop de animación',()=>{
 assert.match(source.jardin,/function reset\(\)\{running=false;cancelAnimationFrame\(frame\)/);
});
