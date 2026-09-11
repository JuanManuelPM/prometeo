# Study Library V11 — public QA plan

Date: 2026-09-11

After publishing the V11 files to `gh-pages`, verify without claiming browser interaction that:

1. `/pages/study-library/` serves the V11 CSS and loader cache versions.
2. `study-v10-loader.js` publicly loads `study-v11-experience.js` and pairing diagnostics V3.
3. V11 JS/CSS return HTTP 200.
4. reusable Study System renderer HTML/CSS/JS and Modelos migration shadow return HTTP 200.
5. Firefox Bridge manifest publicly reports 0.4.0 and installer references cache version 400.
6. no forced `gh-pages` update was used; publish commit remains a descendant of the latest observed `gh-pages` HEAD.
7. browser, hardware and multi-device behavior remain separate QA layers and are not inferred from static/public HTTP checks.
