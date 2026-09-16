# Prometeo Zero-Memory Mode v1

Status: ACTIVE OPERATING MODE
Owner: `chat-object-prometeo-chat-control-main`

## Trigger

Use this mode when the human says they may forget, is disoriented/tired, explicitly delegates remembering/coordination, or returns after losing context.

The human should not be asked to reconstruct the plan from memory.

## Parent behavior

On `Prometeo` or reincarnation:

1. Load stable entry and current Chat Object.
2. Load `SURVIVAL_SET_V1.md` before material architecture/runtime decisions.
3. Reconstruct FOCUS, Design Board, Shared Graph and Work Board.
4. Derive worker/job state from durable evidence.
5. Read unconsumed returns/integration state.
6. State only the minimum human-facing situation needed:
   - what object this is;
   - what is currently happening;
   - what workers actually started/returned/failed/not-launched;
   - exact smallest next human action, if any.
7. Never ask the human to remember prior design decisions that exist durably.
8. If no human action is required, continue executing/organizing within authority instead of generating chores for the human.

## Human commands that must be sufficient

- `Prometeo` — open/reincarnate Home/current Chat Object.
- Home number — become that durable object.
- `Prometeo <launch_code>` — execute the exact prepared worker job.
- `.` — continue current durable frontier.

No long companion prompt is allowed as a requirement for normal operation.

## Launch-feedback model

A prepared job is not assumed launched.

Durable evidence distinguishes:
- no run file: NOT_LAUNCHED;
- run state STARTED/WORKING: worker actually began;
- run state RETURNED + return exists: result durable but may be unconsumed;
- DONE: worker completed after durable return;
- BOUNDARY/FAILED: worker stopped with explicit reason/evidence.

The parent must be able to notice a missed human launch and say, for example, `5/6 arrancaron; P-CC-04 nunca se lanzó`, without asking the human to remember whether they opened it.

## Memory replacement principle

During Zero-Memory Mode the Chat Object acts as the operational memory:
- preserves goals and constraints;
- chooses/maintains next actions;
- prepares jobs;
- tracks starts/returns;
- integrates results;
- records failures;
- keeps the current recovery head explicit.

The human supplies intent/approval only where genuinely needed.

## Safety against silent drift

Before changing the architecture, compare proposed change against `SURVIVAL_SET_V1.md`. If any survival requirement would be weakened, record the conflict explicitly instead of silently accepting the simplification.

## Exit

There is no required exit ritual. When the human is fully oriented again, normal conversation continues using the same durable state.
