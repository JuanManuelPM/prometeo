import {
  AsyncJobQueue,
  CAPTURE_CONFIG,
  cleanText,
  formatClock,
  mergeSegments,
  planWindows,
  qualityGate,
  transcriptDocument
} from './core.mjs';

const TRANSCRIBE_URL = 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/study-transcribe-v1';
const DB_NAME = 'prometeo-audio-to-text-v1';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';
const BLOB_STORE = 'blobs';
const ACTIVE_MIC_STATES = new Set(['RECORDING', 'LIVE_TRANSCRIBING']);
const ACTIVE_FILE_STATES = new Set(['UPLOADING_FILE', 'TRANSCRIBING_FILE']);
const FRIENDLY_STATE = {
  IDLE: 'Listo para escuchar',
  REQUESTING_MIC: 'Abriendo micrófono…',
  RECORDING: 'Grabando',
  PAUSED: 'Pausado',
  LIVE_TRANSCRIBING: 'Grabando · el texto está apareciendo',
  CANONICALIZING: 'Acomodando texto…',
  UPLOADING_FILE: 'Preparando audio…',
  TRANSCRIBING_FILE: 'Transcribiendo…',
  MERGING: 'Unificando texto…',
  DONE: 'Listo',
  ERROR_RECOVERABLE: 'Hay algo para recuperar'
};

const $ = id => document.getElementById(id);
const ui = {
  recordShell: $('recordShell'), recordMain: $('recordMain'), recordIcon: $('recordIcon'), recDot: $('recDot'),
  recordLabel: $('recordLabel'), timer: $('timer'), pauseBtn: $('pauseBtn'), stopBtn: $('stopBtn'), discardBtn: $('discardBtn'),
  micHint: $('micHint'), fileInput: $('fileInput'), fileTrigger: $('fileTrigger'), fileName: $('fileName'),
  fileProgress: $('fileProgress'), phase: $('phase'), percentage: $('percentage'), progressFill: $('progressFill'), chunkCount: $('chunkCount'),
  resumeBtn: $('resumeBtn'), retryBtn: $('retryBtn'), errorLine: $('errorLine'),
  docTitle: $('docTitle'), transcriptPlaceholder: $('transcriptPlaceholder'), canonical: $('canonical'), provisional: $('provisional'),
  editor: $('editor'), actions: $('actions'), copyBtn: $('copyBtn'), txtBtn: $('txtBtn'), jsonBtn: $('jsonBtn'), newBtn: $('newBtn'),
  debugState: $('debugState'), debugSession: $('debugSession'), debugBackend: $('debugBackend'), debugStorage: $('debugStorage'),
  debugSpeech: $('debugSpeech'), debugMedia: $('debugMedia'), clearLocalBtn: $('clearLocalBtn')
};

let dbPromise = null;
let session = null;
let uiState = 'IDLE';
let stateDetail = '';
let micStream = null;
let masterRecorder = null;
let masterPersistChain = Promise.resolve();
let masterSeq = 0;
let canonicalInterval = null;
let canonicalPart = 1;
let canonicalOrdinal = 0;
let activeCanonical = new Map();
let micBaseMs = 0;
let micStartedAt = 0;
let speech = null;
let speechFinal = '';
let speechInterim = '';
let editorSaveTimer = null;
let fileRuntime = null;
let renderTimer = null;
let backendInfo = null;
const scheduledJobs = new Set();
const deletedSessionIds = new Set();

const queue = new AsyncJobQueue(transcribeJob, 2);
queue.onChange = render;

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const nowISO = () => new Date().toISOString();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) db.createObjectStore(SESSION_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BLOB_STORE)) db.createObjectStore(BLOB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function dbPut(store, value, key = undefined) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    if (key === undefined) os.put(value); else os.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB abortó la operación'));
  });
}

async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function persistSessionObject(target) {
  if (!target || deletedSessionIds.has(target.id)) return;
  target.updated_at = nowISO();
  await dbPut(SESSION_STORE, structuredClone(target));
}

async function saveSession() {
  if (!session) return;
  await persistSessionObject(session);
  render();
}

async function persistBlob(key, blob) {
  await dbPut(BLOB_STORE, blob, key);
}

async function requestDurableStorage() {
  try { return await navigator.storage?.persist?.(); } catch { return false; }
}

async function storageSummary() {
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const pct = quota ? Math.round(usage / quota * 100) : 0;
    return `${Math.round(usage / 1048576)} MB / ${Math.round(quota / 1048576)} MB · ${pct}%`;
  } catch { return 'sin dato'; }
}

function setState(next, detail = '') {
  uiState = next;
  stateDetail = detail;
  if (session) {
    session.status = next;
    session.status_detail = detail;
  }
  render();
}

function currentMicElapsed() {
  if (!session || session.kind !== 'microphone') return 0;
  if (ACTIVE_MIC_STATES.has(uiState) && micStartedAt) return micBaseMs + (performance.now() - micStartedAt);
  return Number(session.duration_ms || micBaseMs || 0);
}

function activeText() {
  if (!session) return '';
  return cleanText(session.edited_text ?? mergeSegments(session.segments || [], { durationMs: session.duration_ms || 0 }));
}

