(()=>{
  'use strict';
  const Adapter=window.PrometeoHabitSourceAdapter;
  const DONOR='/prometeo/pages/calendar/previews/habits-traces-v1/habits-persistence-v31.js?v=20260908-ux31';

  function patchPersistenceSource(source){
    if(!Adapter)throw new Error('PrometeoHabitSourceAdapter is required');
    return Adapter.patchPersistence(source);
  }
  async function boot(){
    if(!window.PrometeoHabitTrackerConfig||!Adapter)throw new Error('PrometeoHabitTrackerConfig + source adapter are required');
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
