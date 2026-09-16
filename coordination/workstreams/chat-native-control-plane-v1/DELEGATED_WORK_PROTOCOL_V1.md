# Prometeo Delegated Work Protocol v1

Status: ACTIVE CANDIDATE
Owner: `chat-object-prometeo-chat-control-main`

## Principle

A worker chat is not the task. **The durable Work Item is the task.**

The Work Item exists before a ChatGPT worker conversation is opened. The human launches the worker using only a short code/address. The worker reads its prepared job, records execution state, produces a durable return, reaches a terminal state and may disappear.

## Identities

- `chat_object_id`: durable parent/orchestrator identity.
- `batch_id`: optional group of related parallel jobs.
- `work_item_id`: stable delegated task identity.
- `launch_code`: short human transport alias; not authority.
- `worker_instance_id`: one disposable worker execution/run.
- `return_id`: durable result identity.

## Durable layout

Recommended layout for this owner:

`coordination/workstreams/chat-native-control-plane-v1/work-items/<work_item_id>/`

Files:
- `JOB.json` — immutable-ish prepared task contract; parent updates only by explicit revision.
- `runs/<worker_instance_id>.json` — independent run state written by that worker.
- `returns/<worker_instance_id>.json` — worker return/evidence.
- optional `INTEGRATION.json` — parent's decision after consuming one or more returns.

Parent summaries are derived into `WORK_BOARD.json`; workers do not all mutate it while executing.

## Work Item lifecycle

Parent side:

`IDEA → PREPARING → PREPARED → DISPATCHABLE`

Worker run side:

`CLAIMED → STARTED → WORKING → RETURNED → DONE`

Exceptional terminal states:

`BOUNDARY | FAILED | CANCELLED | SUPERSEDED`

Parent consumption side:

`UNCONSUMED → REVIEWED → INTEGRATED | REJECTED | SUPERSEDED | FOLLOWUP_REQUIRED`

## Launch

Preferred human action:

`Prometeo <launch_code>`

Example:

`Prometeo P-CC-01`

The bootstrap resolves `<launch_code>` through the durable Work Board/launch index, loads `JOB.json`, then follows this protocol.

The human never pastes the job body or parent context.

## Worker boot algorithm

1. Load stable Prometeo entry/runtime/constitution.
2. Resolve launch code to exact `work_item_id` + `JOB.json`.
3. Validate job status is dispatchable and not obsolete/superseded.
4. Revalidate EPOCH/current owner state required by the job.
5. Create unique `worker_instance_id` and an independent run status object.
6. Persist `STARTED` before material execution.
7. Load the smallest sufficient job context and declared conditional refs.
8. Execute the job through implementation/analysis/critique/repair within scope.
9. Persist a RETURN with evidence and explicit unresolved boundaries.
10. Persist terminal run state `DONE` after the return is durable.
11. Do not require another human message merely to finish a solvable well-formed job.

## Run state requirements

Every run record includes:
- worker_instance_id;
- chat_object_id;
- batch_id if any;
- work_item_id;
- launch_code;
- state;
- started_at;
- updated_at;
- frontier;
- write_scope;
- epoch_seen;
- return_ref when available;
- terminal_reason when terminal.

Do not use periodic heartbeat noise. Update on material lifecycle/frontier changes.

## Return contract

A return includes:
- work_item_id;
- worker_instance_id;
- status;
- summary of useful delta;
- observations/facts;
- candidate recommendations/decisions separately;
- files/artifacts changed or created;
- tests/evidence;
- conflicts/collisions encountered;
- unresolved questions/boundaries;
- implications for parent/shared owners;
- suggested next parent action;
- relevant commit/refs.

Candidate opinion is not promoted to fact or Human Accepted state merely because the worker returned it.

## Parent behavior

The parent Chat Object derives state from Work Items + run objects + returns.

Before/while doing its own work it may cheaply determine:
- prepared jobs count;
- started/working workers;
- returned/done workers;
- failures/boundaries;
- unconsumed returns;
- batch completion percentage;
- whether integration is now the highest-value next action.

The parent does not need to stop working while workers are active.

When the final required worker in a batch returns, the parent should notice at its next state refresh and may surface that integration/review is ready.

## Parallel safety

- Prefer disjoint write scopes for simultaneous workers.
- Independent run/status files avoid a shared mutable-status bottleneck.
- Agent Network convergence surfaces real overlapping writes.
- Multiple workers may intentionally analyze the same problem read-only as challengers/critics.
- Overlapping candidate writers require explicit reconciliation by the parent/steward before canonical promotion.

## Integration

After consuming returns, parent writes an integration decision that identifies:
- accepted facts;
- accepted/rejected candidate changes;
- conflicts and how resolved;
- artifacts integrated;
- follow-up jobs;
- resulting Chat Object design/focus updates.

Then parent updates its durable FOCUS / Design Board / rules / Work Board as appropriate.

## Use the system to build itself

This workstream should immediately use this protocol to parallelize its own implementation. The first batch is `B-CHATOBJ-01`, listed in `WORK_BOARD.json`.
