# Kitchen Lab v1 — Two-agent coordination laboratory

Status: DESIGN_READY / VISUAL_SHELL_PUBLISHED
Scope: exactly two agents for the first experiment.

## Purpose

Kitchen Lab isolates coordination from real Prometeo product work. The first question is not whether agents can fix code; it is whether two identical agents can enter one shared world, observe the same durable truth, claim non-overlapping work, expose their internal execution state visibly, unlock dependencies, and converge without the human routing tasks.

The visual surface is `pages/kitchen-lab/index.html`. Its current sequence is explicitly a simulation and must never be interpreted as evidence of real multi-agent coordination.

## Human-visible model

The screen should make the system legible from across the room:

- Agent A and Agent B each have one persistent identity marker.
- The top line is the shared kitchen state, not either agent's private belief.
- Large chat bubbles expose only meaningful coordination messages.
- Temporary states such as RECEIVED, THINKING, WRITING and WORKING are visible but are not durable completion evidence.
- CLAIM, DONE and UNLOCK are machine events and should be rendered distinctly from natural-language messages.
- The page must say whether it is SIMULATION or LIVE.

## Durable event model

Canonical lifecycle:

`ENTER -> SEE -> CLAIM -> WORKING -> DONE -> UNLOCK`

Optional events:

`WAIT`, `HEARTBEAT`, `CLAIM_EXPIRED`, `RELEASE`, `FAIL`, `RECOVER`.

Every event needs:
- `event_id`
- `run_id`
- `agent_id`
- `type`
- `task_id_or_null`
- `observed_world_version`
- `created_at`
- `message`
- `evidence_or_null`

Natural-language bubbles are projections of these events. They are not the source of truth.

## World model v1

Initial world:
- vegetables = DIRTY
- dishes = DIRTY
- knife = CLEAN
- board = CLEAN
- pot = CLEAN
- meal = NOT_STARTED
- table = EMPTY

Initial task graph:
- wash_vegetables: READY
- wash_dishes: READY
- cut_vegetables: BLOCKED by wash_vegetables
- cook_vegetables: BLOCKED by cut_vegetables
- serve_meal: BLOCKED by cook_vegetables + wash_dishes
- wash_knife: CREATED after cut_vegetables DONE
- wash_board: CREATED after cut_vegetables DONE
- wash_pot: CREATED after cook_vegetables DONE

Terminal condition:
`meal=SERVED AND dishes=CLEAN AND knife=CLEAN AND board=CLEAN AND pot=CLEAN`.

## Claim law

A task may have at most one live owner.

Claim must be atomic against a specific task generation. Two agents attempting the same task must produce exactly one winner. The loser re-reads world state immediately and seeks another READY task. A natural-language "I'm doing X" without a successful durable claim does not grant ownership.

Claims carry leases. If an agent disappears after CLAIM, the lease can expire and a recovery event can create a new generation. A late DONE from an expired owner must not overwrite the newer generation.

## Agent loop

Both agents receive the same bootstrap. They do not receive names such as "dish washer" or "vegetable agent".

At each execution opportunity an agent:
1. enters / refreshes identity for the run;
2. reads latest world + task graph + claims;
3. emits SEE;
4. selects one useful READY task using deterministic compatibility rules;
5. attempts atomic CLAIM;
6. if it loses, re-reads and selects again;
7. emits WORKING and a human-readable message;
8. performs the simulated unit;
9. commits DONE with evidence;
10. derives/unlocks dependent tasks;
11. re-reads and continues if useful work is immediately available.

No agent may infer another agent's intent from prose when durable events disagree.

## Real-time transport

The browser surface needs a low-latency event feed, while durable audit needs append-only evidence.

Recommended split:
- LIVE BUS: lightweight event/state service for sub-second polling/subscription.
- DURABLE LEDGER: append-only events/receipts in Prometeo/Git.
- MATERIALIZED VIEW: current world/tasks/agents projection consumed by the visual page.

Do not make GitHub Pages directory listing or chat prose the coordination bus.

## Important platform boundary

Two normal ChatGPT conversations do not receive push wakeups merely because another conversation wrote an event. A conversation can react while its turn is actively executing/re-reading; after it has replied, a separate wake mechanism is required.

Therefore Kitchen Lab must distinguish:
- coordination correctness: claims, dependencies, recovery, no duplication;
- wake correctness: how an idle agent is reactivated when new work appears.

The visual lab should make WAIT vs ASLEEP visibly different. Solving claims without solving wake is not autonomous teamwork.

## First experimental acceptance gate

Start with exactly two agents.

PASS only when repeated runs demonstrate:
- same bootstrap prompt for both agents;
- zero human task routing;
- zero duplicate successful claims;
- dependent work never starts before prerequisites are durable DONE;
- abandoned claims recover safely;
- both agents' visible messages correspond to durable events;
- terminal kitchen condition is reached;
- replaying the event log reconstructs the final world exactly.

Only after this passes should the experiment scale beyond two agents or substitute real Prometeo work for kitchen tasks.
