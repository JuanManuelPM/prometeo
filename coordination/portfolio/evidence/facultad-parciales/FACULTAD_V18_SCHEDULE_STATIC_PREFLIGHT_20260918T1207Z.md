# Facultad V18 Cronograma · static preflight · 2026-09-18T12:07Z

Authority: `coordination/portfolio/pins/portfolio-facultad-v18-schedule-static-contract-audit-v1/G000001.json`.
Worker: `gpt56sol-20260918T115800Z-p01-8f3c`.

## Result

**STATIC_CONTRACT_OK / STATIC_CONTRACT_ONLY**

No repository defect was found that justified a product patch.

The committed regression pins six `gh-pages` blobs and every observed blob matched exactly:

- `pages/study-library/index.html` → `b088b71517f081e641e984bd8378e22e9be3f368`
- `pages/study-library/study-v11-experience.js` → `b1f6b5bd68e2cbaf205d627697332591d1e2b433`
- `pages/study-library/study-v18.js` → `b54ed6324d6f08f94b2116b3dc410d50244699c9`
- `pages/study-library/study-v18-5-fix.js` → `26ead844db7e93934fe742ce86a16d60f71beff6`
- `pages/study-library/study-v18-6-fix.js` → `1754527feefbda95b59e79a0235d367ce16591a5`
- `pages/study-library/study-v18.css` → `d06e0df3580c64c86a06e5eb3db2798b255b745b`

The checker logic was reproduced against those exact blobs in the available JavaScript runtime. All 13 checks passed: candidate wiring, vertical-position preservation, shelf reset, drag/click separation, Enter/Space activation, deeplink/popstate, JS parsing, login honesty, native schedule bridge, notes/date bridge, theme persistence, responsive 620 and responsive 300.

## Cronograma source matching

`study-v11-experience.js` builds schedule candidates only from:
- Blackboard events in `data11.events`; and
- Study Library assessments in `registry11.assessments`.

`scheduleMatch11(courseId,title)` filters that durable set by exact `courseId` first, then normalized course-name equivalence/containment, and maps only matched durable events into the V18 bridge.

For an unmatched course the filter returns an empty array. V18 then renders the honest empty state:

`No hay próximas fechas confirmadas para esta materia.`

No guessed schedule fallback or placeholder event synthesis was found.

## Version anterior fallback

V18 constructs the fallback from the current real page URL, clears the query, sets `legacy=1`, and preserves `course=<id>` when available. The V18 bootstrap explicitly returns immediately when `legacy=1`, so the fallback disables the V18 overlay instead of pointing at a fabricated target. Static inspection found no obvious defect preventing that transition.

## Exact runtime boundary

This environment has a Node runtime, but repository/archive transfer into the execution container is unavailable and the checker’s direct raw-GitHub fetch path cannot be exercised there. Therefore `node scripts/check-facultad-v18-regression.mjs` is **NOT_EXECUTED** as a repository process in this worker.

The exact checker SHA contract and its evaluation were reproduced against current `gh-pages` blobs instead. This remains static evidence only and does not establish browser behavior.

Remaining required capability: `representative_javascript_browser`.

No Current, Human Accepted or Served promotion was performed.