function render() {
  const hasSession = !!session;
  const micActive = ACTIVE_MIC_STATES.has(uiState);
  const paused = uiState === 'PAUSED';
  const request = uiState === 'REQUESTING_MIC';
  const busyFile = ACTIVE_FILE_STATES.has(uiState);
  const finishing = uiState === 'CANONICALIZING' || uiState === 'MERGING';
  const elapsed = micActive ? currentMicElapsed() : Number(session?.duration_ms || 0);

  ui.recordShell.dataset.state = uiState.toLowerCase();
  ui.recordShell.classList.toggle('expanded', micActive || paused || request);
  ui.recordMain.disabled = busyFile || finishing;
  ui.pauseBtn.hidden = !(micActive || paused);
  ui.stopBtn.hidden = !(micActive || paused);
  ui.discardBtn.hidden = !(micActive || paused);
  ui.recDot.hidden = !micActive;
  ui.timer.hidden = !(micActive || paused);
  ui.timer.textContent = formatClock(elapsed, elapsed >= 3600000);

  if (request) ui.recordLabel.textContent = 'Permiso…';
  else if (paused) ui.recordLabel.textContent = 'Continuar';
  else if (micActive) ui.recordLabel.textContent = 'Pausar';
  else ui.recordLabel.textContent = 'Grabar';

  ui.recordIcon.innerHTML = micActive
    ? '<path d="M8 6h3v12H8zM13 6h3v12h-3z" fill="currentColor" stroke="none"/>'
    : paused
      ? '<path d="M8 5l10 7-10 7z" fill="currentColor" stroke="none"/>'
      : '<rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4M9 21h6"></path>';

  const friendly = FRIENDLY_STATE[uiState] || FRIENDLY_STATE.IDLE;
  ui.micHint.textContent = stateDetail || friendly;

  const segments = session?.segments || [];
  const ready = segments.filter(s => s.status === 'ready').length;
  const errors = segments.filter(s => s.status === 'error').length;
  const working = segments.filter(s => ['queued', 'transcribing'].includes(s.status)).length;
  const pending = segments.filter(s => s.status === 'pending').length;
  const total = segments.length;
  const completed = ready + errors;
  const pct = total ? Math.min(100, Math.round(completed / total * 100)) : 0;

  ui.fileProgress.hidden = !(session?.kind === 'file');
  if (session?.kind === 'file') {
    ui.fileName.textContent = session.source?.name || session.title || 'Audio';
    let phase = FRIENDLY_STATE[uiState] || 'Preparando…';
    if (uiState === 'ERROR_RECOVERABLE' && errors) phase = `${errors} fragmento${errors === 1 ? '' : 's'} para reintentar`;
    else if (uiState === 'ERROR_RECOVERABLE' && pending) phase = 'Listo para continuar';
    ui.phase.textContent = phase;
    ui.percentage.textContent = `${pct}%`;
    ui.progressFill.style.width = `${pct}%`;
    ui.chunkCount.textContent = total ? `${completed} / ${total} bloques${working ? ` · ${working} en proceso` : ''}` : 'Preparando…';
  }

  const canonical = hasSession ? mergeSegments(segments, { durationMs: session.duration_ms || 0, includeGaps: false }) : '';
  ui.canonical.textContent = canonical;
  const provisional = micActive ? cleanText(`${speechFinal} ${speechInterim}`, 1800) : '';
  ui.provisional.textContent = provisional;
  ui.provisional.hidden = !provisional;
  ui.transcriptPlaceholder.hidden = !!(canonical || provisional || session?.edited_text);

  const doneLike = hasSession && ['DONE', 'ERROR_RECOVERABLE'].includes(uiState) && !micActive && !busyFile && !finishing;
  ui.editor.hidden = !doneLike;
  ui.canonical.hidden = doneLike;
  ui.provisional.hidden = doneLike || !provisional;
  ui.actions.hidden = !doneLike || !activeText();
  if (doneLike && document.activeElement !== ui.editor) {
    const value = session.edited_text ?? mergeSegments(segments, { durationMs: session.duration_ms || 0 });
    if (ui.editor.value !== value) ui.editor.value = value;
    autoGrow(ui.editor);
  }

  ui.docTitle.value = session?.title || 'Transcripción';
  ui.docTitle.disabled = !hasSession;
  ui.resumeBtn.hidden = !(hasSession && uiState === 'ERROR_RECOVERABLE' && (pending > 0 || session.interrupted));
  ui.retryBtn.hidden = !(hasSession && errors > 0);
  ui.retryBtn.textContent = errors ? `Reintentar ${errors}` : 'Reintentar';
  ui.errorLine.textContent = session?.last_error || '';
  ui.errorLine.hidden = !session?.last_error;
  ui.newBtn.hidden = !hasSession || micActive || paused || request || busyFile || finishing;

  ui.fileTrigger.classList.toggle('disabled', micActive || paused || request || finishing || busyFile);
  ui.fileInput.disabled = micActive || paused || request || finishing || busyFile;

  ui.debugState.textContent = uiState;
  ui.debugSession.textContent = session?.id || '—';
  ui.debugBackend.textContent = backendInfo ? `${backendInfo.service || 'Whisper'} · ${backendInfo.primary_model || 'whisper-large-v3'}` : 'comprobando…';
  ui.debugSpeech.textContent = (window.SpeechRecognition || window.webkitSpeechRecognition) ? 'SpeechRecognition disponible' : 'sin SpeechRecognition; audio canónico sigue disponible';
  ui.debugMedia.textContent = window.MediaRecorder ? 'MediaRecorder disponible' : 'MediaRecorder no disponible';
}

