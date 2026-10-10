# Engineering decisions and acceptance

- Portable static HTML + CSS + browser ES modules + Canvas2D, original drawing and generated Web Audio. No build tool, external libraries, analytics, storage or internet dependency.
- `engine.mjs` is pure state/physics. `game.mjs` handles input, animation, feedback and audio. Acceptance first: `proof/DEMO_PLAN.json` and RED `ERR_MODULE_NOT_FOUND` before writing engine. Engine then 8/8 GREEN.
- Engine: capped timestep, velocity drag, relative-speed impulse car/ball, side wall bounce except goal mouth, AI pursue behind ball for attacking direction, boost fuel, 90 s finite state and reset positions after score.
- Semantic targets `arena.start`, `arena.field`, `arena.score`, `arena.timer`, `arena.status`, `arena.stick`, `arena.boost`, `arena.audio`, `arena.restart`, `arena.result`.
- Actual Chromium browser direct navigation blocked by platform. Fallback verification uses `page.set_content` with *unchanged* HTML and CSS, and a test-only inline concatenation of both unchanged modules (rename module-private helper names to avoid classic-script collision). This tests user interactions and drawing but **does not prove deployed ES module imports**.
- Publishing gate missing: true Demo Engine V6 run on the actual game and served browser smoke. Stop on isolated PR; no update to served `gh-pages`, TV or existing widgets.
