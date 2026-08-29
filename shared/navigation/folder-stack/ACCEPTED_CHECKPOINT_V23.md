# PROMETEO FOLDER STACK — HUMAN ACCEPTED CHECKPOINT V23

Status: **HUMAN ACCEPTED BASELINE**
Date: 2026-08-29 (America/Argentina/Buenos_Aires)
Accepted artifact: `PROMETEO_NAVIGATOR_V23_HUMAN_ACCEPTED_20260829`
Drive exact source file id: `1sugPXB_UExUrISmljWxdvzF-jJ2m5Zxo`
Raw bytes: `72508`
SHA-256: `f15f67240794b9d3224cc11f1899819485c08554b517b48ea6fca8458eb41398`
Local lineage filename at acceptance: `prometeo_edge_stack_final_v23_final_vertical_down.html`

## Authority / change-control rule

This checkpoint is the accepted interaction baseline for the folder-stack navigator. Future work must start from these exact bytes or from a derivative whose diff against these bytes is explicitly known.

**Do not restart from later experimental rewrites such as the snapshot/sheet-stack v17/v18 approaches. Do not reconstruct the navigator from prose when the accepted source is available.**

For any future adjustment:

1. name the exact scenario/action being changed;
2. identify the smallest owning function/geometry primitive;
3. preserve all unrelated behavior byte-for-byte when practical;
4. reject broad rewrites for local bugs;
5. compare against V23 after the change;
6. never claim a regression is solved solely because JavaScript parses;
7. Human acceptance of V23 is a product fact and must not be inferred for future derivatives.

## Core physical model

The navigator is not a set of independent tabs. It is a stack of complete sheets/pages.

- A visible “tab” is only the exposed region of a sheet behind the sheet in front.
- Z-depth (front/rear) is independent from left/right projection.
- The same canonical sheet silhouette is mirrored for the initial right-side/root projection; do not separately redraw mirrored curves.
- Text belongs physically to its sheet. A word never owns an independent reveal animation.
- A word may become visible only because a physical sheet boundary or the widget viewport stops covering it.
- No opacity/fade, animated text width, late text insertion, midpoint word swap, or independent word translation is allowed as the normal reveal mechanism.
- If a new glyph becomes visible, a specific physical boundary that uncovered it must be identifiable.

## Geometry laws

### 4 : 2 : 1 exposed-remainder grammar

For main boundary `main` and remainder `R = W - main`:

- `u = R / 7`
- `B0 = main`
- `B1 = main + 4u`
- `B2 = main + 6u`
- `B3 = W`

This is not arbitrary button sizing. It is how much of deeper sheets remains exposed.

### Canonical silhouette

One `canonicalPath()` owns the shape. Mirror the path with an SVG transform when needed; never maintain separate left/right curve implementations.

Internal concave shoulder and external lower corner belong to one curve family and use the same effective radius.

Temporary rectangular covers are forbidden when they would visibly replace the curved sheet silhouette.

### Terminal-slot law

Folder/leaf identity must not change navigator spacing.

Every visible label reserves:

`[TITLE][UNIVERSAL TERMINAL SLOT]`

- folder: `/` is painted inside the terminal slot;
- leaf: terminal slot is empty;
- slash presence does not move a sheet boundary;
- changing `TEST` from leaf to folder (`TEST/`) with the same title must keep physical label width and page boundaries identical;
- `isFolder()` must not control canonical layout, curves, 4:2:1, or vertical movement. It may control slash rendering and ENTER semantics.

### Path segments

The path is physical independent segments, never one visually concatenated string.

Example: `[Prometeo/][gap][proyectos/][gap][José/]`.

A segment changing semantic role from active to path/prefix must not change position at commit.

The attempted `…/` path compression is **disabled** at this checkpoint. It caused segment-count/identity changes during transitions and overlapping words. Visual path currently equals semantic path 1:1.

Future ellipsis work may return only if the entire visible segment projection is frozen before frame 0 and remains identical in identity/count through frame 1.

## Root/right projection

The root is a deliberate special visual state.

- Root starts in the mirrored/right projection.
- First folder entry is the one special inversion/deployment movie into the canonical-left hierarchy.
- A first child such as `proyectos/` must begin completely behind/outside the widget’s right wall. Not even the first `P` may be visible before the physical wall is crossed.
- The widget viewport is a physical occlusion boundary (`overflow:hidden` mental model).
- After the first root entry, depth does **not** alternate orientation. All deeper folders remain canonical-left.

Root special behavior must not be generalized into every nested folder transition.

## Nested folder ENTER / EXIT

The accepted nested-folder model is the restored V6/V4 lineage, not a whole-screen snapshot transition.

ENTER has two ordered halves:

1. old family closes: `4:2:1 -> 0:0:0`;
2. neutral geometry;
3. new family opens: `0:0:0 -> 4:2:1`.

Important:

- old and new families must not run opposing “close/open” movies simultaneously;
- child words may already exist/own their sheet and be uncovered by the closing old family;
- the neutral frame is a real equality boundary: last old frame = first new frame geometrically;
- semantic handoff at neutral/commit must not move pixels;
- EXIT is the same folder movie traversed in reverse. Do not create a separate divergent exit choreography;
- first child inherits the current folder color across the continuity boundary to avoid color flash;
- cancelled movement returns through the same function toward `p=0`, not by reconstructing an approximate state.

## Vertical movement

