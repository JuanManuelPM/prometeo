// Candidate extension of Widget API v1. No shell, activation pointer or scheduler.
const ID=/^[a-z][a-z0-9-]{0,63}$/;
const VERSION=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RANGE=/^\^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const error=code=>Object.assign(new Error(code),{code});
export function compatible(version,range){
  if(!VERSION.test(version||'')||!RANGE.test(range||''))return false;
  const v=version.split('.').map(Number),r=range.slice(1).split('.').map(Number);
  if(v[0]!==r[0])return false;
  if(r[0]===0&&(v[1]!==r[1]||(r[1]===0&&v[2]!==r[2])))return false;
  return v[1]>r[1]||(v[1]===r[1]&&v[2]>=r[2]);
}
export function validateManifest(m){
  if(!m||m.schema!=='prometeo.widget-cartridge/v1'||!ID.test(m.id)||!VERSION.test(m.version)||
     !compatible('1.0.0',m.widgetApi)||m.trust!=='TRUSTED_LOCAL'||
     !/^\.\/[a-zA-Z0-9_.-]+\.js$/.test(m.entry||'')||
     !m.requires||!m.requires.services||typeof m.requires.services!=='object'||Array.isArray(m.requires.services)||
     !Array.isArray(m.requires.plugins)||!m.permissions||
     !Array.isArray(m.permissions.network)||!Array.isArray(m.permissions.storage)||
     !Number.isSafeInteger(m.state?.currentVersion)||m.state.currentVersion<1||
     !Array.isArray(m.state.readableVersions)||!m.state.readableVersions.includes(m.state.currentVersion))throw error('MANIFEST_INVALID');
  for(const [name,range] of Object.entries(m.requires.services))if(!/^[a-z][a-z0-9_.-]+$/.test(name)||!RANGE.test(range))throw error('CAPABILITY_CONTRACT_INVALID');
  if(m.requires.plugins.some(x=>!ID.test(x))||new Set(m.requires.plugins).size!==m.requires.plugins.length||
     m.permissions.storage.some(x=>x!==`widget:${m.id}`)||
     m.permissions.network.some(x=>typeof x!=='string'||!ID.test(x))||
     m.state.readableVersions.some(x=>!Number.isSafeInteger(x)||x<1))throw error('MANIFEST_SCOPE_INVALID');
  return structuredClone(m);
}
// The owner supplies current composition. Discovery means availability only.
export function compileCatalog(manifests,composition){
  const byId=new Map();
  for(const raw of manifests){const m=validateManifest(raw);if(byId.has(m.id))throw error('DUPLICATE_CARTRIDGE');byId.set(m.id,m)}
  const seen=new Set(),stack=new Set(),ordered=[];
  function visit(id){
    if(seen.has(id))return;if(stack.has(id))throw error('DEPENDENCY_CYCLE');
    const m=byId.get(id);if(!m)throw error('DEPENDENCY_MISSING');stack.add(id);
    m.requires.plugins.forEach(visit);stack.delete(id);seen.add(id);ordered.push(m);
  }
  const active=composition.widgets.map(x=>x.id);
  // Legacy widgets remain handled by the existing kernel and explicit scripts.
  active.filter(id=>byId.has(id)).forEach(visit);
  return {schema:'prometeo.cartridge-catalog-candidate/v1',authority:'AVAILABILITY_ONLY',
    available:[...byId.values()].sort((a,b)=>a.id.localeCompare(b.id)),
    loadOrder:ordered.map(m=>m.id),legacy:active.filter(id=>!byId.has(id))};
}
export function readCompatibleState(envelope,manifest,adapters={}){
  const m=validateManifest(manifest),raw=structuredClone(envelope);
  if(!m.state.readableVersions.includes(raw?.version))throw error('STATE_VERSION_UNREADABLE');
  if(raw.version===m.state.currentVersion)return {version:raw.version,data:raw.data};
  const read=adapters[raw.version];if(typeof read!=='function')throw error('STATE_ADAPTER_REQUIRED');
  return {version:m.state.currentVersion,data:read(structuredClone(raw.data))};
}
export function createLifetime(){
  const controller=new AbortController(),cleanups=[];let disposed=false;
  return Object.freeze({signal:controller.signal,
    own(cleanup){if(typeof cleanup!=='function')throw error('CLEANUP_INVALID');if(disposed)cleanup();else cleanups.push(cleanup)},
    dispose(){if(disposed)return;disposed=true;controller.abort();while(cleanups.length){try{cleanups.pop()()}catch{}}}
  });
}
export function registerCartridge(kernel,raw,module,{resolve,grants}){
  const m=validateManifest(raw);
  if(module.id!==m.id||module.widgetApi!==1||typeof module.render!=='function')throw error('MODULE_CONTRACT_INVALID');
  for(const type of ['network','storage'])if(m.permissions[type].some(x=>!grants?.[type]?.includes(x)))throw error('CAPABILITY_DENIED');
  // Resolve existing owner capabilities per use, so accepted compatible patches
  // reach all consumers without rewriting state or copying implementations.
  function context(ctx){const capabilities={};for(const [name,range] of Object.entries(m.requires.services)){
    const service=resolve(name);if(!service||!compatible(service.version,range))throw error('CAPABILITY_UNAVAILABLE');
    capabilities[name]=service.api;
  }return {...ctx,capabilities:Object.freeze(capabilities)}}
  context({});let lifetime=null;
  const wrapped={...module,css:'',render:()=>`<div data-cartridge-host="${m.id}"></div>`,
    afterRender(ctx){lifetime?.dispose();lifetime=createLifetime();
      const host=ctx.root?.querySelector(`[data-cartridge-host="${m.id}"]`);if(!host){lifetime.dispose();return}
      const shadow=host.shadowRoot||host.attachShadow({mode:'open'});
      const style=host.ownerDocument.createElement('style');style.textContent=module.css||'';
      const content=host.ownerDocument.createElement('div');shadow.replaceChildren(style,content);
      const scoped={...context(ctx),root:content,resources:lifetime};
      try{content.innerHTML=module.render(scoped);module.afterRender?.(scoped)}catch(e){content.textContent=`Cartucho no disponible: ${e.code||'RENDER_FAILED'}`;lifetime.dispose()}
      // Native observation only owns cleanup, not task scheduling or liveness.
      const observer=new MutationObserver(()=>{if(!host.isConnected)lifetime?.dispose()});
      observer.observe(host.ownerDocument.body,{childList:true,subtree:true});lifetime.own(()=>observer.disconnect());
    },
    actions:(module.actions||[]).map(a=>({...a,run:ctx=>a.run(context(ctx))})),
    dispose(){lifetime?.dispose();module.dispose?.()}
  };
  kernel.registerWidget(wrapped);return wrapped;
}
// Shadow DOM contains CSS, not arbitrary JavaScript. Only owner-approved local
// modules can use this adapter. External/untrusted iframe sandbox is not built.
