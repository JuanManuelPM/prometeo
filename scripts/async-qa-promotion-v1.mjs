import crypto from 'node:crypto';

export const DEPTHS=['SOURCE_STATIC','DETERMINISTIC_HARNESS','INTEGRATION','SERVED_BYTE_PARITY','REPRESENTATIVE_INTERACTION','VISUAL','FULL_E2E_ADVERSARIAL'];
const byteCompare=(a,b)=>Buffer.from(String(a)).compare(Buffer.from(String(b)));
const arr=v=>Array.isArray(v)?v:[];
const uniq=v=>[...new Set(arr(v).map(x=>String(x).trim()).filter(Boolean))].sort(byteCompare);
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0,12);

export function selectedDepth(vectors=[]){
  let max=0;
  for(const v of arr(vectors)){
    const i=DEPTHS.indexOf(String(v.depth||'SOURCE_STATIC'));
    if(i<0) throw new Error(`UNKNOWN_QA_DEPTH:${v.depth}`);
    max=Math.max(max,i);
  }
  return DEPTHS[max];
}

export function verifyServedAsset({source_hash,served_hash,served_ref}={}){
  const q=String(served_ref||'').match(/[?&]v=([0-9a-f]{12})(?:&|$)/)?.[1]||null;
  const expected=String(source_hash||'').slice(0,12);
  const bytesMatch=Boolean(source_hash&&served_hash&&source_hash===served_hash);
  const versionMatch=Boolean(expected&&q===expected);
  return {status:bytesMatch&&versionMatch?'PASS':'FAIL',bytes_match:bytesMatch,version_match:versionMatch,expected_version:expected||null,served_version:q};
}

export function evaluateAsyncQA(input={}){
  for(const k of ['candidate_id','candidate_ref','version_ref','source_owner']) if(!String(input[k]||'').trim()) throw new Error(`${k.toUpperCase()}_REQUIRED`);
  const vectors=arr(input.acceptance_vectors);
  if(!vectors.length) throw new Error('ACCEPTANCE_VECTORS_REQUIRED');
  const policy=input.acceptance_policy||{};
  const results=new Map(arr(input.results).map(r=>[String(r.vector_id),String(r.status||'PENDING').toUpperCase()]));
  const normalized=vectors.map(v=>{
    for(const k of ['vector_id','depth','input','action_or_check','expected','evidence_type','blocking_scope']) if(!String(v[k]||'').trim()) throw new Error(`VECTOR_${k.toUpperCase()}_REQUIRED:${v.vector_id||'unknown'}`);
    const status=results.get(String(v.vector_id))||'PENDING';
    if(!['PENDING','PASS','FAIL','BOUNDARY'].includes(status)) throw new Error(`INVALID_RESULT:${v.vector_id}:${status}`);
    return {...v,status};
  }).sort((a,b)=>byteCompare(a.vector_id,b.vector_id));
  const fails=normalized.filter(v=>v.status==='FAIL');
  const boundaries=normalized.filter(v=>v.status==='BOUNDARY');
  const pending=normalized.filter(v=>v.status==='PENDING');
  const preUsablePending=normalized.some(v=>v.blocking_scope==='PRE_USABLE'&&v.status!=='PASS');
  const candidate_visible=Boolean(input.candidate_visible_allowed!==false&&!preUsablePending);
  let qa_state='QA_PENDING'; let promotion_signal=null; let repair_successor_candidate=null;
  if(fails.length){
    qa_state='QA_REPAIR_IN_PROGRESS';
    const failedIds=fails.map(v=>v.vector_id).sort(byteCompare);
    repair_successor_candidate={
      schema:'prometeo.qa-repair-successor-candidate/v1',
      repair_id:`repair-${String(input.candidate_id).replace(/[^a-zA-Z0-9-]/g,'-')}-${hash([input.version_ref,...failedIds])}`,
      parent_candidate_id:input.candidate_id,
      parent_version_ref:input.version_ref,
      failed_vector_ids:failedIds,
      input_refs:uniq([input.candidate_ref,input.version_ref,...fails.map(v=>v.input)]),
      done_when:fails.map(v=>String(v.expected)).sort(byteCompare),
      consumer:'REVERIFY',
      authority:'GUIDE_INTEGRATOR_MATERIALIZATION_REQUIRED'
    };
  } else if(boundaries.length){ qa_state='QA_BLOCKED'; }
  else if(!pending.length){
    qa_state='QA_PASS';
    promotion_signal=policy.human_approval_required===true
      ? {state:'READY_TO_PROMOTE',authority:'EXISTING_HUMAN_ACCEPTANCE_REQUIRED',auto_promote:false}
      : policy.auto_promotion_allowed===true
        ? {state:'READY_TO_PROMOTE',authority:'EXISTING_PROMOTION_OWNER',auto_promote:true,signal:'AUTO_PROMOTION_ELIGIBLE_SIGNAL'}
        : {state:'READY_TO_PROMOTE',authority:'EXISTING_PROMOTION_OWNER',auto_promote:false};
  }
  const compact_state=promotion_signal?.state||qa_state;
  return {
    schema:'prometeo.async-qa-evaluation/v1',candidate_id:input.candidate_id,candidate_ref:input.candidate_ref,version_ref:input.version_ref,
    supersedes_candidate_id:input.supersedes_candidate_id||null,selected_depth:selectedDepth(normalized),candidate_visible,
    qa_state,compact_state,counts:{pass:normalized.filter(v=>v.status==='PASS').length,pending:pending.length,fail:fails.length,boundary:boundaries.length},
    vectors:normalized,promotion_signal,repair_successor_candidate,
    primary_chat_projection:{visible:['QA_PENDING','QA_REPAIR_IN_PROGRESS','QA_BLOCKED','READY_TO_PROMOTE'].includes(compact_state),state:compact_state,candidate_id:input.candidate_id,version_ref:input.version_ref},
    authority:'EVIDENCE_ONLY_NO_PROMOTION_AUTHORITY'
  };
}
