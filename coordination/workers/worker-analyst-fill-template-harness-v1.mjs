import fs from 'node:fs';

const [templatePath, target] = process.argv.slice(2);
if (!templatePath || !target) {
  console.error('usage: node worker-analyst-fill-template-harness-v1.mjs <template.json> <--self-test|analyst-output.json>');
  process.exit(2);
}
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

const REQUIRED_OUTPUT_FIELDS = [
  'analysis_status','source_refs','completed','partial_or_boundaries','durable_changes',
  'evidence_quality','contradictions','worker_method_findings','bottleneck','next_experiment',
  'next_jobs','human_summary','human_action','recommended_wc_launches','launch_basis',
  'canonical_wc_prompt','draft_reply_to_human','question_answers','authority_boundary'
];
const EVIDENCE_ARRAY_FIELDS = [
  'completed','partial_or_boundaries','durable_changes','evidence_quality',
  'contradictions','worker_method_findings','next_jobs'
];

const questionIds = () => template.required_questions.map(q => q.split(':', 1)[0].trim());
const wordCount = s => String(s).trim().split(/\s+/u).filter(Boolean).length;
function looksDurableRef(ref) {
  if (typeof ref !== 'string' || !ref.trim()) return false;
  const s = ref.trim();
  return /^(commit:)[0-9a-f]{40}$/i.test(s)
    || /^(main|gh-pages):[^\s]+$/i.test(s)
    || /^github-actions:(run\/)?\d+/i.test(s)
    || /^artifact:/i.test(s)
    || /^(coordination|current-tree|shared|state|catalog|tests|scripts|\.github)\//.test(s);
}
function evidenceArray(name, value, errors) {
  if (!Array.isArray(value)) { errors.push(`${name}: must be array`); return; }
  value.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${name}[${i}]: must be {text,evidence_refs}`); return;
    }
    if (typeof entry.text !== 'string' || !entry.text.trim()) errors.push(`${name}[${i}].text missing`);
    if (!Array.isArray(entry.evidence_refs) || entry.evidence_refs.length === 0) errors.push(`${name}[${i}].evidence_refs missing`);
    else entry.evidence_refs.forEach(ref => { if (!looksDurableRef(ref)) errors.push(`${name}[${i}]: non-durable ref ${ref}`); });
  });
}
function flattenStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(x => flattenStrings(x, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(x => flattenStrings(x, out));
  return out;
}
function validateLiveness(output, errors) {
  const status = /(ACTIVE|PARKED)/i;
  const live = /(alive|live\b|liveness|running|currently working|trabajando|vivo|vivos|ejecutando)/i;
  const neg = /(not\s+(proof|evidence|mean|imply)|does\s+not|doesn't|never|no\s+(prueba|implica|demuestra|significa)|sin\s+probar)/i;
  for (const s of flattenStrings(output)) {
    if (status.test(s) && live.test(s) && !neg.test(s)) errors.push(`liveness inferred from ACTIVE/PARKED: ${s}`);
  }
}
function validatePrompt(prompt, launches, errors) {
  if (prompt === null) {
    if (launches > 0) errors.push('canonical_wc_prompt cannot be null when recommended_wc_launches > 0');
    return;
  }
  if (typeof prompt !== 'string' || !prompt.trim()) { errors.push('canonical_wc_prompt must be string or null'); return; }
  const occurrences = (prompt.match(/\/wc\b/gi) || []).length;
  if (occurrences !== 1) errors.push(`canonical_wc_prompt must contain exactly one /wc invocation, got ${occurrences}`);
  if (!/NUEVO_WORKER\s*=\s*1/i.test(prompt)) errors.push('canonical_wc_prompt missing NUEVO_WORKER=1');
  if (!/POOL\s+[A-Z0-9_-]+/i.test(prompt)) errors.push('canonical_wc_prompt must be a POOL prompt');
  if (/(worker|chat|slot)\s*#?\s*\d+|\bW\d+\b|\bslot_id\b/i.test(prompt)) errors.push('canonical_wc_prompt manually routes/numbers workers');
}
function validateDraftReply(s, errors) {
  if (typeof s !== 'string' || !s.trim()) { errors.push('draft_reply_to_human missing'); return; }
  const t = s.toLowerCase();
  if (!/(pasó|terminó|resultado|estado|hecho)/u.test(t)) errors.push('draft_reply_to_human must say what happened');
  if (!/(hacer|hacé|ahora|acción|siguiente)/u.test(t)) errors.push('draft_reply_to_human must say what to do');
  if (!/(mirá|mira|ver|evidencia|ref|dónde|donde)/u.test(t)) errors.push('draft_reply_to_human must say where to look');
}
function validateOutput(output) {
  const errors = [];
  if (!output || typeof output !== 'object' || Array.isArray(output)) return ['output must be object'];
  REQUIRED_OUTPUT_FIELDS.forEach(field => { if (!(field in output)) errors.push(`missing required field ${field}`); });
  if (!['PASS','PARTIAL','BOUNDARY'].includes(output.analysis_status)) errors.push('analysis_status invalid');
  if (!Array.isArray(output.source_refs) || output.source_refs.length === 0) errors.push('source_refs must contain durable evidence');
  else output.source_refs.forEach(ref => { if (!looksDurableRef(ref)) errors.push(`source_refs contains non-durable ref ${ref}`); });
  EVIDENCE_ARRAY_FIELDS.forEach(field => evidenceArray(field, output[field], errors));
  if (typeof output.bottleneck !== 'string' || !output.bottleneck.trim()) errors.push('bottleneck missing');
  const ne = output.next_experiment;
  if (!ne || typeof ne !== 'object') errors.push('next_experiment missing');
  else {
    ['hypothesis','changed_variable','control'].forEach(k => { if (typeof ne[k] !== 'string' || !ne[k].trim()) errors.push(`next_experiment.${k} missing`); });
    ['metrics','done_when'].forEach(k => { if (!Array.isArray(ne[k]) || ne[k].length === 0) errors.push(`next_experiment.${k} missing`); });
  }
  if (!output.question_answers || typeof output.question_answers !== 'object' || Array.isArray(output.question_answers)) errors.push('question_answers missing');
  else questionIds().forEach(id => { if (typeof output.question_answers[id] !== 'string' || !output.question_answers[id].trim()) errors.push(`question_answers.${id} missing`); });
  if (typeof output.human_summary !== 'string' || !output.human_summary.trim()) errors.push('human_summary missing');
  else if (wordCount(output.human_summary) > template.required_output.human_summary_max_words) errors.push(`human_summary exceeds ${template.required_output.human_summary_max_words} words`);
  if (typeof output.human_action !== 'string' || !output.human_action.trim()) errors.push('human_action missing');
  const launches = output.recommended_wc_launches;
  if (!Number.isInteger(launches) || launches < 0) errors.push('recommended_wc_launches must be integer >= 0');
  const basis = output.launch_basis;
  if (!basis || typeof basis !== 'object') errors.push('launch_basis missing');
  else {
    const demand = basis.compatible_claimable_demand;
    const already = basis.already_owned_or_satisfied;
    if (!Number.isInteger(demand) || demand < 0) errors.push('launch_basis.compatible_claimable_demand invalid');
    if (!Number.isInteger(already) || already < 0) errors.push('launch_basis.already_owned_or_satisfied invalid');
    if (!Array.isArray(basis.evidence_refs) || basis.evidence_refs.length === 0 || basis.evidence_refs.some(r => !looksDurableRef(r))) errors.push('launch_basis.evidence_refs must be durable');
    if (Number.isInteger(demand) && Number.isInteger(already) && Number.isInteger(launches)) {
      const expected = Math.max(0, demand - already);
      if (launches !== expected) errors.push(`recommended_wc_launches arbitrary: expected ${expected} from launch_basis, got ${launches}`);
    }
  }
  validatePrompt(output.canonical_wc_prompt, launches, errors);
  validateDraftReply(output.draft_reply_to_human, errors);
  if (output.authority_boundary !== template.authority_boundary) errors.push('authority_boundary must equal template boundary');
  validateLiveness(output, errors);
  if (output.analysis_status !== 'PASS' && (!Array.isArray(output.partial_or_boundaries) || output.partial_or_boundaries.length === 0)) errors.push('PARTIAL/BOUNDARY requires explicit partial_or_boundaries evidence');
  return errors;
}

function selfTestFixtures() {
  const ref = 'coordination/portfolio/returns/example/RETURN.json';
  const item = text => ({text, evidence_refs:[ref]});
  const qa = Object.fromEntries(questionIds().map(id => [id, ['FAILURES','CONTRADICTIONS'].includes(id) ? 'UNKNOWN: falta evidencia adicional.' : `Respuesta durable para ${id}.`]));
  const base = {
    analysis_status:'PASS', source_refs:[ref,`commit:${'a'.repeat(40)}`],
    completed:[item('Job A cerró.')], partial_or_boundaries:[item('UNKNOWN: la superficie servida aún no tiene veredicto.')],
    durable_changes:[item('Existe un resultado durable nuevo.')], evidence_quality:[item('RETURN y commit reabiertos; timing autodeclarado no se usa.')],
    contradictions:[item('UNKNOWN: dos métricas no usan el mismo reloj externo.')],
    worker_method_findings:[item('ACTIVE no prueba liveness ni implica que el worker siga trabajando.')],
    bottleneck:'Falta una verificación externa comparable.',
    next_experiment:{hypothesis:'Un reloj externo reduce ambigüedad.',changed_variable:'fuente de clock',control:'mismo lote con clock durable previo',metrics:['beacon_to_claim_seconds'],done_when:['3 trazas cerradas con reloj externo']},
    next_jobs:[item('Ejecutar una verificación acotada.')],
    human_summary:'Terminó el job durable y quedó una frontera explícita. La evidencia separa lo verificado de lo desconocido; no infiere liveness ni promoción.',
    human_action:'No hacer nada manual salvo abrir capacidad si la demanda compatible sigue igual.',
    recommended_wc_launches:2,
    launch_basis:{compatible_claimable_demand:4,already_owned_or_satisfied:2,evidence_refs:['coordination/portfolio/PORTFOLIO.json#snapshot:test']},
    canonical_wc_prompt:'🟠 PROMETEO /wc — NUEVO_WORKER=1 · POOL PROD-01',
    draft_reply_to_human:'Estado: terminó la unidad durable. Ahora hacé sólo los lanzamientos justificados. Mirá la evidencia en coordination/portfolio/returns/example/RETURN.json.',
    question_answers:qa,
    authority_boundary:template.authority_boundary
  };
  const clone = x => JSON.parse(JSON.stringify(x));
  const partial = clone(base); partial.analysis_status='PARTIAL'; partial.recommended_wc_launches=0; partial.launch_basis={compatible_claimable_demand:1,already_owned_or_satisfied:1,evidence_refs:[ref]}; partial.canonical_wc_prompt=null; partial.partial_or_boundaries=[item('BOUNDARY: falta prerrequisito durable.')]; partial.human_summary='Resultado parcial: faltan prerrequisitos y quedan UNKNOWN explícitos. No se fuerza conclusión ni lanzamiento.'; partial.draft_reply_to_human='Estado parcial: faltan prerrequisitos. Ahora no lances más capacidad. Mirá la evidencia en coordination/portfolio/returns/example/RETURN.json.';
  const noEvidence = clone(base); noEvidence.source_refs=[]; noEvidence.completed=[{text:'Sin refs',evidence_refs:[]}];
  const arbitrary = clone(base); arbitrary.recommended_wc_launches=5; arbitrary.launch_basis.compatible_claimable_demand=2; arbitrary.launch_basis.already_owned_or_satisfied=1;
  const multiPrompt = clone(base); multiPrompt.canonical_wc_prompt='PROMETEO /wc NUEVO_WORKER=1 POOL PROD-01\nPROMETEO /wc NUEVO_WORKER=1 POOL PROD-01';
  const fakeLive = clone(base); fakeLive.worker_method_findings=[item('ACTIVE workers are currently working and alive.')];
  return [
    {name:'PASS',expect_valid:true,output:base},
    {name:'PARTIAL',expect_valid:true,output:partial},
    {name:'FAIL',expect_valid:false,output:noEvidence},
    {name:'FAIL_ARBITRARY_LAUNCH_COUNT',expect_valid:false,output:arbitrary},
    {name:'FAIL_MULTI_PROMPT',expect_valid:false,output:multiPrompt},
    {name:'FAIL_ACTIVE_LIVENESS',expect_valid:false,output:fakeLive}
  ];
}

if (target !== '--self-test') {
  const output = JSON.parse(fs.readFileSync(target, 'utf8'));
  const errors = validateOutput(output);
  console.log(JSON.stringify({schema:'prometeo.worker-analyst-harness-report/v1',accepted:errors.length===0,errors}, null, 2));
  process.exit(errors.length ? 1 : 0);
}

let failed = false;
const results = [];
for (const fixture of selfTestFixtures()) {
  const errors = validateOutput(fixture.output);
  const accepted = errors.length === 0;
  let expectationMet = accepted === fixture.expect_valid;
  if (fixture.name === 'PASS' && fixture.expect_valid) {
    if (!fixture.output.contradictions.length || !flattenStrings(fixture.output).some(s => /UNKNOWN/i.test(s))) {
      errors.push('PASS fixture must contain explicit contradictions/UNKNOWN'); expectationMet = false;
    }
  }
  if (!expectationMet) failed = true;
  results.push({name:fixture.name,expect_valid:fixture.expect_valid,accepted,expectation_met:expectationMet,errors});
}
console.log(JSON.stringify({schema:'prometeo.worker-analyst-harness-report/v1',fixture_count:results.length,passed:!failed,results}, null, 2));
process.exit(failed ? 1 : 0);
