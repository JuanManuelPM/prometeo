(async()=>{
  const app=document.getElementById('app'),boot=document.getElementById('studyBoot15'),bootText=document.getElementById('studyBootText15'),bootBar=document.getElementById('studyBootBar15'),q=new URLSearchParams(location.search),legacyMode=q.get('legacy')==='1';
  window.__STUDY_V6_EXISTING=!!localStorage.getItem('study_library_v4');
  const setBoot=(text,p)=>{if(bootText)bootText.textContent=text;if(bootBar)bootBar.style.setProperty('--p',String(Math.max(0,Math.min(1,p||0))))};
  let bootHidden=false;
  const hideBoot=()=>{if(bootHidden)return;bootHidden=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{boot?.classList.add('done');setTimeout(()=>boot?.remove(),260)}))};
  const setLegacyState=(status,error=null)=>{const state={status,legacy_mode:legacyMode,updated_at:new Date().toISOString()};if(error)state.error=String(error?.message||error);window.__STUDY_LEGACY_STATE=state;window.dispatchEvent(new CustomEvent('study:legacy-state',{detail:state}));return state};
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.dataset.prometeoSrc=src;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;document.body.appendChild(s)});
  const preload=src=>{const l=document.createElement('link');l.rel='preload';l.as='script';l.href=src;document.head.appendChild(l)};
  const core=[
    './study-v4-core1.js?v=4','./study-v4-core2.js?v=4','./study-v4-live.js?v=4',
    './study-v5-patch.js?v=5','./study-v6-patch.js?v=60','./study-v7-patch.js?v=70','./study-v8-patch.js?v=80',
    './study-v9-patch.js?v=90','./study-bb-pairing-fix-v1.js?v=15','./universal-whiteboard-adapter-v1.js?v=100',
    './study-v10-integration.js?v=100','./study-v11-experience.js?v=150','./study-v15-performance.js?v=150'
  ];
  let legacyPromise=null;
  const ensureLegacy=({blocking=false}={})=>{
    if(legacyPromise)return legacyPromise;
    legacyPromise=(async()=>{
      setLegacyState('loading');
      if(blocking){core.forEach(preload);setBoot('Conectando biblioteca…',.05)}
      try{
        const r=await fetch('https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-config-v1',{cache:'no-store'}),c=await r.json();
        if(!r.ok||!c?.key)throw new Error('config');
        window.__STUDY_KEY=c.key;
        if(blocking)setBoot('Preparando biblioteca…',.14);
        for(let i=0;i<core.length;i++){
          await load(core[i]);
          if(blocking)setBoot(i<7?'Preparando interfaz…':i<11?'Organizando materias…':'Casi listo…',.14+.76*((i+1)/core.length));
        }
        const perf=window.PrometeoPerformanceV15,params=new URLSearchParams(location.search);
        if(params.get('session')&&perf){if(blocking)setBoot('Preparando clase…',.94);await perf.ensureClass({quiet:true,rerender:true})}
        else if(params.get('course')&&perf){if(blocking)setBoot('Preparando materia…',.94);await perf.ensureKnowledge({quiet:true})}
        setLegacyState('ready');
        if(blocking){setBoot('Listo',1);hideBoot()}
        return window.__STUDY_LEGACY_STATE;
      }catch(e){
        console.error(e);setLegacyState('degraded',e);
        if(blocking){
          if(bootText)bootText.textContent='No pude iniciar Study Library';
          if(bootBar)bootBar.style.setProperty('--p','1');
          if(app&&!app.children.length)app.innerHTML='<main style="padding:28px;font:14px system-ui;color:#d8d1ff;background:#111326;min-height:100vh">No pude iniciar Study Library. Reintentá en unos segundos.</main>';
          setTimeout(hideBoot,900);
        }
        throw e;
      }
    })();
    legacyPromise.catch(()=>{});
    return legacyPromise;
  };
  window.__STUDY_ENSURE_LEGACY=()=>ensureLegacy({blocking:false});
  if(legacyMode){await ensureLegacy({blocking:true}).catch(()=>{});return}
  setLegacyState('idle');
  setBoot('Preparando biblioteca…',.12);
  const releaseWhenV18Ready=()=>{const r=document.getElementById('studyV18Root');if(!r||(!r.children.length&&!r.textContent.trim()))return false;setBoot('Listo',1);hideBoot();return true};
  if(!releaseWhenV18Ready()){const observer=new MutationObserver(()=>{if(releaseWhenV18Ready())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true})}
})();