function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(220, textarea.scrollHeight + 4)}px`;
}

function microphoneTitle() {
  const d = new Date();
  const date = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
  return `Grabación · ${date}`;
}

function newSession(kind, source = null) {
  const id = uuid();
  return {
    schema: 'prometeo.audio-transcription-session/v1',
    id,
    kind,
    title: kind === 'file' ? (source?.name || 'Audio') : microphoneTitle(),
    language: 'es-AR',
    created_at: nowISO(),
    updated_at: nowISO(),
    duration_ms: 0,
    status: 'IDLE',
    status_detail: '',
    source,
    segments: [],
    master_keys: [],
    master_seq: 0,
    edited_text: null,
    last_error: null,
    interrupted: false,
    file_cursor_ms: 0
  };
}

function pickMime() {
  if (!window.MediaRecorder) return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    .find(type => MediaRecorder.isTypeSupported?.(type)) || '';
}

async function startMic({ resume = false } = {}) {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    return recoverable('Este navegador no puede grabar audio con MediaRecorder.');
  }
  if (!window.isSecureContext) return recoverable('El micrófono necesita una página HTTPS.');
  if (fileRuntime) return;

  if (!resume || !session || session.kind !== 'microphone') {
    session = newSession('microphone', { kind: 'microphone', ref: null, mime_type: null });
    await saveSession();
  }
  session.interrupted = false;
  session.last_error = null;
  setState('REQUESTING_MIC');
  await saveSession();
  try {
    await requestDurableStorage();
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    session.source.mime_type = pickMime() || 'audio/webm';
    session.source.ref = `indexeddb://${DB_NAME}/master/${session.id}`;
    masterSeq = Number(session.master_seq || session.master_keys?.length || 0);
    const maxPart = Math.max(1, ...session.segments.map(s => Number(s.segment_no || 1)), 1);
    canonicalPart = resume && session.segments.length ? maxPart + 1 : maxPart;
    canonicalOrdinal = 0;
    micBaseMs = Number(session.duration_ms || 0);
    micStartedAt = performance.now();
    setState('RECORDING');
    startMasterRecorder();
    startCanonicalCapture();
    startSpeechRecognition();
    await saveSession();
  } catch (error) {
    releaseMic();
    const msg = error?.name === 'NotAllowedError'
      ? 'Permití el micrófono para empezar.'
      : `No pude abrir el micrófono: ${error?.message || error}`;
    recoverable(msg);
  }
}

function startMasterRecorder() {
  if (!micStream?.active) return;
  const mime = pickMime();
  masterRecorder = new MediaRecorder(micStream, mime ? { mimeType: mime } : undefined);
  masterRecorder.ondataavailable = event => {
    if (!event.data?.size || !session) return;
    const blob = event.data;
    const seq = ++masterSeq;
    const key = `master:${session.id}:${String(seq).padStart(6, '0')}`;
    masterPersistChain = masterPersistChain.then(async () => {
      await persistBlob(key, blob);
      if (!session) return;
      session.master_seq = seq;
      if (!session.master_keys.includes(key)) session.master_keys.push(key);
      await saveSession();
    }).catch(error => {
      if (session) {
        session.last_error = `No pude guardar una parte del audio maestro: ${error?.message || error}`;
        render();
      }
    });
  };
  masterRecorder.onerror = event => {
    if (session) session.last_error = event?.error?.message || 'La grabación maestra tuvo un error; los bloques ya guardados siguen disponibles.';
    render();
  };
  masterRecorder.start(CAPTURE_CONFIG.masterSliceMs);
}

function pauseMasterRecorder() {
  if (masterRecorder?.state === 'recording') {
    try { masterRecorder.requestData(); } catch {}
    try { masterRecorder.pause(); } catch {}
  }
}

function resumeMasterRecorder() {
  if (masterRecorder?.state === 'paused') {
    try { masterRecorder.resume(); } catch {}
  } else if (!masterRecorder || masterRecorder.state === 'inactive') startMasterRecorder();
}

function stopMasterRecorder() {
  if (!masterRecorder || masterRecorder.state === 'inactive') return Promise.resolve();
  return new Promise(resolve => {
    masterRecorder.addEventListener('stop', resolve, { once: true });
    try { masterRecorder.requestData(); } catch {}
    try { masterRecorder.stop(); } catch { resolve(); }
  });
}

function nextSeq() {
  return Math.max(0, ...(session?.segments || []).map(s => Number(s.seq || 0))) + 1;
}

function startCanonicalCapture() {
  stopCanonicalLaunches();
  canonicalOrdinal = 0;
  launchCanonicalWindow();
  canonicalInterval = setInterval(launchCanonicalWindow, CAPTURE_CONFIG.stepMs);
}

function stopCanonicalLaunches() {
  if (canonicalInterval) clearInterval(canonicalInterval);
  canonicalInterval = null;
}

function launchCanonicalWindow() {
  if (!micStream?.active || !session || !ACTIVE_MIC_STATES.has(uiState) && uiState !== 'RECORDING') return;
  const mime = pickMime();
  let recorder;
  try { recorder = new MediaRecorder(micStream, mime ? { mimeType: mime } : undefined); }
  catch (error) { session.last_error = `No pude abrir una ventana de audio: ${error?.message || error}`; render(); return; }

  const id = uuid();
  const seq = nextSeq();
  const startMs = Math.round(currentMicElapsed());
  canonicalOrdinal += 1;
  const slot = {
    id, seq, recorder, pieces: [], startMs, segmentNo: canonicalPart,
    overlapMs: canonicalOrdinal > 1 ? CAPTURE_CONFIG.overlapMs : 0,
    timer: null, done: null, resolveDone: null
  };
  slot.done = new Promise(resolve => { slot.resolveDone = resolve; });
  activeCanonical.set(id, slot);
  recorder.ondataavailable = event => { if (event.data?.size) slot.pieces.push(event.data); };
  recorder.onerror = event => {
    if (session) session.last_error = event?.error?.message || 'Una ventana de audio tuvo un error.';
  };
  recorder.onstop = () => finalizeMicWindow(slot).finally(() => slot.resolveDone?.());
  try {
    recorder.start();
    slot.timer = setTimeout(() => { try { if (recorder.state !== 'inactive') recorder.stop(); } catch {} }, CAPTURE_CONFIG.windowMs);
  } catch (error) {
    activeCanonical.delete(id);
    clearTimeout(slot.timer);
    slot.resolveDone?.();
    session.last_error = `No pude iniciar una ventana de audio: ${error?.message || error}`;
  }
}

