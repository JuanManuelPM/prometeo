(function(global){
  "use strict";
  const Core=global.PrometeoObject;
  if(!Core)throw new Error("PrometeoObject must load before SchemaRegistry");

  const schemas=new Map();

  function register(schema){
    if(!schema||typeof schema!=="object")throw new TypeError("schema object required");
    const type=String(schema.type||"").trim();
    if(!type)throw new Error("schema.type required");
    const capabilities=[...new Set(schema.capabilities||[])];
    capabilities.forEach(c=>{if(!Core.CAPABILITIES.includes(c))throw new Error(`unknown capability ${c}`)});
    const normalized={
      type,
      version:Number(schema.version)||1,
      capabilities,
      required:[...new Set(schema.required||[])],
      defaults:Core.clone(schema.defaults||{}),
      actions:[...new Set(schema.actions||[])],
      visualIdentity:schema.visualIdentity||null,
      validate:typeof schema.validate==="function"?schema.validate:null
    };
    schemas.set(type,normalized);
    return normalized;
  }

  function get(type){return schemas.get(type)||null}
  function list(){return [...schemas.values()].map(Core.clone)}
  function supports(type,capability){return !!get(type)?.capabilities.includes(capability)}

  function create(type,input={}){
    const schema=get(type);
    if(!schema)throw new Error(`unknown type: ${type}`);
    const capabilities={...(input.capabilities||{})};
    schema.capabilities.forEach(name=>{if(capabilities[name]==null)capabilities[name]={}});
    return Core.create({...Core.clone(schema.defaults),...Core.clone(input),type,capabilities});
  }

  function validate(object){
    const core=Core.validateCore(object),errors=[...core.errors];
    const schema=get(object?.type);
    if(!schema)return {ok:false,errors:[...errors,"unknown_type"]};
    schema.required.forEach(path=>{
      const value=path.split(".").reduce((acc,key)=>acc?.[key],object);
      if(value===undefined||value===null||value==="")errors.push(`required:${path}`);
    });
    Object.keys(object.capabilities||{}).forEach(cap=>{
      if(!schema.capabilities.includes(cap))errors.push(`capability_not_allowed:${cap}`);
    });
    if(schema.validate){
      const result=schema.validate(object);
      if(Array.isArray(result))errors.push(...result);
      else if(result===false)errors.push("custom_validation_failed");
    }
    return {ok:errors.length===0,errors};
  }

  [
    {type:"task",capabilities:["actionable","temporal"],required:["title"],actions:["complete","reschedule","archive"],visualIdentity:"task"},
    {type:"event",capabilities:["temporal","social"],required:["title","capabilities.temporal"],actions:["reschedule","cancel"],visualIdentity:"event"},
    {type:"habit",capabilities:["repeatable","trackable","temporal"],required:["title"],actions:["log","skip","pause"],visualIdentity:"habit"},
    {type:"project",capabilities:["actionable","content","temporal"],required:["title"],actions:["complete","archive"],visualIdentity:"project"},
    {type:"lesson",capabilities:["temporal","repeatable","financial","social"],required:["title","capabilities.temporal"],actions:["reschedule","cancel","markDone","markPaid"],visualIdentity:"lesson"},
    {type:"expense",capabilities:["financial","temporal","repeatable"],required:["title","capabilities.financial"],actions:["markPaid","archive"],visualIdentity:"expense"},
    {type:"plan",capabilities:["social","temporal","actionable"],required:["title"],actions:["confirm","reschedule","cancel"],visualIdentity:"plan"},
    {type:"note",capabilities:["content"],required:["title"],actions:["archive"],visualIdentity:"note"},
    {type:"course",capabilities:["content","temporal","social"],required:["title"],actions:["archive"],visualIdentity:"course"}
  ].forEach(register);

  global.PrometeoSchemaRegistry=Object.freeze({register,get,list,supports,create,validate});
})(window);
