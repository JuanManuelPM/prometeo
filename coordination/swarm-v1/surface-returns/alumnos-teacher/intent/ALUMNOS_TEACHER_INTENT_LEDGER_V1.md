# Alumnos / página docente — Intent Ledger v1

Status: SCOPED CANDIDATE EVIDENCE
Opportunity: `O-SURFACE-ALUMNOS_TEACHER-INTENT-V1`
Run: `RUN-O-SURFACE-ALUMNOS_TEACHER-INTENT-V1-20260917T0910-SOL56-AI47`
Worker: `wc-chat-20260917T0910-0300-sol56-alumnosintent`
Authority: read-only intent synthesis plus this isolated durable return. This file does not bind an Alumnos root and does not make any page, runtime or capability Current, Human Accepted or Served.

## 1. Surface identity and current durable intent

The durable project-level meaning of **Alumnos** is broader than any one José page: `PROJECT_INDEX.json` defines it as work about students, classes, materials and teaching systems, and currently associates it with three distinct durable workstreams: `student-world-jose-recovery`, `pagekit-class-player-r07`, and `jose-study-design-20260911`.

The strongest currently recoverable intent for this surface is therefore a **family of teaching/student experiences that must stay linked without being flattened**:

| Durable intent / preference | Strength | Exact durable evidence | Implication for `alumnos-teacher` |
|---|---|---|---|
| Alumnos covers students, classes, materials and teaching systems; it is not synonymous with José. | CURRENT PROJECT INTENT | `coordination/workstreams/chat-native-control-plane-v1/PROJECT_INDEX.json` -> `project-alumnos` | A teacher/root surface may route several child identities; it must not silently replace them with one generic page. |
| Student World, subject pages, full classes, compact classes, atlases, homework and the shared Study engine remain distinct product identities. | BINDING RECOVERED INVARIANT | `coordination/workstreams/student-world-jose-recovery/PACK.json`; `RECOVERY_2026-09-09.json`; `LAST_RETURN.json` | Compose/link identities rather than flattening them into a single visual shell. |
| Shared Study behavior has an explicit owner and student-specific products consume it rather than forking its CSS/JS. | BINDING OWNER BOUNDARY | `shared/study/current.json`; R06 PACK/RECOVERY | Student-specific pages may own content/state/layout decisions, but shared Study primitives remain owner-controlled. |
| José Algebra should continue from the V11 design frontier, preserve the canonical 48 exercises, and improve hierarchy, theory/practice flow, map, tactile interaction and responsive layout without regressing settled behavior. | CURRENT DURABLE CHILD INTENT | `coordination/workstreams/jose-study-design-20260911/PACK.json`; `LAST_RETURN.json` | Any Alumnos plan that touches José must consume V11 intent instead of reconstructing from older demos. |
| The course architecture is Algebra menu -> one of four distinct topics -> topic-local 12-level map in three rounds -> exercise/practice. | SETTLED CHILD DECISION | José Study PACK/LAST_RETURN | Do not collapse four topics into one rail or replace the 48 canonical exercises with invented simplifications. |
| Theory scrolling must not silently destroy/change current practice state; on small screens theory is primary and practice is a three-snap bottom sheet. | SETTLED UX DECISION | José Study PACK/LAST_RETURN | Preserve context and state across theory/practice movement; mobile hierarchy is intentionally asymmetric. |
| Selection is not submission/activation; scroll/drag is not click. | SHARED INTERACTION INVARIANT | R06 PACK/RECOVERY; José Study PACK | Pointer/touch/mouse behavior must distinguish inspection/navigation from commitment. |
| Normal four-option MCQ should fit as one composition on a small phone without avoidable scrolling; explanatory filler and visible trap labels are regressions. | SETTLED STUDENT-FACING ACCEPTANCE | José Study PACK/LAST_RETURN | Keep student copy compact and diagnostic logic hidden until appropriate feedback. |
| The left study map must read as a designed product: clear current level, strong round separation, breathing room, reduced inactive-label noise. | CURRENT DESIGN ACCEPTANCE | José Study PACK/LAST_RETURN | Density reduction is a product requirement, not cosmetic optionality. |
| PageKit/Class Player recovery evidence must preserve pressed-only eraser semantics; V37 typed undo / board-object behavior is selective candidate evidence, not a whole-UX promotion. | RECOVERED CLASS-TOOL INVARIANT | `coordination/workstreams/pagekit-class-player-r07/PACK.json`; `NEGATIVE_KNOWLEDGE.json` | Teacher/class tooling may reuse recovered mechanisms only with their evidence ceilings and regression guards. |
| Generic Pointer Events do not prove Wacom pressure/buttons; responsive/full-viewport layout does not prove application Fullscreen API. | EVIDENCE CEILING | PageKit `NEGATIVE_KNOWLEDGE.json` | Do not advertise or plan around unsupported input/fullscreen capabilities. |

## 2. Current vs candidate vs historical truth

### Current durable truth relevant to intent

