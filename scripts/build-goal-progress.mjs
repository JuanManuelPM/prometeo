import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const site = process.argv[3] || root;
const outPath = process.argv[4] || path.join(root, 'progress-state.json');

const read = p => {
  try { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); }
  catch { return null; }
};
const readSite = p => {
  try { return JSON.parse(fs.readFileSync(path.join(site, p), 'utf8')); }
  catch { return null; }
};
const exists = p => fs.existsSync(path.join(root, p));
const arr = v => Array.isArray(v) ? v : [];
const txt = v => String(v ?? '');
const outcome = d => txt(d?.outcome || d?.status || d?.result).toUpperCase();
const passish = d => ['PASS','DONE','VERIFIED','SUCCESS','RUN_COMPLETE'].includes(outcome(d));
const frac = state => state === 'PASS' ? 1 : state === 'PARTIAL' ? 0.5 : 0;

const contract = read('coordination/goal-progress/PROMETEO_FINISH_CONTRACT_V1.json');
if (!contract || contract?.scoring?.total !== 100) throw new Error('finish contract missing or total != 100');
const weights = Object.fromEntries(contract.gates.map(g => [g.id, Number(g.weight || 0)]));
if (Object.values(weights).reduce((a,b)=>a+b,0) !== 100) throw new Error('gate weights must total 100');

const ui = read('coordination/portfolio/returns/portfolio-mp10-v11-ui-integration-audit-v1/RETURN-wc-20260929T034600Z-b8e4d21c7f93-G000001-VERIFIED.json');
const ingress = read('coordination/portfolio/returns/portfolio-mp10-v11-ingress-page-change-integration-v1/RETURN-wc-20260929T034721Z-5bc466fc24e6-G000001-DONE.json');
const previews = read('coordination/portfolio/returns/portfolio-mp10-v11-preview-workspace-verify-v1/RETURN-20260929T035603Z-wc-20260929T034748Z-be64d60c47bf-G000001.json');
const context = read('coordination/portfolio/returns/portfolio-mp10-v11-project-context-index-case-reconcile-v1/RETURN-20260929T035842Z-wc-20260929T034748Z-be64d60c47bf-G000001.json');
const statsRet = read('coordination/portfolio/returns/portfolio-mp10-v11-stats-publish-wire-v1/RETURN-20260929T040315Z-wc-20260929T034748Z-be64d60c47bf-G000001.json');
const handoff = read('coordination/integration-runs/PROMETEO-MP10-01/CURRENT_HANDOFF.json');
const integrator = read('coordination/portfolio/returns/portfolio-mp10-integrate-into-current-v1/RETURN-wc-20260929T034758Z-a7c4e19b6f2d-G000001-DONE.json');
const pageClose = read('coordination/canaries/page-change-pipeline-v1/software-closeout-20260928T232800Z.json');
const pageLatest = read('coordination/canaries/page-change-pipeline-v1/latest.json');
const g05Contract = read('coordination/goal-progress/G05_REAL_PRIVATE_E2E_EVIDENCE_CONTRACT_V1.json');
const g05Verification = read('coordination/goal-progress/G05_VERIFICATION.json');
const g09Verification = read('coordination/storage-recovery/github-native-v1/G09_VERIFICATION.json');
const continuity = read('continuity/state.json');
const scoreboard = readSite('live/worker-scoreboard.json');
const publicStats = readSite('coordination/analytics/control-room-stats-v1/latest.json');

const poolIds = [
  'wc-20260929T034600Z-9d2f7c41a6e3',
  'wc-20260929T034600Z-b8e4d21c7f93',
  'wc-20260929T034721Z-5bc466fc24e6',
  'wc-20260929T034748Z-be64d60c47bf',
  'wc-20260929T034758Z-a7c4e19b6f2d'
];
const poolRows = arr(scoreboard?.launch_measurements).filter(r => poolIds.includes(r?.worker_id) && r?.pool_id === 'PROMETEO-CURRENT-01');
const poolCheckpoint = poolIds.every(id => {
  const row = poolRows.find(r => r.worker_id === id);
  return Number(row?.productive_units || 0) >= 3 && row?.pool_residency?.status === 'OPEN_OR_DERIVED';
});

