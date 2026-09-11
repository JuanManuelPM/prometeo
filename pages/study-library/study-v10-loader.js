(async()=>{
  const app=document.getElementById('app'),boot=document.getElementById('studyBoot15'),bootText=document.getElementById('studyBootText15'),bootBar=document.getElementById('studyBootBar15');
  window.__STUDY_V6_EXISTING=!!localStorage.getItem('study_library_v4');
  const setBoot=(text,p)=>{if(bootText)bootText.textContent=text;if(bootBar)bootBar.style.setProperty('--p',String(Math.max(0,Math.min(1,p||0))))};
  const hideBoot=()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{boot?.classList.add('done');setTimeout(()=>boot?.remove(),260)}));
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.dataset.prometeoSrc=src;s.onload=()=>{s.dataset.loaded='1';resolve()};s.onerror=reject;document.body.appendChild(s)});
  const preload=src=>{const l=document.createElement('link');l.rel='preload';l.as='script';l.href=src;document.head.appendChild(l)};
  const core=[
    './study-v4-core1.js?v=4','./study-v4-core2.js?v=4','./study-v4-live.js?v=4',
    './study-v5-patch.js?v=5','./study-v6-patch.js?v=60','./study-v7-patch.js?v=70','./study-v8-patch.js?v=80',
    './study-v9-patch.js?v=90','./universal-whiteboard-adapter-v1.js?v=100','./study-v10-integration.js?v=100',
    './study-v11-experience.js?v=150','./study-v15-performance.js?v=150'
  ];
  core.forEach(preload);
  try{
    setBoot('Conectando biblioteca…',.05);
    const configPromise=fetch('https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-config-v1',{cache:'no-store'}).then(async r=>{const c=await r.json();if(!r.ok||!c?.key)throw new Error('config');return c});
    const c=await configPromise;window.__STUDY_KEY=c.key;
    setBoot('Preparando biblioteca…',.14);
    for(let i=0;i<core.length;i++){
      await load(core[i]);
      setBoot(i<7?'Preparando interfaz…':i<10?'Organizando materias…':'Casi listo…',.14+.76*((i+1)/core.length));
    }
    const perf=window.PrometeoPerformanceV15,q=new URLSearchParams(location.search);
    if(q.get('session')&&perf){setBoot('Preparando clase…',.94);await perf.ensureClass({quiet:true,rerender:true})}
    else if(q.get('course')&&perf){setBoot('Preparando materia…',.94);await perf.ensureKnowledge({quiet:true})}
    setBoot('Listo',1);hideBoot();
  }catch(e){
    console.error(e);if(bootText)bootText.textContent='No pude iniciar Study Library';if(bootBar)bootBar.style.setProperty('--p','1');
    if(app&&!app.children.length)app.innerHTML='<main style="padding:28px;font:14px system-ui;color:#d8d1ff;background:#111326;min-height:100vh">No pude iniciar Study Library. Reintentá en unos segundos.</main>';
    setTimeout(hideBoot,900);
  }
})();
