# Prometeo Public State v1 — design contract

Status: **DESIGN + ISOLATED CONTRACT PROTOTYPE. NOT INTEGRATED. NOT DEPLOYED.**

This layer lets Prometeo surfaces publish explicit, privacy-reviewed projections of current state and lets other authorized surfaces consume the same semantic variable without importing producer code or reading another page's storage.

It does **not** replace `PrometeoDB`, canonical domain stores, or the TV Room / command bus.

## 1. The separation

```text
LOCAL / CANONICAL DATA
        ↓ derive
SAFE PUBLIC PROJECTION
        ↓ local outbox / sync
PROMETEO PUBLIC STATE
        ↓ get / subscribe
MANY RENDERERS
```

Example:

```text
PrometeoDB behavior_events            CANONICAL
        ↓ derive current streak
habits.exercise.current_streak = 7    DERIVED / SHARED PROJECTION
        ↓
TV renders "7 días"                   DISPLAY STATE
```

Definitions:

- **CANONICAL**: domain truth required to reconstruct the domain. Example: append-only `behavior_events`. Public State never becomes canonical merely because it is convenient to query.
- **DERIVED**: a reproducible projection from canonical data. Example: `current_streak`, `tasks.completed_today`.
- **DISPLAY STATE**: renderer-specific wording/layout. Example: `"7 días"`, a progress ring, or a TV tile. It should not be published as semantic truth when the underlying value is `7`.

## 2. Public State is not TV Room

These systems are complementary and intentionally separate.

| Public State | TV Room / command bus |
| --- | --- |
| What is true now | What a device should do now |
| Current value by semantic key | Event / command stream |
| `habits.exercise.current_streak = 7` | `open_url` |
| `study.current_subject = "Modelos III"` | `change_layout` |
| `pomodoro.remaining = 840` | `pause` |
| Read/get/subscribe | Send/consume command |
| Durable or expiring current projection | Ephemeral intent/event |

Do not route Public State through `prometeo_tv_events`, and do not make TV Room the owner of shared variables.

## 3. Privacy model

“Public State” means **published/shared projection**, not “public on the Internet”. The minimum layers are:

1. **Canonical/private data** — remains in its domain owner. Never copied wholesale into Public State.
2. **Shared state** — small explicit projections readable by authorized Prometeo surfaces.
3. **Public anonymous state** — optional, explicit, independently safe projection that may be exposed without workspace identity.

V1 visibility values:

- `workspace`: readable by the authenticated workspace owner / trusted workspace surfaces.
- `channel`: readable only by actors authorized for that channel.
- `public_anonymous`: readable through a dedicated sanitized public endpoint. Publishing requires both a key definition that permits it and an explicit `publicSafe: true` assertion.

The following are forbidden as convenience projections: medical/personal history, private notes, academic files/content, private transcripts, finance records, full habit histories, tokens, credentials, auth material, or opaque private-source payloads.

**Provenance must not leak private identifiers.** A public anonymous entry may name a logical producer such as `habits.projection/v1`; it must not expose private canonical row IDs, filenames, tokens, signed URLs, transcript IDs, or storage paths.

## 4. Addressing: channels and keys

A shared variable is addressed by:

```text
(workspace_id, channel, key)
```

`channel` is an **audience / permission namespace**, not the page that renders the value. A TV renderer may subscribe to the `home` channel if it is authorized; do not duplicate a variable into `tv` merely because TV consumes it.

Initial channel vocabulary can include:

- `home` — owner-level cross-surface projections useful across Prometeo.
- `tv` — state intentionally scoped to TV-authorized consumers.
- `study` — academic progress/status projections, never academic document bodies.
- `public-profile` — explicitly publishable profile projections.
- `friends` — projections shared with explicitly authorized friends/capabilities.

Channels are not created implicitly by renderers. Production integration should keep a small channel registry with policy/ACL metadata.

Keys are semantic dotted paths:

