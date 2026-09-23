# Hand-drawn Audio Visual Recipe v1

References researched:
- line boil: low-rate redraw with small shape/stroke differences
- Rough.js: random offsets / bowing / multi-pass sketch primitives
- SVG feTurbulence + feDisplacementMap: organic spatial displacement

Implementation choice for Prometeo:
- no external runtime dependency
- single shared Web Audio AnalyserNode
- audio features continue at requestAnimationFrame rate
- sketch imperfection is posterized at ~8 fps
- deterministic seeded jitter inside each boil frame
- 2–3 overlapping strokes for ink/pencil character
- variable stroke width and alpha
- jitter amplitude is partly modulated by audio energy

Renderers in v1:
1. Boiling waveform
2. Ink spectrum
3. Scribble halo
4. Doodle ribbon
5. Pencil swarm
6. Breathing contour

This keeps the signal truthful while making only the rendering organic.
