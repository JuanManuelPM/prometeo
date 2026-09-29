# Eye Pointer Protocol V26

V26 extends the accepted V21 blink and current V25 scene engine with pointer-follow scenes.

## Separation of concerns
- blink position/frames remain V21;
- pointer gaze controls only pupil center;
- click transformations control style/radius/fill;
- pointer position remains authoritative while styles change.

## Low-FPS pointer tracking
Pointer coordinates are sampled/quantized at the scene pointer FPS (default 9 FPS) and snapped to a finite gaze lattice (default 9 horizontal × 7 vertical positions). This preserves the stepped visual language rather than making the pupil glide smoothly at display refresh rate.

## Scenes
- pointer_follow: pupil follows mouse/touch.
- pointer_dilate: pupil keeps current pointer gaze while click triggers a many-step dilation toward black.
- pointer_color: click cycles sclera color; gaze remains pointer-driven.
- pointer_shape: click cycles circle/oval/diamond/slit/cross/star/dot; gaze remains pointer-driven.
- pointer_combo: click mutates both color and shape while gaze remains pointer-driven.

## Input
- mouse/pointer anywhere on page updates gaze target;
- touch drag updates gaze on mobile;
- tapping the eye executes the active scene action;
- arrows switch examples.
