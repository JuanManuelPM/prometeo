(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PrometeoHabitSourceAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TRACE_CALL="loadScript('/prometeo/pages/calendar/previews/habits-traces-v1/traces-v24.js?v=20260907-ux24')";
  const PERSISTENCE_REPLACEMENT='window.PrometeoHabitTrackerConfig.loadRenderer(shadow)';

  function patchTraces(source,config){
    const roster=/const GROUPS=\[[\s\S]*?\n  \];\n  const TRACKERS=\[[\s\S]*?\n  \];/;
    const seed=/function seed\(\)\{[\s\S]*?\n    return s;\n  \}/;
    if(!roster.test(source))throw new Error('Unexpected traces-v24 source; hardcoded roster block not found');
    if(!seed.test(source))throw new Error('Unexpected traces-v24 source; legacy seed block not found');
    return source
      .replace(roster,`const GROUPS=${JSON.stringify(config.groups||[])};\n  const TRACKERS=${JSON.stringify(config.trackers||[])};`)
      .replace(seed,"function seed(){const s={};TRACKERS.forEach(t=>s[t.id]={});return s;}");
  }

  function patchPersistence(source){
    const count=source.split(TRACE_CALL).length-1;
    if(count!==2)throw new Error(`Unexpected habits-persistence-v31 source; expected 2 traces-v24 loads, found ${count}`);
    return source.split(TRACE_CALL).join(PERSISTENCE_REPLACEMENT);
  }

  return Object.freeze({TRACE_CALL,patchTraces,patchPersistence});
});
