const SAFE_COORDINATION=/^coordination\/[A-Za-z0-9._\/-]+$/;
const SHA=/^[a-f0-9]{40,64}$/i;
const arr=v=>Array.isArray(v)?v:[];
const str=v=>String(v??'').trim();

export function validateG05LineageReceipt(doc,contract){
  const errors=[];
  const fail=(code,path)=>errors.push({code,path});
  if(!doc||typeof doc!=='object'||Array.isArray(doc))return {ok:false,errors:[{code:'RECEIPT_REQUIRED',path:'$'}]};
  if(doc.schema!=='prometeo.g05-lineage-receipt/v1')fail('SCHEMA','$');
  const lineage=str(doc.lineage_id),work=str(doc.work_item_id),builder=str(doc.builder_worker_id);
  if(!lineage)fail('LINEAGE_ID','$.lineage_id');
  if(!work)fail('WORK_ITEM_ID','$.work_item_id');
  if(!builder)fail('BUILDER_WORKER_ID','$.builder_worker_id');
  const generation=Number(doc.claim?.generation);
  const preGeneration=Number(doc.prewrite?.generation);
  if(!Number.isInteger(generation)||generation<1)fail('CLAIM_GENERATION','$.claim.generation');
  if(!Number.isInteger(preGeneration)||preGeneration<1)fail('PREWRITE_GENERATION','$.prewrite.generation');
  if(generation!==preGeneration)fail('STALE_GENERATION','$.prewrite.generation');
  if(!SAFE_COORDINATION.test(str(doc.claim?.ref)))fail('CLAIM_REF','$.claim.ref');
  const expected=str(doc.prewrite?.expected_blob),observed=str(doc.prewrite?.observed_blob);
  if(!SHA.test(expected)||!SHA.test(observed))fail('BLOB_IDENTITY','$.prewrite');
  if(expected!==observed)fail('CAS_BLOB_MISMATCH','$.prewrite');
  if(!arr(contract?.accepted_cas_result).includes(str(doc.prewrite?.cas_result).toUpperCase()))fail('CAS_RESULT','$.prewrite.cas_result');
  if(str(doc.return?.schema)!=='prometeo.execution-result/v1')fail('RETURN_SCHEMA','$.return.schema');
  if(str(doc.return?.lineage_id)!==lineage)fail('RETURN_LINEAGE_MISMATCH','$.return.lineage_id');
  if(str(doc.return?.work_item_id)!==work)fail('RETURN_WORK_ITEM_MISMATCH','$.return.work_item_id');
  if(doc.return?.sanitized!==true)fail('RETURN_NOT_SANITIZED','$.return.sanitized');
  if(!SAFE_COORDINATION.test(str(doc.return?.path)))fail('RETURN_PATH','$.return.path');
  if(!SHA.test(str(doc.return?.digest)))fail('RETURN_DIGEST','$.return.digest');
  if(str(doc.ingest?.lineage_id)!==lineage)fail('INGEST_LINEAGE_MISMATCH','$.ingest.lineage_id');
  if(str(doc.ingest?.work_item_id)!==work)fail('INGEST_WORK_ITEM_MISMATCH','$.ingest.work_item_id');
  if(!arr(contract?.accepted_ingest_sources).includes(str(doc.ingest?.source).toUpperCase()))fail('INGEST_SOURCE','$.ingest.source');
  if(!str(doc.ingest?.status))fail('INGEST_STATUS','$.ingest.status');
  const forbidden=new Set(arr(contract?.forbidden_public_keys).map(x=>String(x).toLowerCase()));
  const scan=(v,p='$')=>{
    if(Array.isArray(v)){v.forEach((x,i)=>scan(x,`${p}[${i}]`));return}
    if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){
      if(forbidden.has(String(k).toLowerCase()))fail('PRIVATE_KEY',`${p}.${k}`);
      scan(x,`${p}.${k}`);
    }
  };
  scan(doc);
  return {ok:errors.length===0,errors};
}
