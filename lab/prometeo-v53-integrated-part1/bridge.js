/* Same-origin Part 1 composition harness. V53 stays byte-identical; runtimes are injected after it loads. */
(()=>{
  'use strict';
  const frame=document.getElementById('v53');
  const sourceContract=Object.freeze({
    schema:'prometeo.source-contract-runtime/v1',
    build:'PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901',
    catalogUpdatedAt:'2026-09-01',
    treeGitBlobSha:'31cb2fefb32e2ccda67100ec7e872c3e3c2a5b61',
    pagesGitBlobSha:'4d471d2721b3ead0bf5b00c3896fdd5abc79b348',
    id:'v53:7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418:tree:31cb2fef:pages:4d471d27'
  });
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
      if(win.__PROMETEO_BUILD__!==sourceContract.build)throw new Error(`Unexpected V53 build ${win.__PROMETEO_BUILD__}`);
      const catalog=win.__PROMETEO_V53__?.catalog;
      if(!catalog||catalog.updated_at!==sourceContract.catalogUpdatedAt)throw new Error(`Unexpected V53 catalog metadata ${catalog?.updated_at||'missing'}`);
      win.__PROMETEO_SOURCE_CONTRACT__=sourceContract;
      for(const rel of scripts)await inject(win,new URL(rel,location.href).href);
      await win.PrometeoPart1.bootstrap({restoreNavigator:true,persistNavigator:true});
      document.documentElement.dataset.prometeoPart1='ready';
    }catch(error){console.error('[Prometeo Part1 bridge]',error);document.documentElement.dataset.prometeoPart1='error';}
  });
})();