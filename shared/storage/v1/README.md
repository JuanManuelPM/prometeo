# Prometeo local-first storage v1

## Status

**Foundation present; production ownership not switched yet.**

The currently served Calendar / Habits / Money preview still reads its existing localStorage keys. This is deliberate: the first database step must not risk destroying or silently reinterpreting existing habit history.

Pre-migration rollback baseline:

`golden/CALENDAR_LIFE_PREV_UX29_BASELINE.json`

## Goal

Prometeo data must survive independently of any chat. ChatGPT is an editor/agent for the product, not the database and not the only holder of product knowledge.

The local database is **IndexedDB** and works without a server or network connection. A future sync layer may mirror this data to another device, but local persistence remains usable when sync is unavailable.

## Runtime

`shared/storage/v1/prometeo-db.js`

Global API:

`window.PrometeoDB`

Default database:

`prometeo.local`

Schema:

`prometeo.local-db/v1`

## Stores

### `behavior_events`

Append-only behavioral history.

```json
{
  "id": "uuid",
  "schema": "prometeo.behavior-event/v1",
  "tracker_id": "weed",
  "date": "2026-09-08",
  "state": "lapse",
  "source": "manual",
  "created_at": "ISO timestamp",
  "supersedes_id": null,
  "metadata": {}
}
```

A correction is another event. Existing events are not destructively edited. The latest event for tracker + date projects the visible daily state.

### `kv`

Canonical local values that do not need an event stream yet. It is intentionally generic so future migrations can introduce typed owners without creating another localStorage pile.

### `meta`

Database/migration metadata. Migration markers belong here rather than inside domain data.

### `snapshots`

Explicit local backup snapshots. These are separate from domain truth and are used only for rollback/recovery.

## Non-negotiable persistence rules

1. Existing localStorage data is not deleted during first migration.
2. Migration is additive and idempotent.
3. A migration marker is written only after verification succeeds.
4. Behavior graphs remain derived projections, never stored truth.
5. Blank/unknown semantics are not invented during migration.
6. Existing tracker ids stay stable.
7. View preferences such as open graphs or collapsed categories are not behavior history.
8. Production must remain usable offline.
9. A future remote sync layer consumes local records; it does not make every tap depend on the network.
10. No production database reset API is exposed. The only delete helper is restricted to database names beginning with `prometeo.test.`.

## Current legacy owners to migrate next

- `prometeo-preview-habit-traces-v7` — habit history
- `prometeo-preview-habit-graphs-v13` — graph-open preference
- `prometeo-preview-habit-groups-v22` — category-collapse preference
- `prometeo-preview-habit-starts-v24` — tracker activation dates

The first production migration should move **habit history only** to `behavior_events`, retain the legacy object as rollback evidence, and temporarily dual-read while verifying equivalence.

## Cutover sequence

```text
FREEZE CURRENT
    ↓
LOAD PrometeoDB
    ↓
MIGRATE legacy habit marks idempotently
    ↓
VERIFY legacy projection == DB projection
    ↓
DUAL READ / DB WRITE
    ↓
VERIFY reload + old data
    ↓
DB becomes behavior owner
    ↓
legacy key remains read-only rollback evidence
```

## Agent rule

Before modifying persistent Prometeo data, a fresh agent must load:

1. `.well-known/prometeo.json`
2. the active surface contract
3. `golden/CALENDAR_LIFE_PREV_UX29_BASELINE.json` while the storage migration is active
4. this storage contract
5. the current migration implementation

Do not replace the migration with a clean rewrite merely because IndexedDB exists.
