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
