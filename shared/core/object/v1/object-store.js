(function(global){
  "use strict";
  const Core=global.PrometeoObject;
  const Registry=global.PrometeoSchemaRegistry;
  if(!Core||!Registry)throw new Error("PrometeoObject and PrometeoSchemaRegistry must load before ObjectStore");

  const DEFAULT_KEY="prometeo-object-store-v1";

  function createStore(options={}){
    const key=options.key||DEFAULT_KEY;
    const listeners=new Set();
    let state=load();

    function empty(){return {schemaVersion:Core.SCHEMA_VERSION,updatedAt:new Date().toISOString(),objects:{}}}
    function load(){
      try{
        const raw=global.localStorage?.getItem(key);
        if(!raw)return empty();
        const parsed=JSON.parse(raw);
        if(parsed.schemaVersion!==Core.SCHEMA_VERSION)return empty();
        if(!parsed.objects||typeof parsed.objects!=="object")return empty();
        return parsed;
      }catch{return empty()}
    }
    function persist(){
      state.updatedAt=new Date().toISOString();
      global.localStorage?.setItem(key,JSON.stringify(state));
      listeners.forEach(fn=>fn(snapshot()));
    }
    function snapshot(){return Core.clone(state)}
    function get(id){return state.objects[id]?Core.clone(state.objects[id]):null}
    function all(){return Object.values(state.objects).map(Core.clone)}
    function put(input,{recordAction=true}={}){
      const object=Core.normalize(input);
      const checked=Registry.validate(object);
      if(!checked.ok)throw new Error(`invalid object: ${checked.errors.join(", ")}`);
      const prior=state.objects[object.id];
      const next=recordAction&&prior?Core.record(object,"updated"):object;
      state.objects[next.id]=next;persist();return Core.clone(next);
    }
    function create(type,input={}){return put(Registry.create(type,input),{recordAction:false})}
    function patch(id,patch){
      const prior=state.objects[id];if(!prior)throw new Error(`object not found: ${id}`);
      const next=Core.record(Core.withPatch(prior,patch),"updated",{fields:Object.keys(patch)});
      return put(next,{recordAction:false});
    }
    function remove(id,{hard=false}={}){
      const prior=state.objects[id];if(!prior)return null;
      if(hard){delete state.objects[id];persist();return Core.clone(prior)}
      return patch(id,{status:"archived"});
    }
    function query(criteria={}){
      return all().filter(object=>{
        if(criteria.type&&object.type!==criteria.type)return false;
        if(criteria.status&&object.status!==criteria.status)return false;
        if(criteria.capability&&!Core.has(object,criteria.capability))return false;
        if(criteria.collection&&!object.collections.includes(criteria.collection))return false;
        if(criteria.tag&&!object.tags.includes(criteria.tag))return false;
        if(typeof criteria.where==="function"&&!criteria.where(object))return false;
        return true;
      });
    }
    function transact(fn){
      const before=snapshot();
      try{
        const api={get,all,create,put,patch,remove,query};
        const result=fn(api);
        return result;
      }catch(error){state=before;throw error}
    }
    function subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn)}
    function exportState(){return snapshot()}
    function importState(next){
      if(!next||next.schemaVersion!==Core.SCHEMA_VERSION||typeof next.objects!=="object")throw new Error("invalid store state");
      Object.values(next.objects).forEach(object=>{const v=Registry.validate(object);if(!v.ok)throw new Error(`invalid imported object ${object.id}`)});
      state=Core.clone(next);persist();return snapshot();
    }
    return Object.freeze({key,get,all,create,put,patch,remove,query,transact,subscribe,exportState,importState});
  }

  global.PrometeoObjectStore=Object.freeze({DEFAULT_KEY,createStore});
})(window);
