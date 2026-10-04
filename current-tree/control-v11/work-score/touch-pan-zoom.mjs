const DEFAULT_LIMITS = Object.freeze({ minScale: 0.5, maxScale: 3 });

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function point(touch) {
  return { x: finite(touch?.x ?? touch?.clientX), y: finite(touch?.y ?? touch?.clientY) };
}

function center(points) {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length
  };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalizePanZoomState(state = {}, limits = DEFAULT_LIMITS) {
  const minScale = finite(limits.minScale, DEFAULT_LIMITS.minScale);
  const maxScale = Math.max(minScale, finite(limits.maxScale, DEFAULT_LIMITS.maxScale));
  return {
    x: finite(state.x),
    y: finite(state.y),
    scale: clamp(finite(state.scale, 1), minScale, maxScale)
  };
}

export function panViewport(state, delta = {}, limits = DEFAULT_LIMITS) {
  const current = normalizePanZoomState(state, limits);
  return {
    ...current,
    x: current.x + finite(delta.dx),
    y: current.y + finite(delta.dy)
  };
}

export function zoomViewportAt(state, focal = {}, scaleFactor = 1, limits = DEFAULT_LIMITS) {
  const current = normalizePanZoomState(state, limits);
  const minScale = finite(limits.minScale, DEFAULT_LIMITS.minScale);
  const maxScale = Math.max(minScale, finite(limits.maxScale, DEFAULT_LIMITS.maxScale));
  const nextScale = clamp(current.scale * finite(scaleFactor, 1), minScale, maxScale);
  const ratio = nextScale / current.scale;
  const fx = finite(focal.x);
  const fy = finite(focal.y);
  return {
    x: fx - (fx - current.x) * ratio,
    y: fy - (fy - current.y) * ratio,
    scale: nextScale
  };
}

export function deriveTouchGesture(previousTouches, currentTouches) {
  const prev = Array.from(previousTouches || []).map(point);
  const next = Array.from(currentTouches || []).map(point);
  if (!prev.length || prev.length !== next.length || next.length > 2) return null;
  const prevCenter = center(prev);
  const nextCenter = center(next);
  const gesture = {
    kind: next.length === 1 ? 'PAN' : 'PINCH',
    dx: nextCenter.x - prevCenter.x,
    dy: nextCenter.y - prevCenter.y,
    focal: nextCenter,
    scaleFactor: 1
  };
  if (next.length === 2) {
    const before = distance(prev[0], prev[1]);
    const after = distance(next[0], next[1]);
    gesture.scaleFactor = before > 0 ? after / before : 1;
  }
  return gesture;
}

export function applyTouchGesture(state, gesture, limits = DEFAULT_LIMITS) {
  if (!gesture) return normalizePanZoomState(state, limits);
  const panned = panViewport(state, gesture, limits);
  if (gesture.kind !== 'PINCH') return panned;
  return zoomViewportAt(panned, gesture.focal, gesture.scaleFactor, limits);
}
