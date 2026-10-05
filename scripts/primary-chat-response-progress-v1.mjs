export const RESPONSE_PROGRESS_SCHEMA='prometeo.primary-chat-response-progress/v1';
const CANDIDATE_SCHEMA='prometeo.primary-chat-response-candidate-return-public/v1';
const EXAM_SCHEMA='prometeo.primary-chat-response-exam-return-public/v1';
const arr=v=>Array.isArray(v)?v:[];
const str=v=>String(v??'').trim();

function uniqueDurable(rows,{schema,requestId,ordinalField,maxOrdinal}){
  const seenWorkers=new Set(),seenRefs=new Set(),seenOrdinals=new Set();
  const accepted=[];
  for(const row of arr(rows)){
    if(!row||row.schema!==schema||str(row.request_id)!==str(requestId)||row.durable_return!==true||row.raw_text_public!==false) continue;
    const ordinal=Number(row[ordinalField]);
    const worker=str(row.worker_id), ref=str(row.return_ref);
    if(!Number.isInteger(ordinal)||ordinal<1||ordinal>maxOrdinal||!worker||!ref) continue;
    if(seenWorkers.has(worker)||seenRefs.has(ref)||seenOrdinals.has(ordinal)) continue;
    seenWorkers.add(worker); seenRefs.add(ref); seenOrdinals.add(ordinal); accepted.push({ordinal,worker_id:worker,return_ref:ref});
  }
  return accepted.sort((a,b)=>a.ordinal-b.ordinal);
}

export function compilePrimaryChatResponseProgress({request_id,candidate_returns=[],exam_returns=[],synthesis_return=null}={}){
  const requestId=str(request_id);
  if(!requestId) return {pass:false,status:'FAIL',errors:['REQUEST_ID_REQUIRED']};
  const candidates=uniqueDurable(candidate_returns,{schema:CANDIDATE_SCHEMA,requestId,ordinalField:'candidate_ordinal',maxOrdinal:4});
  const exams=uniqueDurable(exam_returns,{schema:EXAM_SCHEMA,requestId,ordinalField:'exam_ordinal',maxOrdinal:2});
  const synthesisDone=Boolean(
    synthesis_return &&
    str(synthesis_return.request_id)===requestId &&
    synthesis_return.durable_return===true &&
    str(synthesis_return.return_ref)
  );
  const counts={candidates:candidates.length,exams:exams.length,synthesis:synthesisDone?1:0};
  const complete=counts.candidates===4&&counts.exams===2&&counts.synthesis===1;
  const next=counts.candidates<4?'CANDIDATES':counts.exams<2?'EXAMS':counts.synthesis<1?'SYNTHESIS':'COMPLETE';
  const evidence_refs=[...candidates.map(x=>x.return_ref),...exams.map(x=>x.return_ref),...(synthesisDone?[str(synthesis_return.return_ref)]:[])];
  return {
    pass:true,status:'PASS',
    progress:{
      schema:RESPONSE_PROGRESS_SCHEMA,request_id:requestId,
      targets:{candidates:4,exams:2,synthesis:1},
      counts,complete,next_stage:next,
      evidence_refs,
      working_workers:null,
      liveness_claimed:false,
      raw_text_public:false
    },
    widget:{
      type:'experiment_stats',
      label:'respuesta · progreso',
      metrics:{
        candidatos:`${counts.candidates}/4`,
        examenes:`${counts.exams}/2`,
        sintesis:`${counts.synthesis}/1`,
        estado:complete?'COMPLETA':next
      },
      note:'conteos derivados sólo de RETURNs durables independientes; no representa workers vivos'
    }
  };
}
