(()=>{
  'use strict';

  const LEGACY_KEY='prometeo-preview-habit-traces-v7';
  const MIRROR_KEY='prometeo-db-habit-projection-v31';
  const OUTBOX_KEY='prometeo-db-habit-outbox-v31';
  const GRAPH_KEY='prometeo-preview-habit-graphs-v13';
  const GROUP_KEY='prometeo-preview-habit-groups-v22';
  const START_KEY='prometeo-preview-habit-starts-v24';

  const nativeGet=Storage.prototype.getItem;
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const uuid=()=>crypto?.randomUUID?.()||`habit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let shadow={};
  let dbReady=false;
  let flushPromise=null;
  let patched=false;

  function parseObject(raw,fallback={}){
    try{const x=JSON.parse(raw||'null');return x&&typeof x==='object'&&!Array.isArray(x)?x:fallback}catch{return fallback}
  }
  function rawGet(key){return nativeGet.call(localStorage,key)}
  function rawSet(key,value){return nativeSet.call(localStorage,key,value)}
  function rawRemove(key){return nativeRemove.call(localStorage,key)}
  function legacyState(){return parseObject(rawGet(LEGACY_KEY),{})}
  function mirrorState(){return parseObject(rawGet(MIRROR_KEY),null)}
  function companionPreferences(){return {
    graph_open:parseObject(rawGet(GRAPH_KEY),{}),
    groups_collapsed:parseObject(rawGet(GROUP_KEY),{}),
    tracker_starts:parseObject(rawGet(START_KEY),{})
  }}
  function outbox(){const x=parseObject(rawGet(OUTBOX_KEY),[]);return Array.isArray(x)?x:[]}
  function saveOutbox(rows){rows.length?rawSet(OUTBOX_KEY,JSON.stringify(rows)):rawRemove(OUTBOX_KEY)}
  function saveMirror(){rawSet(MIRROR_KEY,JSON.stringify(shadow))}

  function normalizeState(state){
    const out={};
    if(!state||typeof state!=='object'||Array.isArray(state))return out;
    for(const [tracker,days] of Object.entries(state)){
      out[tracker]={};
      if(!days||typeof days!=='object'||Array.isArray(days))continue;
      for(const [date,value] of Object.entries(days)){
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
        const s=String(value||'unknown');
        if(s!=='unknown')out[tracker][date]=s;
      }
    }
    return out;
  }

  function changedEvents(beforeInput,afterInput){
    const before=normalizeState(beforeInput),after=normalizeState(afterInput),events=[];
    const trackers=new Set([...Object.keys(before),...Object.keys(after)]);
    let seq=0;
    for(const tracker of trackers){
      const dates=new Set([...Object.keys(before[tracker]||{}),...Object.keys(after[tracker]||{})]);
      for(const date of dates){
        const prev=before[tracker]?.[date]??'unknown';
        const next=after[tracker]?.[date]??'unknown';
        if(prev===next)continue;
        const created=new Date(Date.now()+seq++).toISOString();
        events.push({
          id:uuid(),
          tracker_id:tracker,
          date,
          state:next,
          source:'manual',
          created_at:created,
          supersedes_id:null,
          metadata:{writer:'habits-persistence-v31',previous_state:prev}
        });
      }
    }
    return events;
  }

  function enqueue(events){
    if(!events.length)return;
    const rows=outbox();rows.push(...events);saveOutbox(rows);
    queueMicrotask(()=>flushOutbox().catch(()=>{}));
  }

  async function appendQueued(event){
    const previous=await PrometeoDB.dailyBehaviorState(event.tracker_id,event.date);
    const row={...event,supersedes_id:event.supersedes_id||previous?.event?.id||null};
    try{await PrometeoDB.appendBehaviorEvent(row)}
    catch(error){if(error?.name!=='ConstraintError'&&!/constraint/i.test(String(error?.message||'')))throw error}
  }

  async function flushOutbox(){
    if(!dbReady||!window.PrometeoDB)return false;
    if(flushPromise)return flushPromise;
    flushPromise=(async()=>{
      let rows=outbox();
      while(rows.length){
        const current=rows[0];
        await appendQueued(current);
        rows=rows.slice(1);saveOutbox(rows);
      }
      return true;
    })().finally(()=>{flushPromise=null});
    return flushPromise;
  }

  function patchLegacyKey(){
    if(patched)return;patched=true;
    const baseGet=Storage.prototype.getItem;
    const baseSet=Storage.prototype.setItem;
    const baseRemove=Storage.prototype.removeItem;

    Storage.prototype.getItem=function(key){
      if(this===localStorage&&String(key)===LEGACY_KEY)return JSON.stringify(shadow);
      return baseGet.call(this,key);
    };
    Storage.prototype.setItem=function(key,value){
      if(this===localStorage&&String(key)===LEGACY_KEY){
        const next=normalizeState(parseObject(String(value),{}));
        const events=changedEvents(shadow,next);
        shadow=next;saveMirror();enqueue(events);
        return;
      }
      return baseSet.call(this,key,value);
    };
    Storage.prototype.removeItem=function(key){
      if(this===localStorage&&String(key)===LEGACY_KEY){
        const events=changedEvents(shadow,{});shadow={};saveMirror();enqueue(events);return;
      }
      return baseRemove.call(this,key);
    };
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(`Unable to load ${src}`));document.body.appendChild(s);
    });
  }

  async function hydrateFromDB(seed){
    const keys=Object.keys(seed||{});
    shadow=normalizeState(await PrometeoHabitMigration.project({seedKeys:keys}));
    saveMirror();
  }

  async function boot(){
    const legacy=legacyState();
    const mirror=mirrorState();
    shadow=normalizeState(mirror||legacy);
    let mode='mirror-fallback';
    let migration=null;

    try{
      if(!window.PrometeoDB||!window.PrometeoHabitMigration)throw new Error('PrometeoDB runtime unavailable');
      await PrometeoDB.open();dbReady=true;
      migration=await PrometeoHabitMigration.migrate(legacy,{companionPreferences:companionPreferences()});
      await flushOutbox();
      await hydrateFromDB(legacy);
      mode='indexeddb';
    }catch(error){
      console.warn('[Prometeo habits persistence] using durable mirror fallback',error);
      dbReady=false;
      saveMirror();
    }

    patchLegacyKey();
    document.documentElement.dataset.habitPersistence=mode;
    window.PrometeoHabitPersistence=Object.freeze({
      schema:'prometeo.habit-persistence/v31',
      mode,
      legacy_key:LEGACY_KEY,
      mirror_key:MIRROR_KEY,
      outbox_key:OUTBOX_KEY,
      database:window.PrometeoDB?.name||null,
      migration:clone(migration?.marker||null),
      status:()=>({mode,db_ready:dbReady,pending_writes:outbox().length,migration:clone(migration?.marker||null)}),
      flush:()=>flushOutbox(),
      exportDatabase:()=>window.PrometeoDB?.exportAll?.()
    });

    await loadScript('/prometeo/pages/calendar/previews/habits-traces-v1/traces-v24.js?v=20260907-ux24');
    await loadScript('/prometeo/pages/calendar/previews/habits-traces-v1/habits-v26.js?v=20260907-ux26');
    window.dispatchEvent(new CustomEvent('prometeo:habit-persistence-ready',{detail:{mode}}));
  }

  boot().catch(error=>{
    console.error('[Prometeo habits persistence] boot failed',error);
    /* Last-resort compatibility: preserve the existing product rather than blanking Habits. */
    loadScript('/prometeo/pages/calendar/previews/habits-traces-v1/traces-v24.js?v=20260907-ux24')
      .then(()=>loadScript('/prometeo/pages/calendar/previews/habits-traces-v1/habits-v26.js?v=20260907-ux26'))
      .catch(console.error);
  });
})();
