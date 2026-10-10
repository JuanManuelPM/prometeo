# Books → applicable Prometeo organs (NOT a new atlas)
**Status:** verified publisher/author metadata plus explicitly labeled engineering interpretation. No full-text ingestion, no claim of having read complete copyrighted books; no fabricated older atlas. Existing entrypoint: `.agents/skills/prometeo-knowledge/SKILL.md`. An earlier separate atlas was NOT located by scoped GitHub code search or targeted Drive title search; retain lineage if later recovered.

## Kent Beck: *Test-Driven Development: By Example*
- **Verified sources:** Pearson: https://eu.pearson.com/test-driven-development-by-example/9780137585236 ; original publisher sample: https://ptgmedia.pearsoncmg.com/images/9780321146533/samplepages/0321146530.pdf . Author, title, practice of test-before-code and systematic refactoring are publisher-supported. Editions/ISBNs differ; do not assert an unverified edition.
- **Our application / interpretation:** define observable acceptance test, RED on real baseline when there is a defect, minimal code GREEN, clean/refactor only if necessary and regression stays GREEN.
- **Prometeo owners:** `prometeo-web-change` triggers; `READINESS_GATE_V1.md` and `PRESERVATION_CONTRACT_V1.json` gate; `prometeo-verify-release` separates test from deployment.
- **Executable example:** `tv/chat/scene/tests/verify-scene-regression.mjs`, input revision 10→11 null→12 valid; exact pre/post counts documented in PR #72 receipt.

## Gojko Adzic: *Specification by Example*
- **Verified source:** Manning: https://www.manning.com/books/specification-by-example ; author/publisher describe collaborative examples, automated validation and living documentation, 2011.
- **Our application / interpretation:** one user-visible scenario maps to stable `FEATURE-n → PROOF-n`, Given/When/Then, valid+failure+recovery cases; acceptance specs stay linked to executable tests and evidence instead of frozen prose.
- **Prometeo organs:** `ui-workspace-v1/continuity/evolution-v1/IDEA_INDEX_V1.json` human requirements (NOT implementation), `prometeo-web-change`, Page Change Thread/Feed for durable decisions, V6 `DEMO_PLAN` + `PAGE_CONTRACT`; publish only after live example proves observation.

## Steve Freeman & Nat Pryce: *Growing Object-Oriented Software, Guided by Tests*
- **Verified sources:** author book site: https://growing-object-oriented-software.com/ ; Pearson: https://www.pearson.com/en-ca/subject-catalog/p/growing-object-oriented-software-guided-by-tests/P200000009298/9780321503626 . Sources support system-level TDD, mock objects, interaction tests and external boundaries. Book publication 2009/©2010 depends on listing.
- **Our application / interpretation:** start from real user-visible outcome (outside-in), test contracts at service boundaries with test doubles, then verify a production adapter and real page. A mocked fetch proves error handling but NOT actual GitHub Pages/Drive/browser embed.
- **Prometeo organs:** P4 Capture/private owner, Page Change/TV as public projection, existing adapter contracts, `prometeo-verify-release` and Demo V6. Keep data authority and display distinct; add no mock data to public state.
- **Example:** the Chromium test uses a controlled fetch fixture, while V6 page demo and served smoke remain separately PENDING. This is deliberate evidence separation, not a claim of full E2E proof.

## Non-negotiable epistemic rule
“Publisher/author verified” describes only bibliography and publicly documented approach. `Our application / interpretation` is a local architectural decision until exercised/verified under real Prometeo contracts. Do NOT attribute named Prometeo organs, invented quotations or specific local tests to the authors.
