import assert from 'node:assert/strict';
import {
  normalizePanZoomState,
  panViewport,
  zoomViewportAt,
  deriveTouchGesture,
  applyTouchGesture
} from '../../../current-tree/control-v11/work-score/touch-pan-zoom.mjs';

assert.deepEqual(normalizePanZoomState({ x: 10, y: -5, scale: 99 }, { minScale: 0.5, maxScale: 3 }), { x: 10, y: -5, scale: 3 });
assert.deepEqual(panViewport({ x: 10, y: 20, scale: 1 }, { dx: 7, dy: -4 }), { x: 17, y: 16, scale: 1 });

const zoomed = zoomViewportAt({ x: 0, y: 0, scale: 1 }, { x: 100, y: 50 }, 2);
assert.deepEqual(zoomed, { x: -100, y: -50, scale: 2 });
assert.equal((100 - zoomed.x) / zoomed.scale, 100);
assert.equal((50 - zoomed.y) / zoomed.scale, 50);

const panGesture = deriveTouchGesture([{ x: 10, y: 20 }], [{ x: 15, y: 28 }]);
assert.deepEqual(panGesture, { kind: 'PAN', dx: 5, dy: 8, focal: { x: 15, y: 28 }, scaleFactor: 1 });
assert.deepEqual(applyTouchGesture({ x: 0, y: 0, scale: 1 }, panGesture), { x: 5, y: 8, scale: 1 });

const pinch = deriveTouchGesture(
  [{ x: 0, y: 0 }, { x: 100, y: 0 }],
  [{ x: -50, y: 0 }, { x: 150, y: 0 }]
);
assert.equal(pinch.kind, 'PINCH');
assert.equal(pinch.scaleFactor, 2);
assert.deepEqual(pinch.focal, { x: 50, y: 0 });
const pinched = applyTouchGesture({ x: 0, y: 0, scale: 1 }, pinch);
assert.deepEqual(pinched, { x: -50, y: 0, scale: 2 });

assert.equal(deriveTouchGesture([], []), null);
assert.equal(deriveTouchGesture([{ x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 1, y: 1 }]), null);
assert.equal(deriveTouchGesture([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]), null);

console.log('PASS B009 touch pan zoom');
