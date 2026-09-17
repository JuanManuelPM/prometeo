(()=>{
  const REGISTRY='./pages.json';
  const ACTIVE_KEY='prometeo-live-active-pages-v1';
  const SEEN_KEY='prometeo-live-page-seen-v1';
  const BASELINE_KEY='prometeo-live-page-baselined-v1';
  const POLL=15000;
  const $=id=>document.getElementById(id);
  let registry={pages:[]};
  let active=new Set();
  let seen={};

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const readJSON=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??fallback}catch{return fallback}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const shortStatus=s=>({current:'actual',candidate:'candidato',reference:'referencia',archive:'archivo'})[s]||s||'';

  function normalize(){
    active=new Set((readJSON(ACTIVE_KEY,[])||[]).filter(id=>registry.pages.some(p=>p.id===id)));
    seen=readJSON(SEEN_KEY,{})||{};
    let based=false;try{based=localStorage.getItem(BASELINE_KEY)==='1'}catch{}
    if(!based){
      for(const p of registry.pages)seen[p.id]=p.revision;
      writeJSON(SEEN_KEY,seen);
      try{localStorage.setItem(BASELINE_KEY,'1')}catch{}
    }
  }
  function isUnread(p){return !!p.revision && seen[p.id]!==p.revision}
  function unreadCount(){return registry.pages.filter(isUnread).length}
  function persistActive(){writeJSON(ACTIVE_KEY,[...active])}
  function markSeen(p){if(!p)return;seen[p.id]=p.revision;writeJSON(SEEN_KEY,seen);renderDrawer()}

  function pageRow(p,isActive){
    const unread=isUnread(p);
    const note=p.change_id&&p.change_note?`${p.change_id} · ${p.change_note}`:shortStatus(p.status);
    return `<div class="pageRow"><button class="pageOpen" type="button" data-open-page="${esc(p.id)}"><span class="pageNameLine"><span class="pageName">${esc(p.title)}</span>${unread?'<i class="pageNew" aria-label="nuevo"></i>':''}</span><span class="pageMeta">${esc(note)}</span></button><button class="pageToggle ${isActive?'active':''}" type="button" data-toggle-page="${esc(p.id)}" aria-label="${isActive?'Quitar de activas':'Agregar a activas'}">${isActive?'−':'+'}</button></div>`;
  }

  function renderDrawer(){
    const pages=registry.pages||[];
    const act=pages.filter(p=>active.has(p.id));
    const stored=pages.filter(p=>!active.has(p.id));
    $('activePages').innerHTML=act.length?act.map(p=>pageRow(p,true)).join(''):'<div class="drawerEmpty">Elegí páginas con +. Sólo esas quedan arriba.</div>';
    $('activePagesCount').textContent=act.length?String(act.length):'0';

    const groups=new Map();
    for(const p of stored){const k=p.folder||'Otras';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}
    $('storedPages').innerHTML=[...groups.entries()].map(([folder,rows])=>`<details class="folder"><summary>${esc(folder)}<span>${rows.length}</span></summary><div class="pageList">${rows.map(p=>pageRow(p,false)).join('')}</div></details>`).join('')||'<div class="drawerEmpty">No hay páginas guardadas.</div>';

    const n=unreadCount();$('menuBadge').textContent=n?String(n):'';$('pagesUnread').textContent=n?`${n} nuevas`:'sin novedades';
    document.querySelectorAll('[data-open-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.openPage));
    document.querySelectorAll('[data-toggle-page]').forEach(b=>b.onclick=e=>{e.stopPropagation();togglePage(b.dataset.togglePage)});
  }

  function togglePage(id){
    if(active.has(id))active.delete(id);else active.add(id);
    persistActive();renderDrawer();
  }

  function openDrawer(){ $('pageDrawer').classList.add('open');$('drawerShade').classList.add('open');document.body.classList.add('bodyLocked'); }
  function closeDrawer(){ $('pageDrawer').classList.remove('open');$('drawerShade').classList.remove('open');if(!$('pageViewer').classList.contains('open'))document.body.classList.remove('bodyLocked'); }

  function openPage(id){
    const p=registry.pages.find(x=>x.id===id);if(!p)return;
    closeDrawer();markSeen(p);
    $('viewerTitle').textContent=p.title;
    $('viewerNote').textContent=p.change_id&&p.change_note?`${p.change_id} · ${p.change_note}`:'';
    $('viewerExternal').href=p.url;
    $('pageFrame').src=p.url;
    $('pageViewer').classList.add('open');document.body.classList.add('bodyLocked');
  }
  function closePage(){
    $('pageViewer').classList.remove('open');$('pageFrame').src='about:blank';document.body.classList.remove('bodyLocked');
  }

  async function load(){
    try{
      const r=await fetch(`${REGISTRY}?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(r.status);
      const next=await r.json();if(!Array.isArray(next.pages))throw new Error('bad registry');
      const oldStamp=registry.updated_at;registry=next;normalize();if(next.updated_at!==oldStamp)renderDrawer();
    }catch(e){
      if(!registry.pages.length){$('activePages').innerHTML='<div class="drawerEmpty">No pude leer las páginas todavía.</div>';$('storedPages').innerHTML=''}
    }
  }

  $('menuButton').onclick=openDrawer;$('drawerClose').onclick=closeDrawer;$('drawerShade').onclick=closeDrawer;$('viewerBack').onclick=closePage;
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('pageViewer').classList.contains('open'))closePage();else closeDrawer()});
  load();setInterval(load,POLL);
})();