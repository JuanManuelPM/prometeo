# TTS project-guide cycle evidence · 2026-09-17T23:17Z

Authority: candidate coordination only. No Current / Human Accepted / Served promotion.

## Recovered current state

- GitHub Pages source `gh-pages:__canary/portfolio-tts-generic-text-surface-v1/index.html` exists at blob `f58801f1e67999923fac8eb36466b0ce33be2b8f`.
- The source visibly identifies itself as `candidate · no current`, references only `audio-lab-page-audio-v1`, and enforces `MAX=1800`.
- Supabase project `catnohyouxqjjtseaueb` is `ACTIVE_HEALTHY`.
- Edge Function `audio-lab-page-audio-v1` is ACTIVE v1 with deployed source hash `49641aedee8e9b8ab339a34775b09905aa7a9729f5d25cf11683a81676256bcb`.
- Current deployed source returns health metadata on GET without `id`: `ok=true`, service `audio lab page`, engine `Qwen3-TTS VoiceDesign`, `maxChars=1800`, mode `single long generation`.
- Read-only database evidence still contains cache row `audio-lab-page-v1-clara-r1-164wms` with `voice_id=audio-lab-page-v1`, mime `application/octet-stream`, created `2026-09-14 18:57:26.477+00`, and non-empty encoded audio.

## Public-network verification boundary

Two independent client paths failed before an origin response could be observed:
- direct web navigation rejected both the GitHub Pages candidate URL and the Supabase function URL as inaccessible by the tool;
- direct curl could not resolve `juanmanuelpm.github.io` or `catnohyouxqjjtseaueb.supabase.co`.

Therefore this cycle does NOT claim public Pages propagation or a live HTTP health/cache response. The failure is recorded as verifier-host/network boundary, not endpoint failure.

## Local repair executed

`pages/modelos-iii/README.md` was reconciled with `AUDIO_PARAGRAPH_V2.json`:
- current HTML SHA-256 is `421c04c1cc870034fd4c455bf24ce8fd48273df47d0d5cb08a65d6a1d13a0be9`;
- Modelos III paragraph audio authority is `modelos-room-audio-v2` → `modelos-qwen-tts-v2`;
- the old V13 hash and `casa-room-audio` route are now explicitly historical;
- generic long-text `audio-lab-page-audio-v1` is kept separate from paragraph authority.

Commit: `90e3ac52a60ea813b759c87504cf1ead431fde1f`.
