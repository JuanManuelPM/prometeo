/* PROMETEO YouTubeClip v1.0.0
 * Public, no-dependencies browser adapter around YouTube's documented IFrame Player API.
 * Inputs: URL, start seconds, end seconds. Output: DOM element + playback methods/events.
 * It does NOT bypass YouTube ads, guarantee hiding platform UI, or yield video pixels
 * for WebGL textures. Use Three.js CSS3DObject (DOM) for 3D video screens.
 * Source code component designed for reuse across PROMETEO browser applications.
 */
(function (global) {
  'use strict';
  const VERSION = 'prometeo.youtube-clip/v1.0.0';
  let apiLoad = null;

  function videoId(input) {
    if (typeof input !== 'string') throw new TypeError('YouTube URL must be a string');
    const raw = input.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
    let u;
    try { u = new URL(raw); } catch (_) { throw new TypeError('Invalid YouTube URL'); }
    if (u.protocol !== 'https:') throw new TypeError('Only HTTPS YouTube URLs are accepted');
    const host = u.hostname.toLowerCase();
    let id = '';
    if (host === 'youtu.be' || host === 'www.youtu.be') id = u.pathname.split('/')[1] || '';
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      const path = u.pathname.split('/').filter(Boolean);
      if (path[0] === 'watch') id = u.searchParams.get('v') || '';
      else if (['shorts', 'live', 'embed', 'v'].includes(path[0])) id = path[1] || '';
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new TypeError('Expected a single YouTube video URL');
    return id;
  }

  function seconds(value) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) throw new RangeError('Seconds must be finite and positive');
      return value;
    }
    if (typeof value !== 'string' || !/^\d{1,4}(?::[0-5]?\d){1,2}(?:\.\d{1,3})?$/.test(value.trim())) {
      throw new TypeError('Time must be seconds or mm:ss / hh:mm:ss');
    }
    const a = value.trim().split(':').map(Number);
    return a.reduce((sum, n) => sum * 60 + n, 0);
  }

  function clipSpec({ url, start, end }) {
    const result = { videoId: videoId(url), start: seconds(start), end: seconds(end) };
    if (result.end <= result.start) throw new RangeError('end must be after start');
    return result;
  }

  function loadAPI() {
    if (global.YT && typeof global.YT.Player === 'function') return Promise.resolve(global.YT);
    if (apiLoad) return apiLoad;
    apiLoad = new Promise((resolve, reject) => {
      const prior = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = function () {
        try { if (typeof prior === 'function') prior(); } finally { resolve(global.YT); }
      };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('YouTube IFrame API unavailable'));
      document.head.appendChild(tag);
    });
    return apiLoad;
  }

  function create({ target, url, start, end, passive = false, onEnd, onState, onError } = {}) {
    const parent = typeof target === 'string' ? document.querySelector(target) : target;
    if (!(parent instanceof Element)) throw new TypeError('target must be an element or selector');
    let active = clipSpec({ url, start, end });
    let player = null, ended = false, destroyed = false, ready = false, checkTimer = 0;
    let state = 'loading';

    const surface = document.createElement('div');
    surface.className = 'prometeo-youtube-clip';
    surface.style.cssText = 'position:relative;display:block;width:100%;height:100%;min-height:200px;overflow:hidden;background:#000;';
    const slot = document.createElement('div');
    slot.id = 'prometeo-player-' + Math.random().toString(36).slice(2);
    surface.appendChild(slot);
    parent.appendChild(surface);

    function emit(status, extra = {}) {
      state = status;
      if (typeof onState === 'function') onState({ status, ...extra, clip: { ...active } });
    }
    function error(err) {
      emit('error', { error: String(err) });
      if (typeof onError === 'function') onError(err);
    }
    function setTouches(enabled) {
      const iframe = surface.querySelector('iframe');
      if (iframe) iframe.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    function clearCheck() { if (checkTimer) clearInterval(checkTimer); checkTimer = 0; }
    function finish() {
      if (ended || destroyed) return;
      ended = true;
      clearCheck();
      try { if (player) player.pauseVideo(); } catch (_) {}
      emit('ended');
      if (typeof onEnd === 'function') onEnd({ ...active });
    }
    function tick() {
      if (!player || destroyed || ended) return;
      let t;
      try { t = Number(player.getCurrentTime()); } catch (_) { return; }
      if (Number.isFinite(t) && t >= active.end - 0.12) finish();
    }
    function cue() {
      if (!ready || !player || destroyed) return;
      clearCheck(); ended = false;
      player.cueVideoById({ videoId: active.videoId, startSeconds: active.start, endSeconds: active.end });
      emit('cued');
    }
    function load(params) {
      if (destroyed) throw new Error('Player has been destroyed');
      active = clipSpec(params);
      cue();
      return { ...active };
    }
    function play() {
      if (destroyed) throw new Error('Player has been destroyed');
      if (!ready) { emit('not-ready'); return false; }
      ended = false;
      // The caller should invoke this synchronously in a genuine click/touch gesture.
      emit('starting');
      player.loadVideoById({ videoId: active.videoId, startSeconds: active.start, endSeconds: active.end });
      player.playVideo();
      clearCheck(); checkTimer = setInterval(tick, 140);
      return true;
    }
    function stop() {
      clearCheck();
      if (ready && player) { try { player.pauseVideo(); } catch (_) {} }
      emit('paused');
      if (passive) setTouches(true);
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      clearCheck();
      try { player?.destroy(); } catch (_) {}
      surface.remove();
      emit('destroyed');
    }

    const startup = loadAPI().then(YT => {
      if (destroyed) return;
      player = new YT.Player(slot.id, {
        width: '100%', height: '100%',
        videoId: active.videoId,
        playerVars: { playsinline: 1, controls: 0, disablekb: 1, iv_load_policy: 3, fs: 0, rel: 0, origin: global.location.origin },
        events: {
          onReady: () => { ready = true; cue(); },
          onStateChange: e => {
            if (destroyed) return;
            if (e.data === YT.PlayerState.PLAYING) {
              emit('playing');
              if (passive) setTouches(false);
            } else if (e.data === YT.PlayerState.ENDED) finish();
            else if (e.data === YT.PlayerState.PAUSED && !ended) emit('paused');
          },
          onError: e => error('YouTube player error ' + e.data),
          onAutoplayBlocked: () => { clearCheck(); setTouches(true); emit('autoplay-blocked'); }
        }
      });
    }).catch(error);
    return {
      version: VERSION,
      element: surface,
      get ready() { return ready; },
      get state() { return state; },
      get clip() { return { ...active }; },
      startup,
      load, play, stop, destroy
    };
  }
  global.PrometeoYouTubeClip = Object.freeze({ VERSION, create, videoId, seconds, clipSpec });
})(window);
