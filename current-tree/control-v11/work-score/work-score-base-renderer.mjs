import { visualCueForWorkState, validateSequencerGrammarCandidate } from './synth-sequencer-visual-grammar.mjs';
import { blockSemanticZoomRule, blockSemanticZoomAttributes } from './block-semantic-zoom.mjs';

const text = value => String(value ?? '');
const upper = value => text(value).trim().toUpperCase() || 'UNKNOWN';
const esc = value => text(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

export function buildWorkScoreBlockViewModel(block = {}, options = {}) {
  const state = upper(options.state ?? block.state);
  const zoom = blockSemanticZoomRule(options.effectiveWidthPx ?? block.effective_width_px ?? 112);
  const grammar = validateSequencerGrammarCandidate({
    primaryComposition: options.primaryComposition || 'CONTINUOUS_INSTRUMENT',
    equalCellWeight: false,
    colorOnlyStatus: false,
    activeMeansLive: false,
    decorationOverEvidence: false,
    tinyCoreControls: false
  });
  if (!grammar.pass) throw new Error(`WORK_SCORE_VISUAL_GRAMMAR_REJECTED:${grammar.failures.join(',')}`);

  const id = text(block.block_id || block.id).trim();
  const title = text(block.title).trim();
  const deps = Array.isArray(block.dependencies) ? block.dependencies.map(text).filter(Boolean) : [];
  const estimate = Number(block.expected_minutes);
  const cue = visualCueForWorkState(state);
  const attrs = blockSemanticZoomAttributes(zoom.effective_width_px);
  const selected = options.selected === true;
  const critical = options.critical === true || block.critical === true;

  return {
    schema: 'prometeo.work-score-base-block-view/v1',
    id,
    title,
    state,
    cue,
    zoom,
    attributes: {
      ...attrs,
      'data-work-state': state.toLowerCase(),
      'data-work-cue': cue,
      'aria-label': [id, zoom.fields.title && title, state].filter(Boolean).join(' · ')
    },
    visible: {
      id: zoom.fields.id ? id : null,
      title: zoom.fields.title ? title : null,
      state: zoom.fields.state ? state : null,
      estimate_minutes: zoom.fields.estimate && Number.isFinite(estimate) ? estimate : null,
      dependency_summary: zoom.fields.dependency_summary ? (deps.length ? deps.join(', ') : 'ninguna') : null
    },
    classes: [
      'block',
      `state-${state.toLowerCase()}`,
      `cue-${cue}`,
      `zoom-${zoom.level.toLowerCase()}`,
      selected ? 'sel' : null,
      critical ? 'crit' : null
    ].filter(Boolean),
    selected,
    critical,
    authority: 'PRESENTATION_ONLY'
  };
}

export function renderWorkScoreBlockHtml(block = {}, options = {}) {
  const view = buildWorkScoreBlockViewModel(block, options);
  const attrs = Object.entries(view.attributes)
    .map(([key, value]) => `${key}="${esc(value)}"`)
    .join(' ');
  const parts = [];
  if (view.visible.id !== null) parts.push(`<span class="bid">${esc(view.visible.id)}</span>`);
  if (view.visible.title !== null) parts.push(`<span class="bt">${esc(view.visible.title)}</span>`);
  if (view.visible.state !== null) parts.push(`<span class="bs">${esc(view.visible.state)}</span>`);
  if (view.visible.estimate_minutes !== null) parts.push(`<span class="be">${esc(view.visible.estimate_minutes)} min</span>`);
  if (view.visible.dependency_summary !== null) parts.push(`<span class="bd">deps: ${esc(view.visible.dependency_summary)}</span>`);
  return `<button type="button" class="${view.classes.join(' ')}" data-b="${esc(view.id)}" ${attrs}>${parts.join('')}</button>`;
}
