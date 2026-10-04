import assert from 'node:assert/strict';
import {
  BLOCK_SEMANTIC_ZOOM_LEVELS,
  blockSemanticZoomLevel,
  blockSemanticZoomRule,
  blockSemanticZoomAttributes
} from '../../../current-tree/control-v11/work-score/block-semantic-zoom.mjs';

assert.deepEqual(BLOCK_SEMANTIC_ZOOM_LEVELS.map(row => [row.id, row.min_width_px]), [
  ['SIGNAL', 0],
  ['LABEL', 64],
  ['DETAIL', 112]
]);

assert.equal(blockSemanticZoomLevel(-20), 'SIGNAL');
assert.equal(blockSemanticZoomLevel(0), 'SIGNAL');
assert.equal(blockSemanticZoomLevel(63.99), 'SIGNAL');
assert.equal(blockSemanticZoomLevel(64), 'LABEL');
assert.equal(blockSemanticZoomLevel(111.99), 'LABEL');
assert.equal(blockSemanticZoomLevel(112), 'DETAIL');
assert.equal(blockSemanticZoomLevel(1000), 'DETAIL');

const signal = blockSemanticZoomRule(40);
assert.equal(signal.fields.id, true);
assert.equal(signal.fields.state, true);
assert.equal(signal.fields.title, false);
assert.equal(signal.authority, 'PRESENTATION_ONLY');

const label = blockSemanticZoomRule(80);
assert.equal(label.fields.title, true);
assert.equal(label.fields.estimate, false);

const detail = blockSemanticZoomRule(160);
assert.equal(detail.fields.title, true);
assert.equal(detail.fields.estimate, true);
assert.equal(detail.fields.dependency_summary, true);
assert.deepEqual(detail.invariant_fields, ['id', 'state']);
assert.deepEqual(blockSemanticZoomAttributes(160), {
  'data-semantic-zoom': 'detail',
  'aria-label-detail-level': 'DETAIL'
});

console.log('PASS B002 block semantic zoom rules');
