import { listNotes, putNote, removeNote, getNote } from '../v1/db.js';
import { VoiceQueue } from '../v1/voice.js';
import { PrometeoRemote } from './sync.js';

const ENABLE_KEY = 'prometeo.shell.enabled.v1';
const CHANNEL = 'prometeo-global-notes-v2';
const baseURL = new URL('./', import.meta.url);
const CATALOG_URL = new URL('/prometeo/catalog/pages.json', location.origin).href;

function resolveOwnerMode() {
  const url = new URL(location.href);
  const requested = url.searchParams.get('prometeo');
  if (requested === '1') localStorage.setItem(ENABLE_KEY, '1');
  if (requested === '0') localStorage.removeItem(ENABLE_KEY);
  if (requested === '1' || requested === '0') {
    url.searchParams.delete('prometeo');
    history.replaceState(history.state, '', url.href);
  }
  return localStorage.getItem(ENABLE_KEY) === '1';
}

if (resolveOwnerMode() && !window.__PROMETEO_GLOBAL_SHELL__) {
  window.__PROMETEO_GLOBAL_SHELL__ = true;
  boot().catch(error => console.error('[Prometeo shell v2]', error));
}

async function boot() {
  const host = document.createElement('div');
  host.id = 'prometeo-global-shell';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;';
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('shell.css?v=2', baseURL).href;
  root.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 's';
  wrap.innerHTML = `
    <div class="badge" id="badge"></div>
    <div class="orbit" id="orbit" aria-hidden="true">
      <button id="nav" type="button" aria-label="Navegador" title="Navegador">${icon('nav')}</button>
      <button id="notes" type="button" aria-label="Inbox" title="Inbox">${icon('notes')}</button>
      <button id="mic" type="button" aria-label="Grabar nota" title="Grabar nota">${icon('mic')}</button>
    </div>
    <div class="rec" id="rec">
      <div class="timer" id="timer">00:00</div>
      <div class="recbuttons">
        <button id="pause" type="button" aria-label="Pausar">${icon('pause')}</button>
        <button class="save" id="save" type="button" aria-label="Guardar">${icon('save')}</button>
        <button class="del" id="discard" type="button" aria-label="Eliminar">${icon('trash')}</button>
      </div>
    </div>
    <section class="drawer" id="drawer" aria-label="Prometeo Inbox">
      <div class="dh">
        <button class="active" id="filterPage" type="button">Esta página</button>
        <button id="filterAll" type="button">Todas</button>
        <span class="syncstate" id="syncstate">local</span>
        <button class="link" id="link" type="button">Vincular</button>
        <button class="close" id="closeDrawer" type="button" aria-label="Cerrar">×</button>
      </div>
      <div class="notes" id="noteList"></div>
      <div class="df">
        <button id="copy" type="button">Copiar visibles</button>
        <button class="patent" id="patent" type="button">Preparar patente</button>
        <div class="count" id="count"></div>
      </div>
    </section>
    <section class="dispatch" id="dispatch">
      <button class="x" id="closeDispatch" type="button">×</button>
      <h3 id="dispatchTitle">Patente lista</h3>
      <p id="dispatchMeta"></p>
      <textarea id="dispatchText" readonly></textarea>
      <div class="buttons">
        <button id="copyPatent" type="button">Copiar</button>
        <button class="chat" id="openChat" type="button">Abrir ChatGPT</button>
      </div>
    </section>
    <section class="linkpanel" id="linkpanel">
      <h3>Vincular dispositivos</h3>
      <p>Copiá este código en tu otro dispositivo. Es privado: quien lo tenga puede acceder a tu Inbox.</p>
      <input id="linkcode" autocomplete="off" spellcheck="false" />
      <div class="buttons">
        <button id="copyLink" type="button">Copiar código</button>
        <button id="applyLink" type="button">Usar código pegado</button>
      </div>
    </section>
    <div class="toast" id="toast"></div>
    <button class="hub" id="hub" type="button" aria-label="Prometeo"><span class="dimple"></span></button>
  `;
  root.appendChild(wrap);

  const $ = id => root.getElementById(id);
  const hub = $('hub'), orbit = $('orbit'), drawer = $('drawer'), noteList = $('noteList');
  const badge = $('badge'), rec = $('rec'), timer = $('timer'), pause = $('pause');
  const filterPage = $('filterPage'), filterAll = $('filterAll'), count = $('count');
  const dispatch = $('dispatch'), linkpanel = $('linkpanel'), syncstate = $('syncstate');

  let filter = 'page';
  let notes = [];
  let page = await resolvePageIdentity();
  let longPressTimer = null, longPressed = false, toastTimer = null, timerRAF = null;
  let lastPlaybackURL = null, syncTimer = null;
  const editTimers = new Map();
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;
  const remote = new PrometeoRemote({ onState: state => renderSyncState(state) });

  const voice = new VoiceQueue({
    workerURL: new URL('../v1/prometeo-voice-worker.js?v=1', baseURL).href,
    onChange: async () => { await refresh(); scheduleSync(); channel?.postMessage({ type: 'changed' }); },
    onRecording: state => renderRecording(state)
  });

  channel?.addEventListener('message', () => refresh());
  await voice.init();
  await refresh();
  remote.init().then(async () => { await pullRemote(); scheduleSync(50); }).catch(() => renderSyncState({ synced:false }));

  hub.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    longPressed = false;
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(async () => { longPressed = true; closeMenus(); await startRecording(); }, 430);
  });
  for (const type of ['pointerup','pointercancel','pointerleave']) hub.addEventListener(type, () => clearTimeout(longPressTimer));
  hub.addEventListener('click', event => {
    if (longPressed) { event.preventDefault(); longPressed = false; return; }
    if (voice.state().active) return;
    drawer.classList.remove('open'); dispatch.classList.remove('show'); linkpanel.classList.remove('show');
    orbit.classList.toggle('open');
  });

  $('mic').addEventListener('click', async () => { closeMenus(); await startRecording(); });
  $('notes').addEventListener('click', () => { orbit.classList.remove('open'); dispatch.classList.remove('show'); linkpanel.classList.remove('show'); drawer.classList.toggle('open'); refresh(); });
  $('nav').addEventListener('click', () => { location.href = '/prometeo/navigator/'; });
  $('closeDrawer').addEventListener('click', () => drawer.classList.remove('open'));
  pause.addEventListener('click', () => voice.pauseResume());
  $('save').addEventListener('click', async () => {
    try {
      await voice.save(pageMeta());
      showToast('Guardado · podés seguir navegando');
      await refresh();
    } catch (error) { showToast(error?.message || 'No pude guardar'); }
  });
  $('discard').addEventListener('click', () => { voice.discard(); showToast('Audio eliminado'); });
  filterPage.addEventListener('click', () => { filter = 'page'; setFilterButtons(); renderNotes(); });
  filterAll.addEventListener('click', () => { filter = 'all'; setFilterButtons(); renderNotes(); });
  $('copy').addEventListener('click', copyVisible);
  $('patent').addEventListener('click', preparePatent);
  $('closeDispatch').addEventListener('click', () => dispatch.classList.remove('show'));
  $('copyPatent').addEventListener('click', () => copyText($('dispatchText').value, 'Patente copiada'));
  $('openChat').addEventListener('click', async () => {
    await copyText($('dispatchText').value, 'Patente copiada');
    window.open('https://chatgpt.com/', '_blank', 'noopener');
  });
  $('link').addEventListener('click', () => {
    drawer.classList.remove('open');
    $('linkcode').value = remote.linkCode();
    linkpanel.classList.add('show');
  });
  $('copyLink').addEventListener('click', () => copyText(remote.linkCode(), 'Código de vínculo copiado'));
  $('applyLink').addEventListener('click', async () => {
    try {
      await remote.importLinkCode($('linkcode').value);
      showToast('Dispositivo vinculado');
      linkpanel.classList.remove('show');
      await pullRemote();
      await refresh();
    } catch (error) { showToast(error?.message || 'Código inválido'); }
  });
  addEventListener('online', () => { remote.init().then(pullRemote).then(() => scheduleSync(50)).catch(() => {}); });
  addEventListener('pagehide', () => voice.close(), { once: true });

  async function startRecording() {
    try {
      await voice.start();
      navigator.vibrate?.(10);
      renderRecording(voice.state());
    } catch (error) {
      showToast(error?.name === 'NotAllowedError' ? 'Permití el micrófono en Chrome' : (error?.message || 'No pude grabar'));
    }
  }

  function renderRecording(state) {
    const active = !!state.active;
    hub.classList.toggle('recording', active && !state.paused);
    hub.classList.toggle('paused', active && state.paused);
    rec.classList.toggle('show', active);
    orbit.classList.remove('open'); drawer.classList.remove('open'); dispatch.classList.remove('show'); linkpanel.classList.remove('show');
    pause.innerHTML = state.paused ? icon('play') : icon('pause');
    if (active) tickTimer(); else { cancelAnimationFrame(timerRAF); timer.textContent = '00:00'; }
  }

  function tickTimer() {
    cancelAnimationFrame(timerRAF);
    const step = () => {
      const state = voice.state(); if (!state.active) return;
      const sec = Math.floor(state.elapsed / 1000);
      timer.textContent = `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
      timerRAF = requestAnimationFrame(step);
    };
    step();
  }

  async function refresh() {
    notes = await listNotes();
    for (const n of notes) if (!n.pageId) n.pageId = inferPageIdFromPath(n.sourcePath);
    renderNotes();
    const pending = notes.filter(n => !['done','error'].includes(n.status)).length;
    const actionable = notes.filter(n => n.status === 'done' && String(n.text||'').trim() && !n.patentedIn).length;
    badge.textContent = pending || actionable || '';
    badge.classList.toggle('show', pending + actionable > 0);
  }

  function visibleNotes() {
    return filter === 'page' ? notes.filter(n => n.pageId === page.id || n.sourcePath === location.pathname) : notes;
  }

  function renderNotes() {
    const visible = visibleNotes();
    const actionable = visible.filter(n => n.status === 'done' && String(n.text||'').trim() && !n.patentedIn).length;
    count.textContent = `${visible.length} ${visible.length===1?'captura':'capturas'} · ${actionable} pendiente${actionable===1?'':'s'}`;
    if (!visible.length) { noteList.innerHTML = '<div class="empty">No hay capturas todavía.<br>Mantené apretado el puck para grabar.</div>'; return; }
    noteList.innerHTML = '';
    for (const note of visible) noteList.appendChild(noteNode(note));
  }

  function noteNode(note) {
    const row = document.createElement('article');
    row.className = `note ${note.status || ''} ${note.patentedIn ? 'patented' : ''}`;
    const state = document.createElement('div'); state.className = 'state';
    if (note.status === 'done') state.textContent = note.patentedIn ? '↗' : '✓';
    else if (note.status === 'error') state.textContent = '!';
    else state.innerHTML = '<span class="spin"></span>';
    const body = document.createElement('div'); body.className = 'body';
    const meta = document.createElement('div'); meta.className = 'meta';
    const path = document.createElement('span'); path.className = 'path'; path.textContent = note.pageId || note.sourcePath || '/';
    const when = document.createElement('span'); when.textContent = note.patentedIn ? `↗ ${note.patentedIn}` : relativeTime(note.created);
    meta.append(path, when); body.append(meta);
    if (note.status === 'done') {
      const ta = document.createElement('textarea'); ta.value = note.text || ''; autoSize(ta);
      ta.addEventListener('input', () => {
        autoSize(ta); clearTimeout(editTimers.get(note.id));
        editTimers.set(note.id, setTimeout(async () => {
          note.text = ta.value;
          note.transcriptRevision = (note.transcriptRevision || 1) + 1;
          note.patentedIn = null; note.patentedAt = null;
          await putNote(note); scheduleSync(50); channel?.postMessage({type:'changed'}); await refresh();
        }, 350));
      });
      body.append(ta);
    } else {
      const pending = document.createElement('div'); pending.className = 'pending'; pending.textContent = statusLabel(note); body.append(pending);
    }
    const acts = document.createElement('div'); acts.className = 'acts';
    if (note.audio) {
      const play = document.createElement('button'); play.type='button'; play.title='Reproducir'; play.innerHTML=icon('play'); play.addEventListener('click',()=>playAudio(note.audio)); acts.append(play);
    }
    const del = document.createElement('button'); del.type='button'; del.className='del'; del.title='Borrar'; del.innerHTML=icon('trash');
    del.addEventListener('click', async () => {
      await removeNote(note.id); renderNotes();
      remote.deleteCapture(note.id).catch(() => {});
      await refresh(); channel?.postMessage({type:'changed'});
    });
    acts.append(del); row.append(state, body, acts); return row;
  }

  async function pullRemote() {
    if (!navigator.onLine) return;
    try {
      renderSyncState({online:true, syncing:true});
      const captures = await remote.listCaptures(null, 300);
      for (const c of captures) {
        const local = await getNote(c.id);
        const remoteRev = Number(c.transcript_revision || 1);
        const localRev = Number(local?.transcriptRevision || 1);
        if (!local || remoteRev > localRev) {
          const merged = {
            ...(local || {}), id:c.id, created:new Date(c.created_at).getTime(),
            status: ['queued','loading','transcribing','preparing','error'].includes(c.status) ? c.status : 'done',
            text:c.transcript || '', audio:local?.audio || null, error:local?.error || '',
            sourcePath:c.source_path, sourceHref:c.source_href, sourceTitle:c.source_title, viewport:c.viewport,
            pageId:c.page_id, transcriptRevision:remoteRev,
            patentedIn:c.status === 'patented' ? (local?.patentedIn || 'patent') : local?.patentedIn
          };
          await putNote(merged);
        }
      }
      await refresh(); renderSyncState({online:true, synced:true});
    } catch (error) { renderSyncState({online:navigator.onLine, synced:false, error}); }
  }

  function scheduleSync(delay = 700) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncAll, delay);
  }

  async function syncAll() {
    if (!navigator.onLine) { renderSyncState({online:false}); return; }
    try {
      renderSyncState({online:true, syncing:true});
      const current = await listNotes();
      for (const note of [...current].reverse()) {
        if (!note.id) continue;
        if (!note.pageId) note.pageId = inferPageIdFromPath(note.sourcePath);
        await remote.syncCapture(note, note.pageId === page.id ? page : { id: note.pageId, source_repo:'JuanManuelPM/prometeo' });
      }
      renderSyncState({online:true, synced:true});
    } catch (error) { renderSyncState({online:true, synced:false, error}); }
  }

  async function preparePatent() {
    const chosen = visibleNotes().filter(n => n.status === 'done' && String(n.text||'').trim() && !n.patentedIn);
    if (!chosen.length) { showToast('No hay capturas nuevas para patentar'); return; }
    try {
      $('patent').disabled = true; $('patent').textContent = 'Preparando…';
      for (const n of chosen) await remote.syncCapture(n, n.pageId === page.id ? page : {id:n.pageId,source_repo:'JuanManuelPM/prometeo'});
      const result = await remote.createPatent(chosen.map(n => n.id));
      for (const n of chosen) { n.patentedIn = result.patent_code; n.patentedAt = Date.now(); await putNote(n); }
      $('dispatchTitle').textContent = result.patent_code;
      $('dispatchMeta').textContent = `${chosen.length} capturas · vence ${new Date(result.expires_at).toLocaleDateString()}`;
      $('dispatchText').value = result.command;
      drawer.classList.remove('open'); dispatch.classList.add('show');
      await refresh(); showToast('Patente creada');
    } catch (error) { showToast(error?.message || 'No pude preparar la patente'); }
    finally { $('patent').disabled = false; $('patent').textContent = 'Preparar patente'; }
  }

  async function copyVisible() {
    const done = visibleNotes().filter(n => n.status === 'done' && String(n.text||'').trim());
    if (!done.length) { showToast('No hay texto listo'); return; }
    const grouped = new Map();
    for (const note of [...done].reverse()) {
      const key = note.pageId || note.sourcePath || '/';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(note);
    }
    let out = 'PROMETEO CAPTURES\n';
    for (const [key, arr] of grouped) {
      out += `\n${key}\n`;
      arr.forEach((n,i)=>{ out += `${i+1}. ${String(n.text).trim()}\n\n`; });
    }
    await copyText(out.trim(), 'Capturas copiadas');
  }

  function renderSyncState(state) {
    if (!state.online) { syncstate.textContent = 'local'; return; }
    if (state.syncing) { syncstate.textContent = '↑'; return; }
    syncstate.textContent = state.synced ? '☁✓' : '☁!';
  }

  function pageMeta() {
    return { sourcePath:location.pathname, sourceHref:location.href, sourceTitle:document.title||location.pathname, viewport:`${innerWidth}x${innerHeight}`, pageId:page.id, transcriptRevision:1 };
  }
  function setFilterButtons(){filterPage.classList.toggle('active',filter==='page');filterAll.classList.toggle('active',filter==='all')}
  function closeMenus(){orbit.classList.remove('open');drawer.classList.remove('open');dispatch.classList.remove('show');linkpanel.classList.remove('show')}
  function playAudio(blob){if(lastPlaybackURL)URL.revokeObjectURL(lastPlaybackURL);lastPlaybackURL=URL.createObjectURL(blob);new Audio(lastPlaybackURL).play().catch(()=>showToast('No pude reproducir'))}
  function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1600)}
  async function copyText(text,ok){try{await navigator.clipboard.writeText(text);showToast(ok)}catch{fallbackCopy(text);showToast(ok)}}
}

async function resolvePageIdentity() {
  const path = location.pathname;
  if (/\/prometeo\/navigator\/?(?:index\.html)?$/.test(path)) return { id:'prometeo-navigator', title:'Prometeo Navigator', href:location.href, public_url:location.href, source_repo:'JuanManuelPM/prometeo', source_entrypoint:'navigator/index.html', manifest_url:'https://juanmanuelpm.github.io/prometeo/navigator/MANIFEST.json' };
  try {
    const r = await fetch(CATALOG_URL, { cache:'no-cache' });
    const catalog = await r.json();
    const here = normalizeURL(location.href);
    for (const p of catalog.pages || []) {
      const target = normalizeURL(new URL(p.href, CATALOG_URL).href);
      if (target === here) {
        const source = parseSource(p.source);
        return { ...p, public_url:new URL(p.href,CATALOG_URL).href, ...source, manifest_url:manifestFor(p.id) };
      }
    }
  } catch {}
  return { id:inferPageIdFromPath(path), title:document.title||path, href:location.href, public_url:location.href, source_repo:'JuanManuelPM/prometeo', source_entrypoint:null, manifest_url:null };
}

function normalizeURL(value){const u=new URL(value,location.href);u.hash='';u.search='';u.pathname=u.pathname.replace(/index\.html$/,'').replace(/\/$/,'');return `${u.origin}${u.pathname}`}
function inferPageIdFromPath(path=''){let p=String(path||'/').replace(/^\/prometeo\/?/,'').replace(/^\/|\/$/g,'').replace(/index\.html$/,'');if(!p)return'prometeo-root';if(p==='navigator')return'prometeo-navigator';return p.replace(/[^a-zA-Z0-9._/-]+/g,'-').replaceAll('/','.')}
function parseSource(source=''){if(!String(source).startsWith('github:'))return{};const parts=String(source).slice(7).split('/');if(parts.length<3)return{};return{source_repo:`${parts[0]}/${parts[1]}`,source_entrypoint:parts.slice(2).join('/')}}
function manifestFor(id){if(id==='calendar')return'https://juanmanuelpm.github.io/prometeo/shared/calendar/v1/MANIFEST.json';if(id==='study-components')return'https://juanmanuelpm.github.io/prometeo/shared/study/v1/contract.json';return null}
function autoSize(el){el.style.height='auto';el.style.height=`${Math.min(210,Math.max(54,el.scrollHeight))}px`}
function relativeTime(ms){if(!ms)return'';const sec=Math.max(0,Math.round((Date.now()-ms)/1000));if(sec<60)return'ahora';const min=Math.round(sec/60);if(min<60)return`${min}m`;const hr=Math.round(min/60);if(hr<24)return`${hr}h`;return`${Math.round(hr/24)}d`}
function statusLabel(note){if(note.status==='preparing')return'Guardando audio…';if(note.status==='queued')return'En cola…';if(note.status==='loading')return'Preparando Whisper…';if(note.status==='transcribing')return'Transcribiendo en español…';if(note.status==='error')return note.error||'Error';return'Procesando…'}
function fallbackCopy(text){const ta=document.createElement('textarea');ta.value=text;Object.assign(ta.style,{position:'fixed',opacity:'0',pointerEvents:'none'});document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}
function icon(name){const icons={nav:'<svg viewBox="0 0 24 24"><path d="M4.5 8.5h6l1.7 2H19.5v8H4.5z"/><path d="M4.5 8.5V6h6l1.5 2.5"/></svg>',notes:'<svg viewBox="0 0 24 24"><path d="M6 4.5h12v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',mic:'<svg viewBox="0 0 24 24"><rect x="9" y="4" width="6" height="11" rx="3"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6"/></svg>',pause:'<svg viewBox="0 0 24 24"><path d="M9 7v10M15 7v10"/></svg>',play:'<svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6z"/></svg>',save:'<svg viewBox="0 0 24 24"><path d="M5 5h14v14H5zM8 5v5h8V5M8 16h8"/></svg>',trash:'<svg viewBox="0 0 24 24"><path d="M7 8h10l-1 11H8zM9 8V5h6v3M5 8h14"/></svg>'};return icons[name]||''}
