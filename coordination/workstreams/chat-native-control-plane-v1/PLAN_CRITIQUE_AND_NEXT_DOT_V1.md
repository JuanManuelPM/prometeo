# Plan Critique + Next Dot v1

Status: BINDING EXECUTION CORRECTION
Owner: `chat-object-prometeo-chat-control-main`
Purpose: prevent the next parent cycle from repeating a shallow version of the recent 10-line plan, and make the next `.` produce a verified, ready-to-launch parallel wave instead of another prose plan.

## Critique of the recent 10-line plan

1. **"Open 8 workers now" was too arbitrary.** Worker count must be derived from unclaimed compatible READY work, dependency width, current active workers, collision risk, expected duration and critic requirements. Eight can be a cap/target, not the source of truth.
2. **"1 critic every 8-10" is too mechanical.** Use event-driven critic triggers plus a 10-durable-RETURN backstop. Critic cadence follows evidence and risk, not chat count.
3. **"Parent integrates while workers run" is only true when the parent gets a turn or an external runtime wakes it.** Until an event loop exists, do not describe this as continuous background metabolism.
4. **Planner->Queue recursion is the main multiplicative bottleneck, but it cannot be treated as prose-only architecture.** The next wave must include executable/two-generation canaries and durable generation receipts.
5. **POST_RETURN is still bounded and incomplete.** Workers need checkpoint/acceptance logic so they work deeply enough, but must stop/split when fresh independence, authority separation, collision isolation or context freshness requires it.
6. **STALE/retry/supersede is not yet generic runtime.** The BIG09/BIG13 recovery lane was a one-off parent authorization; the next implementation path must generalize lease/heartbeat/stale/recovery semantics.
7. **Context Fabric is currently architecture, not proof of use.** A worker/planner must emit a context receipt showing selected L0/L1/L2 sources, freshness and omissions before the capability can be called operational.
8. **Progress metrics can be gamed if they count tasks/chats.** Track integrated durable results, stage gates, blockers cleared, automatically generated next-wave work and human interventions. Busy workers are not progress.
9. **Incident learning is incomplete unless corrections become executable guards/tests.** Repeated human corrections must generate negative phenotypes/vaccines/falsifiers or durable meta-method changes.
10. **"Human only does . and /wc" is still a target, not a completed fact.** True unattended progress needs an external event loop; production `/w` needs collision, recovery, validation and context canaries to pass first.

## New execution rule

The next bound-parent `.` must not merely describe what should happen. It must execute the following sequence to the maximum safe extent in one turn, persisting every material result:

1. Load Master Context, User Intent Gap Audit, Strategic Non-Regression/Self-Critique, Verification + Critic Control, Context Fabric, Continuity Head, FOCUS and exact current authority/evidence.
2. Refresh **all active queues** plus claims/runs/returns. Derive actual state; do not trust stale counters.
3. Consume the now-durable recovery returns for BIG09 and BIG13. Run the final 18-domain contradiction/coverage/authority audit. Produce/update final convergence artifacts and explicitly record what remains candidate vs promoted.
4. Refresh and consume all other returned canary/meta/verification work that is valid and not yet integrated. Do not make the human transport results.
5. Audit the first self-assigning worker wave: claim uniqueness, STARTED-before-work, RETURN/DONE lineage, collisions, scope violations, post-return behavior, missing receipts, depth and actual useful output. Persist PASS/PARTIAL/FAIL by mechanism.
6. Compute a machine-readable throughput snapshot for the current generation: active, returned, integrated, failed/stale/boundary, stage gates advanced, blockers cleared, manually vs automatically generated opportunities, human interventions, critic trigger status.
7. Run the strategic self-critique and critic-trigger policy. If triggered and no valid fresh critic is already active/returned, ensure a critic opportunity is READY at high priority.
8. Identify the single highest multiplicative bottleneck after evidence refresh. Prefer implementation/falsification that improves future generations over additional broad design prose.
9. Compile the next dependency-aware READY frontier from unresolved stage gates, worker proposals, incidents, critic findings and existing prepared plans. Do not hand-design numbered prompts for the human.
10. Calculate `recommended_worker_slots` from the actual parallel frontier. If >=8 independent compatible items exist, recommend 8; otherwise recommend the exact smaller number. Keep at least one fresh-critic slot when the trigger policy requires it.
11. Update Continuity Head, FOCUS, Chat Object/frontier and any generation/verification receipts before replying.
12. Human-visible reply must be short: current gate/status + exact count + the one reusable `/wc` command, or no action if workers are already sufficient.

## Definition of "ready for the 8-worker wave"

The parent may tell the human to open 8 `/wc` workers only when all are true:
- at least 8 unclaimed, compatible, dependency-unblocked opportunities exist after current claims are refreshed;
- opportunities are not redundant variants of the same unresolved decision unless intentional independent criticism is required;
- each has explicit mission, acceptance criteria, read/write scope and return contract;
- the claim fabric is still exclusive create-if-absent;
- shared-authority mutations are not accidentally exposed to generic workers;
- a verification/critic path exists for the resulting wave;
- parent has persisted the current generation/frontier and will be able to consume returns from durable state.

If fewer than 8 are actually useful, do not invent filler. Tell the human the smaller number.

## Worker depth rule

A worker should not stop merely because it produced one artifact. It should continue through sequential checkpoints when context, authority and failure domain remain the same. It must stop/split when:
- a fresh independent critic is required;
- another worker can safely parallelize an independent branch;
- authority/write scope changes;
- context is stale or too broad;
- continuing would make one chat a universal worker;
- acceptance criteria are complete and no safe high-value continuation remains.

Every worker return should make explicit which acceptance criteria/checkpoints were actually completed and what prevented further safe progress.

## Verification law

No future parent may claim a mechanism is working from the existence of a spec alone. Runtime/canary evidence and receipts must exist. If evidence is missing, mark `DESIGNED_NOT_USED`, `PARTIAL`, or `UNPROVEN` and create the smallest falsifying/build opportunity needed to resolve it.
