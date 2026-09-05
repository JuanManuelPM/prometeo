/* Prometeo Runtime Ownership v1 — CANDIDATE
   One active gesture owner + explicit nested focus leases.
*/
((global) => {
  'use strict';
  if (global.PrometeoOwnership) return;
  let generation=1,seq=0,gesture=null;const focusStack=[];
  const err=(code,message,detail={})=>Object.assign(new Error(message),{code,detail});
  const token=(kind,owner,extra={})=>Object.freeze({kind,id:`${kind}-${generation}-${++seq}`,owner,generation,...extra});
  const same=(a,b)=>!!a&&!!b&&a.id===b.id&&a.generation===b.generation;
  function acquireGesture(owner,meta={}){if(!owner)throw err('PROMETEO_OWNER_REQUIRED','Gesture owner is required');if(gesture)throw err('PROMETEO_INPUT_OWNER_CONFLICT',`Gesture already owned by ${gesture.owner}`,{current:gesture.owner,requested:owner});gesture=token('gesture',owner,{pointerId:meta.pointerId??null,scope:meta.scope??null});return gesture}
  function releaseGesture(t){if(!gesture||!same(gesture,t))return false;gesture=null;return true}
  function assertGesture(t){return !!gesture&&same(gesture,t)}
  function acquireFocus(owner,{parentLeaseId=null,restoreKey=null,scope=null}={}){if(!owner)throw err('PROMETEO_OWNER_REQUIRED','Focus owner is required');const parent=focusStack.at(-1)||null;if(parent){if(!parentLeaseId||parentLeaseId!==parent.id)throw err('PROMETEO_FOCUS_PARENT_REQUIRED','Nested focus lease must name the current top lease as parent',{currentTop:parent.id,parentLeaseId})}else if(parentLeaseId){throw err('PROMETEO_FOCUS_PARENT_STALE','Focus parent does not exist',{parentLeaseId})}const lease=token('focus',owner,{parentLeaseId,restoreKey,scope});focusStack.push(lease);return lease}
  function releaseFocus(lease){if(!lease||lease.generation!==generation)return{released:false,stale:true,restoreKey:null};const top=focusStack.at(-1)||null;if(!top||!same(top,lease))throw err('PROMETEO_FOCUS_LEASE_ORDER','Focus leases must release in LIFO order',{top:top?.id??null,requested:lease.id});focusStack.pop();return{released:true,stale:false,restoreKey:lease.restoreKey??null,parent:focusStack.at(-1)||null}}
  function hasFocusLease(lease){return lease?.generation===generation&&focusStack.some(x=>same(x,lease))}
  function invalidate(reason='generation-change'){const previous={generation,gesture,focus:[...focusStack],reason};generation+=1;gesture=null;focusStack.length=0;return previous}
  function snapshot(){return Object.freeze({generation,gesture,focus:[...focusStack]})}
  global.PrometeoOwnership=Object.freeze({version:'1.0.0-candidate',acquireGesture,releaseGesture,assertGesture,acquireFocus,releaseFocus,hasFocusLease,invalidate,snapshot});
})(typeof globalThis!=='undefined'?globalThis:window);
