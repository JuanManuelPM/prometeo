const SCHEMA='prometeo.v11-visible-result-projection/v1';
const STATES=new Set(['PENDING','BLOCKED','VERIFIED']);

const text=value=>typeof value==='string'&&value.trim()?value.trim():null;

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

export function visibleResultCanPromote(raw){
  return normalizeVisibleResultProjection(raw).state==='VERIFIED';
}

export const VISIBLE_RESULT_PROJECTION_SCHEMA=SCHEMA;
