# Prometeo TV Remote Lab — 2026-09-15

Status: ACTIVE EXPERIMENT / NOT PRODUCT AUTHORITY

## Purpose

Prometeo TV is not only a destination for AI-generated surfaces. It is also a shared visual host that can be controlled directly from phones without routing every interaction through ChatGPT or another model.

Two paths coexist:

1. **Direct room path** — phone/client → room event → TV. Used for fast controls, layout changes, focusing a surface, showing text, opening media, game inputs, votes, player actions, and other interactions that already exist.
2. **AI creation path** — Capture → Planner → prepared jobs → workers → durable artifact/result → TV. Used when the human is asking to create or modify software/product behavior that does not already exist.

The user should not have to understand or explicitly choose the transport layer. Existing controls should be direct; creation/modification can spawn AI work.

## First proof

The current lab adds a QR pairing surface to Prometeo Live. Scanning the QR opens a phone controller bound to that specific TV room through an expiring capability token.

Public TV:
`https://juanmanuelpm.github.io/prometeo/experiments/prometeo-live/`

Remote shell:
`https://juanmanuelpm.github.io/prometeo/experiments/prometeo-remote/`

The QR carries the room code and remote capability in the URL fragment; the fragment is consumed client-side.

## Room transport

Backend Edge Function:
`prometeo-tv-room-v1`

Tables:
- `prometeo_tv_rooms`
- `prometeo_tv_events`

A room has separate TV and remote capability tokens. Tokens are stored only as hashes in Postgres. Rooms expire after 12 hours.

The room is a generic bidirectional event bus. Events have:
- room
- source (`tv` or `remote`)
- client_id
- event_type
- payload
- monotonically increasing event id

The current transport uses short interval event polling for resilient cross-device behavior. It does not depend on ChatGPT. The protocol is intentionally transport-independent so it can later move to Realtime/WebSockets without changing app semantics.

## Current direct controls

The phone can currently:
- switch host layout among 1, 2, and 4 panes;
- focus any surface reported by the TV;
- show and hide a large text overlay;
- open a YouTube or HTTPS media/web URL over the host;
- close media;
- force-refresh mounted surfaces;
- make the TV show its pairing QR again;
- return to the normal Prometeo Live view.

The TV emits `tv.state` events back to the remote with the mounted surface identities/titles, current layout, focus, and media/overlay state. Therefore the remote can become contextual rather than being a permanently fixed remote design.

## Multi-client direction

Multiple phones may use the same room capability and retain distinct `client_id` values. This is the base for friends scanning one QR and joining a game or shared experience. Later roles can split owner/controller/player/spectator permissions and private player state without replacing the room abstraction.

## Non-regression laws

- Direct interactions must never be forced through AI if the action already exists.
- Arbitrary creation/modification requests must not be reduced to hard-coded keyword parsers.
- Prometeo TV remains a universal host for both live software surfaces and agent/control-room state.
- Phone control is private/tactile state; TV is the shared visual state.
- QR/capability transport is a lab mechanism, not final production identity/auth authority.
- This experiment is not Human Accepted until cross-device QR pairing and control are physically tested.
