# Prometeo · Proof-first build method · v1
**Status: SOURCE_CANDIDATE_ON_PR_71; not an installed ChatGPT skill, Current promotion, verified demo or served UI.**
**Owner/authority:** reuse Design DNA, exact widget/page owner, Work Graph V1.1 (when applicable), existing Page Change/P4 Capture and `prometeo-web-change` / `prometeo-verify-release`. This file is a development method, NOT a runtime, queue, publisher, scheduler or alternate knowledge atlas.

## Entry / fast lane (do not slow normal commands)
Classify the user's actual intent *before* invoking any build pipeline:
- **QUICK_SHOW / QUICK_TV** (e.g. `🔥tv calendario`, `🔥tv ideas`): already-existing PUBLIC page/scene, just select it through owner `gh-pages:tv/chat/state.json` with fresh SHA, scope/privacy gate and readback. No red-green-refactor, no fake demo and no speculative edits. Same human turn, no `.`.
- **DIRECT_TASK** (e.g. draft study materials or inspect a result): perform authorized task immediately; apply relevant quality tests but do not invoke website build protocol for unrelated work.
- **WEB_BUILD / WIDGET_CHANGE** (e.g. correct UI behavior, add functionality): follow the proof-first sequence below. This is mandatory before *claiming* the material result; no blanket permission to edit Current/Served.
- **RELEASE**: separate authorization and verification gate, never implied by an emoji.

## Proof-first sequence for WEB_BUILD
1. **RECOVER / BOUND**: read exact owner, Current versus served, baseline refs, Design DNA invariants, relevant EVO IDs (all 45 remain design requirements), preservation contract and concurrent HEAD. Record write scope, rollback and forbidden effects. Never copy `main` V7 onto `gh-pages` V15.
2. **HUMAN CAPABILITY**: one sentence about what a demanding user will DO, SEE and CHECK, plus boundary/error state. No feature without observable evidence.
3. **DESIGN THE DEMO FIRST**: assign `FEATURE-n → PROOF-n`, semantic selectors, expected visible result and viewport. Use the REAL source `JuanManuelPM/Experimentos:gh-pages:demo-engine-v6/UNIVERSAL_BUILD_DEMO_PROTOCOL_V1.md`. Demo plan is design, not proof.
4. **ACCEPTANCE BEFORE CODE**: turn concrete examples (valid, invalid, recovery, privacy, mobile) into executable tests against current module. Run against untouched baseline; log RED when it genuinely fails, or explicitly log BASELINE_PASS for non-regression tests. No staged fake failure.
5. **MINIMAL IMPLEMENTATION**: change the smallest owned file(s), without reimplementing TV, skills, worker bus, engine or data owner. Keep previous baseline intact.
6. **GREEN / REGRESSION**: run acceptance and preservation tests; identify and repair observed defects. A deterministic unit or DOM test is not proof of cross-origin embed, production server or actual user interaction.
7. **REAL DEMO**: inspect the finished real page for semantic targets, compile original PROOF-n into V6 recipe for that page, run and visually verify results on real DOM at relevant viewports. The existing V6 synthetic Window Lab is NOT proof of the changed widget. Failed/unavailable runtime => `DEMO_NOT_VERIFIED`.
8. **RELEASE GATE**: publish only after functional PASS, V6 DEMO_REPORT PASS, acceptance receipt, privacy/auth/security and owner/version/CI gates; then verify real URL, assets and behavior. If any gate missing, save isolated candidate and DO NOT change served branch or TV feed.
9. **PERSIST / REINCARNATE**: record baseline and candidate SHA, tests with commands and RED/GREEN outputs, demo recipe/reports, errors/negative knowledge, publication/visual states, rollback, and exact next action in the same owner/GitHub branch. Fresh chat reads the short entry, not this conversation.

## State vocabulary (never collapse)
`DOCUMENTED` (requirements/plan), `IMPLEMENTED_CANDIDATE` (bytes exist), `TESTED_LOCAL` (specific executable tests), `DEMO_VERIFIED_REAL_PAGE` (V6 actual real DOM), `PUBLISHED` (serving commit), `VISUALLY_VERIFIED_SERVED` (served browser observation), `CURRENT/PROMOTED` (actual owner promotion). Missing stage stays UNVERIFIED.

## Existing contracts and application
- Design DNA `DNA008` distinguishes producer DONE from PASS; `DNA011/DNA012` require preservation/baseline.
- `coordination/design-dna/PRESERVATION_CONTRACT_V1.json` owns the change proof/rollback.
- `ui-workspace-v1/protocols/READINESS_GATE_V1.md` + `WIDGET_CONTINUITY_PROTOCOL_V1.md` own widget readiness.
- `ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json`: 45 design requirements, none completed by this method.
- `coordination/one-turn/v1/SKILLS_CATALOG_V1.json` catalogs skills; it does not install them.
- Book-to-organ mapping: `coordination/one-turn/v1/PROOF_FIRST_BOOKS_MAPPING_V1.md` (verified metadata versus Prometeo-specific interpretation separated).
- **Real example:** PR #72 (`feature/proof-first-scene-20261009` based on `gh-pages`), `tv/chat/scene/proof/DEMO_PLAN_V1.json`, regression script, local RED/GREEN. `TESTED_LOCAL`, V6/served unverified, draft not merged. No private data/worker/Supabase modifications.

## Continuity / no human message bus
New agent: classify quick versus build; load this method, exact owner and linked receipt; re-fetch HEAD. Continue missing gates without asking the user to transport transcript or results. GitHub repo skills are source only, not automatically enabled in ChatGPT. A new chat also requires an installed skill client or Project bootstrap configuration, and one turn cannot run endlessly after reply.
