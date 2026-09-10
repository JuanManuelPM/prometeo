# Prometeo Agent Runtime v3

Prometeo is intentionally multi-chat. **Route before archaeology; EPOCH before coordination reread; compiled packet before raw owners.**

## Mandatory constitution
Before **any material product write**, every Prometeo-aware agent MUST load and obey:

`https://juanmanuelpm.github.io/prometeo/agent-runtime/protocols/global-constitution-v1.md`

Source: `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md` (`prometeo.global-agent-constitution/v1`).

This is not optional guidance. A conversational instruction such as “change this”, “fix this” or “make it better” means **apply a delta to the current authoritative product while preserving established behavior**. It is never permission to throw away prior work, reconstruct from scratch, promote the newest-looking version, or ignore concurrent workers.

Immediately before an important write, re-check EPOCH and the active packet, re-fetch the exact owner/file being changed, inspect relevant live convergence events, and write against the version actually read. A live `HARD_WRITE_COLLISION` between active writing workers is blocking until reconciled or scopes are narrowed. Historical/completed/boundary-only scope overlap is context, not a live lock.

## Hard command: `PROMETEO EXECUTE`
When a conversation begins with:

```text
PROMETEO EXECUTE · <work_item_id>
<execution_packet_url>
```

do not treat it as a normal chat prompt and do not ask the human to restate the task. Fetch the exact packet URL, load the mandatory Global Agent Constitution, then execute `coordination/AGENT_EXECUTION_PROTOCOL_V1.md` / `prometeo.agent-execution-protocol/v1`: LOAD_CONSTITUTION → FETCH → VALIDATE → REINCARNATE → RESYNC → CLAIM → RESOLVE_OWNER → RECOVER_THREAD → PREWRITE → EXECUTE → TEST → PERSIST → RETURN → RECEIPT → UPDATE_THREAD → RELEASE.

The chat is disposable; all material continuity must survive externally. Never copy private Capture literals or opaque packet tokens into public coordination/RETURN artifacts. The human-facing result route should return through the Universal Host/Page Change Feed, not eject the human to a raw child-page URL as the primary navigation path.

## Hard command: `Prometeo`
Treat `Prometeo` as RESYNC + RECOVER + CONTINUE, never as a request for a generic project description.

1. Load `https://juanmanuelpm.github.io/prometeo/.well-known/prometeo.json` and its current manifest.
2. Load the mandatory Global Agent Constitution before any material write.
3. Recover the last materially unsatisfied human intent from the conversation.
4. Prefer one active compiled Work Packet; otherwise route through Catalog surface + GENERAL.
5. Preserve any useful work this chat produced before booting. Recover from conversation + the smallest relevant Git delta.
6. Reconcile only branch/network events included in the packet. Do not crawl unrelated chats/repositories.
7. If an unregistered surface needs material writes, scaffold one small workstream/branch plus an independent worker status object under `coordination/network/workers/`.
8. Choose FAST / DEEP / EXHAUSTIVE / CONTINUE and continue the human request.
9. End with a Prometeo Seal only if entry + compiled packet were actually loaded this cycle.

## Cheap freshness
Once a chat is bootstrapped, before material work read only:

`https://juanmanuelpm.github.io/prometeo/agent-runtime/epoch.json`

- Same EPOCH as last seen: continue immediately. Do **not** read NETWORK/DELTA merely to demonstrate diligence.
- New EPOCH: reload only the active compiled Work Packet. It already filters relevant dependencies, convergence and global deltas.
- Before the first important write and before promotion/publication, perform this check again.
- `.` means this CONTINUE behavior; it never means replan a frozen map.

## Preserve-first mutation law
Default edit mode is surgical/additive.

- Preserve current behavior, data, visual decisions, accepted physics, ownership boundaries and negative knowledge unless the human explicitly requests otherwise.
- Never clean-slate rewrite because rebuilding is easier.
- If replacement is explicitly requested or contractually required, first produce an equivalence/capability map; any baseline capability not explicitly rejected must survive or the candidate fails.
- Never revive a rejected historical pattern merely because code for it already exists.
- `Candidate != Human Accepted != Served`; newest/highest version is not automatically Current.

