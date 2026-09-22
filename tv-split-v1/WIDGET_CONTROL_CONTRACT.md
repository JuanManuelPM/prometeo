# Prometeo TV · Widget Control Contract

This contract lets any TV page expose controls without drawing its own remote UI.

## Principle

The widget declares capabilities. Prometeo renders the physical control surface.

A page must not inject arbitrary control HTML into the scheduler.

## Page payload

A `page` block may include:

```json
{
  "url": "https://example.com/news",
  "display": {
    "profile": "flex",
    "position": "auto"
  },
  "control": {
    "label": "NOTICIAS",
    "actions": ["previous", "next", "refresh"],
    "settings_url": "https://example.com/news/settings"
  }
}
```

Supported actions:

- `previous`
- `next`
- `toggle`
- `reset`
- `refresh`

`refresh` reloads the iframe directly.

The other actions are delivered to the page with `postMessage`.

## Message received by the widget

```js
window.addEventListener("message", (event) => {
  const d = event.data;
  if (!d || d.type !== "prometeo:control") return;

  switch (d.action) {
    case "previous":
      break;
    case "next":
      break;
    case "toggle":
      break;
    case "reset":
      break;
  }
});
```

Message shape:

```json
{
  "type": "prometeo:control",
  "action": "next",
  "block_id": "..."
}
```

## Built-in widget controls

### YouTube

Prometeo owns the control definition:

- previous video
- play / pause
- next video
- mute / sound
- open YouTube library/settings

The YouTube queue remains global, not stored in the schedule block.

### Clock

Prometeo owns the control definition:

- focus duration
- break duration
- preset dial

Persisted clock payload:

```json
{
  "style": "time-mass-25-5",
  "focus_minutes": 25,
  "break_minutes": 5
}
```

### Black

No runtime controls.

## Scheduler behavior

A normal tap on any schedule block:

1. selects that event;
2. opens the contextual control instrument.

A long press opens the app/settings target when one exists.

If no event is selected, the control surface falls back to an active TV block when possible.

## Visual rule

Controls are composed from a shared physical vocabulary:

- recessed wells for related actions;
- round buttons for discrete actions;
- split capsules for paired/opposing actions;
- dials for stepped continuous values;
- separate information strip for state.

The shape should communicate the relationship between actions before text is read.
