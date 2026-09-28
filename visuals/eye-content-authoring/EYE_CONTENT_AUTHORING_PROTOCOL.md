# PROMETEO · Eye Content Authoring Protocol V1
Status: CURRENT
Date: 2026-09-28

## Goal

Prepare the next subsystem: the eyeball / iris / pupil / internal eye content that will live **behind** the already accepted V21 eye-frame blink.

The V21 frame animation is frozen as baseline. This protocol exists so new eye-content art does not reintroduce the centering, cropping, packing and transport failures already solved for the frame.

## 1. Two different grids for two different jobs

### 10×10 exploration grid
Use a 10×10 sheet only to explore visual vocabulary:
- pupil shapes;
- white-eye states;
- black-eye states;
- iris styles;
- supernatural transformations;
- gaze concepts;
- textures;
- retro variants.

It is a moodboard / candidate matrix.

It is **not** final animation data.

### 2×5 sequence grid
Once one visual family is accepted, create a small sequence-specific grid:
- one action;
- ten chronological frames;
- same reference frame;
- same safe area;
- same logical origin.

That is the authoring input that later enters the normalization pipeline.

## 2. Use the accepted frame as the template, not a blank grid

Do not ask the image model to invent the eye frame again.

The accepted positional reference is:
- V21 open frame: `frame_00`;
- logical canvas: 128×128;
- frame pivot: [64,86].

The authoring template repeats that **same accepted frame** in every cell.

Generation instructions should say:
- preserve the existing eye-frame position and scale;
- modify/fill only the interior aperture;
- do not redraw, move, resize or crop the outer frame;
- each cell is one variation of the internal content.

This reduces free variables.

## 3. Geometry derived from the accepted open frame

Measured from the accepted normalized frame:
- open aperture bbox: [38,54,90,86];
- authoring safe bbox: [42,58,86,82];
- internal content center: [64,70];
- frame pivot: [64,86].

Interpretation:
- the **frame pivot** belongs to the eyelid/frame actor;
- the **content center** belongs to the eyeball/pupil subsystem;
- these are separate coordinate spaces.

Do not center pupil art on the frame pivot.

## 4. Clean template vs debug template

Maintain two views:

### Clean
- exact accepted frame repeated;
- neutral background;
- no labels or guides;
- intended as image-generation reference.

### Debug
Adds:
- cell borders;
- aperture bbox;
- smaller safe bbox;
- content-center cross;
- frame-pivot marker.

The debug version is for humans and QA, not for generative input unless alignment is failing.

## 5. Prompt pattern for exploration

Use wording equivalent to:

> Use this image as a strict structural template. Preserve the existing black-and-white eye frame in every cell at exactly the same scale and position. Change only the content visible inside the hollow center. Keep each candidate centered around the same internal eye center and fully inside the safe opening. Do not crop, resize, shift, redraw, stylize, or replace the outer eye frame. Each cell is one design candidate, not an independent composition.

Then specify the visual family to explore.

## 6. Prompt pattern for a final animation sequence

Use wording equivalent to:

> Use this 2×5 structural template. Keep the outer eye frame identical and fixed in every cell. Create one continuous ten-frame animation of the internal eye content only. Frame order is left-to-right on the first row, then left-to-right on the second row. Preserve the same scale, base position and visual identity across all frames. Only the intended internal motion may change.

## 7. Important distinction: frame animation vs eye-content animation

The V21 eyelid/frame animation already handles blink.

The internal content system may later handle:
- pupil translation;
- iris dilation;
- looking upward;
- eye going white;
- eye going black;
- supernatural transformations.

Those actions must not:
- move the frame;
- change frame scale;
- change frame pivot;
- compensate for frame jitter;
- own blink geometry.

The two layers compose.

## 8. After image generation

Do not use the generated grid directly.

For selected content sequences:
1. preserve the raw generation;
2. split frames;
3. mask/detect content;
4. measure content center / semantic anchor;
5. normalize to fixed content canvas;
6. residual alignment pass;
7. contact-sheet QA;
8. onion-skin QA;
9. temporal preview;
10. pack as data;
11. validate;
12. only then integrate behind V21 frame.

This reuses `../eye-frame-lab/ANIMATION_PIPELINE_V1.md`.

## 9. Content-specific anchor strategy

For internal eye content:

### Static pupil / iris
Anchor = eye-content center [64,70].

### Look direction
The **base eyeball center remains fixed**.
Only pupil/iris center moves inside bounded limits.

### Dilation
Center remains fixed.
Radius changes.

### White-eye transformation
Eye content center remains fixed.
Visible pupil/iris fades/shrinks/moves; aperture does not move.

### Black-eye transformation
Center remains fixed unless the chosen effect explicitly moves material.
Do not shift the entire internal layer as a shortcut.

## 10. Why this is safer

Instead of asking a model to solve simultaneously:
- layout;
- eye-frame design;
- scale;
- centering;
- animation;
- content style;

we freeze everything except the one variable we are designing.

That is the main strategy:
**reduce degrees of freedom before generation.**

## 11. Current next step

The authoring system is now prepared.

Next:
- generate the first 10×10 exploration matrix for **internal eye content only** using the clean template;
- review families;
- select one family;
- generate a dedicated 2×5 sequence from that family;
- normalize and QA it before adding it to runtime.
