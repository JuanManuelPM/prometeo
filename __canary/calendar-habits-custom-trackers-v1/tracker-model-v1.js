(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PrometeoHabitTrackerModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const SCHEMA='prometeo.habit-tracker-config/v1';
  const STORAGE_KEY='prometeo-habit-tracker-config-v1';
  const META_KEY='habits.tracker-config.v1';
  const KINDS=new Set(['avoid','negative','positive']);
  const GROUP_LABELS={addictions:'Adicciones',avoid:'Evitar',routine:'Rutina',extras:'Extras',other:'Otros'};
  const LEGACY={
    youtube:{label:'YouTube',group:'addictions',kind:'avoid'},
    weed:{label:'Marihuana',group:'addictions',kind:'avoid'},
    smoking:{label:'Cigarrillos',group:'addictions',kind:'avoid'},
    food:{label:'Comer mal',group:'routine',kind:'negative'},
    sleep:{label:'Dormir mal',group:'routine',kind:'negative'},
    meds:{label:'Pastillas mal',group:'routine',kind:'negative'},
    train:{label:'Entrenar',group:'extras',kind:'positive'},
    study:{label:'Estudio',group:'extras',kind:'positive'},
    mood:{label:'Buen humor',group:'extras',kind:'positive'},
    productive:{label:'Productivo',group:'extras',kind:'positive'}
  };
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const nowIso=()=>new Date().toISOString();
  const cleanText=(value,fallback)=>String(value??'').trim().replace(/\s+/g,' ')||fallback;
  const cleanId=value=>String(value??'').trim().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
  const validKind=value=>KINDS.has(String(value))?String(value):'positive';
  const validGroup=value=>cleanId(value)||'other';
  const genericLabel=id=>id.replace(/^tracker-/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())||'Tracker';

  function normalizeTracker(input,stamp){
    const id=cleanId(input?.id);
    if(!id)return null;
    return {
      id,
      label:cleanText(input?.label,genericLabel(id)).slice(0,80),
      group:validGroup(input?.group),
      kind:validKind(input?.kind),
      archived:input?.archived===true,
      source:cleanText(input?.source,'user').slice(0,40),
      created_at:cleanText(input?.created_at,stamp),
      updated_at:cleanText(input?.updated_at,stamp)
    };
  }

  function normalizeConfig(input,stamp=nowIso()){
    const seen=new Set(),trackers=[];
    for(const raw of Array.isArray(input?.trackers)?input.trackers:[]){
      const tracker=normalizeTracker(raw,stamp);
      if(!tracker||seen.has(tracker.id))continue;
      seen.add(tracker.id);trackers.push(tracker);
    }
    return {schema:SCHEMA,revision:1,updated_at:cleanText(input?.updated_at,stamp),trackers};
  }

  function observedIds(input){
    if(Array.isArray(input))return [...new Set(input.map(cleanId).filter(Boolean))];
    if(!input||typeof input!=='object')return [];
    return [...new Set(Object.keys(input).map(cleanId).filter(Boolean))];
  }

  function legacyTracker(id,stamp){
    const prior=LEGACY[id];
    return normalizeTracker({
      id,
      label:prior?.label||genericLabel(id),
      group:prior?.group||'other',
      kind:prior?.kind||'positive',
      archived:false,
      source:prior?'legacy-observed':'observed-history',
      created_at:stamp,
      updated_at:stamp
    },stamp);
  }

  function bootstrap(saved,observed,stamp=nowIso()){
    const config=normalizeConfig(saved||{},stamp),byId=new Map(config.trackers.map(t=>[t.id,t]));
    let changed=!saved||saved.schema!==SCHEMA;
    for(const id of observedIds(observed)){
      if(byId.has(id))continue;
      const tracker=legacyTracker(id,stamp);config.trackers.push(tracker);byId.set(id,tracker);changed=true;
    }
    if(changed)config.updated_at=stamp;
    return {config,changed};
  }

  function slug(text){return cleanText(text,'tracker').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'tracker'}
  function randomSuffix(){return Math.random().toString(36).slice(2,8)||Date.now().toString(36).slice(-6)}
  function makeId(label,existing,idFactory){
    if(typeof idFactory==='function'){
      const proposed=cleanId(idFactory(label));
      if(proposed&&!existing.has(proposed))return proposed;
    }
    const base=`tracker-${slug(label)}`;
    let id=base;
    while(existing.has(id))id=`${base}-${randomSuffix()}`;
    return id;
  }

  function mutate(input,fn,stamp=nowIso()){
    const config=normalizeConfig(input,stamp);fn(config);config.updated_at=stamp;return config;
  }

  function add(input,fields={},options={}){
    const stamp=options.now||nowIso(),existing=new Set(normalizeConfig(input,stamp).trackers.map(t=>t.id));
    const label=cleanText(fields.label,'Nuevo tracker').slice(0,80),id=makeId(label,existing,options.idFactory);
    return mutate(input,config=>config.trackers.push(normalizeTracker({id,label,group:fields.group,kind:fields.kind,archived:false,source:'user',created_at:stamp,updated_at:stamp},stamp)),stamp);
  }

  function update(input,id,patch={},stamp=nowIso()){
    id=cleanId(id);
    return mutate(input,config=>{
      const tracker=config.trackers.find(t=>t.id===id);if(!tracker)return;
      if(Object.prototype.hasOwnProperty.call(patch,'label'))tracker.label=cleanText(patch.label,tracker.label).slice(0,80);
      if(Object.prototype.hasOwnProperty.call(patch,'group'))tracker.group=validGroup(patch.group);
      if(Object.prototype.hasOwnProperty.call(patch,'kind'))tracker.kind=validKind(patch.kind);
      tracker.updated_at=stamp;
    },stamp);
  }

  function archive(input,id,archived=true,stamp=nowIso()){
    return mutate(input,config=>{const tracker=config.trackers.find(t=>t.id===cleanId(id));if(tracker){tracker.archived=archived===true;tracker.updated_at=stamp}},stamp);
  }

  function activeTrackers(input){return normalizeConfig(input).trackers.filter(t=>!t.archived).map(clone)}
  function groups(input){
    const used=[];
    for(const tracker of activeTrackers(input))if(!used.includes(tracker.group))used.push(tracker.group);
    return used.map(id=>({id,label:GROUP_LABELS[id]||genericLabel(id)}));
  }
  function exportBundle(input,history={}){
    return {schema:'prometeo.habit-tracker-export/v1',exported_at:nowIso(),config:normalizeConfig(input),history:clone(history||{})};
  }

  return Object.freeze({SCHEMA,STORAGE_KEY,META_KEY,GROUP_LABELS:clone(GROUP_LABELS),normalizeConfig,observedIds,bootstrap,add,update,archive,activeTrackers,groups,exportBundle});
});
