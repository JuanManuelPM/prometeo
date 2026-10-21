import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETTES, DEFAULT_STOPS, assertPalette, assertStops, bandIndex,
  createPaintedFoliageMaterial, updatePaintedFoliageMaterial,
  vertexShader, fragmentShader,
} from './painted-foliage.mjs';

// Tests unitarios sin descarga ni GPU: falsos objetos limitados a contratos de Three.js.
class Color { constructor(hex) { this.hex = hex } set(hex) { this.hex=hex; return this } }
class Vector3 { constructor(x,y,z) { Object.assign(this,{x,y,z}) } set(x,y,z) { Object.assign(this,{x,y,z}); return this } }
class ShaderMaterial { constructor(options) { Object.assign(this,options) } }
const THREE = {Color, Vector3, ShaderMaterial};

test('cuatro bandas y tres umbrales se asignan sin intervalos vacíos', () => {
  assert.deepEqual([1, .6, .5, .35, .2, .001, 0, -1].map(n => bandIndex(n)),[0,1,1,2,2,3,3,3]);
});
test('una paleta requiere cuatro colores hexadecimales', () => {
  assert.equal(assertPalette(PALETTES.forest).length, 4);
  assert.throws(() => assertPalette(['#ffffff']), /cuatro/);
  assert.throws(() => assertPalette(['red','#fff','#fff','#fff']), /cuatro/);
});
test('umbrales deben estar estrictamente ordenados', () => {
  assert.deepEqual(assertStops(DEFAULT_STOPS), DEFAULT_STOPS);
  assert.throws(() => assertStops([.1,.2,.3]), /descendentes/);
  assert.throws(() => assertStops([.6,.35,Infinity]), /descendentes/);
});
test('crea material sin depender de React ni del DOM', () => {
  const m=createPaintedFoliageMaterial(THREE);
  assert.ok(m instanceof ShaderMaterial);
  assert.equal(m.uniforms.uPalette.value.length,4);
  assert.deepEqual(m.uniforms.uStops.value,[.6,.35,.001]);
});
test('actualiza paleta, luz y stops sin recrear material', () => {
  const m=createPaintedFoliageMaterial(THREE);
  const same=updatePaintedFoliageMaterial(THREE,m,{palette:PALETTES.dusk,stops:[.8,.3,-.2],lightPosition:[-3,12,5]});
  assert.equal(m,same);
  assert.equal(m.uniforms.uPalette.value[0].hex,PALETTES.dusk[0]);
  assert.deepEqual(m.uniforms.uStops.value,[.8,.3,-.2]);
  assert.deepEqual({...m.uniforms.uLightWorld.value},{x:-3,y:12,z:5});
});
test('invalida datos y objetos de actualización incorrectos', () => {
  assert.throws(() => createPaintedFoliageMaterial(THREE,{lightPosition:[0,0,NaN]}), /lightPosition/);
  assert.throws(() => updatePaintedFoliageMaterial(THREE,{}), /no es un material/);
  assert.throws(() => updatePaintedFoliageMaterial(THREE,createPaintedFoliageMaterial(THREE),{stops:[.1,.2,.3]}), /descendentes/);
});
test('normal y luz comparten espacio de cámara', () => {
  assert.match(vertexShader, /normalMatrix\s*\*\s*normal/);
  assert.match(fragmentShader, /viewMatrix\s*\*\s*vec4\(uLightWorld/);
});
test('se aplica conversión explícita de color y tone mapping', () => {
  assert.match(fragmentShader, /<colorspace_fragment>/);
  assert.match(fragmentShader, /<tonemapping_fragment>/);
});

test('una actualización inválida no modifica otros parámetros', () => {
  const m=createPaintedFoliageMaterial(THREE);
  assert.throws(()=>updatePaintedFoliageMaterial(THREE,m,{palette:PALETTES.dusk,stops:[0,1,2]}));
  assert.equal(m.uniforms.uPalette.value[0].hex,PALETTES.forest[0]);
});
