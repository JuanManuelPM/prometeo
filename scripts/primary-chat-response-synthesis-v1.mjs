import { validateIndependentCandidateReturns } from './primary-chat-response-judge-v1.mjs';

export const EXAM_RETURN_SCHEMA = 'prometeo.primary-chat-response-exam-return-public/v1';
export const FINAL_RESPONSE_SCHEMA = 'prometeo.primary-chat-final-response/v1';
export const RICH_RESPONSE_SCHEMA = 'prometeo.primary-chat-rich-response/v1';

const RAW_KEYS = new Set(['text','raw_text','private_text','private_payload','prompt','transcript','messages','hidden_reasoning','chain_of_thought']);
const arr = value => Array.isArray(value) ? value : [];
const str = value => String(value ?? '').trim();
const uniq = values => [...new Set(arr(values).map(str).filter(Boolean))];

function rawFieldPath(value, prefix='') {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i=0;i<value.length;i+=1) {
      const hit=rawFieldPath(value[i], `${prefix}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key,child] of Object.entries(value)) {
    const path=prefix ? `${prefix}.${key}` : key;
    if (RAW_KEYS.has(String(key).toLowerCase())) return path;
    const nested=rawFieldPath(child,path);
    if (nested) return nested;
  }
  return null;
}

function sanitizeRichResponse(value, requestId) {
  if (!value || typeof value !== 'object' || value.schema !== RICH_RESPONSE_SCHEMA) return null;
  const prose=arr(value.prose).map(x=>str(x)).filter(Boolean).slice(0,24).map(x=>x.slice(0,4000));
  const links=arr(value.links).slice(0,16).filter(x=>x && typeof x==='object')
    .map(x=>({label:str(x.label).slice(0,180),href:str(x.href).slice(0,2048)}))
    .filter(x=>x.label && (/^https?:\/\/[^\s]+$/i.test(x.href) || /^(?:\/(?!\/)|\.\.?\/|#)[^\s]*$/.test(x.href)));
  const safeTypes=new Set(['link','details','copy_group','experiment_stats','work_unit_progress','run_progress']);
  const widgets=arr(value.widgets).slice(0,12).filter(x=>x && typeof x==='object' && safeTypes.has(str(x.type))).map(x=>{
    const type=str(x.type);
    if (type==='link') {
      const href=str(x.href).slice(0,2048);
      if (!(/^https?:\/\/[^\s]+$/i.test(href) || /^(?:\/(?!\/)|\.\.?\/|#)[^\s]*$/.test(href))) return null;
      return {type,label:str(x.label).slice(0,180)||'abrir',href};
    }
    if (type==='details') return {type,label:str(x.label).slice(0,180)||'ver más',body:str(x.body).slice(0,8000)};
    if (type==='work_unit_progress') return {type,...(str(x.label)?{label:str(x.label).slice(0,180)}:{})};
    if (type==='experiment_stats') {
      const metrics={};
      for (const [k,v] of Object.entries(x.metrics && typeof x.metrics==='object' ? x.metrics : {}).slice(0,12)) {
        if (['string','number','boolean'].includes(typeof v)) metrics[str(k).slice(0,100)]=str(v).slice(0,180);
      }
      return Object.keys(metrics).length ? {type,label:str(x.label).slice(0,180)||'estadísticas',metrics} : null;
    }
    if (type==='copy_group') {
      const items=arr(x.items).slice(0,8).filter(i=>i && typeof i==='object' && str(i.text)).map(i=>({label:str(i.label).slice(0,180)||'texto',text:String(i.text).slice(0,8000)}));
      return items.length ? {type,label:str(x.label).slice(0,180)||'copiar',items} : null;
    }
    if (type==='run_progress') {
      const out={type};
      for (const key of ['label','run_id','batch_id','status_url','lab_url','runtime_url']) if (str(x[key])) out[key]=str(x[key]).slice(0,key.endsWith('_url')?2048:180);
      return out;
    }
    return null;
  }).filter(Boolean);
  if (!prose.length && !links.length && !widgets.length) return null;
  return {
    schema:RICH_RESPONSE_SCHEMA,
    request_id:requestId,
    prose,links,widgets,
    evidence_refs:uniq(value.evidence_refs).slice(0,24).map(x=>x.slice(0,512)),
    public_safe_projection:true,
    raw_private_prompt:false
  };
}

export function validateIndependentExamReturns(exams, requestId) {
  const errors=[];
  const list=arr(exams);
  if (list.length!==2) errors.push('EXAM_RETURN_COUNT_MUST_BE_2');
  const workers=new Set(), refs=new Set(), ordinals=new Set();
  for (const exam of list) {
    if (!exam || typeof exam!=='object') { errors.push('EXAM_RETURN_INVALID'); continue; }
    const leak=rawFieldPath(exam); if (leak) errors.push(`EXAM_RAW_FIELD_FORBIDDEN:${leak}`);
    if (exam.schema!==EXAM_RETURN_SCHEMA) errors.push('EXAM_RETURN_SCHEMA_INVALID');
    if (str(exam.request_id)!==str(requestId)) errors.push('EXAM_REQUEST_ID_MISMATCH');
    const ordinal=Number(exam.exam_ordinal);
    if (![1,2].includes(ordinal)) errors.push('EXAM_ORDINAL_INVALID');
    else if (ordinals.has(ordinal)) errors.push('EXAM_ORDINAL_DUPLICATE'); else ordinals.add(ordinal);
    const worker=str(exam.worker_id); if (!worker) errors.push('EXAM_WORKER_REQUIRED'); else if (workers.has(worker)) errors.push('EXAM_WORKER_DUPLICATE'); else workers.add(worker);
    const ref=str(exam.return_ref); if (!ref) errors.push('EXAM_RETURN_REF_REQUIRED'); else if (refs.has(ref)) errors.push('EXAM_RETURN_REF_DUPLICATE'); else refs.add(ref);
    if (exam.durable_return!==true) errors.push('EXAM_RETURN_NOT_DURABLE');
    if (exam.raw_text_public!==false) errors.push('EXAM_RAW_TEXT_PUBLIC_MUST_BE_FALSE');
    const ranking=arr(exam.ranking).map(Number);
    if (ranking.length!==4 || new Set(ranking).size!==4 || ranking.some(n=>![1,2,3,4].includes(n))) errors.push('EXAM_RANKING_MUST_PERMUTE_1_4');
  }
  if (workers.size!==2) errors.push('INDEPENDENT_EXAM_WORKER_COUNT_MUST_BE_2');
  if (refs.size!==2) errors.push('INDEPENDENT_EXAM_RETURN_REF_COUNT_MUST_BE_2');
  return {pass:errors.length===0,errors:uniq(errors).sort()};
}

function chooseOrdinal(exams) {
  const score=new Map([[1,0],[2,0],[3,0],[4,0]]);
  for (const exam of exams) arr(exam.ranking).map(Number).forEach((ordinal,index)=>score.set(ordinal,(score.get(ordinal)||0)+(4-index)));
  return [...score.entries()].sort((a,b)=>b[1]-a[1] || a[0]-b[0])[0][0];
}

export function synthesizePrimaryChatResponse({request_id,candidate_returns,exam_returns}={}) {
  const requestId=str(request_id);
  if (!requestId) return {pass:false,status:'FAIL',errors:['REQUEST_ID_REQUIRED']};
  const candidates=validateIndependentCandidateReturns(candidate_returns,requestId);
  const exams=validateIndependentExamReturns(exam_returns,requestId);
  const errors=[...candidates.errors,...exams.errors];
  if (errors.length) return {pass:false,status:'FAIL',errors:uniq(errors).sort()};
  const selectedOrdinal=chooseOrdinal(exam_returns);
  const selected=candidate_returns.find(x=>Number(x.candidate_ordinal)===selectedOrdinal);
  const rich=sanitizeRichResponse(selected?.rich_response,requestId);
  if (!rich) return {pass:false,status:'FAIL',errors:['SELECTED_CANDIDATE_RICH_RESPONSE_INVALID']};
  const evidenceRefs=uniq([
    ...candidate_returns.map(x=>x.return_ref),
    ...exam_returns.map(x=>x.return_ref),
    ...rich.evidence_refs
  ]).slice(0,32);
  rich.evidence_refs=evidenceRefs;
  return {
    pass:true,status:'PASS',
    final_response:{
      schema:FINAL_RESPONSE_SCHEMA,
      request_id:requestId,
      selected_candidate_ordinal:selectedOrdinal,
      candidate_returns_received:4,
      exam_returns_received:2,
      independent_candidate_workers:4,
      independent_exam_workers:2,
      execution_depth_class:'REAL_BOT_RETURNS_SYNTHESIZED',
      rich_response:rich,
      evidence_refs:evidenceRefs,
      visible_projection_ready:true,
      raw_text_public:false,
      authority:'VISIBLE_RESPONSE_PROJECTION_ONLY_NO_SCHEDULER_QUEUE_CURRENT_OR_PROMOTION_AUTHORITY'
    }
  };
}
