# 🖐️ Player / Eye Frame · Durable Feedback

Status: CURRENT

## Latest direction
The user simplified the plan: do not create another frame animation for every pupil state.

Use two independent layers:
1. accepted V21 blink / eye frame;
2. procedural eye content behind it.

The user explicitly wants things such as:
- black pupil moving in every direction;
- white or black inner eye;
- pupil growing/shrinking;
- independent eye-content animation while blink remains unchanged.

## V23 implementation
V23 follows that direction.

The V21 blink is unchanged and remains the accepted upper layer.

The lower eye-content layer is procedural:
- sclera/fill;
- pupil color;
- gaze x/y;
- pupil radius;
- pupil shape.

## Important V23 improvement over the local V22 prototype
V22 used a hard-coded ellipse as the opening mask.

V23 removes that approximation.

For every actual V21 blink frame V23:
- decodes the real frame alpha;
- builds an opacity barrier;
- dilates it by one pixel to seal antialias gaps;
- finds transparent connected components;
- throws away components touching the canvas edge;
- uses the largest enclosed component as the actual eye opening.

Therefore the pupil/sclera are clipped by the **real accepted eyelid geometry** on every blink frame.

Measured aperture areas:
- frame_00 1239
- frame_01 1060
- frame_02 700
- frame_03 395
- frame_04 90
- frame_05 0
- frame_06 48
- frame_07 509
- frame_08 1024
- frame_09 1295

The closed frame is automatically detected as frame_05.

## Local QA performed
Before publication the V23 composition was rendered locally and inspected for:
- neutral eye;
- gaze left;
- all-black eye;
- full blink sequence with procedural content clipped underneath.

Result: PASS_LOCAL_VISUAL_QA.

## Current review
The next review is about eye-content look/behavior only. Do not reopen the accepted V21 blink architecture unless new evidence shows a blink defect.
