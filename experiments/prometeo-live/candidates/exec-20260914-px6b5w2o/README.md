# Prometeo Live / TV candidate · EXEC-20260914-PX6B5W2O

Candidate only. It does not promote or replace the current `gh-pages` Live shell or `live-manifest.json`.

## Donors recovered

- `experiments/prometeo-live/index.html` on current `main`: existing manifest-driven Live shell, multi-surface grid and Live Lab control-room polling.
- `experiments/prometeo-live/live-manifest.json` on `gh-pages`: current served surface registry contract (`prometeo.live-manifest/v1`). The candidate reads it instead of inventing a second registry.
- Existing Supabase project `catnohyouxqjjtseaueb`: current project already uses Supabase Realtime. This candidate reuses that transport through Realtime Broadcast + Presence and adds no parallel database/session stack.

## Surface contract

The display normalizes every surface to:

```js
{
  id, title, url,
  kind: 'iframe' | 'video',
  capabilities: []
}
```

Current manifest entries become `iframe` surfaces automatically. The controller may also add an arbitrary HTTPS URL at runtime. Layout is independent of content type (`single`, `split`, `quad`), so future dashboards, worker previews, games or other pages do not require a navigation redesign.

## Session and QR semantics

- Display creates a random 128-bit `sessionId` plus a random 192-bit controller capability secret and retains them only in `sessionStorage`.
- QR encodes the same candidate URL with `#controller:<sessionId>:<secret>` in the fragment. The capability is therefore not sent as an HTTP query or referrer to the host.
- Both peers derive the Realtime topic from `SHA-256(sessionId:secret)` and join it with the project's publishable key.
- Roles are explicit: `display` owns authoritative display state; `controller` sends control envelopes. Display-originated control envelopes are rejected by the reducer.
- Presence reports whether the TV is actually present and naturally permits more than one controller later without implementing multiplayer game rules now.
- On Realtime reconnect the controller sends `state.request`; the display rebroadcasts its current state. A valid QR with no display present shows `TV no encontrada` rather than inventing a session.
- Anyone who possesses the QR capability can control that ephemeral session. This is the intended authorization boundary for the first local/room remote; it is not an account-level permission system.

## Protocol

Envelope schema: `prometeo.live-tv/v1` with `id`, `at`, `actor`, `action`, and object `payload`.

Initial actions:

- `state.request`
- `layout.set`
- `slot.focus`
- `surface.select`
- `surface.open`
- `media.play`
- `media.pause`
- `media.seek`
- `media.mute`

The protocol is action/payload based, not a hard-coded natural-language command vocabulary.

## Regression checks

`tests/live-tv-core.test.mjs` covers QR capability round-trip and malformed joins, URL protocol filtering, surface normalization, layout slot creation, controller-to-display surface switching, video control scoping, role boundary rejection, and runtime addition of a worker/custom preview surface.

Practical browser constraints intentionally remain visible: third-party pages may block iframe embedding with CSP/X-Frame-Options, and browsers may require muted playback before remote video play can start.

## Preview

`https://juanmanuelpm.github.io/prometeo/experiments/prometeo-live/surfaces/live-tv-exec-20260914-px6b5w2o/`

The preview lives under a separate candidate surface path. The authoritative stable manifest remains unchanged.
