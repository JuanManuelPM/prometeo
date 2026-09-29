import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('../shared/capture/v1/change-loop.js',import.meta.url),'utf8');

test('Page Change notes remain local-first when remote workspace is unavailable',()=>{
  assert.match(src,/Modo local-first: texto y audio se guardan en este dispositivo/);
  assert.match(src,/Nota guardada localmente/);
  assert.match(src,/if\(!client\.hasWorkspace\(\)\)\{const d=\{thread:null,pending:\[\],processing:\[\],attachments:\[\],results:\[\],local_only:true\}/);
  assert.doesNotMatch(src,/if\(!client\.hasWorkspace\(\)\)\{adapter\.openLegacyNotes\?\.\(\);return false\}/);
  assert.match(src,/linked&&count\?'':'disabled'/);
  assert.match(src,/Los archivos requieren transporte privado vinculado/);
});
