# PROMETEO UNIVERSAL SCROLL SHELL — DESIGN SPEC

Status: DESIGNING / NOT CURRENT
Owner candidate: `navigation.universal-scroll`
Goal: one universal, data-driven navigation shell for mobile + desktop.

## Invariants already learned

1. **One axis:** primary navigation is native vertical scroll.
2. **Static selector:** the arrow/selector is independent from destinations and never enters/leaves item layout.
3. **No active-card geometry change:** selecting an item must not create a full-width card or change row dimensions.
4. **No layout shift:** active state may change opacity, color, weight, or a small translate; not width/height.
5. **Typography-safe:** labels use safe line-height and visible overflow; descenders must never clip.
6. **Large invisible hit area:** tap target may be large even when the visible object is only text.
7. **Same mental model everywhere:** mobile and desktop use the same vertical list and focus rule.
8. **Native scroll first:** no scroll-jacking, wheel interception, or continuous heavy animation.
9. **Data-driven:** adding a destination means adding data, not redesigning HTML.
10. **Shared material:** depth/pressed effects come from `shared/material/v1/material.css`; navigation must not reimplement them.
11. **Progressive density:** 5, 20, or 100 destinations must remain navigable before adding visual decoration.
12. **Preserve iterations:** rejected candidates remain durable evidence; never overwrite historical versions.

## Iteration lineage

### V1 — `lab/universal-shell/v1/`
Useful:
- vertical focus model
- native scroll direction
- one active destination

Rejected / learned:
- arrow was inside active item and moved with it
- active destination became an oversized full-width panel
- large unused rectangle created false structure
- tight line-height allowed descenders (e.g. “g”) to visually escape/clash
- active-state geometry was too coupled to typography
- visual hierarchy depended too much on a card

### V2 — `lab/universal-shell/v2/`
Candidate changes:
- selector is fixed and independent
- destinations are text objects with large invisible hit areas
- no visible full-width active card
- page scroll is the navigation surface
- safer typography geometry
- same model on mobile and desktop
- one data array is the only destination input

## Promotion rule

Do not call this universal/current until a preferred iteration passes:
- mobile 320–430 px
- desktop
- long destination names
- 5 and 30+ destinations
- touch, mouse/trackpad, keyboard
- return/back preserves understandable position
- no label clipping
- no horizontal overflow