async function finalizeMicWindow(slot) {
  clearTimeout(slot.timer);
  activeCanonical.delete(slot.id);
  if (!session) return;
  const endMs = Math.round(currentMicElapsed());
  const duration = Math.max(0, endMs - slot.startMs);
  const blob = new Blob(slot.pieces, { type: slot.recorder.mimeType || slot.pieces[0]?.type || 'audio/webm' });
  if (blob.size < 256 || duration < CAPTURE_CONFIG.minWindowMs) return;
  const audioKey = `chunk:${session.id}:${slot.id}`;
  const segment = {
    id: slot.id, seq: slot.seq, segment_no: slot.segmentNo, start_ms: slot.startMs, end_ms: endMs,
    overlap_ms: slot.overlapMs, capture_window_ms: duration, capture_version: CAPTURE_CONFIG.captureVersion,
    status: 'queued', transcript: '', source: 'whisper-large-v3', quality: null, error: null,
    audio_key: audioKey, mime_type: blob.type, byte_size: blob.size, created_at: nowISO(), attempt: 0
  };
  await persistBlob(audioKey, blob);
  session.segments.push(segment);
  await saveSession();
  enqueueSegment(segment.id);
}

async function stopCanonicalWindows() {
  stopCanonicalLaunches();
  const slots = [...activeCanonical.values()];
  for (const slot of slots) {
    clearTimeout(slot.timer);
    try { if (slot.recorder.state !== 'inactive') slot.recorder.stop(); } catch { slot.resolveDone?.(); }
  }
  await Promise.all(slots.map(slot => slot.done));
}

function startSpeechRecognition() {
  stopSpeechRecognition();
  speechFinal = '';
  speechInterim = '';
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { render(); return; }
  try {
    speech = new SR();
    speech.lang = CAPTURE_CONFIG.locale;
    speech.continuous = true;
    speech.interimResults = true;
    speech.maxAlternatives = 1;
    speech.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const value = `${event.results[i][0]?.transcript || ''} `;
        if (event.results[i].isFinal) speechFinal = cleanText(`${speechFinal} ${value}`, 1400);
        else interim += value;
      }
      speechInterim = cleanText(interim, 700);
      if (ACTIVE_MIC_STATES.has(uiState) || uiState === 'RECORDING') uiState = 'LIVE_TRANSCRIBING';
      render();
    };
    speech.onerror = () => {};
    speech.onend = () => {
      if (session?.kind === 'microphone' && ACTIVE_MIC_STATES.has(uiState) && micStream?.active) {
        try { speech.start(); } catch {}
      }
    };
    speech.start();
  } catch { speech = null; }
}

function stopSpeechRecognition() {
  if (speech) {
    speech.onend = null;
    try { speech.stop(); } catch {}
    speech = null;
  }
  speechInterim = '';
}

async function pauseMic() {
  if (!session || !ACTIVE_MIC_STATES.has(uiState)) return;
  session.duration_ms = Math.round(currentMicElapsed());
  micBaseMs = session.duration_ms;
  micStartedAt = 0;
  setState('PAUSED');
  stopSpeechRecognition();
  pauseMasterRecorder();
  await stopCanonicalWindows();
  await saveSession();
}

async function resumeMic() {
  if (!session || uiState !== 'PAUSED') return;
  canonicalPart += 1;
  canonicalOrdinal = 0;
  micBaseMs = Number(session.duration_ms || 0);
  micStartedAt = performance.now();
  resumeMasterRecorder();
  setState('RECORDING');
  startCanonicalCapture();
  startSpeechRecognition();
  await saveSession();
}

async function finishMic() {
  if (!session || !(ACTIVE_MIC_STATES.has(uiState) || uiState === 'PAUSED')) return;
  if (ACTIVE_MIC_STATES.has(uiState)) session.duration_ms = Math.round(currentMicElapsed());
  micBaseMs = Number(session.duration_ms || 0);
  micStartedAt = 0;
  stopSpeechRecognition();
  setState('CANONICALIZING', 'Terminando los últimos bloques…');
  const canonicalDone = stopCanonicalWindows();
  const masterDone = stopMasterRecorder();
  await Promise.all([canonicalDone, masterDone]);
  await masterPersistChain.catch(() => {});
  releaseMic();
  await saveSession();
  await queue.whenIdle();
  await finishAfterQueue();
}

function releaseMic() {
  try { micStream?.getTracks().forEach(track => track.stop()); } catch {}
  micStream = null;
  masterRecorder = null;
}

async function discardMic() {
  if (!session || session.kind !== 'microphone') return;
  stopSpeechRecognition();
  stopCanonicalLaunches();
  for (const slot of activeCanonical.values()) {
    clearTimeout(slot.timer);
    try { slot.recorder.onstop = null; slot.recorder.stop(); } catch {}
  }
  activeCanonical.clear();
  try { if (masterRecorder && masterRecorder.state !== 'inactive') masterRecorder.stop(); } catch {}
  releaseMic();
  await deleteCurrentSession();
}