- `project-alumnos` is registered in `PROJECT_INDEX.json`, but its `primary_chat_object_id` and `primary_workstream_id` are still null in that authoritative index snapshot.
- The project already lists three child workstreams: R06 Student World/José recovery, R07 PageKit/Class Player recovery, and José Study design.
- `shared/study/current.json` points to `prometeo-study-ui` v1 / 1.0.0 with backward-compatible fixes inside v1 and explicit-major migration for breaking changes.
- José Study V11 is durably recoverable as the latest design frontier of its workstream, but it is explicitly a LAB candidate, not Current/Human Accepted/Served.

### Candidate / not-yet-bound truth

- Root discovery proposed `chat-object-alumnos-main` + `alumnos-root-v1` as a **coordination-only** root, with José Study as an initial child frontier for routing only. The discovery return explicitly marks this `CANDIDATE_NOT_BOUND`.
- The discovery also states that the eventual primary human-facing Alumnos surface is unresolved: José Study, Student World and a future root/teacher launcher are different identities.
- `student-world/runtime/v2` remains TESTED_CANDIDATE evidence.
- PageKit V37 remains a selective capability candidate; V26 remains the stable rollback donor. Neither version number nor catalog liveness is promotion authority.

### Historical / closed evidence

- `student-world-jose-recovery` is an integrated closed recovery lane. Its purpose now is restart evidence, invariants and negative knowledge; it is not an active product owner.
- `pagekit-class-player-r07` is a closed recovery lane. It preserves capability/regression evidence; it is not the PageKit product owner.
- Older José demos such as V4 are historical/stale for the current design frontier and must not be returned as the current design simply because they are easier to locate.

## 3. Recent deltas that matter

1. **Root discovery has happened, but root binding has not yet become authoritative.** The discovery return proposes `alumnos-root-v1`; `PROJECT_INDEX.json` still records Alumnos as `REGISTERED_DISCOVERY_REQUIRED` with no primary Chat Object/workstream. Treat this as discovery-complete/binding-candidate, not active-bound root.
2. **The universal swarm now names the target surface `alumnos-teacher`.** This is a coordination target broader than the existing José student engine. The label does not itself establish that a canonical teacher page already exists.
3. **The strongest active child design intent is José V11**, while R06/R07 are closed evidence domains. A local Alumnos campaign should therefore consume all three for different reasons: V11 for current child design intent, R06/R07 for identity/interaction/regression boundaries.
4. **All seven currently prepared Alumnos surface analysis/planning lanes are now claimed** (`TRUTH`, `INTENT`, `UX`, `REUSE`, `RISK`, `DISCOVER`, `PLAN`) according to the live claims directory observed during this run. New work should not duplicate those lanes.

## 4. Apparent contradictions and reconciliations

### A. “One coherent student path” vs preserving distinct product identities
Not a conflict. R06 defines the coherent path as **linkage with typed roles**, not flattening. World chooses learner/context; subject preserves subject/progress identity; Study supplies reusable hierarchy/exercise behavior; class/atlas/homework remain authored modes; Chemistry remains a sibling subject.

### B. Shared Study owner vs bespoke student experience
Not a conflict. Shared behavior/primitives belong to `shared/study/v1`; a student-specific surface can still own content, layout, state composition and authored experience. The prohibited move is forking shared CSS/JS merely to continue a page.

### C. V11 is the current design frontier vs V11 is not Current
These use different meanings of “current.” V11 is the **current durable frontier of the José design workstream**, but its artifact state is explicitly `CHAT_BUILT_LAB_CANDIDATE_NOT_CURRENT_NOT_SERVED`. Do not convert workstream recency into product authority.

### D. V26 stable baseline vs V37 later version
Version number does not decide authority/capability quality. V26 is the stable rollback donor; V37 contains narrower best-known candidate gains. Selective reuse requires preserving regression guards such as pressed-only eraser and typed undo.

### E. Root discovery return vs `PROJECT_INDEX` still unbound
This is a stage transition, not license to guess. The discovery return is evidence for a candidate binding; until the owner actually materializes/binds that root, `project-alumnos` remains unbound in `PROJECT_INDEX`.

## 5. Acceptance preferences / protected invariants

1. **Preserve identity before unifying UX.** Alumnos may coordinate many teaching surfaces, but subject/class/atlas/homework/teacher-tool identities must not disappear into a generic shell.
2. **Continue from exact durable frontiers, never convenience archaeology.** José continues from V11; R06/R07 remain closed recovery evidence; reconstruction labels stay explicit.
3. **Theory is a first-class study surface.** On mobile it remains primary; practice can deploy without destroying theory/practice context.
4. **Practice should be compact, tactile and diagnostic rather than verbose.** No avoidable scrolling just to compare four standard choices; no pre-announced traps; no helper filler unless explicitly needed.
5. **Navigation/activation semantics stay causal.** Selection != activation/submission; drag/scroll != click; drawing drag remains drawing.
6. **Map hierarchy should be legible and spacious, not a compressed system list.** Preserve topic-local scope and round hierarchy.
7. **Shared capabilities are consumed, not copied.** `shared/study/current.json` remains the Study owner; breaking shared behavior requires a new major and explicit migration.
8. **Teacher/class tooling inherits evidence ceilings.** Pressed-only eraser is protected; Wacom pressure/buttons and application fullscreen remain unproved unless separately exercised.
9. **No implicit promotion.** Catalog liveness, latest filenames, recovery completion, workstream frontier or code presence do not equal Human Accepted/Current/Served.

