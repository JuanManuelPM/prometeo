# Strategy TTS

Runtime engine: `audio-lab-page-audio-v1` (Qwen3-TTS VoiceDesign through the existing Supabase Edge Function).

The strategy page reuses the existing server cache first (`GET ?id=`), generates only on a miss, keeps deterministic IDs so cached audio survives reloads, and splits briefs below the backend's 1800-character limit. Playback uses HTMLAudio/Object URLs rather than WebAudio decoding, with play/pause, retry, autoplay fallback, progressive next-part preparation, and WAV/MP3/Ogg signature detection when cached audio is returned as `application/octet-stream`.

Verification: `.github/workflows/strategy-tts-smoke.yml` syntax-checks the inline strategy JavaScript, requests real TTS bytes, validates an audio signature and minimum size, then GETs the same cache ID and requires byte-for-byte equality.
