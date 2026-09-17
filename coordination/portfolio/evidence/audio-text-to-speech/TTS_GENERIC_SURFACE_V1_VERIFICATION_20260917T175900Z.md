# Generic text → audio candidate · verification receipt · 2026-09-17

## Candidate

- gh-pages source: `__canary/portfolio-tts-generic-text-surface-v1/index.html`
- gh-pages commit: `e8e84555964c461bc06de7f60d7d5672acc76edd`
- intended Pages URL: `https://juanmanuelpm.github.io/prometeo/__canary/portfolio-tts-generic-text-surface-v1/`
- authority: candidate only; not Current, Human Accepted or Served authority.

## Static verification

PASS — the candidate:

- calls only the recovered `audio-lab-page-audio-v1` generation backend;
- caps input at 1800 characters in UI logic and the textarea;
- offers the six recovered Audio Lab voice identities without creating a new voice backend;
- derives a deterministic `messageId` with browser SHA-256 from version + voice + exact prompt + exact text;
- performs GET cache lookup before POST generation;
- does not send text on page load;
- does not persist pasted text in localStorage;
- shows the audio player only after a non-empty audio blob is received;
- updates playing/paused/ended state from actual audio events rather than optimistic button state;
- exposes cache/source/messageId/byte evidence in the technical trace;
- explicitly states remote generation through Supabase and Qwen3-TTS/Hugging Face;
- contains no `speechSynthesis` fallback.

## Backend verification reused from predecessor

The predecessor recovery verified through the connected Supabase project that `audio-lab-page-audio-v1` is ACTIVE v1 and that `casa_audio_cache` contains a previously generated row with `voice_id = audio-lab-page-v1`. The backend source accepts `voicePrompt`, `text`, and `messageId`, enforces max 1800 characters, and serves cached audio by stable id.

## External-effect boundary

No fresh POST generation was intentionally executed in this worker. That avoids generating paid/remote model output merely for a smoke test and avoids sending synthetic/user text externally without need. Therefore this receipt does **not** claim fresh 2026-09-17 audio quality or generation latency.

A fresh public HTTP fetch of the new Pages URL was also not independently obtained by the available web index immediately after the commit. The exact gh-pages source and commit are verified; Pages propagation is not overstated.

## Non-regression / authority

No Current, Catalog, Human Accepted, Served, `/w`, or existing Audio Lab bytes were modified. The new surface is isolated under `__canary/portfolio-tts-generic-text-surface-v1/`.