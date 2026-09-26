# PROMETEO VISUAL REINCARNATION PROTOCOL V1

Status: CURRENT

## Principle
Chats are disposable executors. Visual fronts are durable.

No visual front may depend on one conversation remembering prior work. Every session must be safely abandonable after delivery.

## Durable front package
Each front owns:
- `state.json`: current implementation, accepted baseline, current candidate, open focus.
- `feedback.md`: durable user-reviewed feedback, separated into KEEP / OPEN / REJECTED.
- `versions.json`: meaningful version history and user decision.
- `assets.json`: known assets, sources, licensing/provenance notes and dependencies.
- `decisions.md`: invariants and architectural decisions that must survive chats.
- `visuals/handoff/<front>.txt`: CURRENT reincarnation projection.

The handoff is a projection, not an independent source owner. If it conflicts with the durable front package or actual repo bytes, inspect reality, correct the durable sources, then regenerate the handoff.

## Incarnation phase
A new chat receives ONE handoff URL.

It MUST:
1. Read the handoff completely.
2. Inspect the actual repo files/commits named by the handoff.
3. Read the CURRENT global protocol/feedback/checklist named there.
4. Produce the 5-point INCARNATION READBACK.
5. Do NOT edit yet.
6. Wait for user feedback.

The chat must be ready to receive multiple feedback messages. It accumulates them in-session until the user says **ACTUALIZÁ** (or an unambiguous equivalent).

## Update phase
On ACTUALIZÁ:
1. Consolidate all session feedback.
2. Compare it against accepted baseline and rejected history.
3. Implement without silently regressing accepted behavior.
4. Self-critique and verify.
5. Publish main and gh-pages identically.
6. Update the durable front package.
7. Append the new meaningful version to versions.json.
8. Mark consumed feedback/resolved items accurately; do not erase rejected history.
9. Regenerate the handoff so it describes the new reality.
10. Verify a fresh chat could continue from the handoff alone.

## Abandonment test
Assume the user will abandon the chat immediately after delivery.

Before finalizing ask:
"If this conversation vanished now, could a brand-new chat reconstruct the accepted baseline, current candidate, user feedback, failed attempts, assets, decisions, evidence and next focus from the repo + handoff alone?"

If NO, the task is incomplete.

## Baseline rule
Latest code is not automatically accepted direction.

Track separately:
- ACCEPTED BASELINE: user-approved behavior to preserve.
- CURRENT CANDIDATE: latest implementation, possibly awaiting review.
- REJECTED HISTORY: real attempts that must not be resurrected.
- OPEN FEEDBACK: unresolved user direction.

## Truth rule
Never invent screenshots, visual verification, asset availability, publication, liveness or acceptance.
