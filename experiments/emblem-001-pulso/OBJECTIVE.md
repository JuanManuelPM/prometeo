# PULSO · EMBLEM-001

**Human objective:** play an original top-down 2D car-versus-ball match in the browser, with an AI rival, tactile/keyboard controls, goals on both ends, scoring, countdown, a final result and immediate replay. Original vector drawing and synthesized audio only; no proprietary sprites, names or sounds.

**Owner:** isolated candidate at `experiments/emblem-001-pulso/`, branched from fresh `gh-pages`. This is not a TV scene, scheduler, Supabase, Current migration or a claim that GitHub Pages serves this candidate.

**Evidence boundary:** physics unit tests and a Chromium browser run with the original HTML/CSS and a test-only *inline-concatenated* copy of the two ES modules passed. The browser in the execution environment rejects *all URL navigation* (`ERR_BLOCKED_BY_ADMINISTRATOR`), even localhost and `file://`. ES module HTTP loading, true screen-reader experience, physical device/touch latency, Demo Engine V6's actual runner on the finished product, and GitHub Pages served URL were **not** tested. Because the V6 gate is missing, public deployment is blocked pending legitimate test.

**Known limits:** 2D top-down arcade physics (not 3D, no jumping), deliberately simple AI, no network play, browser Web Audio may be silenced by OS/browser audio policy, landscape recommended on small phones for maximum arena size. Timer suspends while the document is hidden, holding progress rather than silently ending the match.
