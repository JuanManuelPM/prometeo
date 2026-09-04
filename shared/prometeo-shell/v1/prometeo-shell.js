import { listNotes, putNote, removeNote } from './db.js';
import { VoiceQueue } from './voice.js';

const ENABLE_KEY = 'prometeo.shell.enabled.v1';
const CHANNEL = 'prometeo-global-notes-v1';
const baseURL = new URL('./', import.meta.url);

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
  boot().catch(error => console.error('[Prometeo shell]', error));
}

async function boot() {
  const host = document.createElement('div');
  host.id = 'prometeo-global-shell';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;';
  document.documentElement.appendChild(host);

  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('shell.css?v=1', baseURL).href;
  root.appendChild(style);

  const wrap = document.createElement('div');
  wrap.className = 's';
  wrap.innerHTML = `
    <div class="badge" id="badge"></div>
    <div class="orbit" id="orbit" aria-hidden="true">
      <button class="orb orb-nav" id="nav" type="button" aria-label="Navegador" title="Navegador">${icon('nav')}</button>
      <button class="orb orb-notes" id="notes" type="button" aria-label="Notas" title="Notas">${icon('notes')}</button>
      <button class="orb orb-mic" id="mic" type="button" aria-label="Grabar nota" title="Grabar nota">${icon('mic')}</button>
    </div>
    <div class="rec" id="rec">
      <div class="timer" id="timer">00:00</div>
      <div class="recbuttons">
        <button id="pause" type="button" aria-label="Pausar">${icon('pause')}</button>
        <button class="save" id="save" type="button" aria-label="Guardar">${icon('save')}</button>
        <button class="del" id="discard" type="button" aria-label="Eliminar">${icon('trash')}</button>
      </div>
    </div>
    <section class="drawer" id="drawer" aria-label="Notas de Prometeo">
      <div class="dh">
        <button class="active" id="filterPage" type="button">Esta página</button>
        <button id="filterAll" type="button">Todas</button>
        <button class="close" id="closeDrawer" type="button" aria-label="Cerrar">×</button>
      </div>
      <div class="notes" id="noteList"></div>
      <div class="df">
        <button class="copy" id="copy" type="button">Copiar visibles</button>
        <div class="count" id="count"></div>
      </div>
    </section>
    <div class="toast" id="toast"></div>
    <button class="hub" id="hub" type="button" aria-label="Prometeo"><span class="dimple"></span></button>
  `;
  root.appendChild(wrap);

  const $ = id => root.getElementById(id);
  const hub = $('hub');
  const orbit = $('orbit');
  const drawer = $('drawer');
  const noteList = $('noteList');
  const badge = $('badge');
  const rec = $('rec');
  const timer = $('timer');
  const pause = $('pause');
  const filterPage = $('filterPage');
  const filterAll = $('filterAll');
  const count = $('count');

  let filter = 'page';
  let notes = [];
  let longPressTimer = null;
  let longPressed = false;
  let toastTimer = null;
  let timerRAF = null;
  let lastPlaybackURL = null;
  const editTimers = new Map();
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;

  const voice = new VoiceQueue({
    workerURL: new URL('prometeo-voice-worker.js?v=1', baseURL).href,
    onChange: async () => {
      await refresh();
      channel?.postMessage({ type: 'changed' });
    },
    onRecording: state => renderRecording(state)
  });

  channel?.addEventListener('message', () => refresh());
  await voice.init();
  await refresh();

  hub.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    longPressed = false;
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(async () => {
      longPressed = true;
      closeMenus();
      await startRecording();
    }, 430);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) hub.addEventListener(type, () => clearTimeout(longPressTimer));
  hub.addEventListener('click', event => {
    if (longPressed) { event.preventDefault(); longPressed = false; return; }
    if (voice.state().active) return;
    drawer.classList.remove('open');
    orbit.classList.toggle('open');
    orbit.setAttribute('aria-hidden', orbit.classList.contains('open') ? 'false' : 'true');
  });

  $('mic').addEventListener('click', async () => { closeMenus(); await startRecording(); });
  $('notes').addEventListener('click', () => { orbit.classList.remove('open'); drawer.classList.toggle('open'); refresh(); });
  $('nav').addEventListener('click', () => { location.href = '/prometeo/navigator/'; });
  $('closeDrawer').addEventListener('click', () => drawer.classList.remove('open'));
  pause.addEventListener('click', () => voice.pauseResume());
  $('save').addEventListener('click', async () => {
    try {
      await voice.save(pageMeta());
      showToast('Guardado · transcribiendo');
      await refresh();
    } catch (error) { showToast(error?.message || 'No pude guardar'); }
  });
  $('discard').addEventListener('click', () => { voice.discard(); showToast('Audio eliminado'); });
  filterPage.addEventListener('click', () => { filter = 'page'; setFilterButtons(); renderNotes(); });
  filterAll.addEventListener('click', () => { filter = 'all'; setFilterButtons(); renderNotes(); });
  $('copy').addEventListener('click', copyVisible);
  addEventListener('pagehide', () => voice.close(), { once: true });

  async function startRecording() {
    try {
      await voice.start();
      navigator.vibrate?.(10);
      renderRecording(voice.state());
    } catch (error) {
      const message = error?.name === 'NotAllowedError' ? 'Permití el micrófono en Chrome' : (error?.message || 'No pude grabar');
      showToast(message);
    }
  }

  function renderRecording(state) {
    const active = !!state.active;
    hub.classList.toggle('recording', active && !state.paused);
    hub.classList.toggle('paused', active && state.paused);
    rec.classList.toggle('show', active);
    orbit.classList.remove('open');
    drawer.classList.remove('open');
    pause.innerHTML = state.paused ? icon('play') : icon('pause');
    pause.setAttribute('aria-label', state.paused ? 'Seguir' : 'Pausar');
    if (active) tickTimer(); else { cancelAnimationFrame(timerRAF); timer.textContent = '00:00'; }
  }

  function tickTimer() {
    cancelAnimationFrame(timerRAF);
    const step = () => {
      const state = voice.state();
      if (!state.active) return;
      const sec = Math.floor(state.elapsed / 1000);
      timer.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
      timerRAF = requestAnimationFrame(step);
    };
    step();
  }

  async function refresh() {
    notes = await listNotes();
    renderNotes();
    const pending = notes.filter(n => !['done', 'error'].includes(n.status)).length;
    if (pending) {
      badge.textContent = pending;
      badge.classList.add('show');
    } else {
      const pageDone = notes.filter(n => n.status === 'done' && n.sourcePath === location.pathname).length;
      badge.textContent = pageDone || '';
      badge.classList.toggle('show', pageDone > 0);
    }
  }

  function visibleNotes() { return filter === 'page' ? notes.filter(n => n.sourcePath === location.pathname) : notes; }

  function renderNotes() {
    const visible = visibleNotes();
    count.textContent = `${visible.length} ${visible.length === 1 ? 'nota' : 'notas'}`;
    if (!visible.length) { noteList.innerHTML = '<div class="empty">No hay notas todavía.</div>'; return; }
    noteList.innerHTML = '';
    for (const note of visible) noteList.appendChild(noteNode(note));
  }

  function noteNode(note) {
    const row = document.createElement('article');
    row.className = `note ${note.status || ''}`;
    const state = document.createElement('div');
    state.className = 'state';
    if (note.status === 'done') state.textContent = '✓';
    else if (note.status === 'error') state.textContent = '!';
    else state.innerHTML = '<span class="spin"></span>';

    const body = document.createElement('div');
    body.className = 'body';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const path = document.createElement('span');
    path.className = 'path';
    path.textContent = note.sourcePath || '/';
    const when = document.createElement('span');
    when.textContent = relativeTime(note.created);
    meta.append(path, when);
    body.append(meta);

    if (note.status === 'done') {
      const ta = document.createElement('textarea');
      ta.value = note.text || '';
      ta.setAttribute('aria-label', 'Texto de la nota');
      autoSize(ta);
      ta.addEventListener('input', () => {
        autoSize(ta);
        clearTimeout(editTimers.get(note.id));
        editTimers.set(note.id, setTimeout(async () => {
          note.text = ta.value;
          await putNote(note);
          channel?.postMessage({ type: 'changed' });
        }, 350));
      });
      body.append(ta);
    } else {
      const pending = document.createElement('div');
      pending.className = 'pending';
      pending.textContent = statusLabel(note);
      body.append(pending);
    }

    const acts = document.createElement('div');
    acts.className = 'acts';
    if (note.audio) {
      const play = document.createElement('button');
      play.type = 'button';
      play.title = 'Reproducir audio';
      play.innerHTML = icon('play');
      play.addEventListener('click', () => playAudio(note.audio));
      acts.append(play);
    }
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'del';
    del.title = 'Borrar';
    del.innerHTML = icon('trash');
    del.addEventListener('click', async () => {
      await removeNote(note.id);
      await refresh();
      channel?.postMessage({ type: 'changed' });
    });
    acts.append(del);
    row.append(state, body, acts);
    return row;
  }

  async function copyVisible() {
    const done = visibleNotes().filter(n => n.status === 'done' && String(n.text || '').trim());
    if (!done.length) { showToast('No hay texto listo'); return; }
    const grouped = new Map();
    for (const note of [...done].reverse()) {
      const key = note.sourcePath || '/';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(note);
    }
    let out = 'PROMETEO NOTES\n';
    for (const [path, arr] of grouped) {
      out += `\n${path}\n`;
      arr.forEach((n, i) => { out += `${i + 1}. ${String(n.text).trim()}\n\n`; });
    }
    try { await navigator.clipboard.writeText(out.trim()); showToast('Notas copiadas'); }
    catch { fallbackCopy(out.trim()); }
  }

  function playAudio(blob) {
    if (lastPlaybackURL) URL.revokeObjectURL(lastPlaybackURL);
    lastPlaybackURL = URL.createObjectURL(blob);
    new Audio(lastPlaybackURL).play().catch(() => showToast('No pude reproducir el audio'));
  }

  function setFilterButtons() {
    filterPage.classList.toggle('active', filter === 'page');
    filterAll.classList.toggle('active', filter === 'all');
  }

  function closeMenus() { orbit.classList.remove('open'); drawer.classList.remove('open'); }

  function pageMeta() {
    return {
      sourcePath: location.pathname,
      sourceHref: location.href,
      sourceTitle: document.title || location.pathname,
      viewport: `${innerWidth}x${innerHeight}`
    };
  }

  function showToast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    Object.assign(ta.style, { position: 'fixed', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    showToast(ok ? 'Notas copiadas' : 'No pude copiar');
  }
}

function autoSize(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(220, Math.max(64, el.scrollHeight))}px`;
}

function relativeTime(ms) {
  if (!ms) return '';
  const sec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (sec < 60) return 'ahora';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

function statusLabel(note) {
  if (note.status === 'preparing') return 'Guardando audio…';
  if (note.status === 'queued') return 'En cola…';
  if (note.status === 'loading') return 'Preparando Whisper…';
  if (note.status === 'transcribing') return 'Transcribiendo en español…';
  if (note.status === 'error') return note.error || 'Error';
  return 'Procesando…';
}

function icon(name) {
  const icons = {
    nav: '<svg viewBox="0 0 24 24"><path d="M4.5 8.5h6l1.7 2H19.5v8H4.5z"/><path d="M4.5 8.5V6h6l1.5 2.5"/></svg>',
    notes: '<svg viewBox="0 0 24 24"><path d="M6 4.5h12v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M9 21h6"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 6v12M16 6v12"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M9 6l9 6-9 6z"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M7 8h10M9 8V6h6v2M9 11v6M15 11v6M8 8l1 11h6l1-11"/></svg>'
  };
  return icons[name] || '';
}
