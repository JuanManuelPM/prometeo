# Prometeo TV · Widget Display Contract

This contract is for any page or widget that can be shown inside Prometeo TV.

## 1. Display profile

A scheduled block may include a display hint in its payload:

```json
{
  "url": "https://example.com/widget",
  "display": {
    "profile": "wide",
    "position": "bottom"
  }
}
```

Supported profiles:

- `wide`: content that benefits from a landscape rectangle. Use for video, maps, wide timelines, media.
- `compact`: content that can live in a narrow/tall area. Use for clocks, counters, status widgets.
- `flex`: general-purpose responsive content. Default for normal pages.

Supported position hints:

- `bottom`
- `top`
- `side`
- `auto`

Hints are preferences, not absolute coordinates. The TV runtime chooses the final composition based on every active widget.

Defaults when no hint is supplied:

- `youtube` → `wide`, prefers bottom
- `clock` → `compact`, prefers side
- `page` → `flex`
- other kinds → `flex`

## 2. Runtime layout message

Every `page` iframe receives a browser `postMessage` after layout:

```js
window.addEventListener("message", (event) => {
  const d = event.data;
  if (!d || d.type !== "prometeo:layout") return;

  // d.mode
  // d.profile
  // d.width
  // d.height
  // d.count
  // d.orientation: "landscape" | "portrait"
});
```

Example payload:

```json
{
  "type": "prometeo:layout",
  "mode": "layout-three-wide-bottom",
  "profile": "flex",
  "width": 820,
  "height": 360,
  "count": 3,
  "orientation": "landscape"
}
```

A page should use this message to switch its own layout, not merely scale down.

## 3. Responsive behavior expected from pages

Pages should have at least three internal presentation modes:

- wide/landscape: use horizontal space, larger media, multiple columns when useful.
- compact/portrait: prioritize one vertical reading path and remove secondary decoration.
- full/flexible: normal standalone presentation.

Do not assume a fixed TV resolution. Use the dimensions from `prometeo:layout`.

## 4. Current automatic TV compositions

- 1 widget: full screen.
- 2 widgets:
  - if one is wide: stack vertically, wide widget on the bottom.
  - if one is compact: compact widget on a narrow side column.
  - otherwise: equal split.
- 3 widgets:
  - one wide: full-width bottom area; two widgets above.
  - compact + two others: compact side column; other two stacked.
  - otherwise: balanced 2+1 composition.
- 4 widgets:
  - one wide: wide widget spans the bottom; three widgets above.
  - two wide: two wide widgets share the bottom row.
  - otherwise: 2×2 grid.

## 5. Design rule

The TV owns placement. The widget owns its internal responsive layout.

A new page should never hard-code assumptions such as "I will always be full-screen" or "I will always be one third of the screen".

The widget should remain useful with no layout message; the message is progressive enhancement.
