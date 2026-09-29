# Eye Effects Protocol V3 · V25

Status: CURRENT CANDIDATE

V25 keeps V21 blink intact and turns the independent eye-content subsystem into a reusable effects engine.

## Principles
- blink, eye content, audio and media remain independent layers;
- visual parameters live in eye-effects-v25.json;
- renderer consumes effect data instead of hard-coding one animation;
- URL parameters can override global variables for rapid experiments;
- inner-eye motion remains quantized / low-FPS rather than continuously eased.

## Included examples

### dilate_long
14 discrete stages from tiny pupil to full black. This specifically fixes the previous too-fast dilation.

### contract_red
Black contracts through many discrete radii while red sclera is revealed.

### scan
Low-FPS gaze positions.

### chromatic
Colors and shape are generated from a hue variable. Changing one hue/fps variable changes the entire family.

### audio_player
The eye itself becomes PLAY/PAUSE.
- first interaction creates a browser-local procedural audio loop;
- play/pause controls the AudioContext;
- AnalyserNode drives a quantized waveform/line-boil halo around the eye;
- paused eye shows play triangle;
- playing eye shows pause bars.

### media_portal
The aperture can display moving content.
- if ?media=<same-origin-or-CORS-readable-url> is supplied, V25 uses GIF or video;
- without media it uses a procedural moving scan-field demo so the effect is always reviewable.

### glitch
Discrete color / gaze / shape jumps.

## Interaction
- single tap/click: restart current effect; in audio mode toggles play/pause;
- double tap/click: next example;
- ArrowRight / ArrowLeft: next / previous example;
- Space: restart; in audio mode toggles play/pause.

## Variables / URL overrides
- ?effect=<id>
- ?hue=<number>
- ?fps=<number>
- ?media=<url>

The intention is that new color families or rates require changing data/variables, not rewriting renderer logic.
