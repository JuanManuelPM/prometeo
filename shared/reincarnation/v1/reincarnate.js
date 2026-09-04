((global)=>{
 'use strict';if(global.PrometeoReincarnate)return;
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function wake({bootstrap,currentGraph,head,dotState,parent,pending,carry,watermarks,catalog,lineage,capabilities,hotBook}={}){
  if(bootstrap?.schema!=='prometeo.reincarnation-bootstrap/v1')fail('PROMETEO_WAKE_BOOTSTRAP','Invalid bootstrap');
  if(currentGraph?.schema!=='prometeo.current-graph/v1')fail('PROMETEO_WAKE_CURRENT','Invalid Current Graph');
  const visible=currentGraph.pointers?.visible_frontend_current?.artifact_id||null;
  const human=Object.entries(currentGraph.pointers||{}).filter(([k])=>k.startsWith('human_accepted')).map(([scope,p])=>({scope,artifact_id:p.artifact_id}));
  return Object.freeze({
   schema:'prometeo.wake-packet/v1',
   WHAT_IS_PROMETEO:'A durable, chat-agnostic system whose visible frontend is separate from backstage truth, context, work metabolism and release authority.',
   CURRENT:{head:head?.artifact_id||null,visible_frontend:visible,candidate:currentGraph.pointers?.candidate_current?.artifact_id||null,phase:dotState?.phase||null,parent:parent?.parent||null},
   HUMAN_ACCEPTED_SCOPES:human,
   SERVED_INHERITED:currentGraph.pointers?.served_current||null,
   ACTIVE_FRONTEND:visible,
   PAGES:{count:(catalog.pages||[]).length,identity:catalog.source_contract?.identity||null},
   CAPABILITIES:(capabilities.capabilities||[]).map(c=>({id:c.id,best_known:c.best_known,human_accepted:c.human_accepted,rollback_donor:c.rollback_donor})),
   PENDING:structuredClone(pending.items||[]),
   RULES:(carry.items||[]).map(x=>x.text),
   HOW_TO_CHANGE:'Resolve target → Seed → Work Item → minimal Context Pack → execution → Artifact Return → verification → Candidate.',
   HOW_TO_TEST:'Use domain tests + known diseases; browser/perceptual layers remain separate.',
   HOW_TO_RELEASE:'Candidate → exact verification → Human Acceptance → receipt-backed Current transition → Served verification (Part 3).',
   WATERMARKS:structuredClone(watermarks.sources||{}),
   HOT:structuredClone(hotBook.items||[]),
   lineage_reopen:'lineage/LINEAGE_GRAPH.json'
  });
 }
 global.PrometeoReincarnate=Object.freeze({version:'1.0.0-candidate',wake});
})(typeof globalThis!=='undefined'?globalThis:window);
