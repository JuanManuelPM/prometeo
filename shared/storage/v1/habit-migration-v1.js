/* Prometeo habit migration v1
   Moves the legacy habit-history object into append-only PrometeoDB behavior events.
   Safe to run repeatedly: migrated event ids and the snapshot id are deterministic.
*/
(function(root){
  'use strict';

  const LEGACY_KEY='prometeo-preview-habit-traces-v7';
  const MARKER_KEY='migration.habits.localStorage-v7-to-behavior-events.v1';
  const SNAPSHOT_ID='migration-habits-localstorage-v7-precutover-v1';
  const MIGRATION_ID='habits-localStorage-v7-to-behavior-events-v1';

  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));

  function normalizeLegacy(input){
    const out={};
    if(!input||typeof input!=='object'||Array.isArray(input))return out;
    for(const [tracker,value] of Object.entries(input)){
      if(!value||typeof value!=='object'||Array.isArray(value)){out[tracker]={};continue}
      out[tracker]={};
      for(const [date,state] of Object.entries(value)){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
        const s=String(state||'').trim();
        if(!s||s==='unknown')continue;
        out[tracker][date]=s;
      }
    }
    return out;
  }

  function entries(input){
    const legacy=normalizeLegacy(input),rows=[];
    for(const tracker of Object.keys(legacy).sort()){
      for(const date of Object.keys(legacy[tracker]).sort()){
        rows.push({tracker_id:tracker,date,state:legacy[tracker][date]});
      }
    }
    return rows;
  }

  function migrationEventId(tracker,date){return `migr-habits-v1:${tracker}:${date}`}
  function createdAtForDate(date){return `${date}T12:00:00.000Z`}

  function canonicalJSON(input){
    const legacy=normalizeLegacy(input),ordered={};
    for(const tracker of Object.keys(legacy).sort()){
      ordered[tracker]={};
      for(const date of Object.keys(legacy[tracker]).sort())ordered[tracker][date]=legacy[tracker][date];
    }
    return JSON.stringify(ordered);
  }

  function digest(input){
    const text=canonicalJSON(input);let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return `fnv1a32:${(h>>>0).toString(16).padStart(8,'0')}`;
  }

  function isConstraint(error){return error?.name==='ConstraintError'||/constraint/i.test(String(error?.message||''))}

  async function project(options={}){
    if(!root.PrometeoDB)throw new Error('PrometeoDB is required');
    const dbOptions=options.dbName?{name:options.dbName}:{};
    const seedKeys=Array.isArray(options.seedKeys)?options.seedKeys:[];
    const out={};seedKeys.forEach(k=>out[String(k)]={});
    const events=await root.PrometeoDB.behaviorEvents({},dbOptions);
    for(const event of events){
      const tracker=String(event.tracker_id),date=String(event.date),state=String(event.state);
      if(!out[tracker])out[tracker]={};
      if(state==='unknown')delete out[tracker][date];
      else out[tracker][date]=state;
    }
    return out;
  }

  async function verifyLegacy(input,options={}){
    const legacy=normalizeLegacy(input),projected=await project({dbName:options.dbName,seedKeys:Object.keys(legacy)});
    const expected=canonicalJSON(legacy),actual=canonicalJSON(projected);
    return {ok:expected===actual,expected_digest:digest(legacy),actual_digest:digest(projected),projected};
  }

  async function migrate(input,options={}){
    if(!root.PrometeoDB)throw new Error('PrometeoDB is required');
    const dbOptions=options.dbName?{name:options.dbName}:{};
    const legacy=normalizeLegacy(input);
    const previousMarker=await root.PrometeoDB.getMeta(MARKER_KEY,null,dbOptions);
    if(previousMarker?.verified===true){
      return {status:'already-verified',marker:previousMarker,legacy:clone(legacy)};
    }

    const snapshots=await root.PrometeoDB.listSnapshots(dbOptions);
    if(!snapshots.some(x=>x.id===SNAPSHOT_ID)){
      try{
        await root.PrometeoDB.createSnapshot({
          schema:'prometeo.habit-legacy-snapshot/v1',
          migration:MIGRATION_ID,
          legacy_key:LEGACY_KEY,
          habit_history:legacy,
          companion_preferences:clone(options.companionPreferences||{})
        },{...dbOptions,id:SNAPSHOT_ID,kind:'pre-habit-cutover'});
      }catch(error){if(!isConstraint(error))throw error}
    }

    let added=0,existing=0;
    for(const row of entries(legacy)){
      try{
        await root.PrometeoDB.appendBehaviorEvent({
          id:migrationEventId(row.tracker_id,row.date),
          tracker_id:row.tracker_id,
          date:row.date,
          state:row.state,
          source:'migration',
          created_at:createdAtForDate(row.date),
          metadata:{migration:MIGRATION_ID,legacy_key:LEGACY_KEY}
        },dbOptions);
        added++;
      }catch(error){if(isConstraint(error))existing++;else throw error}
    }

    const verification=await verifyLegacy(legacy,{dbName:options.dbName});
    if(!verification.ok)throw new Error(`Habit migration verification failed (${verification.expected_digest} != ${verification.actual_digest})`);

    const marker={
      schema:'prometeo.migration-marker/v1',
      migration:MIGRATION_ID,
      verified:true,
      verified_at:new Date().toISOString(),
      legacy_key:LEGACY_KEY,
      legacy_digest:verification.expected_digest,
      migrated_records:entries(legacy).length,
      added_records:added,
      preexisting_records:existing,
      rollback_snapshot_id:SNAPSHOT_ID
    };
    await root.PrometeoDB.setMeta(MARKER_KEY,marker,dbOptions);
    return {status:'migrated-and-verified',marker,legacy:clone(legacy)};
  }

  root.PrometeoHabitMigration=Object.freeze({
    legacyKey:LEGACY_KEY,
    markerKey:MARKER_KEY,
    snapshotId:SNAPSHOT_ID,
    migrationId:MIGRATION_ID,
    normalizeLegacy,
    entries,
    digest,
    project,
    verifyLegacy,
    migrate
  });
})(typeof window!=='undefined'?window:globalThis);
