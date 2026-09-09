import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../shared/capture/v1/canary-app.js', import.meta.url), 'utf8');
const host = fs.readFileSync(new URL('../shared/capture/v1/v53-host.js', import.meta.url), 'utf8');

test('served canary binds Input Ownership from embedded navigator realm', () => {
  assert.match(app, /frame\.contentWindow\?\.PrometeoOwnership/);
  assert.match(app, /recorder\.ownership=ownership/);
});

test('Patent flow resolves PrometeoWorkflow from embedded navigator realm first', () => {
  assert.match(host, /this\.win\?\.PrometeoWorkflow\|\|globalThis\.PrometeoWorkflow/);
});

test('recovered universal input stays inside the P4 host instead of reviving a global shell', () => {
  assert.match(host, /createCapture,appendTranscriptRevision/);
  assert.match(host, /data-role=\"draft\"/);
  assert.match(host, /data-role=\"save-text\"/);
  assert.match(host, /input_mode:'text'/);
  assert.doesNotMatch(host, /__PROMETEO_GLOBAL_SHELL__/);
});

test('recovered local utilities expose playback and clipboard copy without exporting authority', () => {
  assert.match(host, /data-role=\"copy\"/);
  assert.match(host, /copyVisible\(\)/);
  assert.match(host, /getAudioBlob\(id\)/);
  assert.match(host, /data-role=\"play\"/);
  assert.match(host, /privacy:'LOCAL'/);
});