function enqueueSegment(segmentId) {
  if (!session || scheduledJobs.has(segmentId)) return;
  const segment = session.segments.find(s => s.id === segmentId);
  if (!segment || !segment.audio_key || !['queued', 'transcribing'].includes(segment.status)) return;
  scheduledJobs.add(segmentId);
  queue.push({ sessionId: session.id, segmentId });
}

async function transcribeJob(job) {
  const target = session;
  try {
    if (!target || target.id !== job.sessionId || deletedSessionIds.has(job.sessionId)) return;
    const segment = target.segments.find(s => s.id === job.segmentId);
    if (!segment) return;
    const blob = await dbGet(BLOB_STORE, segment.audio_key);
    if (!blob) throw Object.assign(new Error('El bloque de audio local ya no está disponible.'), { nonRetryable: true });
    segment.status = 'transcribing';
    segment.error = null;
    await persistSessionObject(target);
    if (session?.id === target.id) render();

    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (deletedSessionIds.has(target.id)) return;
        segment.attempt = attempt;
        const form = new FormData();
        const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('wav') ? 'wav' : 'webm';
        form.append('audio', blob, `audio-${segment.seq}.${ext}`);
        const values = {
          mode: 'standalone', client_session_id: target.id, chunk_id: segment.id,
          participant_id: 'local-user', participant_name: 'Audio', segment_no: segment.segment_no || 1,
          seq: segment.seq, start_ms: segment.start_ms, end_ms: segment.end_ms,
          overlap_ms: segment.overlap_ms || 0, capture_window_ms: segment.capture_window_ms || (segment.end_ms - segment.start_ms),
          capture_version: segment.capture_version || CAPTURE_CONFIG.captureVersion,
          audio_chunk_id: segment.audio_key, language: CAPTURE_CONFIG.language, locale: CAPTURE_CONFIG.locale
        };
        for (const [key, value] of Object.entries(values)) form.append(key, String(value));
        const response = await fetch(TRANSCRIBE_URL, { method: 'POST', body: form });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          const error = Object.assign(new Error(data.detail || data.error || `Transcripción ${response.status}`), { status: response.status });
          throw error;
        }
        const quality = qualityGate(data.transcript || '');
        if (quality.bad) throw Object.assign(new Error(`QUALITY_GATE_CLIENT ${quality.reasons.join(',')}`), { status: 422, nonRetryable: true });
        if (deletedSessionIds.has(target.id)) return;
        segment.status = 'ready';
        segment.transcript = cleanText(data.transcript || '');
        segment.source = data.source || 'whisper-large-v3';
        segment.quality = data.quality || quality;
        segment.error = null;
        segment.finished_processing_at = nowISO();
        await persistSessionObject(target);
        if (session?.id === target.id) render();
        return;
      } catch (error) {
        lastError = error;
        const status = Number(error?.status || 0);
        const transient = !error?.nonRetryable && (!status || status === 429 || status >= 500);
        if (transient && attempt < 2) {
          await sleep(1400 * (2 ** attempt));
          continue;
        }
        break;
      }
    }
    if (deletedSessionIds.has(target.id)) return;
    segment.status = 'error';
    segment.error = cleanText(lastError?.message || lastError || 'TRANSCRIPTION_FAILED', 1200);
    segment.finished_processing_at = nowISO();
    target.last_error = 'Uno o más fragmentos no pudieron transcribirse. El audio original sigue guardado para reintentar.';
    await persistSessionObject(target);
    if (session?.id === target.id) render();
  } finally {
    scheduledJobs.delete(job.segmentId);
    render();
  }
}

async function retryErrors() {
  if (!session) return;
  session.last_error = null;
  for (const segment of session.segments.filter(s => s.status === 'error')) {
    if (segment.audio_key && await dbGet(BLOB_STORE, segment.audio_key)) {
      segment.status = 'queued';
      segment.error = null;
      enqueueSegment(segment.id);
    } else if (session.kind === 'file') {
      segment.status = 'pending';
      segment.error = null;
    }
  }
  await saveSession();
  if (session.kind === 'file' && session.segments.some(s => s.status === 'pending')) await resumeFileSession();
  else {
    setState('CANONICALIZING', 'Reintentando fragmentos…');
    await queue.whenIdle();
    await finishAfterQueue();
  }
}

async function finishAfterQueue() {
  if (!session) return;
  setState('MERGING');
  await saveSession();
  const errors = session.segments.filter(s => s.status === 'error').length;
  const pending = session.segments.filter(s => ['pending', 'queued', 'transcribing'].includes(s.status)).length;
  if (errors || pending) {
    session.last_error = errors
      ? `${errors} fragmento${errors === 1 ? '' : 's'} quedó pendiente. Podés reintentarlo sin reprocesar lo que ya salió bien.`
      : 'La sesión quedó incompleta y puede continuar desde el último bloque guardado.';
    session.interrupted = pending > 0;
    setState('ERROR_RECOVERABLE');
  } else {
    session.interrupted = false;
    session.last_error = null;
    setState('DONE');
  }
  await saveSession();
}

async function probeAudio(file) {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    const done = () => { URL.revokeObjectURL(url); audio.remove(); };
    const timer = setTimeout(() => { done(); reject(new Error('No pude leer la duración del audio.')); }, 15000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      const duration = Number(audio.duration || 0);
      done();
      if (!Number.isFinite(duration) || duration <= 0) reject(new Error('El navegador no pudo interpretar este formato de audio.'));
      else resolve(Math.round(duration * 1000));
    };
    audio.onerror = () => { clearTimeout(timer); done(); reject(new Error('Este navegador no puede abrir ese formato de audio.')); };
    audio.src = url;
  });
}

