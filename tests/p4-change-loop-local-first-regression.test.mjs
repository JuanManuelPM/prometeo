import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../shared/capture/v1/change-loop.js',import.meta.url),'utf8');

test('Page Change notes remain local-first when remote workspace or transport is unavailable',()=>{
  assert.match(src,/Modo local-first: texto y audio se guardan en este dispositivo/);
  assert.match(src,/Nota guardada localmente/);
  assert.match(src,/remoteAvailable=false/);
  assert.match(src,/client\.hasWorkspace\(\)&&remoteAvailable/);
  assert.match(src,/local_only:true,remote_error:/);
  assert.match(src,/if\(!client\.hasWorkspace\(\)\|\|!remoteAvailable\).*Notas locales listas/);
  assert.doesNotMatch(src,/if\(!client\.hasWorkspace\(\)\)\{adapter\.openLegacyNotes\?\.\(\);return false\}/);
  assert.match(src,/Los archivos requieren transporte privado disponible/);
});

test('Page Change can project exact object lineage without owning it',()=>{
  assert.match(src,/historyForPage/);
  assert.match(src,/Contexto · misma lineage/);
  assert.match(src,/node_key/);
  assert.match(src,/context_key/);
  assert.match(src,/object_kind/);
});
