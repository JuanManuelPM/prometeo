# Prometeo Work Policy v2

The canonical runtime behavior is owned by `coordination/AGENT_RUNTIME.json` and `coordination/EXECUTION_PROFILES.json`. This file is the human-readable policy layer.

## Primary objective

**Maximize durable useful change per agent turn.**

A commit, test, checklist, receipt or long answer is not intrinsically progress. Progress is a useful capability, decision, repair, reusable discovery or product improvement that did not exist before and survives the chat.

## Compiled packet before archaeology

Preferred path:

`public entry → runtime manifest → one compiled Work Packet → only conditional references that can change the current decision`.

Do not manually reconstruct NOW/PACK/LAST_RETURN/DELTA when a current compiled packet already contains them. Raw owners remain available for authority, ambiguity and drift resolution.

## Execution profiles

Use the canonical profiles in `coordination/EXECUTION_PROFILES.json`:

- **FAST** for explicit local changes.
- **DEEP** for material ambiguity/design: context first → complete meaningful title map → develop decisions → execute → critique → repair.
- **EXHAUSTIVE** for explicit exhaustive/numbered work or large structural coverage; print/freeze the map once, never regenerate it as ritual.
- **CONTINUE** when adequate context/map/spec already exists or the human sends `.`; resume the frontier without replanning.

Planning is decision compression, not progress.

## Three work modes

### LAB
Use for page/product exploration and iterative improvement.
- Optimize human quality, learning and visible product delta.
- Implement, critique and repair in the same turn when possible.
- Do not apply release bureaucracy to ordinary visual iteration.

### INTEGRATE
Use when a useful mechanism should become reusable.
- Decide owner and smallest reusable contract.
- Check real consumers before changing shared ownership.
- Shared laws/primitives do not imply shared skins.

### RELEASE
Use only when crossing publication/authority boundaries.
- Validate the exact final bytes/state being released.
- Distinguish Candidate, Served and Human Accepted.
- Add rollback/receipt evidence only where it materially protects the product.

## Verification economy

1. Make a meaningful change.
2. Batch the cheapest checks that could falsify it.
3. Repair worker-soluble failures immediately.
4. If the same strategy fails twice without new evidence, change strategy.
5. Do not create tests whose only purpose is to justify another test/checkpoint.

## Parallel work and forgotten handoffs

Each active workstream declares a branch/write scope. Disjoint scopes can proceed in parallel. Overlap requires explicit reconciliation.

`RETURN` is an accelerator, not authority. If a chat forgot its handoff:

1. compare the last known head with the actual branch head;
2. inspect only commits after that head;
3. extract relevant useful deltas/decisions/open work;
4. continue.

Git history is fallback memory. A forgotten RETURN must cost a small diff, not project archaeology.

## Cross-workstream learning

Record reusable discoveries in RETURN/global delta candidates. Do not silently refactor unrelated products. Promote only discoveries capable of changing another workstream.

## Prometeo Seal

The human-visible seal contract is owned by `coordination/AGENT_RUNTIME.json`:

- `🟣 P✓ · <WORKSTREAM>`: stable entry + compiled packet were actually loaded this work cycle.
- `🟡 P~ · <WORKSTREAM>`: runtime loaded but a real human/external boundary blocks continuation.
- `🔴 P! · PROMETEO`: runtime/authority could not be loaded safely.

No violet seal means the human should not assume the Prometeo runtime was active.

## Stop conditions

Continue until the requested useful delta is complete, a genuine human/external/authority boundary exists, or evidence invalidates the routed packet. Response length alone is not a project boundary; persist the frontier and continue without re-planning.
