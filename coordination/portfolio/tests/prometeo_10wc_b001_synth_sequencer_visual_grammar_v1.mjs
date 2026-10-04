import assert from 'node:assert/strict';
import {
  SYNTH_SEQUENCER_VISUAL_GRAMMAR,
  visualCueForWorkState,
  validateSequencerGrammarCandidate
} from '../../../current-tree/control-v11/work-score/synth-sequencer-visual-grammar.mjs';

assert.equal(SYNTH_SEQUENCER_VISUAL_GRAMMAR.schema, 'prometeo.work-score-visual-grammar/v1');
assert.ok(SYNTH_SEQUENCER_VISUAL_GRAMMAR.structural_reference.includes('ONE_CONTINUOUS_INSTRUMENT_SURFACE'));
assert.ok(SYNTH_SEQUENCER_VISUAL_GRAMMAR.visible_identity_boundary.includes('CSS_DOM_GEOMETRY_IS_STAGE_MACHINERY'));
assert.equal(visualCueForWorkState('observed_working'), 'fresh-work-signal');
assert.equal(visualCueForWorkState('consumed'), 'consumed-signal');
assert.equal(visualCueForWorkState('ACTIVE'), 'unknown-signal');

const accepted = validateSequencerGrammarCandidate({
  primaryComposition: 'CONTINUOUS_INSTRUMENT',
  equalCellWeight: false,
  colorOnlyStatus: false,
  activeMeansLive: false,
  decorationOverEvidence: false,
  tinyCoreControls: false
});
assert.deepEqual(accepted, { pass: true, failures: [] });

const rejected = validateSequencerGrammarCandidate({
  primaryComposition: 'CARD_GRID',
  equalCellWeight: true,
  colorOnlyStatus: true,
  activeMeansLive: true,
  decorationOverEvidence: true,
  tinyCoreControls: true
});
assert.equal(rejected.pass, false);
assert.deepEqual(rejected.failures, SYNTH_SEQUENCER_VISUAL_GRAMMAR.rejection_tests);

console.log('PASS B001 synth sequencer visual grammar');
