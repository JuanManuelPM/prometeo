/* Prometeo V53 Shell Adapter v1 — CANDIDATE
   Adapts the EXISTING V53 terminal + return tooth to the Universal Shell contract.
   It creates no visible shell, no second Back handler, and does not own V53 physics.
*/
((global)=>{
  'use strict';
  if(global.PrometeoV53ShellAdapter) return;

  const BUILD='PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901';
  const PERSIST_NS='navigator';
  const PERSIST_ID='v53-semantic-state';
  let singleton=null;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const clone=v=>structuredClone(v);
  function api(){return global.__PROMETEO_V53__||null;}
  function build(){return global.__PROMETEO_BUILD__||null;}
  function terminalOpen(){return !!document.querySelector('.vertical-card[data-node-kind="page"].is-front .terminal');}
  function terminalElement(){return document.querySelector('.vertical-card[data-node-kind="page"].is-front .terminal')||null;}
  function gripElement(){return document.querySelector('.vertical-card[data-node-kind="page"].is-front .return-tooth')||null;}
  function frameElement(){return document.querySelector('.vertical-card[data-node-kind="page"].is-front .terminal-frame')||null;}

  async function waitReady(timeout=10000){
    const start=Date.now();
    while(Date.now()-start<timeout){
      if(api()&&typeof api().getState==='function'&&build()===BUILD)return api();
      await sleep(20);
    }
    const e=new Error(`V53 runtime not ready or wrong build: ${build()}`);e.code='PROMETEO_V53_NOT_READY';throw e;
  }
  async function waitIdle(timeout=5000){
    const start=Date.now();
    while(Date.now()-start<timeout){
      const a=api(); if(a?.getState?.().state==='IDLE')return a.getState();
      await sleep(16);
    }
    const e=new Error('V53 did not return to IDLE');e.code='PROMETEO_V53_IDLE_TIMEOUT';throw e;
  }

  function semanticSnapshot(){
    const a=api(); if(!a)return null;
    const s=a.getState();
    return {
      schema:'prometeo.v53-semantic-return/v1',
      build:BUILD,
      currentNode:s.currentNode,
      path:[...(s.path||[])],
      selectedIndex:s.selectedIndex||0,
      selected:s.selected||null,
      paletteOffset:s.paletteOffset||0,
      history:(s.history||[]).map(x=>({node:x.node,selectedIndex:x.selectedIndex||0,paletteOffset:x.paletteOffset||0})),
      terminalOpen:terminalOpen(),
      capturedAt:new Date().toISOString()
    };
  }

  async function setSelectedIndex(target){
    const a=api(); if(!a)throw new Error('V53 unavailable');
    target=Math.max(0,Number(target)||0);
    let guard=0;
    while(guard++<100){
      const s=await waitIdle();
      if(s.selectedIndex===target)return s;
      if(s.selectedIndex<target)a.down(); else a.up();
      await waitIdle();
    }
    const e=new Error(`Could not reach selected index ${target}`);e.code='PROMETEO_V53_INDEX_RESTORE_FAILED';throw e;
  }

  async function restoreSemantic(snapshot,{strictBuild=true}={}){
    const a=await waitReady();
    if(!snapshot||snapshot.schema!=='prometeo.v53-semantic-return/v1')throw new Error('Invalid V53 semantic snapshot');
    if(strictBuild&&snapshot.build!==BUILD){const e=new Error('Snapshot build mismatch');e.code='PROMETEO_V53_SNAPSHOT_BUILD_MISMATCH';throw e;}

    // Normalize to Home using V53's own approved BACK/vertical normalization path.
    let guard=0;
    while(!a.home()&&guard++<80){a.left();await waitIdle();}
    if(!a.home()){const e=new Error('Could not normalize V53 to Home');e.code='PROMETEO_V53_HOME_RESTORE_FAILED';throw e;}

    // History is a semantic route recipe. Each step records the selected child
    // in the world from which RIGHT was committed. No pixel coordinates are used.
    for(const step of snapshot.history||[]){
      const current=await waitIdle();
      if(step.node&&current.currentNode!==step.node){
        const e=new Error(`Restore route mismatch: at ${current.currentNode}, expected ${step.node}`);
        e.code='PROMETEO_V53_ROUTE_RESTORE_MISMATCH';throw e;
      }
      await setSelectedIndex(step.selectedIndex||0);
      a.right();
      await waitIdle();
    }
    await setSelectedIndex(snapshot.selectedIndex||0);
    const restored=semanticSnapshot();
    if(snapshot.currentNode&&restored.currentNode!==snapshot.currentNode){
      const e=new Error(`Restore target mismatch: ${restored.currentNode} != ${snapshot.currentNode}`);
      e.code='PROMETEO_V53_TARGET_RESTORE_MISMATCH';throw e;
    }
    return restored;
  }

  function mount({persist=true,restore=false}={}){
    if(singleton)return singleton;
    const O=global.PrometeoOwnership||null;
    const P=global.PrometeoPersistence||null;
    let gestureToken=null,terminalLease=null,lastSerialized='',saveTimer=0,destroyed=false;

    function currentFocusParent(){const s=O?.snapshot?.();return s?.focus?.at(-1)||null;}
    function syncTerminalLease(){
      if(destroyed||!O)return;
      const open=terminalOpen();
      if(open&&!terminalLease){
        const parent=currentFocusParent();
        try{terminalLease=O.acquireFocus('v53.terminal',{parentLeaseId:parent?.id||null,restoreKey:'v53:navigator',scope:'terminal-page'});}catch(e){
          if(e.code!=='PROMETEO_FOCUS_PARENT_REQUIRED')throw e;
        }
      }else if(!open&&terminalLease){
        try{O.releaseFocus(terminalLease);terminalLease=null;}catch(e){
          // A nested service (e.g. PageKit) must release before terminal BACK.
          if(e.code!=='PROMETEO_FOCUS_LEASE_ORDER')throw e;
        }
      }
    }

    function persistNow(){
      if(!persist||!P||destroyed)return null;
      const snap=semanticSnapshot();if(!snap)return null;
      const raw=JSON.stringify(snap);if(raw===lastSerialized)return null;
      lastSerialized=raw;
      return P.write(PERSIST_NS,PERSIST_ID,snap,{version:'1',privacy:'LOCAL',meta:{build:BUILD,kind:'semantic-return'}});
    }
    function schedulePersist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{persistNow();}catch(e){console.warn('[Prometeo V53 persistence]',e);}},80);}
    function sync(){syncTerminalLease();schedulePersist();}

    function onPointerDown(e){
      if(!O||gestureToken)return;
      const grip=e.target?.closest?.('.return-tooth');
      const world=e.target?.closest?.('.world');
      if(!grip&&!world)return;
      // iframe page interactions belong to the page itself and do not bubble here.
      const owner=grip?'v53.return-grip':'v53.navigator';
      try{gestureToken=O.acquireGesture(owner,{pointerId:e.pointerId,scope:grip?'back':'spatial-navigation'});}catch(err){
        if(err.code!=='PROMETEO_INPUT_OWNER_CONFLICT')throw err;
      }
    }
    function onPointerEnd(){if(gestureToken&&O){O.releaseGesture(gestureToken);gestureToken=null;}sync();}

    document.addEventListener('pointerdown',onPointerDown,true);
    document.addEventListener('pointerup',onPointerEnd,true);
    document.addEventListener('pointercancel',onPointerEnd,true);
    const mo=new MutationObserver(sync);mo.observe(document.getElementById('worldStage')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
    global.addEventListener('resize',schedulePersist,{passive:true});
    global.addEventListener?.('prometeo:focus-stack-changed',sync);

    const exposed=Object.freeze({
      version:'1.0.0-candidate',
      kind:'V53_EXISTING_SHELL_ADAPTER',
      build:BUILD,
      createsVisibleShell:false,
      usesExistingTerminal:true,
      usesExistingGrip:true,
      semanticSnapshot,
      restoreSemantic,
      persistNow,
      reconcile:sync,
      status:()=>({build:build(),ready:!!api(),terminalOpen:terminalOpen(),hasTerminal:!!terminalElement(),hasGrip:!!gripElement(),hasFrame:!!frameElement(),focusLease:terminalLease?.id||null,gestureOwner:gestureToken?.owner||null}),
      destroy:()=>{destroyed=true;clearTimeout(saveTimer);mo.disconnect();document.removeEventListener('pointerdown',onPointerDown,true);document.removeEventListener('pointerup',onPointerEnd,true);document.removeEventListener('pointercancel',onPointerEnd,true);global.removeEventListener?.('prometeo:focus-stack-changed',sync);if(gestureToken&&O)O.releaseGesture(gestureToken);gestureToken=null;if(terminalLease&&O){try{O.releaseFocus(terminalLease);}catch{}}terminalLease=null;singleton=null;}
    });
    singleton=exposed;
    global.__PROMETEO_SHELL__=exposed;

    // Optional durable restore. Fail closed on a different build or corrupt state.
    if(restore&&P){
      queueMicrotask(async()=>{
        try{
          const saved=P.read(PERSIST_NS,PERSIST_ID,{version:'1',defaultValue:null});
          if(saved&&saved.build===BUILD)await restoreSemantic(saved);
        }catch(e){console.warn('[Prometeo V53 restore skipped]',e);}
        sync();
      });
    }else queueMicrotask(sync);
    return exposed;
  }

  global.PrometeoV53ShellAdapter=Object.freeze({version:'1.0.0-candidate',BUILD,waitReady,semanticSnapshot,restoreSemantic,mount,get:()=>singleton});
})(typeof globalThis!=='undefined'?globalThis:window);
