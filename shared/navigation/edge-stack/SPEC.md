# PROMETEO EDGE STACK

Status: HUMAN-PREFERRED CAPABILITY / NOT YET PRODUCT CURRENT
Canonical owner: `navigation.edge-stack`
Implementation: `shared/navigation/edge-stack/v1/`

## Purpose

Edge Stack is the primary navigation grammar selected for moving through Prometeo pages, projects and destinations. One page owns almost the whole surface; the next destinations exist as a few physical layers/tabs exposed along one edge.

It is a navigation shell, not a dashboard. The inactive pages are physical signals of sequence, not columns of information.

## Accepted visual grammar

1. One active page fills the useful surface.
2. Exactly three future tabs are exposed at the navigation edge.
3. Their remaining-space widths always follow `4u : 2u : 1u`.
4. A hidden preload layer exists behind the `1u` tab so a new page is already physically present before it is revealed.
5. The smallest visible `1u` tab shows color only. Its label is hidden by ordinary layer occlusion; there is no opacity, mask animation, fade or independent text reveal.
6. The first two future tabs may show partial labels. Their labels sit near the useful outer edge with a small stable inset.
7. The primary label is aligned toward the main-side outer edge and receives enough main width to fit when possible.
8. If the primary label needs more width, only `mainWidth` changes. The remaining space is still divided `4:2:1`.
9. Portrait layouts may allocate a larger base fraction to the primary page and use a shorter bottom rail, but the same grammar remains.
10. The active/future page geometry is a stack of complete layers, not separate tab decorations.

## Folder geometry

The accepted silhouette is a folder-like page with:

- a subtle outer widget radius;
- a true inverse/concave shoulder at the internal transition from body to tab;
- a rounded lower outer corner on each tab;
- no square internal endings;
- radii capped by the smallest visible slice so curves never consume the `1u` tab.

The inverse shoulder is important: it extends past the tab boundary and curves back toward the tab wall. A normal inward radius is the wrong geometry.

## Layer laws

1. Each page owns one inseparable layer: background shape + label + clip.
2. Higher layers physically cover lower layers.
3. Labels do not have independent reveal animation.
4. Rear page bodies are complete underneath the current page from the first frame.
5. Moving the current page by 1px must already reveal the next page underneath; no lower-left or lower-right gap may appear.
6. Words may be partially hidden only because a higher page physically covers them.
7. A label must never render on another page's color.

## Motion laws

1. State machine: `IDLE -> DRAGGING -> SETTLING -> IDLE`.
2. One gesture advances at most one page.
3. One wheel burst advances at most one page.
4. Forward and backward are mathematical inverses, driven by the same canonical states.
5. During a transition, geometry interpolates from the current canonical layout to the target canonical layout.
6. At `p=1`, the visible geometry must already equal the target committed geometry.
7. Commit may recycle hidden identities/data, but must not create a visible horizontal snap, spawn, resize, margin change or text teleport.

## Adaptive primary width

For each primary page:

1. Measure the primary word at the chosen rail font size.
2. Compute `neededMain = wordWidth + mainInset + safetyInset`.
3. `mainWidth = clamp(max(baseMain, neededMain), baseMain, maxMain)`.
4. `rest = totalWidth - mainWidth`.
5. `u = rest / 7`.
6. Future exposed slices are `4u`, `2u`, `1u`.

Only this scalar is allowed to adapt to primary word length. Do not independently tune all tab widths.

## Bidirectional law

Direction is a projection, not a second implementation.

- `side: "left"`: primary page on the left, future tabs unfold to the right.
- `side: "right"`: exact physical mirror; primary page on the right, future tabs unfold to the left.

There must be exactly one canonical geometry/path implementation. The mirrored mode must reuse it through a projection/mirror transform. Never redraw the right-side body, shoulder, lower corner or clip with separate formulas.

Text itself is never mirrored. Mirror its bounding box/position only.

## Minimal data contract

A destination needs only:

```js
{ id, title, url? }
```

The shell generates visual depth, colors and geometry. A future activation control may consume `url`; activation UI is intentionally not part of v1 yet.

## API

```js
PrometeoEdgeStack.create(element, {
  items,
  startIndex: 0,
  side: "left", // or "right"
  loop: true,
  palette,
  onChange
});
```

Changing direction must require only the `side` option.

## Current product decision

This capability is the selected navigation grammar for the next Prometeo shell integration, but it is not yet wired into Product Current. The next product step is to render real Prometeo destinations through this owner, then design the explicit enter/open action without altering the navigation geometry.
