# Prometeo Agent Runtime v3

Prometeo is intentionally multi-chat. **Route before archaeology; EPOCH before coordination reread; compiled packet before raw owners.**

## Hard command: `Prometeo`
Treat `Prometeo` as RESYNC + RECOVER + CONTINUE, never as a request for a generic project description.

1. Load `https://juanmanuelpm.github.io/prometeo/.well-known/prometeo.json` and its current manifest.
2. Recover the last materially unsatisfied human intent from the conversation.
3. Prefer one active compiled Work Packet; otherwise route through Catalog surface + GENERAL.
4. Preserve any useful work this chat produced before booting. Recover from conversation + the smallest relevant Git delta.
5. Reconcile only branch/network events included in the packet. Do not crawl unrelated chats/repositories.
6. If an unregistered surface needs material writes, scaffold one small workstream/branch plus an independent worker status object under `coordination/network/workers/`.
7. Choose FAST / DEEP / EXHAUSTIVE / CONTINUE and continue the human request.
8. End with a Prometeo Seal only if entry + compiled packet were actually loaded this cycle.

## Cheap freshness
Once a chat is bootstrapped, before material work read only:

`https://juanmanuelpm.github.io/prometeo/agent-runtime/epoch.json`

- Same EPOCH as last seen: continue immediately. Do **not** read NETWORK/DELTA merely to demonstrate diligence.
- New EPOCH: reload only the active compiled Work Packet. It already filters relevant dependencies, convergence and global deltas.
- `.` means this CONTINUE behavior; it never means replan a frozen map.

## Shared nervous system
Workers do **not** collaboratively edit one central mutable status file.

- One disposable chat/agent instance → one `prometeo.worker-status/v1` object.
- Workstreams are auto-discovered from `coordination/workstreams/*/PACK.json`; `NOW.json` remains compatibility/router policy rather than the mandatory registry of every future task.
- Public `NETWORK.json` and `CONVERGENCE.json` are compiler-derived, read-only coordination views.
- Declare `needs`, `provides`, `depends_on`, `impacts`, and `candidate_shared_owners` only when they materially improve cross-workstream decisions.
- Disjoint scopes proceed in parallel.
- `HARD_WRITE_COLLISION` is blocking; dependency/impact/shared-owner events are targeted signals, not global locks.
- No heartbeat bureaucracy.

## Seal
- `🟣 P✓ · <WORKSTREAM>` = stable entry + compiled packet actually loaded this cycle.
- `🟣 P✓ · GENERAL` = runtime + GENERAL loaded; this grants no material write authority.
- `🟡 P~ · <WORKSTREAM>` = runtime active but a real human/external boundary blocks continuation.
- `🔴 P! · PROMETEO` = runtime/authority could not be loaded safely.
- No seal = do not assume Prometeo was active.

Never print the violet seal decoratively. It is working-context attestation, not Human Acceptance or release evidence.

## Execution economy
- FAST: explicit/local/reversible → execute → critique → repair.
- DEEP: CONTEXT FIRST → COMPLETE MEANINGFUL TITLE MAP → DEVELOP decisions → EXECUTE → CRITIQUE → REPAIR.
- EXHAUSTIVE: complete requested map once → develop → `PLAN:FROZEN` → execute continuously; no filler.
- CONTINUE: context/map/spec already sufficient or user sends `.` → resume frontier without replanning.

Plans are decision compression, not progress. Checks are evidence, not progress. Prefer implementation + critique + repair in the same cycle. After the same strategy fails twice without new evidence, change strategy rather than adding more checks.

## Recovery
`RETURN` is an accelerator, not authority. If stale/missing, compare the last known head with actual branch head and inspect only that delta. A forgotten handoff must not trigger project-wide archaeology.

## Ownership
A page-local symptom may belong to a shared capability. Distinguish *where the problem appears* from *who should own the reusable fix*. If two workers independently point to the same shared owner or overlap write scope, let the network surface convergence before duplicating infrastructure.

## Privacy and authority
Public worker/network artifacts contain compact coordination metadata only. Never compile private transcripts, Patent payloads, LOCAL context, credentials or access tokens into them.

Agent Runtime / Network coordinate work only. Current / Catalog / Lineage / Reincarnation / Human Accepted / Served remain authoritative in their existing owners.
