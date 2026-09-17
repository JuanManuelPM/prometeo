import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REQUIRED_SURFACE_IDS,
  buildControlView,
  validateControlState
} from '../../coordination/candidates/multi-surface-control-v1/control-model.mjs';
import { sampleState } from '../../coordination/candidates/multi-surface-control-v1/sample-state.mjs';

test('candidate contains all four required surfaces', () => {
  const result = validateControlState(sampleState);
  assert.equal(result.ok, true, result.errors.join('\n'));
  const view = buildControlView(sampleState);
  assert.deepEqual(view.surfaces.map((surface) => surface.id), REQUIRED_SURFACE_IDS);
});

test('Live/telemetry remains a derived projection, never source of truth', () => {
  const view = buildControlView(sampleState);
  assert.equal(view.telemetry.sourceOfTruth, false);
  assert.match(view.authorityBanner, /not Current \/ Human Accepted \/ Served/);
});

test('candidate surfaces cannot self-promote authority', () => {
  const promoted = structuredClone(sampleState);
  promoted.surfaces[0].authority.current = true;
  const result = validateControlState(promoted);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('self-promote authority')));
});

test('unresolved routes cannot smuggle a guessed href', () => {
  const guessed = structuredClone(sampleState);
  guessed.surfaces[1].preview.href = 'https://example.com/guessed';
  guessed.surfaces[1].preview.routeState = 'UNRESOLVED';
  const result = validateControlState(guessed);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('unresolved route must not carry href')));
});

test('missing one surface fails closed', () => {
  const incomplete = structuredClone(sampleState);
  incomplete.surfaces = incomplete.surfaces.filter((surface) => surface.id !== 'facultad-digital');
  const result = validateControlState(incomplete);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('facultad-digital')));
});

test('telemetry claiming source-of-truth authority is rejected', () => {
  const badTelemetry = structuredClone(sampleState);
  badTelemetry.telemetry.sourceOfTruth = true;
  const result = validateControlState(badTelemetry);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes('cannot be source of truth')));
});
