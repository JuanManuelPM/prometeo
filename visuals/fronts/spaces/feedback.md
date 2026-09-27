# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v23 · MAP 5 ABYSS COLUMNS + HIDDEN GIANT SCREENS

Latest user direction:
- replace the violet pointed triangles/spires;
- use monumental violet columns like the other violet-column language in Spaces;
- columns should come up from below, as if the avenue crossed a precipice;
- lower parts must be darker and upper parts lighter;
- the sign must be hidden behind the column while appearing/disappearing;
- make the sign larger again;
- never show more than two signs at once.

## MAP 5 STRUCTURE

### Precipice
- v22 lateral floor is removed from Map 5.
- The central striped avenue remains as a bridge-like surface.
- The lower half of the scene falls to near-black/purple so the columns can emerge from a void.
- Thin longitudinal bridge edges reinforce the drop without reintroducing horizontal floor seams.

### Columns
- Pointed obelisks are no longer rendered in Map 5.
- New renderer: `renderAbyssColumn()`.
- Columns are cylindrical / faceted, not pointed.
- Current radius: 1.72.
- Current bottom Y: -16.5.
- Current top Y: ~7.4, with occasional slightly taller columns.
- Vertical brightness factor runs from near-black at the bottom to readable violet at the top.
- Camera-distance light and cylinder curvature still modulate the result.
- Alternating one-by-one placement remains: left, right, left, right.

### Giant signs
- Pole length increased to 8.55.
- Cardboard outer local half-size increased to 3.58 x 2.18.
- The hinge sits inside the column silhouette rather than outside it.
- Sign geometry is rendered first and the column afterward, so the column masks stored/retracting parts.
- No sign geometry is rendered at all while `open <= .24`, so the beginning/end of the animation happens invisibly behind the column.
- Deployment now starts farther ahead (<28 Z units) and raises again at <=9 Z units.

### Hard maximum of two visible signs
- Added `ritualVisibleSlots`.
- At most two sign keys can occupy visible slots.
- The nearest eligible signs get the slots.
- A retracting sign keeps its slot until it is visually tucked behind the column.
- A replacement sign cannot open until a slot is actually freed.
- This prevents three overlapping giant screens during transitions.

## PRESERVE
- Map 5 straight longitudinal road stripes.
- v20 finger-scrollable map selector.
- Map 4 world-anchored tunnel flow.
- Map 1 continuous floor.
- fixed frontal movement and existing controls.

## SELF-CRITIQUE / REVIEW RISKS
- The abyss is intentionally much darker than v22; verify the bridge still reads clearly on small screens.
- The columns are tall and wide enough to hide the sign mechanism, but final visual review should confirm they do not crowd the road.
- The two-slot scheduler is verified in code, but visual timing still needs user review for whether the second sign appears at the right moment.
