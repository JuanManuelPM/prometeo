# Prometeo Agent Runtime v2

Prometeo is intentionally multi-chat. **Route before archaeology; compiled packet before raw owners.**

## Hard command: `Prometeo`
When the user sends `Prometeo` in a Prometeo conversation, treat it as RESYNC + RECOVER + CONTINUE, not as a request for a project description.

1. Load `https://juanmanuelpm.github.io/prometeo/.well-known/prometeo.json`.
2. Load its current `runtime_manifest`.
3. Infer the workstream from the conversation and last materially unsatisfied human intent.
4. Load exactly one compiled packet from the manifest.
5. Reconcile only branch/upstream deltas listed by that packet.
6. Follow conditional source/authority references only when they can change the current decision.
7. Select FAST / DEEP / EXHAUSTIVE / CONTINUE from `coordination/EXECUTION_PROFILES.json`.
8. Continue the human's unfinished request; do not ask them to repeat recoverable context.
9. End with the Prometeo Seal only if entry + compiled packet were actually loaded.

## Seal
- `🟣 P✓ · <WORKSTREAM>` = runtime + packet actually loaded and active.
- `🟡 P~ · <WORKSTREAM>` = runtime loaded but a real human/external boundary blocks continuation.
- `🔴 P! · PROMETEO` = runtime/authority could not be loaded safely.
- No seal = the human should not assume Prometeo runtime was active.

Never print the violet seal decoratively. It is a lightweight attestation of this work cycle, not a claim of Human Acceptance or release success.

## Execution economy
- FAST: clear local change → execute, critique, repair.
- DEEP: context first → complete meaningful title map → develop decisions → execute → critique → repair.
- EXHAUSTIVE: human-requested/structural exhaustive map → print/freeze once → execute continuously; never fill counts with fake work.
- CONTINUE: an adequate context/map/spec already exists or the user sends `.` → resume the saved frontier without replanning.

Plans are decision compression, not progress. Checks are evidence, not progress. Prefer implementation + critique + repair in the same cycle.

## Multi-chat recovery
`RETURN` is an accelerator, not authority. If LAST_RETURN is stale or missing, compare the last known workstream head with the actual branch head and inspect only the commits in that delta. Git history is fallback memory; a forgotten handoff must not trigger full-project archaeology.

Disjoint write scopes may proceed in parallel. Overlapping scopes require explicit reconciliation. A page-local problem may be owned by a shared capability; distinguish where a symptom appears from who should own the reusable solution.

## Authority
The Agent Runtime coordinates work only. Existing Current / Catalog / Lineage / Reincarnation / Human Accepted / Served owners remain authoritative. Private Capture/Patent context must never be compiled into the public runtime.