async function handleFile(file) {
  if (!file || fileRuntime || ACTIVE_MIC_STATES.has(uiState) || uiState === 'PAUSED') return;
  const source = { kind: 'file', name: file.name, mime_type: file.type || 'application/octet-stream', size: file.size, ref: null, persisted: false };
  const sameInterrupted = session?.kind === 'file' && session.interrupted && session.source?.name === file.name && Number(session.source?.size) === Number(file.size);
  if (!sameInterrupted) session = newSession('file', source);
  session.last_error = null;
  session.interrupted = false;
  setState('UPLOADING_FILE', 'Guardando el original…');
  await saveSession();
  await requestDurableStorage();

  try {
    if (!sameInterrupted || !session.duration_ms) session.duration_ms = await probeAudio(file);
    const sourceKey = `source:${session.id}`;
    try {
      await persistBlob(sourceKey, file);
      session.source = { ...source, ref: `indexeddb://${DB_NAME}/${sourceKey}`, persisted: true };
    } catch (error) {
      session.source = { ...source, ref: `local-file://${file.name}`, persisted: false };
      session.last_error = 'El archivo se puede procesar, pero el navegador no dio espacio para conservar una copia local durable. Si recargás, tendrás que elegir el mismo archivo otra vez.';
    }
    if (!sameInterrupted || !session.segments.length) {
      session.segments = planWindows(session.duration_ms).map(segment => ({ ...segment, id: uuid(), audio_key: null, created_at: nowISO(), attempt: 0 }));
    }
    await saveSession();
    await processFile(file);
  } catch (error) {
    recoverable(error?.message || String(error));
    await saveSession();
  }
}

