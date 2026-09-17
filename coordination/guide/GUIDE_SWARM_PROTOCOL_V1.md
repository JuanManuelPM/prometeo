# Prometeo Distributed Guide / Rescate Protocol v1

Status: CANARY / durable operating contract

## Core idea

`Guide` is a durable role, not one privileged chat. Any fresh `/wc` with enough context may temporarily embody a bounded guide role when durable evidence says planning/integration/rescate is the highest-value work.

The human should be able to launch many identical `/wc` chats. Some become executors; some become planners/integrators/critics/rescate workers. The system must not require all results to return to one guide chat before useful successor work can exist.

This protocol never grants Current / Human Accepted / Served promotion authority merely because a worker is acting as guide.

## Guide roles

A `/wc` may select one of these roles exactly like any other claimable job:

- `GUIDE_INTEGRATOR`: consume recent returns, reconcile duplicates/conflicts, extract consequences, and materialize safe successors.
- `GUIDE_PLANNER`: replenish a thinning frontier with bounded, deduplicated, evidence-backed jobs.
- `GUIDE_RESCATE`: detect a system that is technically moving but producing too little; connect missing cables, simplify rules, remove a bottleneck, repair allocation, or change the mechanism so useful production increases materially.
- `GUIDE_CRITIC`: independently attack a weak route, false completion signal, authority mistake, regression or local optimum before more workers amplify it.
- `GUIDE_STEWARD`: integrate compatible local results into the appropriate durable lane when the needed authority is already delegated and evidence is sufficient.

These are roles, not personalities. A worker may rotate from execution into guide work or from guide work back into execution in the same chat.

## Automatic guide trigger

A worker SHOULD consider guide work before declaring idle, and MAY prioritize it over ordinary low-value execution, when one or more are true:

1. `FRONTIER_THIN`: fewer than 3 high-value claimable jobs remain while launch capacity is visibly higher.
2. `RETURNS_UNCONSUMED`: 3 or more recent material returns have no durable disposition/successor and are waiting for synthesis.
3. `REPLACEABLE_PRESSURE`: 3 or more workers/jobs are stale/recovery-eligible or repeated recovery is consuming capacity.
4. `COLLISION_PRESSURE`: multiple workers repeatedly collide on the same small frontier instead of spreading into useful work.
5. `PARTIAL_LOOP`: multiple PARTIAL/BOUNDARY returns repeat the same blocker without a mechanism change.
6. `NO_SUCCESSOR`: a material result closes work but creates no next useful work despite unresolved project goals.
7. `HUMAN_FRICTION`: the human has to remind, route, copy results, interpret stale dashboards, or manually reconnect work that durable state should handle.
8. `LOW_YIELD`: many workers are launched but useful durable outcomes/successors are low relative to launches.
9. `MISSING_CABLE`: two existing capabilities/results should connect but no durable route consumes one into the other.
10. `GUIDE_DEPENDENCY`: current workers are effectively waiting for this chat/guide to decide what happens next.

## RESCATE meaning

`RESCATE` means noticing that the current local rules are producing unnecessary friction or low yield and changing the mechanism, not merely documenting the problem.

A valid GUIDE_RESCATE outcome should usually do at least one of:
- remove or shorten a real bottleneck;
- connect an existing result to its consumer;
- make hidden work claimable;
- make stale/retry handling faster and safer;
- make one result spawn several useful successors;
- eliminate recurring duplicate work;
- move planning/integration out of a single chat dependency;
- simplify a confusing human control surface;
- create a reusable capability instead of another one-off artifact;
- materially increase useful durable output per human action.

`RESCATE` is not permission for reckless promotion, destructive writes, privacy violations or bypassing an actual human-decision boundary. Reversible candidate/control-plane improvements should default toward action; only real authority/safety boundaries should stop execution.

## Write-first guide law

Guide work MUST leave durable output. A guide-role worker may not return merely with prose such as “the next step should be...”.

