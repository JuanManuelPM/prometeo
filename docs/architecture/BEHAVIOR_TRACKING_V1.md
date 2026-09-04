# Prometeo Behavior Tracking v1

## Goal

Add simple behavior tracking without creating a separate addictions mini-app.

The engine is generic enough for avoid / limit / minimum / target behaviors. The first UI can use it for cigarette use, but the architecture is intentionally broader.

## Canonical objects

### `behavior_tracker`

One durable object represents the behavior being tracked.

Example:

```js
{
  type: "behavior_tracker",
  title: "Cigarrillos",
  capabilities: {
    trackable: {
      goal: { mode: "avoid" },
      unit: "cigarette",
      confirmation: "manual"
    }
  }
}
```

### `behavior_log`

Each observation is a separate event related to the tracker.

Kinds:

- `use`: the behavior occurred.
- `urge`: urge/craving was recorded but does not imply use.
- `clear`: explicitly confirmed no use for that day.

`unknown` is derived when no decisive log exists. It is never stored as success.

## Critical rule

**No log is not the same as a clear day.**

This prevents abandoned periods from creating fake streaks.

Daily precedence is:

`use > clear > urge > unknown`

A `clear` log cannot erase a `use` log from the same day.

## Minimal UI contract

First useful UI only needs:

1. Tracker title.
2. `Registrar consumo`.
3. Optional quantity.
4. `Tuve ganas`.
5. `Sin consumo hoy`.
6. 30-day strip/calendar with `clear / use / unknown`.
7. Current confirmed streak.
8. Best confirmed streak in the selected window.
9. Days with use and total quantity.

Context, trigger and note are optional metadata and must never block quick logging.

## Projections

The same objects can feed:

- **Today**: quick actions and current state.
- **Calendar**: tiny daily indicator when useful.
- **History**: all observations.
- **Analytics**: frequency, quantity, streaks, context patterns.

No renderer owns the logs.

## Files

- `shared/core/object/v1/schema-registry.js`
- `shared/core/object/v1/projections.js`
- `shared/core/behavior/v1/behavior-tracker.js`
- `shared/core/behavior/v1/self-test.html`

## Current scope

This work lives only on `architecture/object-core-v1` and does not modify the published Prometeo calendar or the user's current local data.
