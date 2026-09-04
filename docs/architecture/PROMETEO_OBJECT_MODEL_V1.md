# PROMETEO OBJECT MODEL v1

Status: experimental foundation on `architecture/object-core-v1`. Not wired to the live app.

## Core rule

Prometeo views do not own domain data. A canonical object is stored once and projected into Calendar, Today, Finance, Students, Projects, Search, or future surfaces.

```text
canonical object
      |
      +--> temporal projection --> Calendar / Today
      +--> financial projection --> Finance
      +--> actionable projection -> Today / Projects
      +--> relations ------------> Students / Courses / Plans
```

## Object envelope

Every object has the same durable envelope:

```js
{
  schemaVersion,
  id,
  type,
  title,
  status,
  createdAt,
  updatedAt,
  tags,
  collections,
  relations,
  notes,
  links,
  attachments,
  capabilities,
  history
}
```

Domain-specific meaning lives in capability blocks rather than in one giant flat schema.

## Capabilities

v1 recognizes:

- `temporal`: date, start/end, duration, recurrence, timezone.
- `actionable`: next action, due date, priority, blockers.
- `repeatable`: recurrence semantics shared by lessons, habits, expenses, routines, etc.
- `financial`: incoming/outgoing money, amount/rate, certainty, category.
- `social`: participants and people relations.
- `trackable`: occurrences/progress/logging.
- `content`: notes/resources/material.

A type declares which capabilities it supports. Views inspect capabilities, not hard-coded object names.

## Initial type registry

- `task`
- `event`
- `habit`
- `project`
- `lesson`
- `expense`
- `plan`
- `note`
- `course`

Types are not navigation categories. Tags and collections remain orthogonal.

## Example: one lesson, several views

```js
lesson = {
  type: "lesson",
  title: "José",
  capabilities: {
    temporal: { ... },
    repeatable: { ... },
    financial: { direction: "in", rate: 50000 },
    social: { ... }
  }
}
```

The same `lesson.id` can generate:

- a block in Calendar;
- an item in Today;
- an income occurrence in Finance;
- history under a Student relation.

No copy is created for each surface.

## Object Store

`object-store.js` is the canonical persistence API for this experiment. It provides:

- `create(type, input)`
- `put(object)`
- `patch(id, patch)`
- `remove(id)` (archive by default)
- `get(id)`
- `all()`
- `query(criteria)`
- `subscribe(listener)`
- import/export of the versioned state envelope

Direct `localStorage` reads/writes should eventually disappear from domain code. The store owns persistence.

## Schema Registry

`schema-registry.js` owns:

- allowed types;
- allowed capabilities per type;
- required paths;
- available semantic actions;
- visual identity key;
- validation hooks.

AI and generators must create objects through registered schemas. They may fill data, but must not invent persistence structure.

## Projections

`projections.js` currently supplies pure projections for:

- `temporal`
- `financial`
- `actionable`
- `relations`

The intended dependency direction is:

```text
Object Store -> Projection -> Renderer
```

Never:

```text
Renderer -> duplicate domain record
```

## History

v1 keeps current state plus a lightweight activity history. It is deliberately not full event sourcing.

Useful future actions include:

- created
- updated
- rescheduled
- completed
- cancelled
- paid
- logged

This keeps future analytics possible without making the first architecture excessively complex.

## Migrations

Every persisted envelope has `schemaVersion`. `migrations.js` requires explicit one-version-at-a-time migrations.

Live data must not be migrated until adapters and round-trip tests exist for the current Calendar/Life state.

## Migration strategy for the current app

Do not rewrite everything at once.

1. Keep current UI and current state working.
2. Add adapters that convert legacy Lessons/University/Tasks/Habits/Expenses into canonical objects in memory.
3. Make Calendar consume the temporal projection while still reading legacy state through the adapter.
4. Make Finance consume financial projections.
5. Move writes behind the Object Store.
6. Verify export/import and recurrence behavior.
7. Only then migrate persisted personal data to the v1 store.

This makes the refactor reversible until the canonical model proves itself.

## Gate for every future feature

Before adding a module, answer:

1. Is this a new object type, a new capability, a relation, a projection, a renderer, or a generator?
2. Does it require new persistent state at all?
3. Can existing capabilities express it without adding a mini-app?
4. Is there exactly one source of truth?

If the proposed feature creates a second copy of an existing domain object, it fails the gate.

## Next implementation slice

The next safe slice is a **legacy adapter** for the current Calendar data. It should map existing lessons, UP course meetings, personal events, tasks, and habits into canonical objects without changing the live persistence format. Then we can compare old and new projections side-by-side before switching any renderer.
