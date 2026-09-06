# Prometeo Work Policy v1

## Primary objective

**Maximize durable useful change per agent turn.**

A commit, test, checklist, receipt or long answer is not intrinsically progress. Progress is a useful capability, decision, repair, reusable discovery or product improvement that did not exist before and survives the chat.

## Route before archaeology

Read the public entrypoint → `NOW.json` → one matching `PACK.json` → its `LAST_RETURN.json` → only relevant newer global deltas. Expand into Current/Catalog/Lineage/source only when the pack or evidence requires it.

Do not read the whole repository merely to feel safe.

## Three modes

### LAB
Use for page/product exploration and iterative improvement.
- Optimize human quality, learning and visible product delta.
- Implement, critique and repair in the same turn when possible.
- Try alternatives when they can answer a real design uncertainty.
- Do not create receipts/gates for ordinary visual iteration.
- Preserve data and explicit invariants, but do not apply release bureaucracy to experimentation.

### INTEGRATE
Use when a useful mechanism should become reusable.
- Decide owner and smallest reusable contract.
- Check actual consumers before changing a shared owner.
- Preserve product visual identity; shared laws/primitives do not imply shared skins.
- Move a mechanism to shared ownership only when reuse is real, not speculative.

### RELEASE
Use only when crossing a publication/authority boundary.
- Validate the exact final bytes/state being released.
- Distinguish Candidate, Served and Human Accepted.
- Add rollback/receipt evidence where it materially protects the product.
- Never claim Human Acceptance without the human accepting the exact candidate.

## Planning economy

- Small/clear task: execute; no ceremonial plan.
- Medium ambiguous task: a short decision map is enough.
- Large/structural task: plan titles first when that prevents drift, then develop and execute.
- If the human explicitly requested an exhaustive plan (for example P4's frozen 100-point map), do not regenerate it on every turn. Continue from it.
- Planning that does not alter execution is overhead.

## Verification economy

1. Make a meaningful change.
2. Batch the cheapest checks that could falsify it.
3. Repair failures immediately when worker-soluble.
4. If the same strategy fails twice without new evidence, change strategy.
5. Do not create tests whose only purpose is to justify another test/checkpoint.

## Parallel work

- Each active workstream declares a branch and write scope.
- Disjoint scopes may proceed in parallel without leases or heartbeats.
- Overlapping scopes require reading both packs/last returns and choosing one owner or explicit alternative branch.
- Git conflict is a signal to reconcile, not a reason to invent a distributed scheduler.
- A chat should not silently write to another workstream's owner because it happens to have access.

## Cross-workstream learning

When a local result may help another surface, put it in RETURN `shared_discoveries` / `global_delta_candidates` with evidence. Do **not** immediately refactor unrelated products. Promote only high-leverage, cross-workstream discoveries to `DELTA_FEED.json`.

## Output economy

Prefer:
- useful implementation;
- concise decision record;
- evidence that changes confidence;
- next human boundary if one truly exists.

Avoid:
- repeating the full architecture each turn;
- recap as a substitute for work;
- fake completeness through numbered filler;
- endless check/recheck loops;
- hiding a blocker behind optimistic language.

## Stop conditions

Continue within the routed workstream until one of these is true:
- the requested useful delta is complete;
- a genuine human choice/acceptance is required;
- an external permission or unavailable source is required;
- continuing would cross the pack's authority/write boundary;
- evidence invalidates the pack and requires re-routing.

A response-length boundary is not itself a project boundary: leave a compact RETURN/checkpoint and continue next turn without replanning.
