# PROMETEO — Part 3 Execution Plan

Status: **PLANNED_NOT_STARTED**

Part 3 is the empirical, browser/perceptual, human-acceptance and served-release layer. This file prepares execution only; creating it does not start Part 3.

## Authority input
Part 3 may start only from the Part 2 adversarial-repaired candidate identified by `state/HEAD.json` and its hash-chained audit receipt. Candidate ≠ Human Accepted ≠ Served remains invariant.

## Gates

### P3-00 — Rehydrate authority
Load BOOTSTRAP, Current Graph, ledger, catalog, lineage, PENDING/CARRY/WATERMARKS in a clean process. Refuse chat memory as authority. Output: reproducible WAKE packet + source identities.

### P3-01 — Browser harness
Create a same-origin deterministic browser harness around the existing V53 visible frontend without redesigning it. Capture console/network/runtime errors and BUILD_ID. Rollback: remove harness only.

### P3-02 — Fresh-agent reincarnation
A genuinely new agent/process receives only durable bootstrap sources and must correctly recover Current, accepted scopes, served-inherited state, pending work and modification workflow. Compare answer to machine truth; no prior-chat hints.

### P3-03 — Hop continuity
Execute state handoff across process/chat/browser restart boundaries. Verify no hidden singleton or conversation state is required.

### P3-04 — Mutation/failure/chaos
Run the known-disease catalog plus stale writes, truncated files, missing catalog entries, forged receipts, stale focus generations, cache skew, interrupted deploy and partial persistence. Every injected failure needs detection + recovery expectation.

### P3-05 — 500-checkpoint visual audit
Reapply the master 500 visual/reuse/publication checkpoints against representative consumers. Historical human decisions outrank generic redesign. No homogenization of Calendar/Adriana/Student Worlds.

### P3-06 — Responsive extremes
Verify tiny phone, ordinary phone, tablet, laptop, desktop and extreme aspect ratios. Touch-first priorities; frequently used controls remain easiest to reach.

### P3-07 — Accessibility
Keyboard, focus order, reduced motion, contrast, target size, screen-reader semantics where applicable, non-color-only state, sound optionality.

### P3-08 — Navigator / input / Exact Back
Browser-prove single input owner, Focus Lease, vertical/horizontal spatial camera, normalize-before-back, semantic restore after resize and no blank flashes.

### P3-09 — PageKit / Classes / Student Worlds
Browser-prove PageKit capability survival, reparenting, persistence, Wacom/touch/mouse paths, Classes resume/conflict behavior and Student World namespace isolation.

### P3-10 — Independent products
Calendar and Adriana retain separate identity while using shared infrastructure. Verify no Design Kernel or shell change flattens their personality.

### P3-11 — Performance/loading/cache
Measure startup, route change, large-page loading, preloads, cache behavior and memory. Establish budgets and fail gates, not aspirational notes.

### P3-12 — Candidate build identity
Produce deterministic candidate bytes with manifest, BUILD_ID, digests, source commit and rollback donor. Tests must attach to the exact bytes.

### P3-13 — Human visual acceptance
Present exact candidate URLs/screens to the human. Record scope-specific acceptance; silence or technical PASS is never Human Accepted.

### P3-14 — Same-link canary
Deploy candidate to a canary/staging alias first. Verify link stability, relative paths, assets, cache-control and service-worker behavior if present.

### P3-15 — Served verification
After approved promotion, independently fetch served bytes and prove alias → BUILD_ID → artifact digest. A deployment receipt alone is insufficient.

### P3-16 — Rollback A→B→A
Prove tested rollback from previous served version to candidate and back, with exact same-link/cache handshake and receipts.

### P3-17 — Final exports
Only after accepted+served proof: produce `PROMETEO_CURRENT.html` where meaningful and `PROMETEO_EXPORT_CURRENT.zip` with canonical manifest, state, receipts, rollback instructions and no forbidden LOCAL material.

### P3-18 — Final reincarnation
A fresh agent reconstructs the completed system from the exported durable state and identifies the same Served/Human Accepted truth.

### P3-19 — Human Home / backstage invisibility
Verify ordinary use shows pages/actions, not worker/provider/receipt plumbing. Backstage remains inspectable but not imposed on the human.

### P3-20 — Final promotion receipt
Append Human Acceptance, Current transition and Served verification receipts in order. Update Current Graph only through receipt-backed CAS. Close PENDING only after all prior gates pass.

## Serial dependencies
P3-00 → P3-01 → {P3-02,P3-03,P3-04} → {P3-05…P3-11} → P3-12 → P3-13 → P3-14 → P3-15 → P3-16 → P3-17 → P3-18 → P3-19 → P3-20.

## Stop conditions
Any mismatch in catalog identity, ledger chain, Human Accepted evidence, served bytes, V53 source blob, LOCAL privacy boundary, input ownership or rollback identity is fail-closed. Part 3 must repair and repeat the affected gate; it may not downgrade the claim to make a red test green.

## Deliverables prepared, not produced
Browser evidence bundle; mutation/chaos report; visual checkpoint ledger; responsive/a11y report; performance report; candidate manifest; Human Acceptance record; Served receipt; rollback proof; final export; fresh-agent proof.
