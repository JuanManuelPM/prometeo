# Prometeo local-first storage v1

## Status

**Habits cutover active; Calendar and Money production ownership not switched yet.**

The integrated Habits surface now boots through PrometeoDB. On the first successful load it migrates the existing habit-history object from `prometeo-preview-habit-traces-v7` into append-only IndexedDB events, verifies equivalence, writes a migration marker, and then hydrates the visible habit state from IndexedDB on every load.

Pre-migration rollback baseline:

`golden/CALENDAR_LIFE_PREV_UX29_BASELINE.json`

Active cutover files:

- `shared/storage/v1/prometeo-db.js`
- `shared/storage/v1/habit-migration-v1.js`
- `pages/calendar/previews/habits-traces-v1/habits-persistence-v31.js`
- `shared/storage/v1/habit-migration-self-test.html`

Calendar and Money still use their existing persistence owners until separate verified migrations are implemented.

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

## Habits cutover v31

The production bridge intentionally preserves the existing `traces-v24.js` renderer while changing the persistence owner underneath it.

Boot sequence:

```text
READ frozen legacy habit object
    ↓
OPEN PrometeoDB
    ↓
MIGRATE deterministic legacy events if needed
    ↓
VERIFY legacy projection == DB projection
    ↓
WRITE verified migration marker
    ↓
REPLAY pending local outbox
    ↓
HYDRATE visible habit state from DB
    ↓
LOAD existing habit renderer
```

After cutover, reads of the old habit key are virtualized to the current DB-backed projection for compatibility with the existing renderer. Writes to that legacy key no longer destructively replace the old rollback object. Instead they:

1. update an in-memory/current projection immediately;
2. update a local recovery mirror;
3. append the change to a synchronous local outbox;
4. flush the outbox into append-only `behavior_events` asynchronously.

This means a tap remains immediate and offline-friendly. If the tab closes before IndexedDB finishes a write, the outbox survives and is replayed on the next boot. If IndexedDB is temporarily unavailable, the recovery mirror + outbox keep the current browser usable until the database becomes available again.

### Active habit persistence keys

- legacy rollback evidence: `prometeo-preview-habit-traces-v7`
- recovery projection cache: `prometeo-db-habit-projection-v31`
- pending write outbox: `prometeo-db-habit-outbox-v31`
- migration marker in DB meta: `migration.habits.localStorage-v7-to-behavior-events.v1`

The recovery projection and outbox are transport/recovery structures, not canonical behavior truth. Canonical behavior truth is `behavior_events` once the migration marker is verified.

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
11. Once Habits is verified on PrometeoDB, the old habit-history key is rollback evidence, not the canonical owner.
12. A pending outbox write must be recorded synchronously before asynchronous IndexedDB flushing begins.
13. Database hydration happens before the habit renderer is loaded, so a reload projects DB truth rather than stale legacy state.

## Legacy owners still in use or preserved

- `prometeo-preview-habit-traces-v7` — preserved as frozen rollback evidence after verified Habits cutover
- `prometeo-preview-habit-graphs-v13` — graph-open view preference remains localStorage
- `prometeo-preview-habit-groups-v22` — category-collapse view preference remains localStorage
- `prometeo-preview-habit-starts-v24` — tracker activation dates remain localStorage for now

## Verified migration behavior

`habit-migration-v1.js` uses deterministic migration event IDs (`migr-habits-v1:<tracker>:<date>`) so rerunning the migration cannot duplicate legacy events.

The dedicated self-test checks:

- first migration writes the expected explicit marks;
- DB projection equals normalized legacy projection;
- second migration is idempotent;
- an `unknown` correction removes the visible mark without deleting history;
- the rollback snapshot exists exactly once.

## Next persistence work

1. Keep Habits under DB ownership and add browser-level regression coverage around real UI taps/reloads.
2. Move tracker activation metadata to a typed DB owner without changing streak semantics.
3. Add export/import controls for user-visible recovery.
4. Migrate Calendar and Money independently, with their own rollback and verification gates.
5. Add optional remote sync after local behavior ownership is stable.

## Agent rule

Before modifying persistent Prometeo data, a fresh agent must load:

1. `.well-known/prometeo.json`
2. the active surface contract
3. `golden/CALENDAR_LIFE_PREV_UX29_BASELINE.json` while persistence migrations are active
4. this storage contract
5. `shared/storage/v1/habit-migration-v1.js`
6. `pages/calendar/previews/habits-traces-v1/habits-persistence-v31.js` when touching Habits

Do not replace the migration with a clean rewrite merely because IndexedDB exists. Do not make the legacy habit key canonical again after verified cutover.
