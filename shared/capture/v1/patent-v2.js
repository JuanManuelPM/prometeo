import {revisionRef,validateCapture} from './capture-core.js';
import {memoryContextForPatent} from './context-memory.js';

const enc=new TextEncoder();
const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};
const clone=v=>structuredClone(v);
const freeze=v=>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v)}return v};
const imm=v=>freeze(clone(v));
function stable(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stable).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'}
export async function digest(value){const bytes=enc.encode(typeof value==='string'?value:stable(value));const d=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}

export function selectionRefs(captures){
  return captures.map(c=>{validateCapture(c);const r=revisionRef(c);return {ref:r.ref,capture_id:c.id,revision:r.revision,digest:r.digest||null,privacy:c.privacy};}).sort((a,b)=>a.ref.localeCompare(b.ref));
}

export function validateExportReceipt(receipt,selected){
  if(receipt?.schema!=='prometeo.capture-export-receipt/v1')fail('PROMETEO_PATENT_EXPORT_RECEIPT','Patent requires Capture export receipt');
  if(receipt.human_approved!==true)fail('PROMETEO_PATENT_EXPORT_HUMAN','Patent export must be explicitly Human approved');
  if(receipt.from_privacy!=='LOCAL'||receipt.to_privacy!=='PROJECT')fail('PROMETEO_PATENT_EXPORT_PRIVACY','Export receipt must explicitly declassify selected LOCAL intent to PROJECT transport');
  if(!receipt.id||!receipt.hash)fail('PROMETEO_PATENT_EXPORT_TRUST','Export receipt requires durable id/hash');
  const expected=[...selected].map(x=>x.ref).sort();
  const actual=[...(receipt.source_revision_refs||[])].sort();
  if(JSON.stringify(expected)!==JSON.stringify(actual))fail('PROMETEO_PATENT_EXPORT_SCOPE','Export receipt scope does not exactly match Patent selection',{expected,actual});
  const byRef=new Map(selected.map(x=>[x.ref,x.digest||null]));
  const receiptDigests=receipt.source_digests||{};
  for(const ref of expected){const d=byRef.get(ref);if(d&&receiptDigests[ref]!==d)fail('PROMETEO_PATENT_EXPORT_DIGEST','Export receipt digest mismatch',{ref,expected:d,actual:receiptDigests[ref]||null});}
  return {ok:true,receipt_id:receipt.id};
}

function pageBindingFor(capture,pageBindings){
  const pageId=capture.immutable_creation.context.page_id;
  const p=(pageBindings||[]).find(x=>x.page_id===pageId||x.id===pageId);
  if(!p)fail('PROMETEO_PATENT_PAGE_BINDING','Patent selection missing page binding',{page_id:pageId});
  return p;
}

