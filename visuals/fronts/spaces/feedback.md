# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v26 · REAL GAP BETWEEN BRIDGE AND COLUMNS

The v25 bug was geometric, not aesthetic.

v25 used:
- roadHalf = 6.15
- radius = 2.15
- column center = roadHalf + radius*0.72 = 7.698
- inner column surface = 7.698 - 2.15 = 5.548

Therefore the column physically overlapped the bridge, which ended at X=6.15. This is why the bridge could still be seen passing under the columns.

## v26 FIX

New rule:
- road edge = roadHalf
- column center = roadHalf + radius + columnGap
- columnGap = 0.65
- current column center = 8.95
- current inner column surface = 6.80
- road edge = 6.15
- real empty gap = 0.65

No horizontal world geometry is rendered between X=6.15 and X=6.80 on either side.

That interval is pure abyss.

## PRESERVE
- elevated central bridge;
- no lateral floor;
- column bottom Y=-38;
- column top Y=42/50;
- deepest lower section forced to pure black;
- violet emerges upward;
- signs hidden behind columns;
- maximum two visible/opening signs;
- straight longitudinal road lines;
- Map 1 and Map 4 fixes;
- mobile map selector.

## REVIEW RISK
The only thing to judge now is whether the 0.65 gap is visually large enough. It is structurally real and no longer an overlap.
