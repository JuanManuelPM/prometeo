/* Same-origin candidate bridge. V53 stays byte-identical; runtimes are injected after it loads. */
(()=>{
  'use strict';
  const frame=document.getElementById('v53');
  const scripts=[
    '../../shared/runtime/ownership/v1/ownership.js',
    '../../shared/runtime/persistence/v1/persistence.js',
    '../../shared/context-foundry/v1/context-foundry.js',
    '../../shared/classes/v1/class-engine.js',
    '../../shared/student-world/v1/student-world.js',
    '../../shared/pagekit/host/v2/pagekit-host.js',
    '../../shared/classes/runtime/v1/class-runtime.js',
    '../../shared/student-world/runtime/v1/student-world-runtime.js',
    '../../shared/shell/v53-adapter/v1/v53-shell-adapter.js',
    '../../shared/runtime/platform/v1/platform.js'
  ];
  function inject(win,src){return new Promise((resolve,reject)=>{const s=win.document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Failed to load ${src}`));win.document.head.appendChild(s);});}
  frame.addEventListener('load',async()=>{
    const win=frame.contentWindow;
    try{
      if(win.location.origin!==location.origin)throw new Error('V53 bridge requires same origin');
      for(const rel of scripts)await inject(win,new URL(rel,location.href).href);
      await win.PrometeoPart1.bootstrap({restoreNavigator:true,persistNavigator:true});
      document.documentElement.dataset.prometeoPart1='ready';
    }catch(error){console.error('[Prometeo Part1 bridge]',error);document.documentElement.dataset.prometeoPart1='error';}
  });
})();
