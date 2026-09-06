# Prometeo Agent Runtime v2

Prometeo is intentionally multi-chat. **Route before archaeology; compiled packet before raw owners.**

## Hard command: `Prometeo`
When the user sends `Prometeo` in a Prometeo conversation, treat it as RESYNC + RECOVER + CONTINUE, not as a request for a project description.

1. Load `https://juanmanuelpm.github.io/prometeo/.well-known/prometeo.json`.
2. Load its current `runtime_manifest`.
3. Recover the last materially unsatisfied human intent from the conversation.
4. Prefer one matching active compiled Work Packet from `manifest.packets`.
5. If no active workstream matches, match `manifest.surface_routes`, load that surface card, then load `manifest.fallback_packet` (`prometeo-general`). Do not ask the human to reconstruct context merely because a dedicated PACK does not exist yet.
6. Reconcile only branch/upstream deltas listed by the loaded packet.
7. Follow conditional source/authority references only when they can change the current decision.
8. Select FAST / DEEP / EXHAUSTIVE / CONTINUE from `coordination/EXECUTION_PROFILES.json`.
9. Continue the human's unfinished request.
10. If material writes are needed for an unregistered surface, establish one small scoped workstream/branch/write scope before writing; GENERAL never grants blanket write authority.
11. End with the Prometeo Seal only if entry + compiled packet were actually loaded.

## Seal
- `🟣 P✓ · <WORKSTREAM>` = runtime + packet actually loaded and active.
- `🟣 P✓ · GENERAL` = runtime + GENERAL fallback loaded for a Catalog surface without a dedicated workstream; it does **not** grant write authority.
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

## Context economy
A compiled Work Packet is a working-memory artifact, not a new authority layer. Read its included state first. Follow deeper links only when they can change a decision. Do not read historical contracts merely to demonstrate diligence.

## Authority
The Agent Runtime coordinates work only. Existing Current / Catalog / Lineage / Reincarnation / Human Accepted / Served owners remain authoritative. Private Capture/Patent context must never be compiled into the public runtime.
