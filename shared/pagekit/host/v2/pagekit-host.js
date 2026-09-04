/* Prometeo PageKit Host v2 — CANDIDATE
   Persistent, version-pinned PageKit service. Close hides; destroy destroys.
*/
((global)=>{
  'use strict';
  if(global.PrometeoPageKitHostV2)return;
  const registry=new Map();
  const scriptBase=new URL('.',document.currentScript?.src||document.baseURI);
  const rootBase=new URL('../../../../',scriptBase);
  const styleHref=new URL('pagekit-host.css',scriptBase).href;
  function ensureStyle(){
    if(!document?.querySelector||!document?.head?.appendChild)return;
    if(document.querySelector('link[data-prometeo-pagekit-host-v2]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=styleHref;l.dataset.prometeoPagekitHostV2='true';document.head.appendChild(l);
  }
  const defaultSources={
    v26:new URL('pages/PROMETEO_CLASS_PLAYER_ULTIMA_VERSION_BUENA_v26.html',rootBase).href,
    v37:new URL('pages/PROMETEO_CLASS_PLAYER_v37_LASER_DOT_TRACKING_FIX_CANDIDATE.html',rootBase).href
  };
  function parentLease(){const s=global.PrometeoOwnership?.snapshot?.();return s?.focus?.at(-1)||null;}
  class Host{
    constructor({container,version='v37',stateKey='default',sources={},mode='expanded',onClose=null}={}){
      if(!container)throw new Error('PageKit container required');
      ensureStyle();
      if(registry.has(stateKey))throw Object.assign(new Error(`PageKit stateKey already mounted: ${stateKey}`),{code:'PROMETEO_PAGEKIT_DUPLICATE_STATE_KEY'});
      if(!['v26','v37'].includes(version))throw new Error(`Unsupported PageKit version ${version}`);
      this.container=container;this.version=version;this.stateKey=stateKey;this.src=sources[version]||defaultSources[version];this.onClose=onClose;this.lease=null;this.opened=false;this.loaded=false;this.mode=mode;
      this.root=document.createElement('section');this.root.className='p-pagekit-host-v2';this.root.hidden=true;this.root.dataset.mode=mode;this.root.dataset.version=version;
      this.frame=document.createElement('iframe');this.frame.className='p-pagekit-frame-v2';this.frame.title=`PageKit ${version}`;this.frame.loading='eager';this.frame.src=this.src;this.frame.allow='fullscreen; clipboard-read; clipboard-write';
      this.frame.addEventListener('load',()=>{this.loaded=true;this.root.dispatchEvent(new CustomEvent('prometeo:pagekit-loaded',{detail:this.status}));});
      this.root.appendChild(this.frame);container.appendChild(this.root);registry.set(stateKey,this);
    }
    setMode(mode){if(!['compact','expanded','fullscreen','presentation'].includes(mode))throw new Error(`Invalid PageKit mode ${mode}`);this.mode=mode;this.root.dataset.mode=mode;return this;}
    open({restoreKey=null}={}){
      if(this.opened)return this;
      const O=global.PrometeoOwnership,parent=parentLease();
      if(O)this.lease=O.acquireFocus(`pagekit:${this.stateKey}`,{parentLeaseId:parent?.id||null,restoreKey:restoreKey||`pagekit:${this.stateKey}`,scope:`pagekit:${this.version}`});
      this.root.hidden=false;this.opened=true;this.root.dataset.open='true';this.root.dispatchEvent(new CustomEvent('prometeo:pagekit-open',{detail:this.status}));global.dispatchEvent?.(new CustomEvent('prometeo:focus-stack-changed'));queueMicrotask(()=>{try{this.frame.focus({preventScroll:true});}catch{}});return this;
    }
    close(){if(!this.opened)return {released:false};let release={released:false};if(this.lease&&global.PrometeoOwnership)release=global.PrometeoOwnership.releaseFocus(this.lease);this.lease=null;this.opened=false;this.root.hidden=true;delete this.root.dataset.open;this.root.dispatchEvent(new CustomEvent('prometeo:pagekit-close',{detail:this.status}));global.dispatchEvent?.(new CustomEvent('prometeo:focus-stack-changed'));this.onClose?.(release);return release;}
    destroy(){if(this.opened)this.close();this.root.remove();registry.delete(this.stateKey);}
    get status(){return Object.freeze({version:this.version,stateKey:this.stateKey,src:this.src,mode:this.mode,opened:this.opened,loaded:this.loaded,persistent:true,lease:this.lease?.id||null});}
  }
  global.PrometeoPageKitHostV2=Object.freeze({version:'2.0.0-candidate',create:opts=>new Host(opts),get:key=>registry.get(key)||null,list:()=>[...registry.values()].map(h=>h.status),sources:Object.freeze({...defaultSources})});
})(typeof globalThis!=='undefined'?globalThis:window);
