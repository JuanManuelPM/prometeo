# PROMETEO UNIVERSAL SCROLL SHELL — DESIGN SPEC

Status: DESIGNING / NOT CURRENT
Owner candidate: `navigation.universal-scroll`
Goal: one universal, data-driven navigation shell for mobile + desktop.
Preferred morphology under test: **Universal Focus Rail**.

## Invariants already learned

1. **One axis per viewport:** desktop may use horizontal native scroll; mobile uses vertical native scroll.
2. **Current destination owns the space:** navigation chrome should occupy only the edges; inactive destinations must not consume half the viewport.
3. **Static enter/back controls:** arrows are independent objects, never laid out inside destination typography.
4. **No active-card geometry surprise:** focus must not create a giant new bar or make text clip.
5. **Typography-safe:** labels use safe line-height/overflow and must survive long names and descenders.
6. **Large invisible hit area:** tap targets may be large while visible navigation stays minimal.
7. **Same mental model everywhere:** scroll → focus → enter; back/escape → parent.
8. **Native scroll first:** no scroll-jacking, wheel interception, WebGL, or continuous heavy animation.
9. **Data-driven:** adding a destination means adding data, not redesigning HTML.
10. **Recursive:** the same shell can represent Root → Students → José → Matemática without inventing a new navigation grammar.
11. **Shared material:** depth/pressed effects come from `shared/material/v1/material.css`; navigation must not reimplement them.
12. **Progressive density:** 5, 20, 100, or more destinations remain conceptually valid because only the current level is rendered as a rail.
13. **Neighbour signal, not neighbour real estate:** nearby destinations may peek at edges; distant destinations may disappear outside viewport.
14. **Preserve iterations:** rejected candidates remain durable evidence; never overwrite historical versions.
15. **Blank app surface by default:** never add counters, progress such as `1 / 5`, scroll hints, keyboard hints, status dots, product names, `Prometeo` labels, breadcrumbs such as `Root`, mode names, debug copy, descriptions, helper microcopy, version labels, technical metadata, or decorative chrome unless the human explicitly requests that exact element. The default surface must look like a finished application with only content and controls that are necessary to perform the current action.
16. **Silence beats explanation:** if an interaction can be understood from layout, motion, affordance, or the operating-system/browser Back behavior, do not add explanatory text.
17. **No speculative chrome:** a designer/AI may not add UI merely because there is empty space. Empty space is valid and preferred over unrequested interface furniture.

## Blank-surface law

By default the shell renders **zero informational chrome**. The following are opt-in only:
- app/product name in the viewport
- current/total counters
- breadcrumbs/path labels
- `Scroll`, `Tap`, `Enter`, keyboard or gesture hints
- state/status dots
- descriptions/subtitles added only to explain navigation
- developer/debug/version/candidate metadata
- persistent headers or footers with no required user action

Allowed by default:
- the focused destination/content itself
- minimal neighbouring destination signals when needed for navigation
- a necessary Enter/Open control
- a necessary Back control only when native/browser Back is insufficient or unavailable

## Data contract

Required per node:
- `id`
- `title`
- exactly one of `url` or `children`

Optional:
- `preview[]`
- `group`
- `state`
- `priority`

The visual shell must not require thumbnails, custom illustrations, per-page CSS, or bespoke icons.

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
- tight line-height allowed descenders to visually escape/clash
- active-state geometry was too coupled to typography
- visual hierarchy depended too much on a card

### V2 — `lab/universal-shell/v2/`
Useful:
- selector fixed and independent
- destinations as text objects with large invisible hit areas
- no visible full-width active bar
- safer typography geometry
- one data array as destination input

Still insufficient:
- good as compact word selector, but cannot become a reusable content surface by itself
- did not yet prove recursive levels
- did not use desktop width efficiently as a focused content world

### V3 — `lab/universal-shell/v3/`
Candidate: **Universal Focus Rail**.

Changes:
- desktop: horizontal native rail, focused destination uses ~84% of the rail while neighbours survive as edge peeks
- mobile: same contract rotated to vertical native scroll
- destination owns almost all useful space
- optional preview content appears only on focused destination
- a single physical Enter control opens children or URL
- Back/Escape returns one level
- recursive data tree demonstrated: Root → Design → Material and Root → Students → José → Matemática
- no page-specific thumbnail or drawing required

New rejection learned from V3:
- persistent `Prometeo`, `Root`, `01 / 05`, status dot, `Scroll`, keyboard hints, and explanatory chrome polluted the finished-app surface and are now forbidden by default under the Blank App Surface law.

Local mechanical evidence before source publication:
- 1440×900: no horizontal overflow, no JS errors, recursive enter/back pass
- 390×844: no horizontal overflow, no JS errors, recursive enter/back pass
- 320×700: no horizontal overflow, no JS errors, recursive enter/back pass

## Promotion rule

Do not call this universal/current until a human-preferred iteration passes:
- mobile 320–430 px
- desktop
- long destination names
- 5 and 30+ destinations
- touch, mouse/trackpad, keyboard
- recursive navigation at 3+ depths
- return/back preserves understandable position
- no label clipping
- no horizontal overflow
- real destinations loaded from one canonical data owner rather than hard-coded demo data
- default viewport contains no unrequested informational chrome
