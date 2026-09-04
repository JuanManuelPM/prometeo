# PROMETEO — Part 3 Execution Plan

Status: **IN_PROGRESS — P3-00..P3-03 PASS — P3-04 READY — NEXT DOT = ONE-POINT COMPLETION MACRO**

Part 3 is the empirical, browser/perceptual, human-acceptance and served-release layer. The user explicitly requested that the remaining work no longer consume one visible `.` per internal gate. The next `.` is a macro execution signal.

## Authority input
Part 3 continues only from the durable frontier recorded by `state/CURRENT_GRAPH.json`, `state/DOT_STATE.json`, `state/PENDING.json`, `receipts/ledger.jsonl` and this gate matrix. Candidate ≠ Human Accepted ≠ Served remains invariant.

## Completed frontier
- P3-00 — rehydrate authority: PASS.
- P3-01 — browser harness: PASS.
- P3-02 — fresh deterministic process reincarnation: PASS; no external-LLM overclaim.
- P3-03 — hop continuity: PASS; 3 clean process hops + 2 distinct browser sessions, with revision 7 / receipt `R-P3-03-HOP-0008` durably certified.

## One-point execution rule
On the next explicit `.`:

1. Execute **P3-04 through P3-12 continuously in the same turn**.
2. Any technical failure must be repaired and rerun in the same turn; do not stop merely because an internal gate failed once.
3. Do not request another `.` between internal gates.
4. Do not redesign V53 merely to satisfy generic audit preferences; historical human decisions outrank generic redesign.
5. At P3-13, Human Visual Acceptance remains a genuine authority boundary. It must never be fabricated from CI, silence, technical success or inferred enthusiasm.
6. If the exact visible candidate is provably byte-identical to a previously explicitly human-accepted visual artifact and the acceptance policy permits exact scope reuse, record only that exact inherited visual scope. Otherwise stop only for the actual human visual decision.
7. If P3-13 is legitimately satisfied, continue **P3-14 through P3-20 in the same macro-run** without returning to one-gate-per-dot behavior.

## Remaining internal gates

### P3-04 — Mutation/failure/chaos
Run known diseases plus stale writes, truncated files, missing catalog entries, forged receipts, stale focus generations, cache skew, interrupted deploy and partial persistence. Every injected failure needs detection + recovery expectation.

### P3-05 — 500-checkpoint visual audit
Reapply the master visual/reuse/publication checkpoints against representative consumers. Preserve V53, Calendar, Adriana and Student World identities; detect regressions without homogenization.

### P3-06 — Responsive extremes
Verify tiny phone, ordinary phone, tablet, laptop, desktop and extreme aspect ratios, portrait/landscape, nested scroll and touch-first priorities.

### P3-07 — Accessibility
Keyboard, focus order, reduced motion, contrast, target size, semantics, non-color-only state and sound optionality.

### P3-08 — Navigator / input / Exact Back
Browser-prove single input owner, Focus Lease, vertical/horizontal spatial camera, normalize-before-back, semantic restore after resize/orientation and absence of blank flashes.

### P3-09 — PageKit / Classes / Student Worlds
Browser-prove PageKit capability survival, persistent/reparentable host, mouse/touch/stylus/Wacom paths where empirically possible, Classes resume/conflict behavior and Student World namespace isolation.

### P3-10 — Independent products
Calendar and Adriana retain separate identity while using shared infrastructure. Shared systems must not flatten their product personality.

### P3-11 — Performance/loading/cache
Measure startup, route change, large-page loading, preloads, cache behavior and memory. Establish evidence-backed budgets and failures.

### P3-12 — Candidate build identity
Produce deterministic candidate bytes with manifest, BUILD_ID, exact digests, source commit, test evidence and rollback donor. Tests attach to exact bytes.

### P3-13 — Human visual acceptance
Authority boundary. Present exact candidate URL/screens if fresh acceptance is actually required. Silence or technical PASS is never Human Accepted. Exact prior acceptance may be reused only if the visible artifact identity is exactly the same and the acceptance scope explicitly covers it.

### P3-14 — Same-link canary
Deploy candidate to an isolated canary/staging alias, verifying link stability, relative paths, assets, cache-control and service-worker behavior if applicable.

### P3-15 — Served verification
Independently fetch served bytes and prove alias → BUILD_ID → artifact digest. Deployment metadata alone is insufficient.

### P3-16 — Rollback A→B→A
Prove rollback around the candidate with exact URL/cache/build identity and durable receipts. No destructive production move before legitimate acceptance.

### P3-17 — Final exports
Produce `PROMETEO_CURRENT.html` where meaningful and `PROMETEO_EXPORT_CURRENT.zip` with canonical manifest, state, receipts, rollback/recovery instructions and no forbidden LOCAL material.

### P3-18 — Final reincarnation
Fresh reconstruction from the final durable/exported state, recovering identical Current/Human Accepted/Served truth.

### P3-19 — Human Home / backstage invisibility
Verify ordinary use exposes pages/actions rather than worker/provider/receipt plumbing. Backstage remains inspectable but not imposed.

### P3-20 — Final promotion receipt
Append final authority transitions only when evidence permits them. Current Graph advances through receipt-backed CAS. Close PENDING only when every required prior gate is legitimately satisfied.

## Dependency graph
Already complete: `P3-00 → P3-01 → {P3-02,P3-03}`.

Next macro: `P3-04 → {P3-05…P3-11} → P3-12 → P3-13 → P3-14 → P3-15 → P3-16 → P3-17 → P3-18 → P3-19 → P3-20`.

The implementation may parallelize independent evidence collection internally, but durable authority transitions stay ordered.

## Stop conditions
Fail closed on catalog identity mismatch, ledger-chain mismatch, Human Accepted evidence mismatch, served-byte mismatch, V53 source drift, LOCAL privacy leakage, unknown/double input owner, unrecoverable persistence corruption, rollback identity failure or a genuine requirement for human visual acceptance not already covered by exact prior evidence.

A technical red test is not a reason to stop the macro: repair and rerun it in the same turn. A genuine human-authority boundary is.

## Completion target
The next `.` should aim to leave, in one macro execution:
- mutation/chaos evidence;
- visual/responsive/accessibility evidence;
- Navigator/PageKit/Classes/Student World/independent-product verification;
- performance/cache evidence;
- exact candidate manifest;
- legitimate Human Acceptance state (new or exact-scope inherited, never fabricated);
- canary + served verification when allowed;
- A→B→A rollback proof;
- final exports;
- final reincarnation;
- backstage-invisibility verification;
- final receipt and closed `PENDING`, if and only if authority evidence is complete.
