export const CAPTURE_CONFIG = Object.freeze({
  windowMs: 150000,
  stepMs: 135000,
  overlapMs: 15000,
  masterSliceMs: 5000,
  minWindowMs: 2500,
  language: 'es',
  locale: 'es-AR',
  captureVersion: 'canonical-v2'
});

export function cleanText(value, limit = 200000) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, limit);
}

export function normalizeToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, '')
    .trim();
}

export function tokenize(value) {
  return cleanText(value).split(/\s+/).filter(Boolean);
}

function sameBlock(words, a, b, n) {
  for (let i = 0; i < n; i += 1) if (words[a + i] !== words[b + i]) return false;
  return true;
}

export function qualityGate(text) {
  const words = tokenize(text).map(normalizeToken).filter(Boolean);
  if (words.length < 4) {
    return { bad: false, score: 0, reasons: [], words: words.length, unique_ratio: 1, max_token_run: 1, max_block_repeat: 1 };
  }
  let score = 0;
  const reasons = [];
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < words.length; i += 1) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  if (maxRun >= 6) {
    score += 10;
    reasons.push('token-loop');
  }
  let maxBlockRepeat = 1;
  for (const n of [2, 3, 4, 5, 6, 7, 8]) {
    for (let i = 0; i + n * 4 <= words.length; i += 1) {
      let reps = 1;
      while (i + (reps + 1) * n <= words.length && sameBlock(words, i, i + reps * n, n)) reps += 1;
      maxBlockRepeat = Math.max(maxBlockRepeat, reps);
      if (reps >= 4) {
        score += 10;
        reasons.push(`${n}gram-consecutive-loop`);
        i += reps * n - 1;
        break;
      }
    }
    if (score >= 10) break;
  }
  const uniqueRatio = new Set(words).size / words.length;
  if (words.length > 60 && uniqueRatio < 0.16) {
    score += 7;
    reasons.push('very-low-diversity');
  }
  return {
    bad: score >= 7,
    score,
    reasons,
    words: words.length,
    unique_ratio: Number(uniqueRatio.toFixed(3)),
    max_token_run: maxRun,
    max_block_repeat: maxBlockRepeat
  };
}

export function levenshtein(a, b) {
  const m = b.length;
  const previous = Array.from({ length: m + 1 }, (_, i) => i);
  const current = new Array(m + 1);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= m; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= m; j += 1) previous[j] = current[j];
  }
  return previous[m];
}

export function fuzzyTrim(previousText, nextText, overlapMs, windowMs = CAPTURE_CONFIG.windowMs) {
  const aOriginal = tokenize(previousText);
  const bOriginal = tokenize(nextText);
  if (!aOriginal.length || !bOriginal.length || !overlapMs) return cleanText(nextText);
  const a = aOriginal.map(normalizeToken);
  const b = bOriginal.map(normalizeToken);
  const maxB = Math.min(70, bOriginal.length);
  const expected = Math.max(4, Math.round(bOriginal.length * Math.min(0.35, overlapMs / Math.max(windowMs, 1))));
  let best = { score: 0, kb: 0 };
  for (let kb = 4; kb <= maxB; kb += 1) {
    const lo = Math.max(4, Math.round(kb * 0.75));
    const hi = Math.min(70, aOriginal.length, Math.round(kb * 1.25));
    for (let ka = lo; ka <= hi; ka += 1) {
      const aa = a.slice(-ka);
      const bb = b.slice(0, kb);
      const similarity = 1 - levenshtein(aa, bb) / Math.max(ka, kb);
      const prior = Math.min(0.08, Math.abs(kb - expected) / Math.max(expected, 1) * 0.02);
      const score = similarity - prior;
      if (score > best.score) best = { score, kb };
    }
  }
  return best.score >= 0.70 ? bOriginal.slice(best.kb).join(' ') : cleanText(nextText);
}

