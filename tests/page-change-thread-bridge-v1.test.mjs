import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildPageThreadBridge } from '../scripts/page-change-thread-bridge.mjs';

function fixture() {
  return {
    target: {
      surface_id: 'alumnos-teacher',
      page_id: 'student-world-jose',
      owner_ref: 'coordination/workstreams/student-world-jose-recovery/OWNER.json',
    },
    intent: {
      raw_text: 'Cambiar el detalle visual privado sin perder el comportamiento aceptado.',
      sanitized_summary: 'Apply the requested page-scoped visual delta while preserving established behavior.',
      public_safe_summary: true,
      capture_refs: [{ ref: 'private://capture/rev-17', digest: 'cap17', kind: 'CAPTURE_REVISION' }],
    },
    context: {
      current: [{ ref: 'catalog/current/student-world-jose.json', digest: 'current-1', state: 'CURRENT' }],
      candidate: [{ ref: 'candidates/student-world-jose/c42.json', digest: 'cand-42', state: 'CANDIDATE' }],
      history: [{ ref: 'lineage/student-world-jose/r16.json', digest: 'hist-16', state: 'HISTORY' }],
    },
    routing: {
      host_url: 'https://juanmanuelpm.github.io/prometeo/',
      return_root: 'coordination/execution-returns',
      host_project: 'universal-host',
    },
  };
}

const fixedNow = '2026-09-17T09:20:00-03:00';

test('builds a preserve-first page-thread bridge without collapsing truth layers', () => {
  const result = buildPageThreadBridge(fixture(), { now: fixedNow });
  assert.equal(result.schema, 'prometeo.page-change-thread-bridge/v1');
  assert.equal(result.planner_input.preserve_first, true);
  assert.equal(result.planner_input.truth_layers.current[0].state, 'CURRENT');
  assert.equal(result.planner_input.truth_layers.candidate[0].state, 'CANDIDATE');
  assert.equal(result.planner_input.truth_layers.history[0].state, 'HISTORY');
  assert.notDeepEqual(result.planner_input.truth_layers.current, result.planner_input.truth_layers.candidate);
});

test('deterministically deduplicates the same target, intent and evidence', () => {
  const a = buildPageThreadBridge(fixture(), { now: fixedNow });
  const b = buildPageThreadBridge(fixture(), { now: '2026-09-17T10:20:00-03:00' });
  assert.equal(a.thread.thread_id, b.thread.thread_id);
  assert.equal(a.opportunity.opportunity_id, b.opportunity.opportunity_id);
  assert.equal(a.opportunity.dedup_key, b.opportunity.dedup_key);
  assert.equal(a.planner_input.work_item_id, b.planner_input.work_item_id);
});

test('changing page identity changes thread identity and work identity', () => {
  const a = buildPageThreadBridge(fixture(), { now: fixedNow });
  const changed = fixture();
  changed.target.page_id = 'student-world-nico';
  const b = buildPageThreadBridge(changed, { now: fixedNow });
  assert.notEqual(a.thread.thread_id, b.thread.thread_id);
  assert.notEqual(a.planner_input.work_item_id, b.planner_input.work_item_id);
});

test('never emits raw human intent or private capture literals into public coordination output', () => {
  const input = fixture();
  const result = buildPageThreadBridge(input, { now: fixedNow });
  const encoded = JSON.stringify(result);
  assert.equal(encoded.includes(input.intent.raw_text), false);
  assert.equal(result.privacy.raw_intent_emitted, false);
  assert.equal(result.thread.intent_receipt.raw_text_included, false);
  assert.equal(result.planner_input.human_intent.raw_text_included, false);
});

test('fails closed without current evidence', () => {
  const input = fixture();
  input.context.current = [];
  assert.throws(() => buildPageThreadBridge(input), /context\.current must contain at least 1/);
});

test('fails closed unless the human intent summary is explicitly public-safe', () => {
  const input = fixture();
  input.intent.public_safe_summary = false;
  assert.throws(() => buildPageThreadBridge(input), /public_safe_summary must be true/);
});

test('fails closed without host routing', () => {
  const input = fixture();
  input.routing.host_url = '';
  assert.throws(() => buildPageThreadBridge(input), /routing\.host_url is required/);
});

test('never grants global promotion, Human Accepted, or Served authority', () => {
  const result = buildPageThreadBridge(fixture(), { now: fixedNow });
  assert.equal(result.authority.global_promotion_allowed, false);
  assert.equal(result.authority.current_unchanged, true);
  assert.equal(result.authority.human_accepted_unchanged, true);
  assert.equal(result.authority.served_unchanged, true);
  assert.equal(result.opportunity.authority.global_promotion_allowed, false);
  assert.equal(result.opportunity.authority.human_acceptance_implied, false);
  assert.equal(result.opportunity.authority.served_implied, false);
});

test('does not mutate caller input', () => {
  const input = fixture();
  const before = structuredClone(input);
  buildPageThreadBridge(input, { now: fixedNow });
  assert.deepEqual(input, before);
});

test('surface-only targets remain routable without inventing a page id', () => {
  const input = fixture();
  input.target.page_id = null;
  const result = buildPageThreadBridge(input, { now: fixedNow });
  const url = new URL(result.host_projection.prometeo_url);
  assert.equal(result.thread.target.page_id, null);
  assert.equal(url.searchParams.get('surface'), 'alumnos-teacher');
  assert.equal(url.searchParams.has('page'), false);
});

test('CLI materializes a reopenable JSON bridge artifact', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'prometeo-page-thread-'));
  const inputPath = path.join(dir, 'input.json');
  const outputPath = path.join(dir, 'output.json');
  await fs.writeFile(inputPath, JSON.stringify(fixture()), 'utf8');
  const script = new URL('../scripts/page-change-thread-bridge.mjs', import.meta.url).pathname;
  const run = spawnSync(process.execPath, [script, '--input', inputPath, '--output', outputPath], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(await fs.readFile(outputPath, 'utf8'));
  assert.equal(output.schema, 'prometeo.page-change-thread-bridge/v1');
  assert.match(output.host_projection.prometeo_url, /changes=WI-/);
});