const pageSoftwarePass =
  pageClose?.status === 'SOFTWARE_CLOSEOUT_COMPLETE_EXTERNAL_STORAGE_BLOCK' &&
  pageClose?.checks?.worker_frontier_degraded_mode?.result === 'PASS' &&
  pageClose?.checks?.live_feed_ci?.result === 'PASS' &&
  pageClose?.checks?.engine_ci?.result === 'PASS';

const latestEvidence = pageLatest?.evidence || {};
const evidencePass = value =>
  arr(g05Contract?.accepted_evidence_status).includes(txt(value).toUpperCase());
const requiredRealE2E = arr(g05Contract?.required_evidence)
  .map(key => [key, latestEvidence[key]]);
const missingRealE2E = requiredRealE2E
  .filter(([, value]) => !evidencePass(value))
  .map(([key]) => key);
const verifiedG05Evidence = g05Verification?.evidence || {};
const verifiedG05Missing = arr(g05Contract?.required_evidence)
  .filter(key => !evidencePass(verifiedG05Evidence[key]));
const verifiedG05 =
  g05Verification?.gate_id === 'G05_REAL_PRIVATE_E2E' &&
  txt(g05Verification?.status).toUpperCase() === 'PASS' &&
  Boolean(g05Verification?.lineage_id) &&
  verifiedG05Missing.length === 0;
const legacyRealE2E =
  g05Contract?.gate_id === 'G05_REAL_PRIVATE_E2E' &&
  arr(g05Contract?.accepted_terminal_status).includes(txt(pageLatest?.status).toUpperCase()) &&
  requiredRealE2E.length > 0 &&
  missingRealE2E.length === 0;
const realE2E = verifiedG05 || legacyRealE2E;

const visibleE2E =
  realE2E &&
  ['PROVEN','PASS','VERIFIED'].includes(txt(latestEvidence.visible_result || latestEvidence.public_result || pageLatest?.visible_result).toUpperCase());

const storageContracts =
  exists('coordination/storage-recovery/github-native-v1/CLOSURE_PACK_CONTRACT.json') &&
  exists('coordination/integration-runs/PROMETEO-MP10-01/tests/privacy-closure.mjs');
const g09GithubNativeEquivalent =
  outcome(g09Verification) === 'PASS' &&
  g09Verification?.gate_id === 'G09_RECOVERY_STORAGE_PRIVACY' &&
  g09Verification?.route === 'GITHUB_NATIVE_EQUIVALENT' &&
  g09Verification?.checks?.reconstructibility === 'PASS' &&
  g09Verification?.checks?.privacy === 'PASS' &&
  g09Verification?.checks?.retention_safety === 'PASS' &&
  g09Verification?.checks?.control_plane_without_database === 'PASS';
const storageRecovered =
  g09GithubNativeEquivalent ||
  (realE2E &&
    !['POSTGRES_DISK_EXHAUSTION','DATABASE_NOT_READY','BLOCKED_EXTERNAL_CONTROL_PLANE'].includes(
      txt(pageClose?.current_external_block?.class || pageLatest?.status).toUpperCase()
    ));

const continuityText = JSON.stringify(continuity || {});
const promoted =
  !continuityText.includes('V11 CANDIDATE') &&
  /V11/.test(continuityText) &&
  /(SERVED|HUMAN_ACCEPTED|PROMOTED|CURRENT)/.test(continuityText);

const gates = [];
function add(id, state, evidence, blocker = null, note = null) {
  const def = contract.gates.find(g => g.id === id);
  const earned = Number((weights[id] * frac(state)).toFixed(2));
  gates.push({
    id,
    title: def.title,
    weight: weights[id],
    earned,
    state,
    done_when: def.done_when,
    evidence,
    blocker,
    note
  });
}

add('G01_V11_WORKSPACE',
  outcome(ui) === 'VERIFIED' ? 'PASS' : 'PENDING',
  ['coordination/portfolio/returns/portfolio-mp10-v11-ui-integration-audit-v1/RETURN-wc-20260929T034600Z-b8e4d21c7f93-G000001-VERIFIED.json'],
  outcome(ui) === 'VERIFIED' ? null : 'Falta verificación durable de la UI V11 actual.'
);

