import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = 'docs/cognitive-forge/forge-sections.v1.json';
const registry = JSON.parse(fs.readFileSync(path, 'utf8'));

const expected = [
  ['fundamentos', 'Fundamentos'],
  ['planificacion', 'Planificación'],
  ['ejecucion', 'Ejecución'],
  ['aprendizaje', 'Aprendizaje'],
  ['visualizacion', 'Visualización'],
  ['experimento', 'Experimento'],
  ['evaluacion', 'Evaluación']
];

assert.equal(registry.schema, 'prometeo.forge-section-registry/v1');
assert.equal(registry.version, 1);
assert.equal(registry.section_count, 7);
assert.equal(registry.sections.length, 7);

const ids = registry.sections.map(section => section.id);
assert.equal(new Set(ids).size, 7, 'section ids must be unique');
assert.deepEqual(
  registry.sections.map(section => [section.id, section.title]),
  expected,
  'canonical seven-section identity/order changed'
);
assert.deepEqual(
  registry.sections.map(section => section.order),
  [1,2,3,4,5,6,7],
  'canonical order must be contiguous and stable'
);

console.log('FORGE_SECTIONS_V1_OK');
