// Read-only historical projection. Neither claims nor state labels prove LIVE.
export function auditDealerBindings(run,handoff,prompt){
  if(!run?.dealer_id||typeof handoff!=='string'||typeof prompt!=='string')return {status:'UNKNOWN'};
  return {status:handoff.includes(run.dealer_id)&&prompt.includes(run.dealer_id)?'MATCH':'MISMATCH',
    run_matches_handoff:handoff.includes(run.dealer_id),run_matches_prompt:prompt.includes(run.dealer_id)};
}
export function projectResidency(state,index,{slot,observed_at=new Date().toISOString()}={}){
  const number=x=>Number.isSafeInteger(x)&&x>=0?x:null;
  const state_minimum=number(state?.returns_created_confirmed_min)??number(state?.returns_created)??number(state?.counters?.returns_created)??number(state?.tasks_completed_confirmed_min)??number(state?.tasks_completed)??0;
  const pattern=new RegExp(`^RETURN-(\\d{6})__worker-${slot}\\.md$`);
  const files=Array.isArray(index)?index.filter(x=>x.type==='file'&&pattern.test(x.name)&&/^[a-f0-9]{40}$/.test(x.sha||'')):null;
  const names=files?[...new Set(files.map(x=>x.name))].sort():null;
  const count=names?names.length:state_minimum;
  const acquired=!!(state?.worker_id&&state?.first_claim_at);
  const status_label=!state?'SOURCE_UNAVAILABLE':!acquired?'NOT_ACQUIRED':state.terminal_reason||(['PLATFORM_INTERRUPTION','FAILED','CLOSED'].includes(state.status)?state.status:'HISTORICAL_CLAIM');
  return {returns_observed:count,state_minimum,canonicality:names?'DURABLE_RETURN_INDEX':'STATE_MINIMUM',
    lower_bound:!names||index.length>=1000,observed_at,live:false,status_label,
    last_durable_ticket:names?.length?pattern.exec(names.at(-1))[1]:state?.last_durable_ticket||null,
    rate_evidence_aligned:!!names&&count===state_minimum};
}
