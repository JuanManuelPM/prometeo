# Guide Current Mission Writeback Contract v1

Status: **BINDING while CURRENT_MISSION_V1.status = ACTIVE_BINDING**

## Purpose

A fresh Guide must not merely recover context and talk about it. It must consume current evidence, act when safe, and write material deltas back to durable state so the next Guide does not depend on transcript memory.

## Read order for the active mission

After stable identity/EPOCH/Continuity Head:
1. `coordination/guide/CURRENT_MISSION_V1.json`
2. `coordination/guide/GROWTH_CAMPAIGN_V1.json`
3. current `gh-pages:live/runtime.json`
4. current `gh-pages:live/claim-frontier.json`
5. current `gh-pages:live/worker-scoreboard.json`
6. only implicated project `STATE.json` / exact receipts needed to resolve a measured contradiction or execute work.

This mission-specific read order overrides stale historical `next_dot` text while Current Mission is ACTIVE_BINDING.

## Action depth

Bare `/g` is an execution cycle, not a status query.

There is no arbitrary one-action cap. Continue same-turn safe actions while:
- each next action is grounded by current evidence;
- authority remains adequate;
- work is materially useful rather than coordination filler;
- context quality is adequate.

Stop only on a real human/authority/privacy/irreversibility/Human-Acceptance boundary, exhausted useful work, or context quality that no longer supports safe continuation.

This does not imply background execution after the response.

## Mandatory writeback

Before the human-facing reply, persist every material change to the narrowest canonical object:

- mission/mode/growth strategy -> `coordination/guide/CURRENT_MISSION_V1.json`
- growth/pool/champion/gate state -> `coordination/guide/GROWTH_CAMPAIGN_V1.json`
- project-specific focus/frontier/blocker -> `coordination/project-guides/<project_id>/STATE.json`
- reusable method regression -> Efficiency Ratchet + guard when cheap
- fresh Guide-cycle audit -> append one session receipt under `coordination/guide/sessions/<session_id>.json`

A session receipt should include:
`schema, session_id, created_at, mission_id, evidence_loaded, changes_made, project_deltas, pool_observation, scoreboard_observation, remaining_boundaries, next_action`.

Writeback is not required for a truly read-only question with no material state delta, but a bare `/g` must execute/persist at least one useful cycle unless a real boundary makes that impossible.

## Anti-loop

Do not repeatedly reread global beacon/PIN/return directories after the compact runtime/frontier/scoreboard already answers the question. Widen only for one cited inconsistency.

Do not create a new coordination project merely to record ordinary state. Prefer updating the existing mission/campaign/project brain.

## Reply contract

After writeback, answer compactly:
- what changed;
- what is producing now;
- what remains a real boundary;
- exact human action only if one is genuinely needed.

Never finish with “what should we do next?” when the durable mission already defines it.
