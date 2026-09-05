# Prometeo Calendar v1

Canonical shared owner for temporal projection used by the stable public route `pages/calendar/`.

## Ownership

Calendar owns date arithmetic, recurrence projection, week/day rendering and the local calendar-state adapter. Domain objects remain owned by their domains; this first integrated version consumes lessons, university schedules, personal tasks/events, habits and opportunities as projections. Finance is a consumer of lesson occurrences, not the owner of calendar state.

## Privacy

The repository is public. Personal schedules are **not committed**. The app stores them in `localStorage` under `prometeo.calendar.state.v1`. A one-time `#pcal=<base64url JSON>` fragment can bootstrap another browser; fragments are not sent in the HTTP request and are erased immediately after import. Backup import/export is available from Tools.

## Stable URL

`https://juanmanuelpm.github.io/prometeo/pages/calendar/`

## Shared dependencies

- `shared/interaction/touch-first/v1/` — pointer/touch grammar and 44px hit targets.
- `shared/material/bicolor/v1/` — exactly-two-color tactile controls.

## State migration

Legacy calendar/life keys are captured idempotently into the v1 state and hydrated for the current renderer. This keeps the migration reversible while downstream domains are extracted further.