async function waitForEvent(target, name, timeout = 10000) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error(`Timeout: ${name}`)); }, timeout);
    const cleanup = () => { clearTimeout(timer); target.removeEventListener(name, onEvent); target.removeEventListener('error', onError); };
    const onEvent = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('No pude reproducir este audio.')); };
    target.addEventListener(name, onEvent, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

async function processFile(file) {
  if (!session || session.kind !== 'file') return;
  if (!window.AudioContext && !window.webkitAudioContext) throw new Error('Este navegador no ofrece Web Audio para procesar el archivo en ventanas.');
  if (!window.MediaRecorder) throw new Error('Este navegador no ofrece MediaRecorder para procesar el archivo.');
  if (fileRuntime) await stopFileRuntime();

  for (const segment of session.segments) {
    if (['queued', 'transcribing'].includes(segment.status) && segment.audio_key) {
      segment.status = 'queued';
      enqueueSegment(segment.id);
    }
  }

  const pendingCapture = session.segments.filter(s => s.status === 'pending' && !s.audio_key).sort((a, b) => a.start_ms - b.start_ms);
  if (!pendingCapture.length) {
    setState('CANONICALIZING', 'Terminando bloques guardados…');
    await saveSession();
    await queue.whenIdle();
    return finishAfterQueue();
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audio = document.createElement('audio');
  const objectUrl = URL.createObjectURL(file);
  audio.src = objectUrl;
  audio.preload = 'auto';
  audio.playsInline = true;
  const context = new AudioContextClass();
  const source = context.createMediaElementSource(audio);
  const destination = context.createMediaStreamDestination();
  source.connect(destination);
  await context.resume();
  if (audio.readyState < 1) await waitForEvent(audio, 'loadedmetadata');

  const startMs = Math.max(0, pendingCapture[0].start_ms);
  audio.currentTime = startMs / 1000;
  if (Math.abs(audio.currentTime * 1000 - startMs) > 500 && audio.readyState < 2) {
    try { await waitForEvent(audio, 'seeked', 8000); } catch {}
  }

  fileRuntime = { audio, context, source, destination, objectUrl, active: new Map(), poll: null, finishing: false, lastPersistAt: 0 };
  setState('TRANSCRIBING_FILE');
  await saveSession();

  const tick = async () => {
    if (!fileRuntime || fileRuntime.finishing || !session) return;
    const pos = Math.min(session.duration_ms, Math.round(audio.currentTime * 1000));
    session.file_cursor_ms = pos;
    const now = performance.now();
    if (now - fileRuntime.lastPersistAt > 5000) {
      fileRuntime.lastPersistAt = now;
      saveSession().catch(() => {});
    } else render();

    for (const segment of session.segments) {
      if (segment.status !== 'pending' || segment.audio_key || fileRuntime.active.has(segment.id)) continue;
      if (pos + 300 >= segment.start_ms && pos < segment.end_ms - 300) startFileWindow(segment, pos);
    }
    for (const slot of fileRuntime.active.values()) {
      if (pos + 120 >= slot.segment.end_ms) stopFileWindow(slot);
    }
    const uncaptured = session.segments.some(s => s.status === 'pending' && !s.audio_key);
    if (!uncaptured && fileRuntime.active.size === 0) await finishFileRuntime();
  };

  fileRuntime.poll = setInterval(() => tick().catch(error => failFileRuntime(error)), 120);
  audio.addEventListener('ended', () => finishFileRuntime().catch(error => failFileRuntime(error)), { once: true });
  try { await audio.play(); }
  catch (error) {
    session.interrupted = true;
    session.last_error = 'El navegador dejó el archivo preparado pero bloqueó el inicio automático. Tocá “Continuar”.';
    setState('ERROR_RECOVERABLE');
    await stopFileRuntime({ keepSession: true });
    await saveSession();
  }
}

function startFileWindow(segment, actualStart) {
  if (!fileRuntime || fileRuntime.active.has(segment.id)) return;
  const mime = pickMime();
  let recorder;
  try { recorder = new MediaRecorder(fileRuntime.destination.stream, mime ? { mimeType: mime } : undefined); }
  catch (error) { segment.status = 'error'; segment.error = error?.message || String(error); return; }
  const slot = { segment, recorder, pieces: [], actualStart, done: null, resolveDone: null, stopping: false };
  slot.done = new Promise(resolve => { slot.resolveDone = resolve; });
  fileRuntime.active.set(segment.id, slot);
  recorder.ondataavailable = event => { if (event.data?.size) slot.pieces.push(event.data); };
  recorder.onstop = () => finalizeFileWindow(slot).finally(() => slot.resolveDone?.());
  recorder.onerror = event => {
    segment.status = 'error';
    segment.error = event?.error?.message || 'Error capturando este bloque';
  };
  try { recorder.start(); }
  catch (error) {
    fileRuntime.active.delete(segment.id);
    segment.status = 'error';
    segment.error = error?.message || String(error);
    slot.resolveDone?.();
  }
}

function stopFileWindow(slot) {
  if (!slot || slot.stopping) return;
  slot.stopping = true;
  try { if (slot.recorder.state !== 'inactive') slot.recorder.stop(); } catch { slot.resolveDone?.(); }
}

async function finalizeFileWindow(slot) {
  if (!session) return;
  fileRuntime?.active.delete(slot.segment.id);
  const blob = new Blob(slot.pieces, { type: slot.recorder.mimeType || slot.pieces[0]?.type || 'audio/webm' });
  if (blob.size < 256) {
    slot.segment.status = 'error';
    slot.segment.error = 'El bloque quedó vacío.';
    await saveSession();
    return;
  }
  const key = `chunk:${session.id}:${slot.segment.id}`;
  await persistBlob(key, blob);
  slot.segment.audio_key = key;
  slot.segment.mime_type = blob.type;
  slot.segment.byte_size = blob.size;
  slot.segment.status = 'queued';
  slot.segment.error = null;
  await saveSession();
  enqueueSegment(slot.segment.id);
}

async function finishFileRuntime() {
  if (!fileRuntime || fileRuntime.finishing) return;
  fileRuntime.finishing = true;
  clearInterval(fileRuntime.poll);
  try { fileRuntime.audio.pause(); } catch {}
  const active = [...fileRuntime.active.values()];
  active.forEach(stopFileWindow);
  await Promise.all(active.map(slot => slot.done));
  await cleanupFileRuntime();
  setState('CANONICALIZING', 'Terminando los últimos bloques…');
  await saveSession();
  await queue.whenIdle();
  await finishAfterQueue();
}

async function cleanupFileRuntime() {
  if (!fileRuntime) return;
  const runtime = fileRuntime;
  fileRuntime = null;
  clearInterval(runtime.poll);
  try { runtime.audio.pause(); runtime.audio.removeAttribute('src'); runtime.audio.load(); } catch {}
  try { runtime.source.disconnect(); } catch {}
  try { runtime.destination.disconnect?.(); } catch {}
  try { await runtime.context.close(); } catch {}
  URL.revokeObjectURL(runtime.objectUrl);
}

async function stopFileRuntime({ keepSession = true } = {}) {
  if (!fileRuntime) return;
  clearInterval(fileRuntime.poll);
  const active = [...fileRuntime.active.values()];
  active.forEach(stopFileWindow);
  await Promise.all(active.map(slot => slot.done));
  await cleanupFileRuntime();
  if (!keepSession && session) session.interrupted = true;
}

async function failFileRuntime(error) {
  if (!session) return;
  session.interrupted = true;
  session.last_error = `El procesamiento se interrumpió: ${error?.message || error}. Lo ya terminado no se pierde.`;
  setState('ERROR_RECOVERABLE');
  await stopFileRuntime({ keepSession: true }).catch(() => {});
  await saveSession();
}

async function resumeFileSession() {
  if (!session || session.kind !== 'file') return;
  let file = null;
  if (session.source?.persisted) {
    file = await dbGet(BLOB_STORE, `source:${session.id}`);
  }
  if (!file) {
    session.last_error = 'Elegí de nuevo el mismo archivo para continuar. Los bloques ya terminados no se vuelven a procesar.';
    render();
    ui.fileInput.click();
    return;
  }
  session.interrupted = false;
  session.last_error = null;
  await processFile(file);
}

async function recoverable(message) {
  if (!session) session = newSession('microphone', { kind: 'microphone', ref: null });
  session.interrupted = true;
  session.last_error = message;
  setState('ERROR_RECOVERABLE');
  try { await saveSession(); } catch {}
}

async function restoreLastSession() {
  const sessions = await dbGetAll(SESSION_STORE);
  sessions.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
  session = sessions[0] || null;
  if (!session) { setState('IDLE'); return; }
  for (const segment of session.segments || []) {
    if (segment.status === 'transcribing') segment.status = 'queued';
  }
  if (['RECORDING', 'LIVE_TRANSCRIBING', 'PAUSED', 'REQUESTING_MIC', 'TRANSCRIBING_FILE', 'UPLOADING_FILE', 'CANONICALIZING', 'MERGING'].includes(session.status)) {
    session.interrupted = true;
    session.last_error = session.kind === 'file'
      ? 'La página se recargó. Podés continuar desde el primer bloque que falta.'
      : 'La grabación se interrumpió, pero el audio y los bloques ya guardados siguen acá.';
    session.status = 'ERROR_RECOVERABLE';
  }
  uiState = session.status || 'ERROR_RECOVERABLE';
  stateDetail = session.status_detail || '';
  for (const segment of session.segments || []) if (segment.status === 'queued' && segment.audio_key) enqueueSegment(segment.id);
  await saveSession();
  if (queue.running || queue.pending.length) {
    setState('CANONICALIZING', 'Retomando bloques guardados…');
    await queue.whenIdle();
    await finishAfterQueue();
  }
}

async function deleteCurrentSession() {
  if (!session) { setState('IDLE'); return; }
  const old = session;
  deletedSessionIds.add(old.id);
  scheduledJobs.clear();
  queue.remove(job => job.sessionId === old.id);
  const keys = [
    ...(old.master_keys || []),
    ...(old.segments || []).map(s => s.audio_key).filter(Boolean),
    `source:${old.id}`
  ];
  for (const key of new Set(keys)) await dbDelete(BLOB_STORE, key).catch(() => {});
  await dbDelete(SESSION_STORE, old.id).catch(() => {});
  session = null;
  speechFinal = '';
  speechInterim = '';
  ui.editor.value = '';
  setState('IDLE');
}

async function startNew() {
  if (fileRuntime) await stopFileRuntime({ keepSession: true });
  session = null;
  speechFinal = '';
  speechInterim = '';
  ui.editor.value = '';
  setState('IDLE');
}

async function copyText() {
  const text = activeText();
  if (!text) return;
  try { await navigator.clipboard.writeText(text); ui.micHint.textContent = 'Texto copiado.'; }
  catch { ui.editor.focus(); ui.editor.select(); document.execCommand('copy'); }
}

function safeFileName(value) {
  return cleanText(value || 'transcripcion', 80).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'transcripcion';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function downloadTxt() {
  const text = activeText();
  if (!text || !session) return;
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${safeFileName(session.title)}.txt`);
}

function downloadJson() {
  if (!session) return;
  const doc = transcriptDocument(session, session.edited_text ?? activeText());
  downloadBlob(new Blob([JSON.stringify(doc, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }), `${safeFileName(session.title)}.transcript.json`);
}

async function checkBackend() {
  try {
    const response = await fetch(TRANSCRIBE_URL, { cache: 'no-store' });
    const data = await response.json();
    backendInfo = response.ok ? data : { service: `HTTP ${response.status}` };
  } catch { backendInfo = { service: 'sin conexión' }; }
  render();
}

async function updateDebugStorage() {
  ui.debugStorage.textContent = await storageSummary();
}

ui.recordMain.addEventListener('click', async () => {
  if (ACTIVE_MIC_STATES.has(uiState)) return pauseMic();
  if (uiState === 'PAUSED') return resumeMic();
  if (uiState === 'ERROR_RECOVERABLE' && session?.kind === 'microphone' && session.interrupted) return startMic({ resume: true });
  return startMic();
});
ui.pauseBtn.addEventListener('click', () => ACTIVE_MIC_STATES.has(uiState) ? pauseMic() : resumeMic());
ui.stopBtn.addEventListener('click', finishMic);
ui.discardBtn.addEventListener('click', discardMic);
ui.fileTrigger.addEventListener('click', () => { if (!ui.fileInput.disabled) ui.fileInput.click(); });
ui.fileInput.addEventListener('change', async () => {
  const file = ui.fileInput.files?.[0];
  ui.fileInput.value = '';
  if (file) await handleFile(file);
});
ui.resumeBtn.addEventListener('click', async () => {
  if (session?.kind === 'file') await resumeFileSession();
  else if (session?.kind === 'microphone') await startMic({ resume: true });
});
ui.retryBtn.addEventListener('click', retryErrors);
ui.copyBtn.addEventListener('click', copyText);
ui.txtBtn.addEventListener('click', downloadTxt);
ui.jsonBtn.addEventListener('click', downloadJson);
ui.newBtn.addEventListener('click', startNew);
ui.clearLocalBtn.addEventListener('click', deleteCurrentSession);
ui.docTitle.addEventListener('input', () => {
  if (!session) return;
  session.title = ui.docTitle.value.slice(0, 120);
  clearTimeout(editorSaveTimer);
  editorSaveTimer = setTimeout(() => saveSession().catch(() => {}), 350);
});
ui.editor.addEventListener('input', () => {
  if (!session) return;
  session.edited_text = ui.editor.value;
  autoGrow(ui.editor);
  clearTimeout(editorSaveTimer);
  editorSaveTimer = setTimeout(() => saveSession().catch(() => {}), 350);
});

window.addEventListener('pagehide', () => {
  if (session && (ACTIVE_MIC_STATES.has(uiState) || uiState === 'PAUSED' || ACTIVE_FILE_STATES.has(uiState))) {
    session.interrupted = true;
    session.status = 'ERROR_RECOVERABLE';
    dbPut(SESSION_STORE, structuredClone(session)).catch(() => {});
  }
});

async function boot() {
  if (!('indexedDB' in window)) {
    uiState = 'ERROR_RECOVERABLE';
    stateDetail = 'Este navegador no ofrece IndexedDB; no puedo garantizar recuperación durable.';
    render();
    return;
  }
  renderTimer = setInterval(render, 250);
  render();
  await updateDebugStorage();
  checkBackend();
  try { await restoreLastSession(); }
  catch (error) { recoverable(`No pude recuperar la sesión local: ${error?.message || error}`); }
}

boot();
