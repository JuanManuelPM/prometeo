# Prometeo Part 1 — V53 canonical integration

Status: **TESTED CANDIDATE — NOT HUMAN ACCEPTED — NOT SERVED**

## Product decision

The exact published V53 navigator is the visible frontend base. Part 1 does not rewrite its renderer or mount a replacement visual shell. V23 is retained as the Human Accepted physics oracle / rollback donor.

## Integration completed

- Existing V53 `.terminal`, `.terminal-frame` and `.return-tooth` implement the visible Universal Shell surface.
- `v53-shell-adapter/v1` adds semantic snapshots, durable navigation state, input ownership bookkeeping and terminal Focus Lease without a second Back/Escape owner.
- Exact Back persistence uses semantic V53 history/current node/selected index and replays V53's own transitions; it stores no pixel coordinates.
- PageKit Host v2 keeps a version-pinned iframe alive across close/reopen, supports compact/expanded/fullscreen/presentation and nests Focus Lease.
- Classes runtime persists pure Classes Engine state and consumes the shared PageKit host.
- Student World runtime persists pure world topology/progress state without imposing map art/theme.
- Design Kernel v2 and Material v2 remain opt-in; they are not globally applied to V53.
- Touch-First v2 remains reusable for pages/widgets and is explicitly not mounted over the V53 viewport.
- Candidate wrapper is visually only V53 in one borderless same-origin iframe; integration scripts are backstage.

## Regression prevention

The earlier V23-derived visible integration is now formally `ARCHIVED_TECHNICAL_FIXTURE`. The generic Shell v1 is not allowed to mount visibly over V53.

## Tests

PASS:
- Part 1 static contract
- V53 shell adapter readiness/snapshot/persistence
- semantic route replay / no pixel restoration
- terminal Focus Lease acquire/release
- PageKit persistent frame / modes / version pins / Focus Lease
- Classes durable resume
- Student World durable resume
- JavaScript syntax
- JSON parse

Browser composition was attempted with system Chromium. This execution environment blocks both `127.0.0.1` and `file://` navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`; no Browser PASS is claimed. Served/perceptual/Human gates remain later release gates.

## Non-actions

- `main` not changed.
- `gh-pages` not changed.
- no production alias moved.
- no Human Accepted pointer moved.
- no V53 visual restyle.
