(async()=>{
  const app=document.getElementById('app');
  window.__STUDY_V6_EXISTING=!!localStorage.getItem('study_library_v4');
  try{
    const r=await fetch('https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-config-v1',{cache:'no-store'});
    const c=await r.json();
    if(!r.ok||!c?.key)throw new Error('config');
    window.__STUDY_KEY=c.key;
    const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});
    for(const src of ['./study-v4-core1.js?v=4','./study-v4-core2.js?v=4','./study-v4-live.js?v=4','./study-v5-patch.js?v=5'])await load(src);
    await new Promise(r=>setTimeout(r,40));
    await load('./study-v6-patch.js?v=60');
    await new Promise(r=>setTimeout(r,25));
    await load('./study-v7-patch.js?v=70');
    await new Promise(r=>setTimeout(r,35));
    await load('./study-v8-patch.js?v=80');
  }catch(e){
    console.error(e);
    if(app)app.innerHTML='<main style="padding:28px;font:14px system-ui;color:#d8d1ff;background:#111326;min-height:100vh">No pude iniciar la clase. Reintentá en unos segundos.</main>';
  }
})();