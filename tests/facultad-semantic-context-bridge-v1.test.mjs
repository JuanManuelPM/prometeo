import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageThreadBridge } from '../scripts/page-change-thread-bridge.mjs';

function input() {
  return {
    target: {
      surface_id: 'facultad-digital',
      page_id: null,
      owner_ref: 'coordination/swarm-v1/local-integrations/facultad-digital/LOCAL_INTEGRATION_V1.json',
    },
    intent: {
      raw_text: 'correccion local',
      sanitized_summary: 'Apply a page-scoped correction while preserving the study context.',
      public_safe_summary: true,
      capture_refs: [{ ref: 'private://capture/facultad-1', digest: 'cap-1' }],
    },
    context: {
      current: [{ ref: 'coordination/portfolio/evidence/facultad-parciales/FACULTAD_V18_REGRESSION_BASELINE_20260917.json', state: 'CURRENT' }],
      candidate: [{ ref: 'pages/study-library/index.html', state: 'CANDIDATE' }],
      history: [],
    },
    semantic_context: {
      surface_id: 'facultad-digital',
      project_id: 'project-facultad',
      authority_status: 'CANDIDATE_TARGET_PINNED',
      target_path: 'pages/study-library/index.html',
      target_source_blob: 'b088b71517f081e641e984bd8378e22e9be3f368',
      course_id: 'modelos',
      selected_year: 2,
      active_tab: 'resources',
      semantic_anchor: 'course:modelos:tab:resources',
      viewport_fallback: { x: 0, y: 684 },
      explicit_shelf_position: null,
    },
    routing: {
      host_url: 'https://juanmanuelpm.github.io/prometeo/',
      return_root: 'coordination/execution-returns',
      host_project: 'universal-host',
    },
  };
}

test('Facultad context stays surface-only and produces an exact semantic reopen URL', () => {
  const result = buildPageThreadBridge(input(), { now: '2026-09-17T22:55:00Z' });
  const url = new URL(result.host_projection.prometeo_url);
  assert.equal(result.thread.target.page_id, null);
  assert.equal(result.planner_input.semantic_context.course_id, 'modelos');
  assert.equal(result.planner_input.semantic_context.selected_year, 2);
  assert.equal(result.planner_input.semantic_context.active_tab, 'resources');
  assert.equal(result.planner_input.semantic_context.semantic_anchor, 'course:modelos:tab:resources');
  assert.deepEqual(result.planner_input.semantic_context.viewport_fallback, { x: 0, y: 684 });
  assert.equal(url.searchParams.get('surface'), 'facultad-digital');
  assert.equal(url.searchParams.has('page'), false);
  assert.equal(url.searchParams.get('course'), 'modelos');
  assert.equal(url.searchParams.get('year'), '2');
  assert.equal(url.searchParams.get('tab'), 'resources');
  assert.equal(url.searchParams.get('anchor'), 'course:modelos:tab:resources');
  assert.equal(url.searchParams.get('view_y'), '684');
});

test('semantic context participates in work identity', () => {
  const a = buildPageThreadBridge(input(), { now: '2026-09-17T22:55:00Z' });
  const changed = input();
  changed.semantic_context.active_tab = 'notes';
  changed.semantic_context.semantic_anchor = 'course:modelos:tab:notes';
  const b = buildPageThreadBridge(changed, { now: '2026-09-17T22:55:00Z' });
  assert.notEqual(a.planner_input.work_item_id, b.planner_input.work_item_id);
});

test('Facultad refuses a fabricated canonical page id', () => {
  const value = input();
  value.target.page_id = 'facultad-digital';
  assert.throws(() => buildPageThreadBridge(value), /remains surface-only/);
});

test('semantic anchor accepts identifiers, not free-form correction text', () => {
  const value = input();
  value.semantic_context.semantic_anchor = 'texto libre con espacios';
  assert.throws(() => buildPageThreadBridge(value), /stable public-safe identifier/);
});

test('semantic context accepts only declared coordination fields', () => {
  const value = input();
  value.semantic_context.extra_text = 'not-allowed';
  assert.throws(() => buildPageThreadBridge(value), /not public coordination data/);
});
