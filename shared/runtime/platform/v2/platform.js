/* Prometeo Part 2 Platform — durable truth/metabolism composition root. No visible UI. */
((global)=>{
 'use strict';if(global.PrometeoPart2Platform)return;
 let singleton=null;
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 async function bootstrap({base=null,fetcher=global.fetch}={}){
  if(singleton)return singleton;
  const required=['PrometeoDurable','PrometeoPrivacy','PrometeoCatalog','PrometeoLineage','PrometeoSupersession','PrometeoCurrentGraph','PrometeoContinuity','PrometeoBooks','PrometeoGolden','PrometeoContextFoundryV2','PrometeoContextPacks','PrometeoWorkflow','PrometeoLedger','PrometeoModificationResolver','PrometeoReincarnate','PrometeoOperatorView'];
  const missing=required.filter(k=>!global[k]);if(missing.length)fail('PROMETEO_PART2_MISSING_RUNTIME','Missing Part 2 runtimes',{missing});
  const root=base?new URL(base,global.location?.href||'https://local.invalid/'):new URL('../',global.location?.href||'https://local.invalid/navigator/');
  const text=async path=>{const r=await fetcher(new URL(path,root).href,{cache:'no-store'});if(!r.ok)fail('PROMETEO_PART2_FETCH',`Failed ${path}`,{status:r.status});return r.text()};
  const j=async path=>JSON.parse(await text(path)),jl=async path=>(await text(path)).trim().split(/\n+/).filter(Boolean).map(JSON.parse);
  const [tree,pages,manifest,lineage,caps,sup,current,head,dot,parent,pending,carry,watermarks,hot,warm,cold,golden,bytes,index,boot,ledger]=await Promise.all([
   j('catalog/tree.json'),j('catalog/pages.json'),j('catalog/CATALOG_MANIFEST.json'),j('lineage/LINEAGE_GRAPH.json'),j('lineage/CAPABILITY_REGISTRY.json'),jl('lineage/SUPERSESSION.jsonl'),
   j('state/CURRENT_GRAPH.json'),j('state/HEAD.json'),j('state/DOT_STATE.json'),j('state/PARENT.json'),j('state/PENDING.json'),j('state/CARRY.json'),j('state/WATERMARKS.json'),
   j('context/books/HOT.json'),j('context/books/WARM.json'),j('context/books/COLD.json'),j('golden/GOLDEN_REFERENCES.json'),j('context/bytes/BYTE_REGISTRY.json'),j('context/registry/CONTEXT_INDEX.json'),j('reincarnation/BOOTSTRAP.json'),jl('receipts/ledger.jsonl')
  ]);
  const cat=global.PrometeoCatalog.validate({tree,pages,manifest});
  global.PrometeoLineage.validate(lineage,caps,{supersession:sup});global.PrometeoSupersession.validate(sup);
  const ledgerStatus=await global.PrometeoLedger.validate(ledger);global.PrometeoCurrentGraph.validate(current,{knownReceipts:ledgerStatus.ids,catalogIdentity:cat.sourceIdentity});
  global.PrometeoContinuity.validatePending(pending);global.PrometeoContinuity.validateCarry(carry);global.PrometeoContinuity.validateWatermarks(watermarks);global.PrometeoBooks.validate(hot,warm,cold);global.PrometeoGolden.validate(golden);
  const foundry=global.PrometeoContextFoundryV2.create({byteRegistry:bytes,index,privacy:global.PrometeoPrivacy});
  const wake=()=>global.PrometeoReincarnate.wake({bootstrap:boot,currentGraph:current,head,dotState:dot,parent,pending,carry,watermarks,catalog:manifest,lineage,capabilities:caps,hotBook:hot});
  const planChange=request=>global.PrometeoModificationResolver.plan({request,pages,manifest,foundry,privacy:'LOCAL'});
  const operator=()=>global.PrometeoOperatorView.project({currentGraph:current,pending,catalog:manifest});
  singleton=Object.freeze({schema:'prometeo.part2-platform/v1',catalog:{tree,pages,manifest,status:cat},lineage:{graph:lineage,capabilities:caps,supersession:sup},currentGraph:current,continuity:{pending,carry,watermarks,books:{hot,warm,cold}},golden,ledger,foundry,wake,planChange,operator,status:()=>({catalog:cat,ledger:{count:ledgerStatus.count,lastHash:ledgerStatus.lastHash},currentRevision:current.revision,pending:(pending.items||[]).length,contextRecords:foundry.listRecords().length,visibleFrontend:current.pointers.visible_frontend_current.artifact_id})});
  global.__PROMETEO_PART2__=singleton;return singleton;
 }
 global.PrometeoPart2Platform=Object.freeze({version:'1.0.0-candidate',bootstrap,get:()=>singleton});
})(typeof globalThis!=='undefined'?globalThis:window);
