const DEFAULT_ENDPOINT='https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-change-loop-v1';
const SECRET_KEYS=['prometeo.capture.workspace.secret.v2','prometeo.capture.workspace.secret.v1'];

function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function when(v){if(!v)return'';const d=new Date(v),s=Math.max(0,Math.round((Date.now()-d.getTime())/1000));if(s<60)return'ahora';const m=Math.round(s/60);if(m<60)return`${m}m`;const h=Math.round(m/60);return h<24?`${h}h`:`${Math.round(h/24)}d`}
function secretFrom(storage){for(const key of SECRET_KEYS){try{const v=storage?.getItem?.(key);if(v&&v.length>=32)return v}catch{}}return''}

export function createChangeLoopClient({endpoint=DEFAULT_ENDPOINT,storage=globalThis.localStorage,fetchImpl=globalThis.fetch}={}){
  const getSecret=()=>secretFrom(storage);
  async function call(action,payload={}){
    const secret=getSecret();if(!secret)throw Object.assign(new Error('WORKSPACE_NOT_LINKED'),{code:'WORKSPACE_NOT_LINKED'});
    const r=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${secret}`},body:JSON.stringify({action,...payload}),cache:'no-store'});
    const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(data?.message||data?.error||`HTTP ${r.status}`),{code:data?.error,status:r.status,data});return data;
  }
  async function uploadAttachment(file,page){
    const secret=getSecret();if(!secret)throw new Error('WORKSPACE_NOT_LINKED');const form=new FormData();form.append('file',file);
    const q=new URLSearchParams({page_id:page?.id||'prometeo-universal-shell-v5',page_title:page?.title||'Prometeo'});
    const r=await fetchImpl(`${endpoint}/attachment?${q}`,{method:'POST',headers:{authorization:`Bearer ${secret}`},body:form,cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.message||data?.error||`HTTP ${r.status}`);return data;
  }
  return Object.freeze({
    schema:'prometeo.page-change-loop-client/v1',
    endpoint,
    hasWorkspace:()=>!!getSecret(),
    workspace:()=>call('workspace'),
    overview:()=>call('overview'),
    syncPage:page=>call('sync_page',{page_id:page?.id||'prometeo-universal-shell-v5',page_title:page?.title||'Prometeo',baseline:page?.baseline||{}}),
    detail:page=>call('detail',{page_id:page?.id||'prometeo-universal-shell-v5',page_title:page?.title||'Prometeo',baseline:page?.baseline||{}}),
    grantStatus:()=>call('grant_status'),
    setProjectGrant:(enabled=true)=>call('set_project_grant',{enabled,human_approved:true}),
    hacer:page=>call('prepare_execution',{page_id:page?.id||'prometeo-universal-shell-v5',page_title:page?.title||'Prometeo',source_href:page?.href||null,served_identity:page?.served_identity||null,baseline:page?.baseline||{}}),
    executionStatus:payload=>call('execution_status',payload||{}),
    markSeen:work_item_id=>call('mark_seen',{work_item_id}),
    uploadAttachment,
  });
}

const STYLE=`
#prometeoChangeLoop{position:fixed;inset:0;z-index:18;background:color-mix(in srgb,var(--surface,#fff) 96%,transparent);color:var(--text,#151A20);font:500 15px/1.38 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:none;overflow:auto;overscroll-behavior:contain}
#prometeoChangeLoop.open{display:block}#prometeoChangeLoop *{box-sizing:border-box}#prometeoChangeLoop button,#prometeoChangeLoop textarea{font:inherit;color:inherit}
.pcl-shell{width:min(760px,100%);min-height:100%;margin:0 auto;padding:calc(20px + env(safe-area-inset-top,0px)) 18px calc(44px + env(safe-area-inset-bottom,0px))}
.pcl-head{display:flex;align-items:flex-start;gap:14px;margin-bottom:24px}.pcl-title{font-weight:900;font-size:18px;letter-spacing:-.03em;flex:1}.pcl-sub{font-size:12px;opacity:.58;margin-top:3px}.pcl-close,.pcl-action,.pcl-small{border:0;background:var(--face,#151A20);color:var(--on,#fff);border-radius:12px;padding:11px 14px;font-weight:850;cursor:pointer}.pcl-close{width:38px;height:38px;padding:0;border-radius:50%;font-size:18px}.pcl-section{margin:22px 0}.pcl-label{font-size:11px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;opacity:.45;margin:0 0 10px}.pcl-item{padding:12px 0;border-bottom:1px solid color-mix(in srgb,var(--text,#151A20) 14%,transparent)}.pcl-time{font-size:11px;opacity:.48;margin-bottom:4px}.pcl-text{white-space:pre-wrap;overflow-wrap:anywhere}.pcl-page{display:flex;align-items:center;gap:12px;width:100%;border:0;border-bottom:1px solid color-mix(in srgb,var(--text,#151A20) 14%,transparent);background:transparent;text-align:left;padding:15px 0;cursor:pointer}.pcl-page-name{font-weight:850;flex:1}.pcl-count{font-size:12px;opacity:.55}.pcl-dot{width:7px;height:7px;border-radius:50%;background:var(--face,#151A20);flex:0 0 auto}.pcl-compose{display:grid;grid-template-columns:1fr auto;gap:9px;margin-top:14px}.pcl-compose textarea{resize:vertical;min-height:48px;max-height:160px;border:1px solid color-mix(in srgb,var(--text,#151A20) 18%,transparent);background:transparent;border-radius:12px;padding:11px;outline:none}.pcl-make{width:100%;border:0;border-radius:14px;background:var(--face,#151A20);color:var(--on,#fff);padding:16px 18px;font-size:15px;font-weight:950;cursor:pointer}.pcl-make[disabled]{opacity:.38}.pcl-result{border:1px solid color-mix(in srgb,var(--text,#151A20) 16%,transparent);border-radius:16px;padding:14px;margin:11px 0}.pcl-result.unread{border-width:2px}.pcl-result-head{display:flex;gap:10px;align-items:center}.pcl-result-status{font-weight:900;flex:1}.pcl-result-summary{margin:10px 0;white-space:pre-wrap}.pcl-result-actions{display:flex;gap:8px;flex-wrap:wrap}.pcl-small{padding:8px 10px;border-radius:9px;font-size:12px}.pcl-file{position:relative;overflow:hidden;display:inline-block}.pcl-file input{position:absolute;inset:0;opacity:0;cursor:pointer}.pcl-gate{border:1px solid color-mix(in srgb,var(--text,#151A20) 18%,transparent);border-radius:16px;padding:15px}.pcl-muted{opacity:.55;font-size:12px}.pcl-error{font-size:13px;padding:10px 0}.pcl-busy{opacity:.55}.pcl-launch{padding:14px;border:1px solid color-mix(in srgb,var(--text,#151A20) 16%,transparent);border-radius:14px;margin-top:12px}.pcl-launch strong{display:block;margin-bottom:4px}
@media(max-width:520px){.pcl-shell{padding-left:14px;padding-right:14px}.pcl-compose{grid-template-columns:1fr}.pcl-action{width:100%}}
`;

export function mountPageChangeLoop({client=createChangeLoopClient(),adapter={}}={}){
  if(document.getElementById('prometeoChangeLoop'))return globalThis.__PROMETEO_CHANGE_LOOP__;
  const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
  const root=document.createElement('section');root.id='prometeoChangeLoop';root.setAttribute('aria-hidden','true');root.innerHTML='<div class="pcl-shell"><div class="pcl-head"><div><div class="pcl-title">Cambios</div><div class="pcl-sub"></div></div><button class="pcl-close" type="button" aria-label="Cerrar">×</button></div><main class="pcl-body"></main></div>';document.body.append(root);
  const body=root.querySelector('.pcl-body'),title=root.querySelector('.pcl-title'),sub=root.querySelector('.pcl-sub');
  let currentPage=null,currentDetail=null,poll=null,busy=false;
  const page=()=>currentPage||adapter.getPage?.()||{id:'prometeo-universal-shell-v5',title:'Prometeo'};
  const notifyUnread=n=>{try{adapter.onUnread?.(n)}catch{}};
  async function syncBeforeRead(){try{await adapter.syncNow?.()}catch{}try{await client.syncPage(page())}catch{}}
  function setOpen(v){root.classList.toggle('open',v);root.setAttribute('aria-hidden',v?'false':'true');if(!v){clearInterval(poll);poll=null;try{adapter.onClose?.()}catch{}}}
  function resultText(r){const s=r?.summary;if(!s)return'';if(typeof s==='string')return s;return s.text||s.change_summary||(Array.isArray(s.changes)?s.changes.join('\n'):'')||''}
  async function refreshOverview(render=true){if(!client.hasWorkspace()){notifyUnread(0);return null}try{const data=await client.overview();notifyUnread((data.threads||[]).filter(t=>t.unread).length);if(render)renderOverview(data.threads||[]);return data}catch(e){if(render)renderError(e);return null}}
  function renderOverview(rows){title.textContent='Cambios';sub.textContent='Todas las páginas';body.innerHTML=rows.length?rows.map(t=>`<button class="pcl-page" data-page="${esc(t.page_id)}"><span class="pcl-page-name">${esc(t.page_title||t.page_id)}</span><span class="pcl-count">${t.pending?`${t.pending} pendiente${t.pending===1?'':'s'}`:''}</span>${t.unread?'<span class="pcl-dot" aria-label="resultado nuevo"></span>':''}</button>`).join(''):'<div class="pcl-muted">Todavía no hay hilos de cambios.</div>';}
  function renderError(e){body.innerHTML=`<div class="pcl-error">${esc(e?.message||'No pude cargar los cambios.')}</div>`}
  function renderDetail(d){currentDetail=d;const p=page();title.textContent=p.title||p.id;sub.textContent=`${d.pending?.length||0} pendiente${d.pending?.length===1?'':'s'} · hilo de cambios`;const pending=d.pending||[],results=d.results||[],attachments=(d.attachments||[]).filter(a=>a.state==='PENDING');body.innerHTML=`
    <section class="pcl-section"><div class="pcl-label">Pendiente</div>${pending.length?pending.map(x=>`<article class="pcl-item"><div class="pcl-time">${esc(when(x.created_at))} · ${esc(x.state||'')}</div><div class="pcl-text">${esc(x.text||'')}</div></article>`).join(''):'<div class="pcl-muted">No hay observaciones pendientes.</div>'}
      ${attachments.map(a=>`<article class="pcl-item"><div class="pcl-time">archivo</div><div class="pcl-text">${esc(a.file_name)}</div></article>`).join('')}
      <div class="pcl-compose"><textarea id="pclText" placeholder="Escribí otra observación…"></textarea><button class="pcl-action" data-act="text">Guardar</button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px"><label class="pcl-small pcl-file">Subir archivo<input id="pclFile" type="file"></label><button class="pcl-small" data-act="all">Ver todas</button></div>
    </section>
    ${results.length?`<section class="pcl-section"><div class="pcl-label">Resultados</div>${results.slice().reverse().map(r=>`<article class="pcl-result${r.seen_at?'':' unread'}"><div class="pcl-result-head"><span class="pcl-result-status">${esc(r.status)}</span>${r.seen_at?'':'<span class="pcl-dot"></span>'}</div><div class="pcl-time">${esc(r.work_item_id)} · ${esc(when(r.created_at))}</div><div class="pcl-result-summary">${esc(resultText(r))}</div><div class="pcl-result-actions"><button class="pcl-small" data-result="${esc(r.work_item_id)}">${r.seen_at?'Abrir':'Ver resultado'}</button>${r.candidate_url?`<button class="pcl-small" data-preview="${esc(r.candidate_url)}" data-result="${esc(r.work_item_id)}">Ver candidato</button>`:''}${r.served_url?`<button class="pcl-small" data-preview="${esc(r.served_url)}" data-result="${esc(r.work_item_id)}">Ver servido</button>`:''}</div></article>`).join('')}</section>`:''}
    <section class="pcl-section"><div id="pclGate"></div><button class="pcl-make" data-act="hacer" ${pending.length||attachments.length?'':'disabled'}>HACER · ${pending.length+attachments.length}</button><div id="pclLaunch"></div></section>`;
    ensureGrant().catch(()=>{});
  }
  async function ensureGrant(){const gate=body.querySelector('#pclGate');if(!gate)return false;try{const g=await client.grantStatus();if(g.grant?.enabled){gate.innerHTML='';return true}gate.innerHTML='<div class="pcl-gate"><strong>Activar HACER para este proyecto</strong><div class="pcl-muted" style="margin:6px 0 10px">Permite usar tus Captures seleccionadas para trabajar en Prometeo. No autoriza mensajes externos, gastos, borrados irreversibles ni publicar datos privados.</div><button class="pcl-small" data-act="grant">Activar</button></div>';return false}catch{gate.innerHTML='';return false}}
  async function open(target=null){currentPage=target||adapter.getPage?.()||null;if(!client.hasWorkspace()){adapter.openLegacyNotes?.();return false}setOpen(true);body.innerHTML='<div class="pcl-muted">Cargando…</div>';if(currentPage){await syncBeforeRead();await showPage(currentPage)}else await refreshOverview(true);clearInterval(poll);poll=setInterval(async()=>{if(!root.classList.contains('open'))return;await refreshOverview(false);if(currentPage)await showPage(currentPage,false)},15000);return true}
  async function showPage(p=page(),showBusy=true){currentPage=p;if(showBusy)body.classList.add('pcl-busy');try{currentDetail=await client.detail(p);renderDetail(currentDetail)}catch(e){renderError(e)}finally{body.classList.remove('pcl-busy')}}
  async function saveText(){const ta=body.querySelector('#pclText');const text=String(ta?.value||'').trim();if(!text||busy)return;busy=true;try{await adapter.createTextCapture?.(text,page());if(ta)ta.value='';await syncBeforeRead();await showPage(page(),false)}catch(e){renderError(e)}finally{busy=false}}
  async function hacer(){if(busy)return;busy=true;let tab=null;try{const g=await client.grantStatus();if(!g.grant?.enabled){await ensureGrant();return}tab=window.open('about:blank','_blank');const data=await client.hacer(page());if(tab)tab.location.href=data.chatgpt_url;else window.open(data.chatgpt_url,'_blank','noopener');const box=body.querySelector('#pclLaunch');if(box)box.innerHTML=`<div class="pcl-launch"><strong>${esc(data.work_item_id)} enviado</strong><div class="pcl-muted">El worker ya tiene el contexto durable. Podés seguir usando Prometeo.</div></div>`;await showPage(page(),false)}catch(e){try{tab?.close()}catch{}renderError(e)}finally{busy=false}}
  async function markSeen(id){try{await client.markSeen(id);await showPage(page(),false);await refreshOverview(false)}catch(e){renderError(e)}}
  root.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;if(t.classList.contains('pcl-close')){setOpen(false);return}if(t.dataset.page){try{const ov=await client.overview();const row=(ov.threads||[]).find(x=>x.page_id===t.dataset.page);await showPage({id:t.dataset.page,title:row?.page_title||t.dataset.page})}catch(err){renderError(err)}return}const a=t.dataset.act;if(a==='all'){currentPage=null;await refreshOverview(true);return}if(a==='text'){await saveText();return}if(a==='grant'){try{await client.setProjectGrant(true);await ensureGrant()}catch(err){renderError(err)}return}if(a==='hacer'){await hacer();return}if(t.dataset.result){await markSeen(t.dataset.result)}if(t.dataset.preview){adapter.previewUrl?.(t.dataset.preview);setOpen(false)}});
  root.addEventListener('change',async e=>{if(e.target.id!=='pclFile')return;const f=e.target.files?.[0];if(!f)return;try{body.classList.add('pcl-busy');await client.uploadAttachment(f,page());await showPage(page(),false)}catch(err){renderError(err)}finally{body.classList.remove('pcl-busy')}});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();setOpen(false)}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&root.querySelector('#pclText')===document.activeElement){e.preventDefault();saveText()}});
  async function pollUnread(){if(!client.hasWorkspace()){notifyUnread(0);return}await refreshOverview(false)}
  addEventListener('online',()=>pollUnread().catch(()=>{}));setTimeout(()=>pollUnread().catch(()=>{}),1200);setInterval(()=>pollUnread().catch(()=>{}),60000);
  const api=Object.freeze({schema:'prometeo.page-change-loop-ui/v1',open,close:()=>setOpen(false),pollUnread,client});globalThis.__PROMETEO_CHANGE_LOOP__=api;return api;
}