export function formatClock(ms, withHours = false) {
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (withHours || h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function planWindows(durationMs, config = CAPTURE_CONFIG) {
  const duration = Math.max(0, Number(durationMs || 0));
  if (!duration) return [];
  const windows = [];
  let seq = 0;
  for (let start = 0; start < duration; start += config.stepMs) {
    if (start > 0 && duration - start <= config.overlapMs) break;
    const end = Math.min(duration, start + config.windowMs);
    if (end - start < config.minWindowMs && windows.length) break;
    seq += 1;
    windows.push({
      id: null,
      seq,
      segment_no: 1,
      start_ms: Math.round(start),
      end_ms: Math.round(end),
      overlap_ms: seq > 1 ? Math.max(0, Math.min(config.overlapMs, windows[windows.length - 1].end_ms - start)) : 0,
      capture_window_ms: Math.round(end - start),
      capture_version: config.captureVersion,
      status: 'pending',
      transcript: '',
      quality: null,
      source: null,
      error: null,
      audio_key: null
    });
  }
  return windows;
}

export function mergeSegments(segments, options = {}) {
  const durationMs = Number(options.durationMs || 0);
  const includeGaps = options.includeGaps !== false;
  const ready = [...(segments || [])]
    .filter(s => s.status === 'ready' && cleanText(s.transcript))
    .sort((a, b) => Number(a.start_ms || 0) - Number(b.start_ms || 0) || Number(a.seq || 0) - Number(b.seq || 0));
  if (!ready.length) {
    const anyFailure = (segments || []).some(s => s.status === 'error');
    if (includeGaps && anyFailure && durationMs > 0) return `[Audio sin transcribir: ${formatClock(0, durationMs >= 3600000)}–${formatClock(durationMs, durationMs >= 3600000)}]`;
    return '';
  }
  const parts = [];
  let mergedText = '';
  let coveredUntil = 0;
  const useHours = durationMs >= 3600000 || ready.some(s => Number(s.end_ms || 0) >= 3600000);
  for (const segment of ready) {
    const start = Number(segment.start_ms || 0);
    const end = Math.max(start, Number(segment.end_ms || start));
    if (includeGaps && start > coveredUntil + 1000) {
      parts.push(cleanText(mergedText));
      mergedText = '';
      parts.push(`[Audio sin transcribir: ${formatClock(coveredUntil, useHours)}–${formatClock(start, useHours)}]`);
    }
    const transcript = cleanText(segment.transcript);
    if (!mergedText) mergedText = transcript;
    else {
      const actualOverlap = Math.max(0, Math.min(Number(segment.overlap_ms || 0), coveredUntil - start || 0));
      const trimmed = fuzzyTrim(mergedText, transcript, actualOverlap, Number(segment.capture_window_ms || CAPTURE_CONFIG.windowMs));
      if (trimmed) mergedText = `${mergedText} ${trimmed}`;
    }
    coveredUntil = Math.max(coveredUntil, end);
  }
  if (mergedText) parts.push(cleanText(mergedText));
  if (includeGaps && durationMs > coveredUntil + 1000) {
    parts.push(`[Audio sin transcribir: ${formatClock(coveredUntil, useHours)}–${formatClock(durationMs, useHours)}]`);
  }
  return cleanText(parts.filter(Boolean).join('\n\n'))
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ ]{2,}/g, ' ');
}

export function transcriptDocument(session, editedText = null) {
  const text = cleanText(editedText ?? mergeSegments(session?.segments || [], { durationMs: session?.duration_ms || 0 }));
  return {
    schema: 'prometeo.transcript-document/v1',
    id: session?.id || '',
    title: session?.title || 'Transcripción',
    language: session?.language || 'es-AR',
    created_at: session?.created_at || null,
    updated_at: session?.updated_at || null,
    duration_ms: Number(session?.duration_ms || 0),
    text,
    segments: [...(session?.segments || [])]
      .sort((a, b) => Number(a.start_ms || 0) - Number(b.start_ms || 0) || Number(a.seq || 0) - Number(b.seq || 0))
      .map(s => ({
        id: s.id || null,
        seq: Number(s.seq || 0),
        start_ms: Number(s.start_ms || 0),
        end_ms: Number(s.end_ms || 0),
        overlap_ms: Number(s.overlap_ms || 0),
        status: s.status,
        text: s.status === 'ready' ? cleanText(s.transcript) : '',
        source: s.source || null,
        quality: s.quality || null,
        error: s.status === 'error' ? (s.error || 'TRANSCRIPTION_FAILED') : null
      })),
    timestamps: {
      kind: 'capture-window',
      word_level: false,
      note: 'Los tiempos preservados son límites de las ventanas de captura; el backend actual no entrega timestamps por palabra.'
    },
    source: session?.source || null
  };
}

export class AsyncJobQueue {
  constructor(worker, concurrency = 2) {
    this.worker = worker;
    this.concurrency = Math.max(1, Number(concurrency || 1));
    this.pending = [];
    this.running = 0;
    this.waiters = [];
    this.onChange = null;
  }

  push(job) {
    this.pending.push(job);
    this._changed();
    this._pump();
  }

  has(predicate) {
    return this.pending.some(predicate);
  }

  remove(predicate) {
    this.pending = this.pending.filter(job => !predicate(job));
    this._changed();
  }

  async whenIdle() {
    if (!this.pending.length && this.running === 0) return;
    await new Promise(resolve => this.waiters.push(resolve));
  }

  _changed() {
    try { this.onChange?.({ pending: this.pending.length, running: this.running }); } catch {}
  }

  _settleIfIdle() {
    if (this.pending.length || this.running) return;
    const waiters = this.waiters.splice(0);
    waiters.forEach(resolve => resolve());
  }

  _pump() {
    while (this.running < this.concurrency && this.pending.length) {
      const job = this.pending.shift();
      this.running += 1;
      this._changed();
      Promise.resolve()
        .then(() => this.worker(job))
        .catch(() => {})
        .finally(() => {
          this.running -= 1;
          this._changed();
          this._settleIfIdle();
          this._pump();
        });
    }
  }
}