add('G02_DURABLE_INGRESS',
  outcome(ingress) === 'DONE' ? 'PASS' : 'PENDING',
  ['coordination/portfolio/returns/portfolio-mp10-v11-ingress-page-change-integration-v1/RETURN-wc-20260929T034721Z-5bc466fc24e6-G000001-DONE.json'],
  outcome(ingress) === 'DONE' ? null : 'Falta contrato de ingress durable/fail-closed.',
  'El bridge autenticado real pertenece a G05, no se maquilla como resuelto acá.'
);

add('G03_AUTONOMOUS_POOL',
  handoff?.primary_returns?.count === 10 && handoff?.handoff_gate === 'OPEN' && outcome(integrator) === 'DONE' && poolCheckpoint ? 'PASS' : 'PARTIAL',
  [
    'coordination/integration-runs/PROMETEO-MP10-01/CURRENT_HANDOFF.json',
    'coordination/portfolio/returns/portfolio-mp10-integrate-into-current-v1/RETURN-wc-20260929T034758Z-a7c4e19b6f2d-G000001-DONE.json',
    'gh-pages:live/worker-scoreboard.json'
  ],
  poolCheckpoint ? null : 'Pool CURRENT todavía no demuestra checkpoint de residencia para los cinco workers frescos.'
);

add('G04_PAGE_CHANGE_SOFTWARE',
  pageSoftwarePass ? 'PASS' : 'PENDING',
  ['coordination/canaries/page-change-pipeline-v1/software-closeout-20260928T232800Z.json'],
  pageSoftwarePass ? null : 'Faltan gates software Page Change.'
);

add('G05_REAL_PRIVATE_E2E',
  realE2E ? 'PASS' : 'BLOCKED',
  [
    'coordination/canaries/page-change-pipeline-v1/latest.json',
    'coordination/goal-progress/G05_REAL_PRIVATE_E2E_EVIDENCE_CONTRACT_V1.json',
    'coordination/goal-progress/G05_VERIFICATION.json'
  ],
  realE2E ? null : `Falta canary real de un solo lineage: claim → packet privado post-claim → PREWRITE/CAS → RETURN sanitizado → verifier independiente. Evidencia faltante: ${(g05Verification ? verifiedG05Missing : missingRealE2E).join(', ') || 'contrato G05 inválido'}.`,
  txt(g05Verification?.status || pageLatest?.status || pageClose?.current_external_block?.class)
);

add('G06_VISIBLE_RESULT_LOOP',
  visibleE2E ? 'PASS' : outcome(previews) === 'VERIFIED' ? 'PARTIAL' : 'PENDING',
  [
    'coordination/portfolio/returns/portfolio-mp10-v11-preview-workspace-verify-v1/RETURN-20260929T035603Z-wc-20260929T034748Z-be64d60c47bf-G000001.json',
    'coordination/canaries/page-change-pipeline-v1/latest.json'
  ],
  visibleE2E ? null : 'Previews estáticas están verificadas, pero todavía falta que el E2E real vuelva como resultado visible/revisable.'
);

add('G07_DURABLE_CONTEXT',
  outcome(context) === 'DONE' && exists('coordination/project-context-v1/INDEX.json') ? 'PASS' : 'PENDING',
  [
    'coordination/portfolio/returns/portfolio-mp10-v11-project-context-index-case-reconcile-v1/RETURN-20260929T035842Z-wc-20260929T034748Z-be64d60c47bf-G000001.json',
    'coordination/project-context-v1/INDEX.json'
  ],
  null
);

add('G08_TRUTHFUL_STATS',
  outcome(statsRet) === 'DONE' && publicStats?.schema === 'prometeo.control-room-stats/v1' ? 'PASS' : 'PARTIAL',
  [
    'coordination/portfolio/returns/portfolio-mp10-v11-stats-publish-wire-v1/RETURN-20260929T040315Z-wc-20260929T034748Z-be64d60c47bf-G000001.json',
    'gh-pages:coordination/analytics/control-room-stats-v1/latest.json'
  ],
  publicStats ? null : 'El wiring existe pero falta snapshot público legible en gh-pages.'
);

