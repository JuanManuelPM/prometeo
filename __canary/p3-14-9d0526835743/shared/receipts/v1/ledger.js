/* Prometeo Durable Receipt Ledger v1 — hash-chained evidence ordering.
   Receipts are evidence records, not self-validating claims. */
((global)=>{
 'use strict';if(global.PrometeoLedger)return;
 function fail(code,msg,detail={}){const e=new Error(msg);e.code=code;e.detail=detail;throw e}
 function body(r){const x=structuredClone(r);delete x.hash;return x}
 async function hashReceipt(r){return global.PrometeoDurable.digest(body(r))}
 async function validate(receipts){
   const ids=new Set();let prev='GENESIS';
   for(let i=0;i<receipts.length;i++){
     const r=receipts[i];
     if(r.schema!=='prometeo.receipt/v1'||!r.id)fail('PROMETEO_LEDGER_SCHEMA','Invalid receipt',{index:i});
     if(ids.has(r.id))fail('PROMETEO_LEDGER_DUPLICATE',`Duplicate receipt ${r.id}`);ids.add(r.id);
     if(r.prev_hash!==prev)fail('PROMETEO_LEDGER_CHAIN',`Broken receipt chain at ${r.id}`,{expected:prev,actual:r.prev_hash});
     const h=await hashReceipt(r);if(h!==r.hash)fail('PROMETEO_LEDGER_HASH',`Receipt hash mismatch ${r.id}`,{expected:h,actual:r.hash});
     prev=r.hash;
   }
   return {ok:true,count:receipts.length,lastHash:prev,ids};
 }
 async function append(receipts,record){
   const checked=await validate(receipts);const next={schema:'prometeo.receipt/v1',...structuredClone(record),prev_hash:checked.lastHash};delete next.hash;next.hash=await hashReceipt(next);
   await validate([...receipts,next]);return next;
 }
 global.PrometeoLedger=Object.freeze({version:'1.0.0-candidate',hashReceipt,validate,append});
})(typeof globalThis!=='undefined'?globalThis:window);
