import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const ROOT=new URL('../',import.meta.url);
const read=rel=>fs.readFileSync(new URL(rel,ROOT),'utf8');
const json=rel=>JSON.parse(read(rel));
const jsonl=rel=>read(rel).trim().split(/\n+/).filter(Boolean).map(JSON.parse);
const git=(...args)=>execFileSync('git',args,{cwd:new URL('.',ROOT),encoding:'utf8'}).trim();
const hashObject=rel=>git('hash-object',rel);

const bootstrap=json('reincarnation/BOOTSTRAP.json');
if(bootstrap.schema!=='prometeo.reincarnation-bootstrap/v1')throw new Error('Invalid bootstrap schema');
const docs={};
for(const spec of bootstrap.required){
  if(spec.role==='ledger'){
    const receipts=jsonl(spec.path);
    if(!receipts.length||receipts.some(r=>r.schema!==spec.schema))throw new Error(`Invalid ledger role ${spec.path}`);
    docs[spec.role]=receipts;
  }else{
    const value=json(spec.path);
    if(value.schema!==spec.schema)throw new Error(`Schema mismatch for ${spec.role}: ${value.schema} != ${spec.schema}`);
    docs[spec.role]=value;
  }
}
const c={console,structuredClone,TextEncoder,TextDecoder,crypto:webcrypto,URL,Date,Math,JSON,setTimeout,clearTimeout,queueMicrotask};c.globalThis=c;c.window=c;vm.createContext(c);
for(const rel of ['shared/core/v1/durable.js','shared/receipts/v1/ledger.js','shared/reincarnation/v1/reincarnate.js'])vm.runInContext(read(rel),c,{filename:rel});
const ledger=await c.PrometeoLedger.validate(docs.ledger);
const wake=c.PrometeoReincarnate.wake({bootstrap,currentGraph:docs.current_graph,head:docs.head,dotState:docs.dot_state,parent:docs.parent,pending:docs.pending,carry:docs.carry,watermarks:docs.watermarks,catalog:docs.catalog,lineage:docs.lineage,capabilities:docs.capabilities,hotBook:docs.hot_book,operatorContract:docs.operator_contract,ledgerReceipts:docs.ledger});
const required=bootstrap.required.map(spec=>({role:spec.role,path:spec.path,schema:spec.schema,git_blob_sha:hashObject(spec.path)}));
const evidence={schema:'prometeo.p3-00-evidence/v1',gate:'P3-00',generated_from_chat_memory:false,source_identities:{repository:'JuanManuelPM/prometeo',branch:git('rev-parse','--abbrev-ref','HEAD'),checkout_commit:git('rev-parse','HEAD'),bootstrap:{path:'reincarnation/BOOTSTRAP.json',git_blob_sha:hashObject('reincarnation/BOOTSTRAP.json')},required,runtime:['shared/core/v1/durable.js','shared/receipts/v1/ledger.js','shared/reincarnation/v1/reincarnate.js'].map(path=>({path,git_blob_sha:hashObject(path)}))},ledger:{ok:ledger.ok,count:ledger.count,last_hash:ledger.lastHash,last_receipt_id:docs.ledger.at(-1).id},state_crosscheck:{current_revision:docs.current_graph.revision,current_last_receipt:docs.current_graph.last_durable_receipt,dot_last_receipt:docs.dot_state.last_receipt,head_receipt:docs.head.receipt_id,candidate_receipt:docs.current_graph.pointers.candidate_current.receipt_id,catalog_identity:docs.current_graph.catalog_identity,v53_source:docs.current_graph.artifacts['navigator-v53-visible']?.source||null},wake};
process.stdout.write(JSON.stringify(evidence,null,2)+'\n');
