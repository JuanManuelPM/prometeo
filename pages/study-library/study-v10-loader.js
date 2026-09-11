(async()=>{
  const app=document.getElementById('app');
  window.__STUDY_V6_EXISTING=!!localStorage.getItem('study_library_v4');
  try{
    const r=await fetch('https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-config-v1',{cache:'no-store'}),c=await r.json();
    if(!r.ok||!c?.key)throw new Error('config');
    window.__STUDY_KEY=c.key;
    const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});
    for(const src of ['./study-v4-core1.js?v=4','./study-v4-core2.js?v=4','./study-v4-live.js?v=4','./study-v5-patch.js?v=5','./study-v6-patch.js?v=60','./study-v7-patch.js?v=70','./study-v8-patch.js?v=80']){await load(src);await new Promise(r=>setTimeout(r,25))}
    await load('./study-v9-patch.js?v=90');
    await load('./study-v9-content.js?v=91').catch(e=>console.warn('Blackboard content layer pending',e));
    await load('./study-bb-pairing-fix-v1.js?v=3').catch(e=>console.warn('Blackboard pairing recovery pending',e));
    await load('./universal-whiteboard-adapter-v1.js?v=100');
    await load('./study-v10-integration.js?v=100');
    await load('./study-v11-experience.js?v=111');
  }catch(e){console.error(e);if(app&&!app.children.length)app.innerHTML='<main style="padding:28px;font:14px system-ui;color:#d8d1ff;background:#111326;min-height:100vh">No pude iniciar Study Library. Reintentá en unos segundos.</main>'}
})();
