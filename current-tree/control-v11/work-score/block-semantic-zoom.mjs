const LEVELS = Object.freeze([
  Object.freeze({
    id: 'SIGNAL',
    min_width_px: 0,
    fields: Object.freeze({ id: true, title: false, state: true, estimate: false, dependency_summary: false })
  }),
  Object.freeze({
    id: 'LABEL',
    min_width_px: 64,
    fields: Object.freeze({ id: true, title: true, state: true, estimate: false, dependency_summary: false })
  }),
  Object.freeze({
    id: 'DETAIL',
    min_width_px: 112,
    fields: Object.freeze({ id: true, title: true, state: true, estimate: true, dependency_summary: true })
  })
]);

const widthPx = value => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

export const BLOCK_SEMANTIC_ZOOM_LEVELS = LEVELS;

export function blockSemanticZoomLevel(effectiveWidthPx) {
  const width = widthPx(effectiveWidthPx);
  let selected = LEVELS[0];
  for (const level of LEVELS) {
    if (width >= level.min_width_px) selected = level;
  }
  return selected.id;
}

export function blockSemanticZoomRule(effectiveWidthPx) {
  const id = blockSemanticZoomLevel(effectiveWidthPx);
  const level = LEVELS.find(row => row.id === id) || LEVELS[0];
  return {
    level: level.id,
    effective_width_px: widthPx(effectiveWidthPx),
    fields: { ...level.fields },
    invariant_fields: ['id', 'state'],
    authority: 'PRESENTATION_ONLY'
  };
}

export function blockSemanticZoomAttributes(effectiveWidthPx) {
  const rule = blockSemanticZoomRule(effectiveWidthPx);
  return {
    'data-semantic-zoom': rule.level.toLowerCase(),
    'aria-label-detail-level': rule.level
  };
}
