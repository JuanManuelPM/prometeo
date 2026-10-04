const TIERS = Object.freeze({
  NARROW: Object.freeze({
    tier: 'NARROW', minTapPx: 44, laneLabelMode: 'SHORT', blockTitleChars: 22,
    blockMetaLines: 0, detailMode: 'SELECTED_OVERLAY', timelineLabelChars: 18, capacityColumns: 2
  }),
  COMPACT: Object.freeze({
    tier: 'COMPACT', minTapPx: 44, laneLabelMode: 'SHORT', blockTitleChars: 30,
    blockMetaLines: 1, detailMode: 'SELECTED_DRAWER', timelineLabelChars: 26, capacityColumns: 2
  }),
  STANDARD: Object.freeze({
    tier: 'STANDARD', minTapPx: 44, laneLabelMode: 'FULL', blockTitleChars: 44,
    blockMetaLines: 1, detailMode: 'SIDE_PANEL', timelineLabelChars: 34, capacityColumns: 4
  }),
  WIDE: Object.freeze({
    tier: 'WIDE', minTapPx: 44, laneLabelMode: 'FULL', blockTitleChars: 64,
    blockMetaLines: 2, detailMode: 'SIDE_PANEL', timelineLabelChars: 48, capacityColumns: 4
  })
});

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function densityTierForViewport(viewport = {}) {
  const width = positive(viewport.width, 1024);
  const height = positive(viewport.height, 768);
  const shortSide = Math.min(width, height);
  if (width < 390 || shortSide < 360) return 'NARROW';
  if (width < 760 || shortSide < 500) return 'COMPACT';
  if (width < 1280) return 'STANDARD';
  return 'WIDE';
}

export function smallScreenDensityStrategy(viewport = {}) {
  const tier = densityTierForViewport(viewport);
  const base = TIERS[tier];
  const coarsePointer = viewport.coarsePointer !== false;
  return {
    ...base,
    coarsePointer,
    horizontalPanEnabled: tier !== 'WIDE',
    pinchZoomEnabled: coarsePointer,
    coreControlsMinPx: Math.max(44, base.minTapPx),
    hideNonessentialBlockMeta: base.blockMetaLines === 0,
    preserve: Object.freeze([
      'BLOCK_ID',
      'LIFECYCLE_STATE',
      'DEPENDENCY_CONTEXT_ON_SELECTION',
      'CRITICAL_MARKER',
      'EVIDENCE_ACCESS'
    ]),
    defer: Object.freeze([
      'LONG_SUMMARY',
      'SECONDARY_TIMESTAMPS',
      'VERBOSE_CAPACITY_EXPLANATION',
      'NONSELECTED_BLOCK_METADATA'
    ])
  };
}

export function truncateForDensity(text, maxChars) {
  const value = String(text ?? '').trim();
  const limit = Math.max(1, Number(maxChars) || 1);
  if (value.length <= limit) return value;
  if (limit <= 1) return '…';
  return `${value.slice(0, limit - 1).trimEnd()}…`;
}

export { TIERS as SMALL_SCREEN_DENSITY_TIERS };