## 6. Non-obvious finding

`alumnos-teacher` should currently be treated as a **coordination surface category, not as a proven single concrete page identity**. The durable Alumnos evidence deliberately spans a student world/map, subject pages, study engine, classes/atlases/homework, and class-player/whiteboard tooling, while root discovery explicitly leaves the primary human-facing Alumnos surface unresolved. Therefore a future local planner or UX worker must not “solve” this ambiguity by choosing José Study, Student World, or PageKit as the teacher page by inference. It should use the sibling truth/discovery evidence to resolve or intentionally compose the teacher-level entry while preserving child identities.

## 7. Verified source debt / unresolved items

- `coordination/workstreams/alumnos-root-v1/` was absent when checked in this run.
- The sibling `O-SURFACE-ALUMNOS_TEACHER-TRUTH-V1` lane was claimed but had no durable return at the time this intent synthesis checked it; exact surface truth therefore remains delegated to that lane.
- The eventual primary human-facing Alumnos/teacher entry remains unresolved by the root discovery return.
- This ledger recovers durable intent summaries and decisions from repository artifacts; it does not claim access to every historical human-chat utterance.

## 8. Deduplicated next work

No new Alumnos analysis/planning opportunity is emitted from this intent lane. The live claims directory already contains distinct claimed lanes for:

- `O-SURFACE-ALUMNOS_TEACHER-TRUTH-V1`
- `O-SURFACE-ALUMNOS_TEACHER-UX-V1`
- `O-SURFACE-ALUMNOS_TEACHER-REUSE-V1`
- `O-SURFACE-ALUMNOS_TEACHER-RISK-V1`
- `O-SURFACE-ALUMNOS_TEACHER-DISCOVER-V1`
- `O-SURFACE-ALUMNOS_TEACHER-PLAN-V1`
- this intent lane, `O-SURFACE-ALUMNOS_TEACHER-INTENT-V1`

The correct continuation is for later local integration/steward work to consume these non-duplicate returns under its dependency/authority contract rather than creating an eighth overlapping analysis lane.

## 9. Evidence receipts

- `coordination/workstreams/chat-native-control-plane-v1/PROJECT_INDEX.json` — blob SHA `4f44413ebd69ddc990e95345ff71fd65edd85a91`.
- `coordination/opportunities/returns/O-ROOT-ALUMNOS-DISCOVERY-V1/RUN-O-ROOT-ALUMNOS-DISCOVERY-V1-20260916T220047-5C91.json` — blob SHA `b7a2139cecdd2616570adcdfaa04868caae3edf3`.
- `coordination/workstreams/student-world-jose-recovery/PACK.json` — blob SHA `2478a243e79d5a40d715e865b13ebfbb72795855`.
- `coordination/workstreams/student-world-jose-recovery/RECOVERY_2026-09-09.json` — blob SHA `7c076b60fec1b2bfd75d44f43688b9f1e467e62e`.
- `coordination/workstreams/student-world-jose-recovery/LAST_RETURN.json` — blob SHA `ed05fb2cad298cac5b41729f636dbfed7f095557`.
- `coordination/workstreams/jose-study-design-20260911/PACK.json` — blob SHA `20f3e25f3ff7c7dba80b37b4828bb4dab5ea1792`.
- `coordination/workstreams/jose-study-design-20260911/LAST_RETURN.json` — blob SHA `4d28a7b7e2fc1baf3c73b757d81f2e1e84cfe547`.
- `coordination/workstreams/pagekit-class-player-r07/PACK.json` — blob SHA `3efa8f4b2a398528e08740332c77927b7b90a210`.
- `coordination/workstreams/pagekit-class-player-r07/NEGATIVE_KNOWLEDGE.json` — blob SHA `eee1abd38ee519504445b87040480427711f2c22`.
- `shared/study/current.json` — blob SHA `55927a1507c0f3d78d5141da7d62fd2e8e0de0f7`.
- Public runtime prewrite refresh: `agent-runtime/manifest.json`, `agent-runtime/workstreams/chat-native-control-plane-v1.json`, and `agent-runtime/convergence.json` on `gh-pages` were reloaded after the EPOCH changed during this run.

## 10. Remaining boundary

This artifact is intent evidence only. It does not decide the exact current teacher-page implementation, bind the Alumnos root, redesign UX, merge sibling surface returns, promote PageKit/Student World/José candidates, or change Current/Catalog/Lineage/Human Accepted/Served state.