```text
habits.exercise.current_streak
tasks.completed_today
study.current_subject
pomodoro.remaining
```

Rules:

- lower-case semantic segments;
- stable meaning across renderers;
- no page/UI names in the key unless they are the actual domain;
- one semantic owner/source per key within a channel;
- no secrets or user-auth material in key names or values.

## 5. State Entry

Canonical JSON contract: `state-entry.schema.json`.

Core envelope:

```json
{
  "schema": "prometeo.public-state-entry/v1",
  "workspace_id": "<workspace>",
  "channel": "home",
  "key": "habits.exercise.current_streak",
  "value_json": 7,
  "version": 12,
  "source": "habits.projection/v1",
  "source_version": 42,
  "schema_id": "prometeo.state.habits-current-streak/v1",
  "visibility": "workspace",
  "history_mode": "none",
  "operation_id": "...",
  "source_updated_at": "2026-09-20T20:00:00-03:00",
  "updated_at": "2026-09-20T23:00:01Z",
  "expires_at": null,
  "provenance": {}
}
```

`version` is the monotonic **remote state-entry revision** for this address. `source_version` belongs to the producer projection and is the primary idempotency/conflict sequence. They are deliberately separate.

`expires_at` is optional for state that becomes false/stale merely by passage of time, such as `pomodoro.remaining`. Consumers treat expired entries as absent/stale rather than displaying a frozen old truth.

`value_json` must be genuine JSON data (no `undefined`, functions, symbols, BigInt, `NaN`, or infinities) and is capped at 16 KiB in the v1 client prototype. Production validation must enforce its registered per-key schema and size server-side as well.

## 6. Optional State Event

`state-event.schema.json` defines an immutable event generated only when a key opts into `history_mode: "changes"`.

State Events are useful for debugging, audit, or genuinely useful shared-state history. They are **not** the canonical history of the producer domain and must never be required to reconstruct that domain.

Default is `history_mode: "none"`.

## 7. Source ownership, validation and conflicts

Every production key should have a definition/registry entry declaring at least:

```js
{
  source: "habits.projection/v1",
  channels: ["home"],
  visibilities: ["workspace"],
  schemaId: "prometeo.state.habits-current-streak/v1",
  validate: value => Number.isInteger(value) && value >= 0
}
```

The production server must enforce the equivalent rule, not trust browser validation alone.

### Version rules

For one `(workspace, channel, key)`:

1. One semantic producer owns the key. A different `source` is rejected unless ownership is explicitly transferred.
2. A higher `source_version` may advance the state.
3. Replaying the same `source_version` with the same value is idempotent and does not increment `version`.
4. The same `source_version` with a different value is a hard `SOURCE_VERSION_CONFLICT`.
5. A lower `source_version` is stale and rejected.
6. `expected_version` is an optional compare-and-swap guard for callers that need it; it is not required for ordinary single-owner projections.
7. An `operation_id` makes transport retries traceable/idempotent.

This is intentionally not a CRDT. Public State is a projection layer with declared semantic ownership. If two independent producers legitimately need to merge a value, the merge belongs in a canonical/derived owner before publishing one projection.

On a terminal remote conflict, a production client should quarantine/dead-letter the failed outbox item, fetch the remote entry, and report telemetry. It must not corrupt or roll back canonical local data.

## 8. Local-first and outbox

A domain interaction remains local-first:

```text
LOCAL CANONICAL WRITE
        ↓
DERIVE SAFE PROJECTION
        ↓
WRITE LOCAL SHARED-STATE CACHE
        ↓
ENQUEUE OUTBOX SYNCHRONOUSLY
        ↓ best effort
REMOTE STATE WRITE
        ↓
ACK / remove outbox item
```

Network failure must not block the canonical write or the producer page. The consumer on the same device may immediately observe the optimistic local projection. When connectivity returns, `flush()` replays the outbox in order.

