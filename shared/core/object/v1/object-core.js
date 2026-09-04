(function(global){
  "use strict";

  const SCHEMA_VERSION=1;
  const CAPABILITIES=Object.freeze([
    "temporal","actionable","repeatable","financial","social","trackable","content"
  ]);
  const STATUSES=Object.freeze([
    "idea","planned","active","waiting","done","cancelled","archived","paused"
  ]);

  function nowISO(){return new Date().toISOString()}
  function uid(prefix="obj"){
    if(global.crypto&&typeof global.crypto.randomUUID==="function")return `${prefix}-${global.crypto.randomUUID()}`;
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
  function uniqueStrings(values){return [...new Set((values||[]).filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim()))]}

  function normalizeCapabilityBlock(name,value){
    if(value==null||value===false)return null;
    if(value===true)return {};
    if(typeof value!=="object"||Array.isArray(value))throw new TypeError(`Capability ${name} must be an object, true, false or null`);
    return clone(value);
  }

  function create(input={}){
    const createdAt=input.createdAt||nowISO();
    const object={
      schemaVersion:SCHEMA_VERSION,
      id:input.id||uid(input.type||"obj"),
      type:String(input.type||"note"),
      title:String(input.title||"").trim(),
      status:STATUSES.includes(input.status)?input.status:"active",
      createdAt,
      updatedAt:input.updatedAt||createdAt,
      tags:uniqueStrings(input.tags),
      collections:uniqueStrings(input.collections),
      relations:Array.isArray(input.relations)?clone(input.relations):[],
      notes:Array.isArray(input.notes)?clone(input.notes):[],
      links:Array.isArray(input.links)?clone(input.links):[],
      attachments:Array.isArray(input.attachments)?clone(input.attachments):[],
      capabilities:{},
      history:Array.isArray(input.history)?clone(input.history):[]
    };
    const caps=input.capabilities||{};
    CAPABILITIES.forEach(name=>{
      const block=normalizeCapabilityBlock(name,caps[name]);
      if(block!==null)object.capabilities[name]=block;
    });
    if(!object.history.length)object.history.push({at:createdAt,action:"created"});
    return object;
  }

  function normalize(input={}){
    const base=create(input);
    base.id=String(input.id||base.id);
    base.schemaVersion=SCHEMA_VERSION;
    base.updatedAt=input.updatedAt||base.updatedAt;
    return base;
  }

  function validateCore(object){
    const errors=[];
    if(!object||typeof object!=="object")return {ok:false,errors:["object_required"]};
    if(!object.id)errors.push("id_required");
    if(!object.type)errors.push("type_required");
    if(typeof object.title!=="string")errors.push("title_must_be_string");
    if(!STATUSES.includes(object.status))errors.push("invalid_status");
    if(!object.capabilities||typeof object.capabilities!=="object")errors.push("capabilities_required");
    else Object.keys(object.capabilities).forEach(name=>{if(!CAPABILITIES.includes(name))errors.push(`unknown_capability:${name}`)});
    return {ok:errors.length===0,errors};
  }

  function withPatch(object,patch={}){
    const next=normalize({...clone(object),...clone(patch),id:object.id,createdAt:object.createdAt,updatedAt:nowISO()});
    next.history=Array.isArray(object.history)?clone(object.history):[];
    return next;
  }

  function record(object,action,detail){
    const next=clone(object);
    next.updatedAt=nowISO();
    next.history=Array.isArray(next.history)?next.history:[];
    next.history.push({at:next.updatedAt,action:String(action),...(detail===undefined?{}:{detail:clone(detail)})});
    return next;
  }

  function has(object,capability){return !!object?.capabilities?.[capability]}

  global.PrometeoObject=Object.freeze({
    SCHEMA_VERSION,CAPABILITIES,STATUSES,uid,clone,create,normalize,validateCore,withPatch,record,has
  });
})(window);
