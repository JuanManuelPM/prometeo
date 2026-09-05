# PROMETEO — Part 2 Adversarial Audit

Status: **PART2_ADVERSARIAL_REPAIRED — CANDIDATE CI PASS — PART3 PLANNED_NOT_STARTED**

Baseline attacked: `fcb77473ecaa4855514253b3c6166bf400356d43` (previous CI `33874647321`).
Repaired candidate: `cb5dd70bc44470457b985bbdcbdbdcd970b14d1c`.
Isolated audit CI: `33877625341` — PASS.
Permanent candidate CI: `33877683291` — PASS.
Durable audit receipt: `R-P2-AUDIT-0004` / hash `c79f09b0d9991da2eb594ab56666e4b61a2e6aa7b459198ff6082a42386841bf`.

## What the attack actually broke
1. **BLOCKER — forged privacy declassification:** a plausible in-memory object could authorize LOCAL→PROJECT/PUBLIC. Repaired: receipt id+hash must match the trusted ledger supplied by the platform.
2. **BLOCKER — PROJECT external by default:** Context Pack used a tautological `allowProject=true`. Repaired: external PROJECT export is explicit opt-in; LOCAL remains forbidden.
3. **BLOCKER — unanchored Current transition:** receipt-shaped objects could move a pointer. Repaired: trusted ledger membership required.
4. **BLOCKER — Current lost-update race:** no revision CAS. Repaired: `expectedRevision` mandatory.
5. **BLOCKER — state elevation through wrong pointer:** candidate pointer could mark HUMAN_ACCEPTED. Repaired: HUMAN_ACCEPTED/SERVED state changes always require their evidence.
6. **HIGH — shallow freeze:** nested arrays/state remained mutable. Repaired with durable deep immutable snapshots and deeply immutable platform exposure.
7. **HIGH — reincarnation accepted cross-file drift:** wake checked too little. Repaired: BOOTSTRAP roles, all required schemas, HEAD/candidate, PARENT/HEAD, DOT/Current, branch, catalog identity and ledger receipt references are cross-validated.
8. **HIGH — explicit context silently missing:** repaired: explicit unknown IDs fail closed.
9. **MEDIUM — watermark write lacked mandatory CAS/post-validation:** repaired.
10. **MEDIUM — migration registry injectable at runtime:** repaired: built-ins sealed after bootstrap.
11. **HIGH discovered by the repair itself — cross-realm trust guard:** `instanceof Set` rejected valid Sets crossing VM/iframe realms. Repaired with capability/duck-typed `.has()` trust collections, then the entire suite was rerun.

## Permanent regression surface
`tests/known-diseases.json` now contains 26 disease entries. `tests/part2-adversarial-repair.test.mjs` carries 10 explicit mutation cases, while the cross-realm issue is exercised by the same test under the VM harness. Part 1 regressions remained green.

## Truth ceiling preserved
This audit did **not** claim browser/perceptual PASS, fresh-chat empirical PASS, Human Accepted, Served verification, production promotion, same-link release or rollback rehearsal. V53 visible frontend remains the exact inherited blob `7ca5f3e223ca843e3f9e4b7be1e53b5b65dd3418`.

## Handoff
Part 2 is now adversarially repaired. `coordination/PART3_EXECUTION_PLAN.md` and `coordination/PART3_GATE_MATRIX.json` are planning artifacts only. Part 3 has not started. `state/PENDING.json` instructs the next explicit execution signal to begin with P3-00 and no later gate.