Vertical navigation selects siblings in the same level and is not folder ENTER/EXIT.

### Up / forward

- current front sheet moves upward with the touch gesture;
- existing rear sheets advance toward front depth;
- the incoming front breadcrumb/path is preloaded at final coordinates before the first visible movement;
- rear tabs contain only their local word and do not carry duplicate breadcrumb copies;
- `Prometeo/ proyectos/ José/` must never “write itself in” from right-to-left while the rear sheet advances;
- incoming path `x` coordinates stay fixed for the whole vertical-up gesture.

### Down / backward — accepted restored behavior

This was the last blocker fixed in V23.

- previous complete page begins above the viewport;
- drag downward moves the previous page **downward** from `-H` toward `0`, following the gesture;
- the current page must not move upward when the user drags downward;
- current front transitions from depth 0 toward depth 1;
- rear sheets transition 1->2, 2->3, etc.;
- the previous page physically covers/replaces the current page from above;
- this direction/sign must remain independent from mirror/right projection. Mirroring is X-only and never changes vertical sign.

Do not reintroduce the rejected alternative in which vertical-down lifts the current page upward to reveal a stationary previous page.

## Text ownership / clipping

Every word is owned by its page.

Rear-page visible text region is the physical visible sheet region, effectively outer canonical page minus the page in front.

Consequences:

- text cannot render over a neighboring page even in 320px portrait;
- last tiny tab may show only color; this is valid occlusion, not a failure;
- fixed viewport => fixed font size. Do not shrink font because title/path is long;
- if a word does not fit, physical occlusion wins;
- rear tabs display only local labels, never duplicate path prefixes.

## Input contract

Touch/pointer uses one axis per gesture.

- initial dead-zone/resistance around 10–12 px;
- when the axis is chosen, rebase the axis origin to the current pointer coordinate so progress begins at 0 with no accumulated jump;
- after X lock, Y does not own the gesture; after Y lock, X does not own it;
- a horizontal gesture that started as ENTER may return toward progress 0 to cancel, but should not become a separate EXIT movie mid-gesture;
- pointer movement should feel direct rather than depending on artificial overshoot.

Keyboard expresses navigation intent, not iPad finger physics:

- `Right / D / L` = ENTER / deeper;
- `Left / A / H` = EXIT / back;
- `Up / W / K` = up;
- `Down / S / J` = down;
- HJKL follows Vim ordering: H left, J down, K up, L right;
- held-key repeat must not machine-gun through many pages;
- blocked actions do not animate and do not emit movement sound.

## Sound contract

Accepted sound profile is a synthetic Brown-switch family:

- short filtered correlated mechanical noise;
- low tactile thock;
- subtle per-direction variation;
- movement sound only after a valid committed movement;
- impossible/blocked/no-change action is silent.

Sound is feedback, not movement authority, and must not delay input.

## Visual protections

- keep current condensed heavy typography unless Human explicitly changes it;
- do not change typography while repairing movement bugs;
- lower navigation rail is compact relative to earlier experiments while type stays visually large;
- warm earthy palette remains decoupled from navigation physics;
- no generic glass/neon/SaaS styling;
- outer widget and sheet curves remain rounded throughout transitions;
- no temporary square/darker rectangle may flash over curved edges.

## Known rejected approaches / regression vaccines

Do not reuse these patterns as “fixes” unless a new explicit experiment proves them:

1. `incoming-child` floating text over unrelated colors.
2. translating an entire child frame from the right, causing duplicate `Prometeo/` prefixes.
3. animated text clipping producing `J -> Jo -> Jos -> José/`.
4. putting the child text inside the wrong/front SVG while claiming it is a true underlayer.
5. rectangular underlays/curtains that create dark square artifacts at curved boundaries.
6. whole-screen/snapshot sheet-stack rewrite where vertical navigation moves the entire interface together.
7. changing font size, main geometry, palette, root semantics or other unrelated owners while fixing one transition bug.
8. JavaScript syntax PASS being treated as visual/runtime proof.
9. ellipsis projection switching path segment identity/count during transition.
10. rear sheets carrying copies of the full breadcrumb and revealing `Prometeo/ proyectos/...` from right to left during vertical movement.
11. vertical-down sign inversion where the current page travels upward while the finger travels downward.

## Change protocol from this checkpoint

For future requests, first classify the change into one of these owners:

- ROOT_RIGHT_MOVIE
- NESTED_FOLDER_ENTER_EXIT
- VERTICAL_UP
- VERTICAL_DOWN
- LABEL_TERMINAL_SLOT
- PATH_SEGMENTS
- PAGE_TEXT_OWNERSHIP
- CANONICAL_CURVES
- INPUT_ADAPTER
- SOUND_PROFILE
- VISUAL_TOKENS_ONLY

Then:

1. start from V23 accepted source;
2. modify only the named owner plus unavoidable local dependencies;
3. run static/syntax checks;
4. when possible run the exact affected interaction scenario, not an unrelated generic smoke test;
5. inspect `p=0`, early movement, midpoint/neutral where relevant, `p=1`, cancel, and reverse;
6. verify unrelated owners did not change;
7. keep V23 as rollback donor even after later accepted versions.

## Acceptance truth

The Human explicitly reported V23 as working perfectly and materially better than before, with no known errors at acceptance time and only future refinements expected.

This Human acceptance applies to **V23 exact behavior/source checkpoint only**. It does not automatically transfer to future derivatives.
