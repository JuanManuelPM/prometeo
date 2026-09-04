/* Prometeo PageKit Host v1 — CANDIDATE
   Keeps PageKit exact artifacts external and version-pinned. The host owns mounting,
   visibility and focus lease; PageKit owns board/tools/content interactions.
*/
((global)=>{
  'use strict';
  if(global.PrometeoPageKitHost) return;
  const instances=new Map();
  const SCRIPT_BASE=new URL('.',document.currentScript?.src||document.baseURI);
  const ROOT_BASE=new URL('../../../../',SCRIPT_BASE);

  function resolveSource(version,sources={}){
    if(sources[version]) return sources[version];
    if(version==='v26') return new URL('pages/PROMETEO_CLASS_PLAYER_ULTIMA_VERSION_BUENA_v26.html',ROOT_BASE).href;
    if(version==='v37') return new URL('pages/PROMETEO_CLASS_PLAYER_v37_LASER_DOT_TRACKING_FIX_CANDIDATE.html',ROOT_BASE).href;
    throw new Error(`Unsupported PageKit version ${version}`);
  }

  class Host {
    constructor({container,version='v37',stateKey='default',sources={},owner='pagekit',onClose=null}={}){
      if(!container) throw new Error('PageKit container required');
      this.container=container; this.version=version; this.stateKey=stateKey; this.owner=owner; this.onClose=onClose;
      this.src=resolveSource(version,sources); this.lease=null; this.opened=false;
      this.root=document.createElement('section');
      this.root.className='p-pagekit-host'; this.root.hidden=true;
      this.root.innerHTML=`<iframe class="p-pagekit-frame" title="Pizarra PageKit ${version}" loading="eager"></iframe>`;
      this.frame=this.root.querySelector('iframe');
      this.frame.src=this.src;
      container.appendChild(this.root);
      instances.set(stateKey,this);
    }
    open({parentLeaseId=null,restoreKey=null}={}){
      if(this.opened) return this;
      const O=global.PrometeoOwnership;
      if(O) this.lease=O.acquireFocus(this.owner,{parentLeaseId,restoreKey:restoreKey||`pagekit:${this.stateKey}`,scope:`pagekit:${this.version}`});
      this.root.hidden=false; this.opened=true;
      this.root.dataset.open='true';
      try{this.frame.focus({preventScroll:true});}catch{}
      return this;
    }
    close(){
      if(!this.opened) return {released:false,restoreKey:null};
      let released={released:false,restoreKey:null};
      if(this.lease&&global.PrometeoOwnership){released=global.PrometeoOwnership.releaseFocus(this.lease);}
      this.lease=null; this.opened=false; this.root.hidden=true; delete this.root.dataset.open;
      this.onClose?.(released); return released;
    }
    destroy(){if(this.opened)this.close(); this.root.remove(); instances.delete(this.stateKey);}
    get status(){return Object.freeze({version:this.version,stateKey:this.stateKey,src:this.src,opened:this.opened,loaded:!!this.frame.contentWindow});}
  }

  global.PrometeoPageKitHost=Object.freeze({version:'1.0.0-candidate',create:opts=>new Host(opts),get:key=>instances.get(key)||null});
})(typeof globalThis!=='undefined'?globalThis:window);
