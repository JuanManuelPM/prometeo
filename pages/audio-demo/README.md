# Modelos III · reusable audio pattern

Public demo: `pages/audio-demo/index.html`

## Proven path

Browser/page → `casa-room-audio` → `casa-qwen-design-tts` → Qwen3-TTS → server cache → browser.

Do **not** connect the browser directly to Hugging Face/Gradio. The Walkie implementation that proved reliable uses the Supabase audio gateway.

## Endpoint

`https://catnohyouxqjjtseaueb.supabase.co/functions/v1/casa-room-audio`

### Read cached audio

`GET ?id=<stable-message-id>`

A `200` response is the audio blob. Cached audio may legitimately be returned as `application/octet-stream`; do not reject it just because the MIME does not start with `audio/`.

### Generate once

`POST` JSON:

```json
{
  "voicePrompt": "<fixed voice design prompt>",
  "text": "<short text, max ~180 chars>",
  "messageId": "<stable id derived from voice version + exact text>"
}
```

The gateway generates only when the id is not already cached. Reusing the same stable id makes the audio reusable across devices.

## Client pattern

1. On page load, GET the stable id.
2. If it is a cache miss, queue one POST generation.
3. Store successful blobs in IndexedDB for local reuse.
4. Decode with `AudioContext.decodeAudioData` after a user gesture unlocks audio.
5. Never show a playing/pause state until an audio source has actually started.
6. For long lessons, split text into semantic atoms under ~180 chars and concatenate them logically in the player. Reuse atoms between short/deep versions.
7. Respect gateway rate limits: generate sequentially, use backoff, and prioritize the content most likely to be played next.

## Current study voice

A single warm, natural, slightly low young-adult Argentine Spanish teacher voice: subtle Rioplatense accent, conversational/pedagogical delivery, clear academic articulation, no announcer/assistant/robotic cadence.

## Demo fixture

Stable id: `modelos-audio-demo-v1`

Text: `La retroalimentación negativa reduce una desviación y favorece la estabilidad del sistema.`

This fixture is pre-generated in the shared server cache, so the demo can exercise the read/play path immediately while retaining POST fallback if the cache is ever cleared.
