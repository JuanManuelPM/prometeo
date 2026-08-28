# Edge Stack v1

Reusable implementation of Prometeo's selected layered navigation grammar.

## Files

- `edge-stack.js` — runtime and interaction engine.
- `edge-stack.css` — component material/surface styles only.
- `../SPEC.md` — frozen behavioral and geometric invariants.
- `../ENGINEERING_MEMORY.md` — failed approaches and modification guardrails.

## Minimal use

```html
<link rel="stylesheet" href="/shared/navigation/edge-stack/v1/edge-stack.css">
<div id="nav" class="prometeo-edge-stack"></div>
<script src="/shared/navigation/edge-stack/v1/edge-stack.js"></script>
<script>
  PrometeoEdgeStack.create(document.querySelector('#nav'), {
    items: [
      { id: 'prometeo', title: 'Prometeo', url: '/' },
      { id: 'jose', title: 'José', url: '/jose/' },
      { id: 'design', title: 'Diseño', url: '/design/' }
    ],
    side: 'left'
  });
</script>
```

## Mirror the component

Do **not** copy or rewrite the component.

```js
PrometeoEdgeStack.create(element, {
  items,
  side: 'right'
});
```

That option projects the same canonical geometry to the opposite side.

## Data vs geometry

Content may change freely through `items`. Geometry does not belong to each project/page. Never add per-destination CSS to make the stack fit.

## Changing the palette

Pass a palette of background/text pairs:

```js
palette: [
  { bg:'#4C3D19', fg:'#E5D7C4' },
  { bg:'#354024', fg:'#E5D7C4' },
  { bg:'#889063', fg:'#4C3D19' },
  { bg:'#CFBB99', fg:'#354024' },
  { bg:'#E5D7C4', fg:'#4C3D19' }
]
```

## Allowed high-level knobs

Safe configuration:

- `side: 'left' | 'right'`
- `startIndex`
- `loop`
- `palette`
- `onChange(item, index)`

Anything that changes tab ratios, layer ownership, commit timing, inverse shoulder math or label occlusion is an architectural change and must be checked against `SPEC.md` and `ENGINEERING_MEMORY.md`.

## Future activation button

v1 intentionally separates **moving/focusing** from **entering/opening**. Items may already carry `url`, but this runtime does not invent an activation button. The next UI step can add an explicit control that opens the focused item's `url` without changing Edge Stack geometry.
