# Facultad V18 — static browser preflight pack

Worker: `wc-20260919T145702Z-b4a9587e3851`  
Owned job: `portfolio-facultad-v18-static-browser-preflight-pack-v1`  
Authority: `coordination/portfolio/pins/portfolio-facultad-v18-static-browser-preflight-pack-v1/G000001.json`  
Observed: 2026-09-19T15:03:00Z

## Exact current identities

Main regression harness:
- `scripts/check-facultad-v18-regression.mjs`
- current blob: `d3ab8dff6cf7da3d69c35117c94ed4970ded88c2`

Pinned `gh-pages` inputs (expected == observed):
- `pages/study-library/index.html` — `b088b71517f081e641e984bd8378e22e9be3f368`
- `pages/study-library/study-v11-experience.js` — `b1f6b5bd68e2cbaf205d627697332591d1e2b433`
- `pages/study-library/study-v18.js` — `b54ed6324d6f08f94b2116b3dc410d50244699c9`
- `pages/study-library/study-v18-5-fix.js` — `26ead844db7e93934fe742ce86a16d60f71beff6`
- `pages/study-library/study-v18-6-fix.js` — `1754527feefbda95b59e79a0235d367ce16591a5`
- `pages/study-library/study-v18.css` — `d06e0df3580c64c86a06e5eb3db2798b255b745b`

## Static regression result

All six pinned blob identities match the current `gh-pages` paths.

All 13 deterministic harness checks pass on those exact bytes:
1. candidate_wiring
2. year_vertical_position
3. shelf_horizontal_start
4. drag_click_separation
5. enter_space_activation
6. course_deeplink_popstate
7. javascript_parse
8. login_capability_honesty
9. native_schedule_legacy_bridge
10. native_notes_date_legacy_bridge
11. theme_persistence
12. responsive_620
13. responsive_300

Specific requested invariants:
- native Notas/date bridge markers are present;
- `Fecha por definir` is absent;
- synthetic `Clase 01–04` placeholders are absent;
- generic login is visibly disabled and capability-honest;
- `Inicio de sesión · próximamente` is absent;
- native schedule bridge markers are present;
- stale `Acá se va a conectar el cronograma real` placeholder is absent;
- `Versión anterior` fallback remains present.

## Return reconciliation

`portfolio-facultad-v18-native-notes-date-bridge-v1` VERIFIED return is consistent with the current pinned contract: its V11/V18 blob identities equal the harness pins and the notes/date assertions still pass.

`portfolio-facultad-v18-login-contract-and-implementation-v1` DONE return is consistent with the current pinned contract: its capability-honest disabled-login semantics remain enforced by the current V18 bytes and regression assertion.

No drift was found between those durable returns and the current pinned static contract.

## Browser-only residuals

The static preflight intentionally does **not** certify these runtime behaviors:
- representative desktop JavaScript interaction for tabs, deep-link/popstate, drag-vs-click and Enter/Space activation;
- representative mobile/touch JavaScript interaction and layout at real tiny/mobile viewports;
- runtime loading/rendering of real notes and schedule data through the legacy bridge;
- visual/human acceptance.

Those residuals require a representative JavaScript browser. Static PASS does not imply Current, Served, Human Accepted or runtime PASS.

## Verdict

`STATIC_PREFLIGHT_PASS` — pinned bytes and deterministic non-runtime invariants are coherent; browser residuals are bounded to actual JavaScript/touch/runtime/visual execution.