At minimum, a useful guide cycle must do one or more of:
- CREATE 1–7 deduplicated derived jobs with explicit acceptance criteria;
- CREATE a durable integration/disposition receipt consuming recent returns;
- patch a control-plane/bootstrap/allocator defect with CAS and evidence;
- create a bounded verification/critic job for an uncertain mechanism;
- create a RESCATE receipt documenting the bottleneck, intervention and expected multiplicative effect;
- close/supersede stale duplicate work with evidence;
- connect a producer artifact/return to its next consumer.

Planning without materialized work is incomplete unless a true human decision is required.

## Durable guide receipts

Guide-role work is append-only under:

`coordination/guide/receipts/<guide_work_id>/<receipt_id>.json`

Recommended schema:

```json
{
  "schema": "prometeo.guide-receipt/v1",
  "guide_work_id": "<stable id>",
  "receipt_id": "<unique>",
  "worker_id": "<same /wc worker id>",
  "role": "GUIDE_INTEGRATOR|GUIDE_PLANNER|GUIDE_RESCATE|GUIDE_CRITIC|GUIDE_STEWARD",
  "created_at": "<ISO-8601>",
  "trigger": "<trigger above>",
  "evidence": [],
  "diagnosis": "<short>",
  "intervention": "<what was actually changed/connected/created>",
  "created_jobs": [],
  "consumed_returns": [],
  "changed_paths": [],
  "tests": [],
  "remaining_boundary": null
}
```

Guide receipts are evidence, not authority promotion.

## Claiming guide work

Guide tasks use the same portfolio pin/claim/collision machinery as other exclusive work whenever they mutate shared durable state. Prefer derived jobs under an existing project unless a dedicated project is warranted.

A generated guide task should use a stable `dedupe_key`, for example:
- `guide:integrate:<return-set-hash>:v1`
- `guide:planner:<frontier-hash>:v1`
- `guide:rescate:<bottleneck-fingerprint>:v1`
- `guide:critic:<route-or-gate>:v1`

Workers losing the pin immediately re-enter allocation.

## Planner replenishment contract

When `GUIDE_PLANNER` sees a thin frontier, it must:
1. reload recent terminal/PARTIAL/BOUNDARY returns, current portfolio and project goals;
2. dedupe against seed + derived + active + terminal work;
3. identify the current bottleneck and at least one alternative route;
4. materialize between 2 and 7 safe bounded jobs when evidence supports them;
5. include implementation, verification and/or integration lanes as needed rather than only more analysis;
6. return and immediately re-enter allocation.

Do not create filler to reach a count. If only one useful job exists, create one.

## Integrator contract

`GUIDE_INTEGRATOR` consumes results incrementally. It must not wait for a whole wave if independent returns can already create useful work.

For each material return:
- classify what it actually proves;
- reconcile duplicate/conflicting evidence;
- record whether it is consumed, partial, superseded, conflicted or waiting on a real boundary;
- materialize grounded successor jobs immediately;
- avoid sending the result back to the human or one privileged guide chat merely for routing.

## Critic contract

`GUIDE_CRITIC` is independent from the generator when possible. It should target false completion, silent authority escalation, accidental local optima, repeated partial loops, poor worker yield, weak metrics and regressions. A critic should create a repair/verification job when the issue is software-solvable.

## Rotation

After completing guide work, the same worker reloads the full frontier and may continue as executor, verifier, integrator or another guide role. There is no one-guide-task stopping rule.

## Human relationship

The human may still open `/g` for strategic conversation, taste, acceptance, irreversible decisions or to discuss Inbox messages. `/g` is not required for routine planning, result integration, backlog replenishment or rescue of software-solvable bottlenecks.

The target is: `human launches generic workers -> network divides execution/planning/integration/rescate -> results create successors -> workers keep rotating`.

## Truth boundary

Do not claim unattended autonomy merely because distributed guide roles exist. Chat launches are still externally initiated unless a separate runtime proves automatic invocation. What this protocol removes is the dependency on one specific guide conversation for routine cognition and routing.
