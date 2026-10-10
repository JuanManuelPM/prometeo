// Read-only historical projection. Neither claims nor state labels prove LIVE.
function declaredDealer(text){
  const lines=text.split(/\r?\n/),ids=[];
  for(let i=0;i<lines.length;i++){
    const match=/^\s*DEALER\s*[=:]\s*([A-Za-z0-9_-]*)\s*$/i.exec(lines[i]);
    if(match){const id=match[1]||lines[i+1]?.trim();if(!/^[A-Za-z0-9_-]+$/.test(id||''))return null;ids.push(id)}
  }
  return ids.length===1?ids[0]:null;
}
export function auditDealerBindings(run,handoff,prompt){
  if(!run?.dealer_id||typeof handoff!=='string'||typeof prompt!=='string')return {status:'UNKNOWN'};
  const h=declaredDealer(handoff),p=declaredDealer(prompt);
  return {status:h===run.dealer_id&&p===run.dealer_id?'MATCH':'MISMATCH',
    run_matches_handoff:h===run.dealer_id,run_matches_prompt:p===run.dealer_id};
}
export async function readVerifiedPrompt(fetcher){
  const api='https://api.github.com/repos/JuanManuelPM/prometeo';
  const response=await fetcher(api+'/git/ref/heads/exp009-control',{cache:'no-store'});
  if(!response.ok)throw new Error('CONTROL_REVISION_UNAVAILABLE');
  const sha=(await response.json()).object?.sha;
  if(!/^[a-f0-9]{40}$/.test(sha||''))throw new Error('CONTROL_REVISION_INVALID');
  const base='https://raw.githubusercontent.com/JuanManuelPM/prometeo/'+sha+'/ui-workspace-v1/experiments/allocator-v8/';
  const texts=await Promise.all(['RUN.json','HANDOFF.md','PROMPT.txt'].map(async name=>{
    const r=await fetcher(base+name,{cache:'no-store'});if(!r.ok)throw new Error('CONTROL_SOURCE_UNAVAILABLE');return r.text();
  }));
  const audit=auditDealerBindings(JSON.parse(texts[0]),texts[1],texts[2]);
  if(audit.status!=='MATCH')throw new Error('CONTROL_BINDING_MISMATCH');
  return {prompt:texts[2],revision:sha,audit};
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
