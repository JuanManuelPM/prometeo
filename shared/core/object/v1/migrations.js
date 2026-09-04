(function(global){
  "use strict";
  const CURRENT_VERSION=1;
  const steps=new Map();

  function register(fromVersion,toVersion,fn){
    if(toVersion!==fromVersion+1)throw new Error("migrations must advance exactly one version");
    if(typeof fn!=="function")throw new TypeError("migration function required");
    steps.set(fromVersion,{toVersion,fn});
  }

  function migrate(state,target=CURRENT_VERSION){
    let next=JSON.parse(JSON.stringify(state||{}));
    let version=Number(next.schemaVersion)||0;
    if(version>target)throw new Error(`store version ${version} is newer than supported ${target}`);
    while(version<target){
      const step=steps.get(version);
      if(!step)throw new Error(`missing migration ${version} -> ${version+1}`);
      next=step.fn(next);
      version=step.toVersion;
      next.schemaVersion=version;
    }
    return next;
  }

  /* Version 0 means a raw object array or an empty legacy shell. */
  register(0,1,state=>{
    const objects={};
    const rows=Array.isArray(state)?state:Array.isArray(state?.objects)?state.objects:[];
    rows.forEach(object=>{if(object?.id)objects[object.id]=object});
    return {schemaVersion:1,updatedAt:new Date().toISOString(),objects};
  });

  global.PrometeoMigrations=Object.freeze({CURRENT_VERSION,register,migrate});
})(window);
