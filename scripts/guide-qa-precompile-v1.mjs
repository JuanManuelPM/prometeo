import crypto from 'node:crypto';

const byteCompare=(a,b)=>Buffer.from(String(a)).compare(Buffer.from(String(b)));
const sortUnique=xs=>[...new Set((xs||[]).map(x=>String(x).trim()).filter(Boolean))].sort(byteCompare);
const slug=s=>String(s||'check').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'check';
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,12);

export function classifyCheck(c={}){
  if(c.human_judgment) return 'HUMAN_ONLY';
  if(c.needs_served_runtime) return 'WAITS_FOR_SERVED_RUNTIME';
  if(c.needs_artifact) return 'WAITS_FOR_ARTIFACT';
  return 'PREPARED_NOW';
}

export function precompileQA(input){
  if(!input?.objective_id) throw new Error('OBJECTIVE_ID_REQUIRED');
  if(!String(input.source_owner||'').trim()) throw new Error('SOURCE_OWNER_REQUIRED');
  if(!Array.isArray(input.done_when)||input.done_when.length===0) throw new Error('DONE_WHEN_REQUIRED');
  const checks=(input.check_candidates||[]).map((c,index)=>{
    for(const k of ['kind','input','expected','evidence','failure_disposition','owner','consumer']) if(!String(c[k]||'').trim()) throw new Error(`CHECK_${k.toUpperCase()}_REQUIRED:${index}`);
    const blocking_scope=String(c.blocking_scope||'ASYNC_AFTER_CANDIDATE');
    const identity={objective_id:String(input.objective_id),kind:String(c.kind),input:String(c.input),expected:String(c.expected),evidence:String(c.evidence),failure_disposition:String(c.failure_disposition),blocking_scope,owner:String(c.owner),consumer:String(c.consumer)};
    return {
      check_id:`qa-${slug(input.objective_id)}-${slug(c.kind)}-${hash(identity)}`,
      kind:String(c.kind),
      state:classifyCheck(c),
      input:String(c.input),
      expected:String(c.expected),
      evidence:String(c.evidence),
      failure_disposition:String(c.failure_disposition),
      blocking_scope,
      owner:String(c.owner),
      consumer:String(c.consumer),
      source_owner:String(input.source_owner),
      done_when_refs:sortUnique(c.done_when_refs||input.done_when)
    };
  }).sort((a,b)=>byteCompare(a.state,b.state)||byteCompare(a.kind,b.kind)||byteCompare(a.check_id,b.check_id));
  const counts=Object.fromEntries(['PREPARED_NOW','WAITS_FOR_ARTIFACT','WAITS_FOR_SERVED_RUNTIME','HUMAN_ONLY'].map(s=>[s,checks.filter(c=>c.state===s).length]));
  return {schema:'prometeo.qa-precompile/v1',objective_id:String(input.objective_id),producer_state:String(input.producer_state||'UNKNOWN'),source_owner:String(input.source_owner),done_when:sortUnique(input.done_when),checks,counts};
}

export function validateCompiled(compiled){
  const allowedStates=new Set(['PREPARED_NOW','WAITS_FOR_ARTIFACT','WAITS_FOR_SERVED_RUNTIME','HUMAN_ONLY']);
  const allowedBlocking=new Set(['PRE_USABLE','ASYNC_AFTER_CANDIDATE','PROMOTION_GATE_ONLY','HUMAN_GATE']);
  const allowedDisposition=new Set(['LOW_RISK_REPAIR_SUCCESSOR','REPAIR_REQUIRED','REGRESSION','CAPABILITY_BOUNDARY','HUMAN_DECISION_REQUIRED','STOP_UNSAFE']);
  const errors=[];
  for(const c of compiled?.checks||[]){
    if(!allowedStates.has(c.state)) errors.push(`${c.check_id}:state`);
    if(!allowedBlocking.has(c.blocking_scope)) errors.push(`${c.check_id}:blocking_scope`);
    if(!allowedDisposition.has(c.failure_disposition)) errors.push(`${c.check_id}:failure_disposition`);
    for(const k of ['input','expected','evidence','owner','consumer']) if(!String(c[k]||'').trim()) errors.push(`${c.check_id}:${k}`);
  }
  return {ok:errors.length===0,errors};
}
