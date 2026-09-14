# Prometeo Capture V10 — Mobile ChatGPT Handoff

Status: ACTIVE LAB IMPLEMENTATION / NOT HUMAN ACCEPTED YET
Date: 2026-09-14

## Problem discovered on physical Android

The V9 Direct / Planner / Produce launch path created `window.open('about:blank','_blank')`, then awaited sync + packet creation, then navigated that popup to `https://chatgpt.com/?q=...`.

On mobile browsers this is fragile because the final navigation occurs asynchronously after the original human gesture. The browser may block, ignore or mishandle the popup/app handoff.

The product requirement is stronger than “works on desktop”: a Direct swipe, Planner spring or Produce spring must have a resilient path to ChatGPT on the phone, while still keeping the prompt tiny and externalizing all real context in the packet URL.

## V10 implementation

Active wrapper:

`experiments/capture-lab/capture-lab-v10.js`

Served entry:

`https://juanmanuelpm.github.io/prometeo/experiments/capture-lab/?v=10`

V10 imports V9 and does not rewrite the accepted Capture / Whisper path.

### Mobile navigation strategy

On likely mobile/coarse-pointer devices, V10 intercepts only the V9/V10 `window.open('about:blank','_blank')` placeholder used for handoff.

Instead of creating a real asynchronous popup, it returns a tiny in-page shim. When V9 later assigns the generated ChatGPT URL to `popup.location.href`, V10:

1. stores the final ChatGPT URL and its tiny prompt in localStorage;
2. navigates the *current tab* with `window.location.assign(chatgpt_url)`.

This avoids relying on an async popup surviving mobile popup blocking. The user can use Back to return to Capture.

Desktop behavior remains unchanged: normal new-tab spawning is preserved.

## Resilient fallback / rescue card

Every successful handoff is cached locally as `prometeoLastHandoffV10` for up to 12 hours.

When the user returns to Capture, a small rescue card can expose:

- **Abrir** — a real anchor to the already-generated ChatGPT URL;
- **Copiar** — copies the tiny `PROMETEO PREPARE / DIRECT / EXECUTE + packet URL` prompt;
- **Compartir** — uses `navigator.share` when available, allowing Android's share sheet to be tried as an alternate path;
- dismiss.

This is intentionally a fallback, not a required ceremony. The normal human path should remain one gesture.

## Non-regression constraints

- Do not put the full note text into the ChatGPT query; keep using tiny packet handoffs.
- Do not introduce a ChatGPT API dependency.
- Do not attempt hidden typing/clicking inside the ChatGPT app or another browser page.
- Do not require copy/paste when normal navigation works.
- Keep Copy/Open/Share available as a universal recovery path when mobile deep linking/browser behavior is unreliable.
- Preserve V9 Planner vs Direct semantics.
- Preserve V7/V8/V9 voice input, Whisper Small→Base fallback, background transcription, edit-at-cursor, delete, selection and inbox hygiene.

## Verification performed before publication

- `capture-lab-v10.js` passed `node --check` locally before publication.
- `index.html` on `main` and `gh-pages` was updated to load `capture-lab-v10.js?v=10`.
- V10 has NOT yet been physically human-tested on Android. Treat mobile opening as candidate until the user confirms the Direct/Planner/Produce handoff works on-device.

## Physical canary

1. Open V10 on Android.
2. Create one short note.
3. Swipe right for Direct.
4. Expected: the current tab navigates to ChatGPT with the tiny Direct prompt preloaded instead of relying on a popup.
5. Press Back.
6. Expected: Capture returns and the `Último envío` rescue card exposes Abrir / Copiar / Compartir.
7. Repeat with global Planner and one prepared Produce job when available.
