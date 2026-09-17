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
  let currentPageId=null;
  let drawerMode='root';
  let drawerFolder=null;

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
  const readJSON=(k,fallback)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??fallback}catch{return fallback}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const shortStatus=s=>({current:'actual',candidate:'candidato',reference:'referencia',archive:'archivo'})[s]||s||'';
  const pageById=id=>(registry.pages||[]).find(p=>p.id===id);
  const folderOf=p=>(p?.folder||'Otras').trim()||'Otras';
  const folderLabel=folder=>String(folder||'Otras').split('/').filter(Boolean).pop()||'Otras';

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
    const change=p.change_id&&p.change_note?`${p.change_id} · ${p.change_note}`:shortStatus(p.status);
    const meta=[p.plate,change].filter(Boolean).join(' · ');
    const current=p.id===currentPageId?' current':'';
    return `<div class="pageRow${current}"><button class="pageOpen" type="button" data-open-page="${esc(p.id)}"><span class="pageNameLine"><span class="pageName">${esc(p.title)}</span>${unread?'<i class="pageNew" aria-label="nuevo"></i>':''}</span><span class="pageMeta">${esc(meta)}</span></button><button class="pageToggle ${isActive?'active':''}" type="button" data-toggle-page="${esc(p.id)}" aria-label="${isActive?'Quitar de activas':'Agregar a activas'}">${isActive?'−':'+'}</button></div>`;
  }

  function bindDrawerRows(){
    document.querySelectorAll('[data-open-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.openPage));
    document.querySelectorAll('[data-toggle-page]').forEach(b=>b.onclick=e=>{e.stopPropagation();togglePage(b.dataset.togglePage)});
  }

  function renderRoot(){
    const pages=registry.pages||[];
    const act=pages.filter(p=>active.has(p.id));
    const stored=pages.filter(p=>!active.has(p.id));
    $('activePages').innerHTML=act.length?act.map(p=>pageRow(p,true)).join(''):'<div class="drawerEmpty">Elegí páginas con +. Sólo esas quedan arriba.</div>';
    $('activePagesCount').textContent=act.length?String(act.length):'0';

    const groups=new Map();
    for(const p of stored){const k=folderOf(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}
    $('storedPages').innerHTML=[...groups.entries()].map(([folder,rows])=>`<details class="folder"><summary>${esc(folder)}<span>${rows.length}</span></summary><div class="pageList">${rows.map(p=>pageRow(p,false)).join('')}</div></details>`).join('')||'<div class="drawerEmpty">No hay páginas guardadas.</div>';
  }

  function renderFolder(){
    const rows=(registry.pages||[]).filter(p=>folderOf(p)===drawerFolder);
    $('currentFolderLabel').textContent=drawerFolder||'Carpeta';
    $('currentFolderCount').textContent=rows.length?`${rows.length} páginas`:'vacía';
    $('currentFolderPages').innerHTML=rows.length?rows.map(p=>pageRow(p,active.has(p.id))).join(''):'<div class="drawerEmpty">No hay páginas en esta carpeta.</div>';
  }

  function renderDrawer(){
    const folderMode=drawerMode==='folder'&&drawerFolder;
    $('pageDrawer').classList.toggle('folderMode',!!folderMode);
    $('drawerRootContent').hidden=!!folderMode;
    $('currentFolderSection').hidden=!folderMode;
    $('drawerTitle').textContent=folderMode?folderLabel(drawerFolder):'Páginas';
    if(folderMode)renderFolder();else renderRoot();

    const n=unreadCount();$('menuBadge').textContent=n?String(n):'';$('pagesUnread').textContent=n?`${n} nuevas`:'sin novedades';
    bindDrawerRows();
  }

  function togglePage(id){
    if(active.has(id))active.delete(id);else active.add(id);
    persistActive();renderDrawer();
  }

  function showRoot(){drawerMode='root';drawerFolder=null;renderDrawer();}
  function showCurrentFolder(){
    const p=pageById(currentPageId);
    if(!p){showRoot();return}
    drawerMode='folder';drawerFolder=folderOf(p);renderDrawer();
  }
  function revealDrawer(){ $('pageDrawer').classList.add('open');$('drawerShade').classList.add('open');document.body.classList.add('bodyLocked'); }
  function openRootDrawer(){showRoot();revealDrawer()}
  function openContextDrawer(){showCurrentFolder();revealDrawer()}
  function closeDrawer(){ $('pageDrawer').classList.remove('open');$('drawerShade').classList.remove('open');if(!$('pageViewer').classList.contains('open'))document.body.classList.remove('bodyLocked'); }

  function openPage(id){
    const p=pageById(id);if(!p)return;
    currentPageId=id;
    markSeen(p);
    closeDrawer();
    $('viewerTitle').textContent=[p.plate,p.title].filter(Boolean).join(' · ');
    $('viewerNote').textContent=p.change_id&&p.change_note?`${p.change_id} · ${p.change_note}`:'';
    $('viewerExternal').href=p.url;
    $('pageFrame').src=p.url;
    $('pageViewer').classList.add('open');document.body.classList.add('bodyLocked');
  }
  function closePage(){
    closeDrawer();
    $('pageViewer').classList.remove('open');$('pageFrame').src='about:blank';document.body.classList.remove('bodyLocked');
    currentPageId=null;showRoot();
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

  $('menuButton').onclick=openRootDrawer;
  $('viewerMenu').onclick=openContextDrawer;
  $('drawerRoot').onclick=showRoot;
  $('drawerClose').onclick=closeDrawer;
  $('drawerShade').onclick=closeDrawer;
  $('viewerBack').onclick=closePage;
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('pageDrawer').classList.contains('open'))closeDrawer();else if($('pageViewer').classList.contains('open'))closePage()});
  load();setInterval(load,POLL);
})();