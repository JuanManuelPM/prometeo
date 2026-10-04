export const SYNTH_SEQUENCER_VISUAL_GRAMMAR = Object.freeze({
  schema: 'prometeo.work-score-visual-grammar/v1',
  id: 'synth-sequencer-reference-extraction-v1',
  provenance: [
    'visuals/VISUAL_PROTOCOL_V1.md',
    'visuals/VISUAL_FEEDBACK_LOG_V1.md',
    'visuals/registry-v1.js',
    'current-tree/control-v11/work-score/index.html'
  ],
  structural_reference: Object.freeze([
    'ONE_CONTINUOUS_INSTRUMENT_SURFACE',
    'LANES_READ_AS_CHANNEL_STRIPS_NOT_CARD_STACKS',
    'BLOCKS_READ_AS_STEPS_OR_MODULES_INSIDE_A_SHARED_GRID',
    'STATE_USES_SMALL_SIGNAL_ACCENTS_NOT_DECORATIVE_CHROME',
    'SELECTION_PRESERVES_SPATIAL_CONTEXT',
    'DETAIL_IS_A_FOCUSED_INSTRUMENT_READOUT_NOT_A_SECOND_DASHBOARD'
  ]),
  visible_identity_boundary: Object.freeze([
    'CSS_DOM_GEOMETRY_IS_STAGE_MACHINERY',
    'DO_NOT_USE_GENERIC_RETRO_TERMINAL_DECORATION_AS_IDENTITY',
    'DO_NOT_SIMULATE_COMPLEXITY_WITH_EMPTY_BOXES_GLOW_NOISE_OR_FAKE_TELEMETRY',
    'WHEN_VISUAL_IDENTITY_IS_NEEDED_PREFER_EXISTING_PROMETEO_ASSETS_TEXTURES_SIGNS_OR_IMAGE_SURFACES'
  ]),
  hierarchy: Object.freeze({
    lane: 'stable horizontal channel identity',
    block: 'compact step/module with id + short task label + one evidence-backed state cue',
    selected: 'strong focus cue while neighbors and dependency context remain visible',
    critical: 'secondary semantic marker; never overwhelms lifecycle state',
    detail: 'exact block evidence, dependencies and next material transition'
  }),
  semantic_state_cues: Object.freeze({
    WAITING: 'muted',
    READY: 'ready-signal',
    IN_FLIGHT: 'authority-or-work-signal',
    PLANNED: 'planned-signal',
    LAUNCHED: 'launch-signal',
    OBSERVED_WORKING: 'fresh-work-signal',
    RESULT: 'material-result-signal',
    VERIFIED: 'verified-signal',
    CONSUMED: 'consumed-signal'
  }),
  rejection_tests: Object.freeze([
    'CARD_GRID_BECOMES_PRIMARY_COMPOSITION',
    'EVERY_CELL_HAS_EQUAL_VISUAL_WEIGHT',
    'STATUS_DEPENDS_ON_COLOR_WITHOUT_TEXT_OR_SHAPE_CUE',
    'ACTIVE_OR_PARKED_IS_PRESENTED_AS_LIVENESS',
    'DECORATION_OUTWEIGHS_CAUSAL_OR_EVIDENCE_INFORMATION',
    'TINY_CONTROLS_ARE_REQUIRED_FOR_CORE_NAVIGATION'
  ])
});

export function visualCueForWorkState(state) {
  const key = String(state || '').toUpperCase();
  return SYNTH_SEQUENCER_VISUAL_GRAMMAR.semantic_state_cues[key] || 'unknown-signal';
}

export function validateSequencerGrammarCandidate(candidate = {}) {
  const failures = [];
  if (candidate.primaryComposition === 'CARD_GRID') failures.push('CARD_GRID_BECOMES_PRIMARY_COMPOSITION');
  if (candidate.equalCellWeight === true) failures.push('EVERY_CELL_HAS_EQUAL_VISUAL_WEIGHT');
  if (candidate.colorOnlyStatus === true) failures.push('STATUS_DEPENDS_ON_COLOR_WITHOUT_TEXT_OR_SHAPE_CUE');
  if (candidate.activeMeansLive === true) failures.push('ACTIVE_OR_PARKED_IS_PRESENTED_AS_LIVENESS');
  if (candidate.decorationOverEvidence === true) failures.push('DECORATION_OUTWEIGHS_CAUSAL_OR_EVIDENCE_INFORMATION');
  if (candidate.tinyCoreControls === true) failures.push('TINY_CONTROLS_ARE_REQUIRED_FOR_CORE_NAVIGATION');
  return { pass: failures.length === 0, failures };
}