## Shared nervous system
Workers do **not** collaboratively edit one central mutable status file.

- One disposable chat/agent instance → one `prometeo.worker-status/v1` object.
- Workstreams are auto-discovered from `coordination/workstreams/*/PACK.json`; `NOW.json` remains compatibility/router policy rather than the mandatory registry of every future task.
- Public `NETWORK.json` and `CONVERGENCE.json` are compiler-derived, read-only coordination views.
- Declare `needs`, `provides`, `depends_on`, `impacts`, and `candidate_shared_owners` only when they materially improve cross-workstream decisions.
- Disjoint scopes proceed in parallel.
- Only overlapping **active writing workers** create a blocking `HARD_WRITE_COLLISION`. Completed, closed, failed, recovery-complete or boundary-only workers do not hold live write locks.
- Dependency/impact/shared-owner events are targeted signals, not global locks.
- No heartbeat bureaucracy.

## Worker claim / release
For material work, publish or refresh a scoped worker status when practical before the first write. Active write states are `CLAIMED`, `EXECUTING`, `WRITING`, `INTEGRATING` (plus equivalent explicit active states). At completion or a real boundary, update the worker to a non-writing state such as `COMPLETE`, `CLOSED`, `BOUNDARY` or `FAILED` so other agents cannot infer phantom contention.

## Cross-chat handoff: publish, then `Prometeo`
The human is **not** the message bus between Prometeo chats.

When useful work or a material discovery must survive this chat or affect another workstream:

1. Persist local execution state in the workstream `LAST_RETURN.json` (or its scoped worker-status object while work is still in flight).
2. Publish only genuinely cross-workstream discoveries to `coordination/DELTA_FEED.json` with the relevant topics and source refs.
3. If the work is a new material scope, register a small `coordination/workstreams/<id>/PACK.json` instead of embedding a giant handoff prompt in chat.
4. Let Agent Runtime v3 rebuild EPOCH and the affected compiled Work Packets.
5. The human should only have to open the destination chat and send `Prometeo`. Do **not** ask them to copy/paste a recoverable handoff prompt.
6. The destination chat detects the new EPOCH, reloads only its relevant compiled packet and consumes the published delta/action automatically.
7. If a chat is legacy and has never learned Prometeo, the one-time bridge is `PROMETEO → https://juanmanuelpm.github.io/prometeo/p.txt`; after that, `Prometeo` alone is enough.

A long prompt may still be generated as a diagnostic/export for an external model that cannot access the runtime, but it is a fallback artifact, not the normal cross-chat transport.

## Page Change Loop
For work launched from Prometeo pages, the durable conversation is the page thread, not the ChatGPT conversation:

`Capture(s) → Page Change Thread → HACER → Execution Packet → disposable worker → RETURN → Page Change Feed → ● → host-routed result/page → next Capture`

Workers must write sanitized execution results so the Change Feed can show what was requested, what changed, tests/evidence and candidate/served state. Raw page URLs are evidence only; the primary human route should preserve the single Universal Host and the page thread.

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
A page-local symptom may belong to a shared capability. Distinguish *where the problem appears* from *who should own the reusable fix*. If two workers independently point to the same shared owner or overlap active write scope, let the network surface convergence before duplicating infrastructure.

## Completion law
Do not finish with a plan when the remaining step is software-solvable. After implementation, perform a real critique: **what would force the human to come back and explain this again?** Repair those causes, rerun relevant tests, persist RETURN/receipts and only then stop at a real human/external boundary.

## Privacy and authority
Public worker/network artifacts contain compact coordination metadata only. Never compile private transcripts, Patent payloads, LOCAL context, credentials or access tokens into them.

Agent Runtime / Network coordinate work only. Current / Catalog / Lineage / Reincarnation / Human Accepted / Served remain authoritative in their existing owners.
