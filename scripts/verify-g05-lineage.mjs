#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const arr=v=>Array.isArray(v)?v:[];
const txt=v=>String(v??'');
const passish=v=>['PROVEN','PASS','VERIFIED','SUCCESS'].includes(txt(v).toUpperCase());

export function verifyG05LineageBundle(bundle={}, contract={}){
  const required=arr(contract?.required_evidence);
  if(contract?.gate_id!=='G05_REAL_PRIVATE_E2E' || required.length!==10){
    return {schema:'prometeo.g05-lineage-verification/v1',status:'REJECT_INVALID_CONTRACT',failure_codes:['INVALID_CONTRACT']};
  }
  const lineageId=txt(bundle?.lineage_id);
  const verifier=txt(bundle?.verifier_worker_id);
  const contributions=arr(bundle?.contributions);
  if(!lineageId || !verifier){
    return {schema:'prometeo.g05-lineage-verification/v1',status:'REJECT_INVALID_BUNDLE',failure_codes:['MISSING_LINEAGE_OR_VERIFIER']};
  }

  const cross=contributions.filter(x=>txt(x?.lineage_id)!==lineageId);
  if(cross.length){
    return {
      schema:'prometeo.g05-lineage-verification/v1',
      gate_id:'G05_REAL_PRIVATE_E2E',lineage_id:lineageId,verifier_worker_id:verifier,
      status:'REJECT_CROSS_LINEAGE',failure_codes:['CROSS_LINEAGE_EVIDENCE'],
      cross_lineage_refs:cross.map(x=>x?.ref||null).filter(Boolean)
    };
  }

  const evidence={};
  const sourceRefs=[];
  const builders=new Set();
  for(const row of contributions){
    if(row?.ref)sourceRefs.push(String(row.ref));
    const worker=txt(row?.worker_id);
    const ev=row?.evidence&&typeof row.evidence==='object'&&!Array.isArray(row.evidence)?row.evidence:{};
    const carriesBuilderEvidence=Object.entries(ev).some(([key,value])=>key!=='independent_verifier'&&required.includes(key)&&passish(value));
    if(worker&&carriesBuilderEvidence)builders.add(worker);
    for(const key of required){
      if(key==='independent_verifier')continue;
      if(passish(ev[key]))evidence[key]='PROVEN';
    }
  }

  const selfVerify=builders.has(verifier);
  evidence.independent_verifier=selfVerify?'NOT_PROVEN':'PROVEN';
  const missing=required.filter(key=>!passish(evidence[key]));
  const failureCodes=[];
  if(selfVerify)failureCodes.push('BUILDER_SELF_VERIFIED');
  if(missing.length)failureCodes.push('MISSING_REQUIRED_EVIDENCE');

  const status=selfVerify
    ? 'REJECT_BUILDER_SELF_VERIFY'
    : missing.length
      ? 'BLOCKED_MISSING_EVIDENCE'
      : 'PASS';

  return {
    schema:'prometeo.g05-lineage-verification/v1',
    gate_id:'G05_REAL_PRIVATE_E2E',
    lineage_id:lineageId,
    verifier_worker_id:verifier,
    status,
    evidence,
    missing_evidence:missing,
    failure_codes:failureCodes,
    source_refs:[...new Set(sourceRefs)],
    builder_worker_ids:[...builders].sort(),
    authority_boundary:'OBSERVABILITY_ONLY_NO_PROMOTION_NO_CURRENT_NO_SERVED'
  };
}

export function runCli(argv=process.argv.slice(2)){
  const [bundlePath,outPath,contractPath='coordination/goal-progress/G05_REAL_PRIVATE_E2E_EVIDENCE_CONTRACT_V1.json']=argv;
  if(!bundlePath||!outPath)throw new Error('usage: verify-g05-lineage.mjs <bundle.json> <out.json> [contract.json]');
  const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
  const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
  const out=verifyG05LineageBundle(bundle,contract);
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
  process.stdout.write(JSON.stringify({status:out.status,lineage_id:out.lineage_id,missing:out.missing_evidence||[],failure_codes:out.failure_codes||[]})+'\n');
  return out;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  try{runCli()}catch(error){process.stderr.write(String(error?.stack||error)+'\n');process.exitCode=1}
}
