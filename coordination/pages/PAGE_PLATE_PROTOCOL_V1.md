# PROMETEO PAGE PLATE + PAGE CONTEXT PROTOCOL V1

## Purpose
Every visible Prometeo page/surface has one stable human-usable identifier shaped like an old Argentine plate: `AAA000` (three uppercase ASCII letters + three digits).

The plate identifies the PAGE, not a particular build, revision, chat, worker, URL, or notification. It never changes when the page evolves.

Examples: `CAL001`, `VOZ001`, `JOS001`.

`P###` identifiers remain PAGE CHANGE / notification identifiers. They are not page identities.

## Page continuity without a literal chat
Every registered page has a deterministic durable context namespace:

`coordination/pages/contexts/<PLATE>.json`

The file MAY be absent until the first material page-scoped conversation/work cycle. Absence means `VIRTUAL_CONTEXT_NOT_MATERIALIZED`, not “page has no continuity”. The deterministic path + registry entry is the durable handle.

On first material use, a Guide/Planner/Steward atomically CREATEs that file. Never mint an alternate context path because CREATE lost a race; reload and use the winner.

Minimum page-context object:
```json
{
  "schema":"prometeo.page-context/v1",
  "plate":"CAL001",
  "page_id":"calendar",
  "created_at":"...",
  "north_star":[],
  "accepted_laws":[],
  "current_state":{},
  "open_threads":[],
  "recent_changes":[],
  "source_refs":[]
}
```

Context is durable project/page memory, NOT hidden chain-of-thought and NOT proof of Human Acceptance.

## Registry law
Canonical visible registry: `coordination/live/PAGE_WATCH_REGISTRY_V1.json`.
Each page entry MUST contain:
- `plate`
- `id`
- `title`
- `url`
- `folder`
- `status`
- `revision`
- `changed_at`
- `change_id`
- `change_note`
- `context_path`

`plate` uniqueness is global across Prometeo pages. Reuse is forbidden, including archived/deleted pages.

## Plate allocation
For existing pages, plates are assigned once and frozen.
For a new page:
1. derive a readable three-letter family code when obvious (`CAL`, `VOZ`, `JOS`), otherwise use a neutral unused code;
2. choose the lowest unused 3-digit suffix for that prefix;
3. atomically CREATE `coordination/pages/plates/<PLATE>.json` before any public registration;
4. if CREATE loses a race, reload registry/plates and choose the next valid unused plate;
5. never overwrite a plate owner.

A plate receipt contains page_id/title/created_at/creator/request_ref/parents where applicable.

## Guide invocation
A `/g` Guide MUST recognize any standalone token matching `[A-Z]{3}[0-9]{3}` as a possible page plate.
When the human references one or more plates, the Guide:
1. resolves every plate against the canonical registry/plate receipts;
2. loads each page context path, materializing a missing context only when needed;
3. loads current revision/URL/change note and relevant page change threads/returns;
4. treats the human request as a delta over those page contexts;
5. persists the request before delegating mutation work.

Examples:
- `CAL001: sacá esta barra y hacé el mes más claro`
- `CAL001 + VOZ001: quiero una nueva página que combine esto`
- `JOS001 + ALG001 + QUI001: unificá navegación, no contenido`

No human should need to locate the old chat for a page.

## Multi-page composition
Combining plates does NOT merge their identities or overwrite parents.
A composition request creates a new durable page request whose `source_plates` list preserves provenance.
If the requested output is a NEW page, that page receives its own new plate and context. Parent pages remain independently addressable.

## Collision safety
- page requests are append-only, fingerprinted and atomically created;
- exclusive page mutation uses existing claim/PIN/CAS laws;
- a new page plate is reserved by create-if-absent receipt;
- registry updates use fresh SHA/CAS and must reload on conflict;
- workers never mint per-worker variants merely because they lost a race;
- late returns remain candidate evidence and are reconciled by the page steward/guide.

## Human-visible guarantee
Live should display the plate near the page title so the human can copy/reference it quickly. The plate is more important for conversation routing than internal page_id/path.

## Truth boundary
A plate means “stable identity exists”. It does not mean the page is Current, Human Accepted, Served, verified, or even publicly reachable. Those remain separate state claims.