The design does **not** change `PrometeoDB` v1 now. During integration, the least invasive first step is to place Public State cache/outbox records behind a typed adapter using reserved `PrometeoDB.kv` keys. If volume/lifecycle later justifies a dedicated IndexedDB store, that is a separate additive DB migration.

Do not make each local tap wait for Supabase.

## 9. Proposed JS API

Prototype: `prometeo-public-state.mjs`.

```js
const state = createPrometeoPublicState({
  workspaceId,
  store: localStoreAdapter,
  transport: remoteTransport,
  registry
});

await state.publish(
  "habits.exercise.current_streak",
  7,
  {
    channel: "home",
    source: "habits.projection/v1",
    sourceVersion: 42,
    visibility: "workspace"
  }
);

const streak = await state.get(
  "habits.exercise.current_streak",
  { channel: "home" }
);

const unsubscribe = await state.subscribe(
  "habits.exercise.current_streak",
  value => render(value),
  { channel: "home" }
);
```

Additional contract methods:

- `getEntry(key, options)` — returns value + metadata/version/provenance envelope.
- `flush()` — retries pending outbox operations.
- `reconnect()` — flushes, refreshes subscribed keys, then reattaches live transport.

The renderer consumes only the semantic value. It never imports Habits, reads Habits localStorage, or scrapes Habits HTML.

## 10. Proposed Supabase shape — design only

`../../../supabase/design/prometeo-public-state-v1.sql` is intentionally **not** under `supabase/migrations/` and starts with a DO-NOT-APPLY warning.

Recommended current-state table name: `prometeo_state_entries`, not `prometeo_public_state`, because “public” does not mean internet-public.

Recommended optional history table: `prometeo_state_events`.

Both are workspace-scoped. Direct anonymous/authenticated table access should remain closed by default, matching existing Prometeo backend patterns. A dedicated Edge Function can authenticate the current workspace bearer/capability, validate channel/key/source/schema, and then use service-role access.

### Permissions

Production server authorization should distinguish:

- workspace owner/trusted workspace capability;
- channel-scoped read capability/member;
- producer-scoped write capability;
- anonymous sanitized read for keys explicitly allowed as `public_anonymous`.

A workspace-wide secret alone can support the initial trusted-single-user integration, but it is **not** sufficient authorization for a future `friends` channel or hostile/multi-user producer isolation. Before those are enabled, add scoped capabilities/membership enforcement server-side.

## 11. Realtime and polling fallback

The semantic API must not depend on one transport.

Preferred sequence for a subscriber:

```text
GET current snapshot
    ↓
attach authenticated live subscription
    ↓ on disconnect
poll current entry/version with backoff
    ↓ on reconnect
GET/reconcile latest entry
    ↓
reattach live subscription
```

Because existing Prometeo private tables are accessed through service-role Edge Functions rather than open browser table grants, do not loosen table RLS merely to obtain Realtime. Use either:

1. a private/authenticated Supabase Realtime Broadcast channel emitted after successful state writes; or
2. polling through the same authenticated Edge Function as the guaranteed fallback.

Consumers deduplicate by `version`. Reconnect always reconciles a fresh current snapshot before trusting subsequent live messages.

## 12. Synthetic Habits → TV example

See `examples/habits-to-tv.synthetic.mjs`.

It demonstrates:

```text
synthetic behavior_events
        ↓ derive
current_streak = 7
        ↓ publish home channel
Prometeo Public State
        ↓ subscribe same semantic key
synthetic TV renderer -> "7 días"
```

There is no import from a real Habits page and no TV production code.

## 13. What this branch deliberately does not do

- no Calendar integration;
- no Habits production integration;
- no Facultad integration;
- no TV integration;
- no data migration;
- no production Supabase migration;
- no Edge Function deployment;
- no RLS change;
- no current UI change;
- no global deploy;
- no claim that Realtime works against production.

The branch proves the semantic contract and leaves production integration as an explicit later step.
