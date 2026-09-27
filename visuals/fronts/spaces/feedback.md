# 🌀 Pseudo-3D Spaces · Durable Feedback

Status: CURRENT

## v19 · MAP 5 PROXIMITY SIGNS
Latest user direction:
- the violet triangular spires beside the ritual road need a sign;
- the sign must remain hidden by default;
- it should rise only when the player is **fairly close**.

## IMPLEMENTATION
- Every Map 5 spire has its own animated sign state.
- Proximity is measured from player/camera XZ position to that spire base.
- Open threshold: distance < 11.2 world units.
- Close threshold: distance > 13.4 world units.
- The two thresholds create hysteresis so signs do not chatter at the edge.
- Rise is faster than retract.
- Animation uses time-based exponential interpolation, not frame-count popping.
- Signs start below the floor and telescope upward.
- Each panel is placed toward the **inner / road-facing side** of its spire.
- Panels use gold + violet ritual materials and a minimal geometric glyph, not UI text.
- Left and right spires trigger independently, so strafing closer to one side can wake that side first.

## PRESERVE
- Map 5 orange/red sky.
- Purple striped central road.
- Paired pointed spires.
- Stepped temple destination.
- True 3D camera-center lighting.
- Existing movement / touch controls and non-selectable UI.
