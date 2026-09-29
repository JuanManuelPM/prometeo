const SCHEMA='prometeo.v11-visible-result-projection/v1';
const G05_SCHEMA='prometeo.g05-lineage-verification/v1';
const STATES=new Set(['PENDING','BLOCKED','VERIFIED']);
const ACCEPTED=new Set(['PROVEN','PASS','VERIFIED','SUCCESS']);

const text=value=>typeof value==='string'&&value.trim()?value.trim():null;
const accepted=value=>ACCEPTED.has(String(value||'').trim().toUpperCase());

export function normalizeVisibleResultProjection(raw){
  if(!raw||raw.schema!==SCHEMA){
    return {
      schema:SCHEMA,
      state:'PENDING',
      fixture_contract_only:false,
      blocker:'RESULT_PROJECTION_UNAVAILABLE',
      summary:'Resultado E2E todavía no proyectado.',
      lineage:{builder_return_ref:null,verifier_ref:null,candidate_ref:null,same_lineage:false,independent_verifier:false},
      verification:{outcome:null},
      candidate_url:null,
      observed_at:null,
      integrity:'UNAVAILABLE'
    };
  }
  const requested=STATES.has(String(raw.state||'').toUpperCase())?String(raw.state).toUpperCase():'PENDING';
  const lineage={
    builder_return_ref:text(raw.lineage?.builder_return_ref),
    verifier_ref:text(raw.lineage?.verifier_ref),
    candidate_ref:text(raw.lineage?.candidate_ref),
    same_lineage:raw.lineage?.same_lineage===true,
    independent_verifier:raw.lineage?.independent_verifier===true
  };
  const verifiedGate=Boolean(
    lineage.builder_return_ref &&
    lineage.verifier_ref &&
    lineage.candidate_ref &&
    lineage.same_lineage &&
    lineage.independent_verifier &&
    raw.verification?.outcome==='PASS'
  );
  const state=requested==='VERIFIED'&&!verifiedGate?'BLOCKED':requested;
  return {
    schema:SCHEMA,
    state,
    fixture_contract_only:raw.fixture_contract_only===true,
    blocker:state==='VERIFIED'?null:text(raw.blocker)||(requested==='VERIFIED'?'VERIFIED_GATE_INCOMPLETE':null),
    summary:text(raw.summary)||'Sin resumen durable.',
    lineage,
    verification:{outcome:raw.verification?.outcome==='PASS'?'PASS':text(raw.verification?.outcome)},
    candidate_url:state==='VERIFIED'?text(raw.candidate_url):null,
    observed_at:text(raw.observed_at)||text(raw.generated_at),
    integrity:state==='VERIFIED'?'VERIFIED_LINEAGE':'NON_PROMOTING'
  };
}

export function projectVisibleResultFromG05(base,g05){
  const fallback=normalizeVisibleResultProjection(base);
  if(!g05||g05.schema!==G05_SCHEMA||g05.gate_id!=='G05_REAL_PRIVATE_E2E')return fallback;

  const status=String(g05.status||'').trim().toUpperCase();
  const lineageId=text(g05.lineage_id);
  const visible=g05.visible_result&&typeof g05.visible_result==='object'?g05.visible_result:{};
  const sameLineage=Boolean(lineageId&&accepted(g05.evidence?.same_lineage));
  const independentVerifier=accepted(g05.evidence?.independent_verifier);
  const requestedState=status==='PASS'?'VERIFIED':'BLOCKED';

  return normalizeVisibleResultProjection({
    schema:SCHEMA,
    state:requestedState,
    fixture_contract_only:false,
    blocker:requestedState==='VERIFIED'?null:`G05_REAL_PRIVATE_E2E_${status||'NOT_VERIFIED'}`,
    summary:requestedState==='VERIFIED'
      ? `Lineage G05 ${lineageId||'sin-id'} verificado; resultado listo para revisión.`
      : `Lineage G05 ${lineageId||'sin-id'} observado; verificación actual: ${status||'NO_TERMINAL_STATUS'}.`,
    lineage:{
      builder_return_ref:text(visible.builder_return_ref)||text(g05.builder_return_ref),
      verifier_ref:'coordination/goal-progress/G05_VERIFICATION.json',
      candidate_ref:text(visible.candidate_ref)||text(g05.candidate_ref),
      same_lineage:sameLineage,
      independent_verifier:independentVerifier
    },
    verification:{outcome:requestedState==='VERIFIED'&&independentVerifier?'PASS':status||null},
    candidate_url:text(visible.candidate_url)||text(g05.candidate_url),
    observed_at:text(g05.verified_at)||text(g05.observed_at)||fallback.observed_at
  });
}

export function visibleResultCanPromote(raw){
  return normalizeVisibleResultProjection(raw).state==='VERIFIED';
}

export const VISIBLE_RESULT_PROJECTION_SCHEMA=SCHEMA;
export const G05_LINEAGE_VERIFICATION_SCHEMA=G05_SCHEMA;
