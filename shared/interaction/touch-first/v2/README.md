# Touch-First Interaction v2 — candidate

V1 already unified pressed/contact feedback through Pointer Events, but the canonical spec also requires direct mouse/pen panning and safe wheel-to-horizontal traversal. V2 implements those missing mechanics without changing native touch physics.

## Declarations

```html
<div data-p-scroll="x" data-p-direct-pan="true" data-p-wheel-axis="x">...</div>
<div data-p-scroll="y" data-p-direct-pan="true">...</div>
```

- Touch: browser-native scroll/momentum.
- Mouse/pen: press-drag after a 7px threshold.
- A crossed drag suppresses the resulting click.
- Pointer capture begins only after drag intent and is released on every terminal path.
- Wheel translation is opt-in and only on a horizontal rail; native horizontal deltas are not doubled.
- Cross-axis intent before lock yields instead of stealing the gesture.

No UA sniffing and no fake inertia.
