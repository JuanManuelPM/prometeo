/* Prometeo Platform v1 — Part 1 composition root. No visible UI. */
((global)=>{
  'use strict';if(global.PrometeoPart1)return;
  let instance=null;
  async function bootstrap({restoreNavigator=true,persistNavigator=true}={}){
    if(instance)return instance;
    const required=['PrometeoOwnership','PrometeoPersistence','PrometeoContextFoundry','PrometeoV53ShellAdapter'];
    const missing=required.filter(k=>!global[k]);if(missing.length)throw new Error(`Part1 missing runtimes: ${missing.join(', ')}`);
    await global.PrometeoV53ShellAdapter.waitReady();
    const shell=global.PrometeoV53ShellAdapter.mount({persist:persistNavigator,restore:restoreNavigator});
    instance=Object.freeze({
      schema:'prometeo.part1-platform/v1',
      build:global.__PROMETEO_BUILD__,
      shell,
      ownership:global.PrometeoOwnership,
      persistence:global.PrometeoPersistence,
      context:global.PrometeoContextFoundry,
      pageKit:global.PrometeoPageKitHostV2||null,
      classes:global.PrometeoClassRuntime||null,
      studentWorld:global.PrometeoStudentWorldRuntime||null,
      resources:Object.freeze({
        designKernel:'shared/design-kernel/v2/tokens.css',
        material:'shared/material/v2/material.css',
        touchFirst:'shared/interaction/touch-first/v2/interaction.js',
        touchFirstMountPolicy:'OPT_IN_CONSUMERS_ONLY_NOT_V53_VIEWPORT'
      }),
      status:()=>({build:global.__PROMETEO_BUILD__,v53:global.__PROMETEO_V53__?.getState?.()||null,shell:shell.status(),ownership:global.PrometeoOwnership.snapshot(),pageKit:global.PrometeoPageKitHostV2?.list?.()||[]})
    });
    global.__PROMETEO_PART1__=instance;return instance;
  }
  global.PrometeoPart1=Object.freeze({version:'1.0.0-candidate',bootstrap,get:()=>instance});
})(typeof globalThis!=='undefined'?globalThis:window);
