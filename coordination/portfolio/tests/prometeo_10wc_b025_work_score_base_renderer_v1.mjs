import assert from 'node:assert/strict';
import { buildWorkScoreBlockViewModel, renderWorkScoreBlockHtml } from '../../../current-tree/control-v11/work-score/work-score-base-renderer.mjs';

const block = {
  block_id: 'B025',
  title: 'work-score <base>',
  state: 'READY',
  expected_minutes: 8,
  dependencies: ['B001', 'B002'],
  critical: true
};

const signal = buildWorkScoreBlockViewModel(block, { effectiveWidthPx: 40 });
assert.equal(signal.zoom.level, 'SIGNAL');
assert.equal(signal.visible.id, 'B025');
assert.equal(signal.visible.title, null);
assert.equal(signal.visible.state, 'READY');
assert.equal(signal.cue, 'ready-signal');
assert.equal(signal.authority, 'PRESENTATION_ONLY');

const label = buildWorkScoreBlockViewModel(block, { effectiveWidthPx: 80, selected: true });
assert.equal(label.zoom.level, 'LABEL');
assert.equal(label.visible.title, 'work-score <base>');
assert.equal(label.visible.estimate_minutes, null);
assert.ok(label.classes.includes('sel'));
assert.ok(label.classes.includes('crit'));

const detail = buildWorkScoreBlockViewModel(block, { effectiveWidthPx: 140 });
assert.equal(detail.zoom.level, 'DETAIL');
assert.equal(detail.visible.estimate_minutes, 8);
assert.equal(detail.visible.dependency_summary, 'B001, B002');

const html = renderWorkScoreBlockHtml(block, { effectiveWidthPx: 140 });
assert.match(html, /data-semantic-zoom="detail"/);
assert.match(html, /data-work-state="ready"/);
assert.match(html, /work-score &lt;base&gt;/);
assert.doesNotMatch(html, /<base>/);

const legacy = buildWorkScoreBlockViewModel({ block_id: 'X', title: 'legacy', state: 'ACTIVE' }, { effectiveWidthPx: 120 });
assert.equal(legacy.cue, 'unknown-signal');
assert.equal(legacy.state, 'ACTIVE');
assert.equal(legacy.attributes['data-work-cue'], 'unknown-signal');

console.log('B025_WORK_SCORE_BASE_RENDERER_PASS');