export async function createPatentV2({
  patent_code,
  token_id=null,
  captures,
  seed,
  work_item,
  export_receipt,
  current_binding,
  catalog_binding,
  page_bindings,
  memories=[],
  protocol,
  created_at=null,
  expires_at=null
}={}){
  if(!patent_code||!seed?.id||!work_item?.id)fail('PROMETEO_PATENT_REQUIRED','Patent code, Seed and Work Item are required');
  if(!Array.isArray(captures)||!captures.length)fail('PROMETEO_PATENT_CAPTURES','Patent requires selected Captures');
  const selected=selectionRefs(captures);
  validateExportReceipt(export_receipt,selected);
  if(!current_binding?.revision||!current_binding?.digest)fail('PROMETEO_PATENT_CURRENT','Current binding revision/digest required');
  if(!catalog_binding?.identity||!catalog_binding?.digest)fail('PROMETEO_PATENT_CATALOG','Catalog binding identity/digest required');
  if(!protocol?.id||!protocol?.digest)fail('PROMETEO_PATENT_PROTOCOL','Execution protocol id/digest required');
  const now=new Date(created_at||Date.now());const expiry=new Date(expires_at||now.getTime()+7*86400e3);
  if(expiry<=now)fail('PROMETEO_PATENT_EXPIRY','Patent expiry must be in the future');
  const affected=[...new Set(captures.map(c=>c.immutable_creation.context.page_id).filter(Boolean))];
  const pages=affected.map(page_id=>{
    const p=(page_bindings||[]).find(x=>x.page_id===page_id||x.id===page_id);if(!p)fail('PROMETEO_PATENT_PAGE_BINDING','Missing affected page binding',{page_id});
    const memory=(memories||[]).find(x=>x.page_id===page_id)||null;
    return {
      page_id,
      source_identity:p.source_identity||p.source||null,
      writable_target:clone(p.writable_target||null),
      public_url:p.public_url||p.href||null,
      manifest_ref:p.manifest_ref||null,
      memory:memoryContextForPatent(memory)
    };
  });
  const selectedCaptures=[];
  for(const capture of captures){
    validateCapture(capture);const r=revisionRef(capture);const page=pageBindingFor(capture,page_bindings);
    selectedCaptures.push({
      capture_id:capture.id,
      revision:r.revision,
      ref:r.ref,
      digest:r.digest||await digest(r.text),
      transcript:r.text,
      transcript_state:r.state,
      page_id:capture.immutable_creation.context.page_id,
      context:clone(capture.immutable_creation.context),
      source_identity:page.source_identity||page.source||null,
      privacy_transport:'PROJECT'
    });
  }
  const snapshot={
    schema:'prometeo.execution-patent/v2',
    patent_code:String(patent_code),
    token_id:token_id?String(token_id):null,
    created_at:now.toISOString(),
    expires_at:expiry.toISOString(),
    project:'Prometeo',
    seed:{id:seed.id,request:seed.request,privacy:seed.privacy,source_refs:clone(seed.source_refs||[])},
    work_item:{id:work_item.id,state:work_item.state,target:clone(work_item.target),dependencies:clone(work_item.dependencies||[])},
    export_receipt:{id:export_receipt.id,hash:export_receipt.hash,source_revision_refs:[...export_receipt.source_revision_refs]},
    current_binding:clone(current_binding),
    catalog_binding:clone(catalog_binding),
    affected_pages:pages,
    selected_captures:selectedCaptures,
    execution_protocol:{id:protocol.id,digest:protocol.digest,ref:protocol.ref||'coordination/P4_CAPTURE_AGENT_PROTOCOL.md'},
    truth_laws:[
      'Patent != product authority',
      'latest != Current',
      'Candidate != Human Accepted != Served',
      'stored context != participating context',
      'transcript != Human Accepted intent by existence',
      'source commit != externally Served verification'
    ]
  };
  const snapshot_hash=await digest(snapshot);
  return imm({schema:'prometeo.execution-patent-envelope/v2',patent_code:String(patent_code),snapshot,snapshot_hash});
}

export async function validatePatentV2(envelope,{now=Date.now()}={}){
  if(envelope?.schema!=='prometeo.execution-patent-envelope/v2'||envelope.snapshot?.schema!=='prometeo.execution-patent/v2')fail('PROMETEO_PATENT_SCHEMA','Invalid Patent v2');
  const actual=await digest(envelope.snapshot);if(actual!==envelope.snapshot_hash)fail('PROMETEO_PATENT_HASH','Patent snapshot hash mismatch',{expected:envelope.snapshot_hash,actual});
  if(new Date(envelope.snapshot.expires_at).getTime()<=Number(now))fail('PROMETEO_PATENT_EXPIRED','Patent expired');
  if(!envelope.snapshot.export_receipt?.id||!envelope.snapshot.execution_protocol?.digest)fail('PROMETEO_PATENT_BINDINGS','Patent missing export/protocol binding');
  return imm({ok:true,patent_code:envelope.patent_code,snapshot_hash:actual,work_item_id:envelope.snapshot.work_item.id,current_revision:envelope.snapshot.current_binding.revision,catalog_identity:envelope.snapshot.catalog_binding.identity});
}