add('G09_RECOVERY_STORAGE_PRIVACY',
  storageRecovered ? 'PASS' : storageContracts ? 'PARTIAL' : 'PENDING',
  [
    'coordination/storage-recovery/github-native-v1/CLOSURE_PACK_CONTRACT.json',
    'coordination/integration-runs/PROMETEO-MP10-01/tests/privacy-closure.mjs',
    'coordination/canaries/page-change-pipeline-v1/software-closeout-20260928T232800Z.json',
    'coordination/storage-recovery/github-native-v1/G09_VERIFICATION.json'
  ],
  storageRecovered ? null : 'Los contratos/privacy existen; falta una verificación PASS de recovery/storage o de la ruta GitHub-native equivalente autorizada por G09.'
);

add('G10_PROMOTE_SERVE_ACCEPT',
  promoted ? 'PASS' : 'BLOCKED',
  ['continuity/state.json'],
  promoted ? null : 'V10 sigue CURRENT_BASELINE y V11 sigue CANDIDATE; faltan promoción/served/rollback y aceptación humana explícita.'
);

const earned = Number(gates.reduce((a,g)=>a+g.earned,0).toFixed(2));
const percent = Math.round(earned);
const remaining = Number((100-earned).toFixed(2));
const reverseOrder = ['G05_REAL_PRIVATE_E2E','G06_VISIBLE_RESULT_LOOP','G09_RECOVERY_STORAGE_PRIVACY','G10_PROMOTE_SERVE_ACCEPT'];
const reversePath = reverseOrder
  .map(id=>gates.find(g=>g.id===id))
  .filter(Boolean)
  .map(g=>({
    id:g.id,
    title:g.title,
    state:g.state,
    remaining_points:Number((g.weight-g.earned).toFixed(2)),
    closes_when:g.done_when,
    blocker:g.blocker
  }))
  .filter(g=>g.remaining_points>0);
const hardBlockers = gates.filter(g => g.state === 'BLOCKED').map(g => ({id:g.id,title:g.title,reason:g.blocker}));
const partials = gates.filter(g => g.state === 'PARTIAL').map(g => ({id:g.id,title:g.title,reason:g.blocker}));
const out = {
  schema: 'prometeo.goal-progress/v1',
  generated_at: new Date().toISOString(),
  source_head: process.env.SOURCE_SHA || process.env.GITHUB_SHA || null,
  contract_ref: 'coordination/goal-progress/PROMETEO_FINISH_CONTRACT_V1.json',
  title: contract.title,
  objective: contract.objective,
  percent,
  earned,
  remaining,
  total: 100,
  reverse_path: reversePath,
  finish_mode: 'REVERSE_FROM_100',
  interpretation: 'PORCENTAJE_DE_GATES_NO_ETA',
  state: percent === 100 ? 'FINISH_GATES_COMPLETE_AWAIT_HUMAN_MEANING' : hardBlockers.length ? 'ADVANCING_WITH_HARD_BLOCKERS' : 'ADVANCING',
  gates,
  hard_blockers: hardBlockers,
  partials,
  next_focus: hardBlockers[0] || partials[0] || null,
  live_context: {
    pool_workers_observed: poolRows.length,
    pool_productive_units: poolRows.map(r=>({worker_id:r.worker_id,productive_units:r.productive_units,status:r.pool_residency?.status||null})),
    page_change_status: pageLatest?.status || null,
    page_change_external_block: pageClose?.current_external_block?.class || null,
    stats_generated_at: publicStats?.generated_at || null,
    worker_scoreboard_generated_at: scoreboard?.generated_at || null
  },
  truth_boundary: 'Observability only. El porcentaje no es autoridad ni ETA. No promueve V11, no crea CURRENT, no asigna trabajo y no convierte ausencia/UNKNOWN en éxito.'
};

fs.mkdirSync(path.dirname(outPath), {recursive:true});
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({ok:true,percent,earned,hard_blockers:hardBlockers.map(x=>x.id),partials:partials.map(x=>x.id)}));
