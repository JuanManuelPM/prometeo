(()=>{
  'use strict';
  const DONOR='/prometeo/pages/calendar/previews/habits-traces-v1/habits-persistence-v31.js?v=20260908-ux31';
  const TRACE_CALL="loadScript('/prometeo/pages/calendar/previews/habits-traces-v1/traces-v24.js?v=20260907-ux24')";
  const REPLACEMENT='window.PrometeoHabitTrackerConfig.loadRenderer(shadow)';

  function patchPersistenceSource(source){
    const count=source.split(TRACE_CALL).length-1;
    if(count!==2)throw new Error(`Unexpected habits-persistence-v31 source; expected 2 traces-v24 loads, found ${count}`);
    return source.split(TRACE_CALL).join(REPLACEMENT);
  }
  async function boot(){
    if(!window.PrometeoHabitTrackerConfig)throw new Error('PrometeoHabitTrackerConfig is required');
    const response=await fetch(DONOR,{cache:'no-store'});
    if(!response.ok)throw new Error(`Unable to load canonical habits persistence (${response.status})`);
    const source=patchPersistenceSource(await response.text());
    const script=document.createElement('script');
    script.dataset.prometeoCandidate='habits-persistence-v32-configurable-trackers';
    script.textContent=`${source}\n//# sourceURL=prometeo-habits-persistence-v32-candidate.js`;
    document.body.appendChild(script);
  }
  window.PrometeoHabitPersistenceCandidate=Object.freeze({patchPersistenceSource});
  boot().catch(error=>{
    document.documentElement.dataset.habitPersistence='candidate-boot-failed';
    console.error('[Prometeo configurable trackers candidate] persistence boot failed',error);
  });
})();
