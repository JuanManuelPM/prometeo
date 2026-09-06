# Prometeo agent entry

Before material work, read `.well-known/prometeo.json`, then `coordination/NOW.json`.

Prometeo is intentionally multi-chat. A fresh agent must **route before archaeology**:

1. Match the human request to an active workstream in `NOW.json`.
2. Read only that workstream's `PACK.json` and `LAST_RETURN.json` first.
3. Read global deltas newer than the pack's `last_global_revision_seen` only when their topics intersect the pack.
4. Follow links from the pack to authoritative source/contracts as needed. If a read ref names a branch, read that exact branch; do not silently substitute `main`.
5. Compare the workstream's actual branch head with `LAST_RETURN.head_commit` / pack observed head. If another chat advanced the branch without updating RETURN, inspect **only those newer commits**, synthesize the missing useful delta, and continue. Do not restart full archaeology.
6. Respect the pack's write scope and branch. Disjoint workstreams may proceed in parallel; overlapping write scopes require explicit reconciliation, not silent competition.
7. Work in the declared mode: **LAB** optimizes learning/product quality, **INTEGRATE** extracts reusable ownership, **RELEASE** adds publication/acceptance evidence.
8. Checks are evidence, not progress. Maximize durable useful change per agent turn. Do not restate a frozen plan, create check-on-check loops, or manufacture gates to look busy.
9. Prefer implementation + critique + repair in the same turn when the task is already understood.
10. If a local improvement could help other surfaces, record it under `shared_discoveries` in the RETURN rather than silently refactoring unrelated products.
11. At a meaningful boundary, update/emit the compact `coordination/RETURN_CONTRACT.json` shape. Git history is the detailed history; the RETURN is the handoff.

If a previous chat forgot to leave a RETURN, **Git is the recovery source**: diff from the last known head, extract only the changes that affect this workstream, update the one `LAST_RETURN.json`, then proceed. Never punish a missing handoff with a full repository re-read.

Special triggers:
- `PROMETEO`: route the current request from the public entrypoint.
- `PROMETEO PATENT`: execute the Patent protocol; repository authority still wins over transported context.
- `.`: continue the current routed pack from its last return. Do not restart broad planning unless the pack/source is materially invalidated.

Authority remains in the existing Current/Lineage/Catalog/Reincarnation system. The control plane only answers: **what is the highest-value work for this chat now, and what changed elsewhere that it must know?**
