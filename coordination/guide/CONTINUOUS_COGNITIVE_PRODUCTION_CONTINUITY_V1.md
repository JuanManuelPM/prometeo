# Prometeo Continuous Cognitive Production — durable continuity v1

Status: **ACTIVE / binding context for the current mission**

This document exists so deletion, truncation, replacement, or loss of the current chat does not reset the strategy.

## Human objective

The human wants Prometeo to feel like multiplication of useful cognition across many disposable fresh chats. The desired behavior is not “launch a batch, wait, inspect, ask what next, repeat.” The desired behavior is a continuously supplied network where identical `/wc` launches discover useful work, execute, integrate, expose successors/assist shards, learn from measured worker performance, and keep advancing **all grounded product projects** with minimal human routing.

“Exponential” is an aspiration about compounding useful output. Do not fake a mathematical exponential claim. Evidence must show durable productive units, breadth, successor reproduction and visible/user-relevant changes while coordination overhead remains bounded.

## The strategic correction sequence

1. **Finite MESH waves** established claim-first routing, project Guide brains and durable ownership, but forced stop/start evaluation.
2. The human correctly objected that every wave still ended in “now what?”.
3. **GRW001** was created so stages/gates/next transitions were written before execution rather than improvised afterward.
4. MESH-03 exposed premature lifecycle closure and low authority/start rates. CLOSE semantics were repaired.
5. MESH-03-R1 exposed another deeper defect: useful chats could retire after a small quota while a large frontier remained.
6. **v3.24 residency** changed unit 3 from stop to checkpoint, target to 6, cap to 8, and added at most two non-overlapping assist children for safely decomposable long work.
7. The human then identified the remaining bottleneck: even better finite waves were still serializing learning and production. They proposed treating workers like students taking reproducible exams and comparing how much they actually produce.
8. **v3.25 rolling pool** therefore replaced stop/start cohort control. `POOL PROD-01` has no EXPECTED count and no cohort completion barrier.
9. **Worker Productivity Exam** now scores up to six evidence-backed productive slots plus visible change, reproduction, breadth and low waste. Word count is diagnostic only. Champion propagation requires at least three independent workers reproducing score >=8/10.
10. A runtime bug then revealed that the first pool worker emitted a CLOSE but continued making durable claims/returns. Runtime was corrected: for `POOL-*`, a CLOSE is terminal only when the worker's terminal exam card exists. Without it, the worker remains logically active and the premature CLOSE is an anomaly.

## What future /g must NOT do

Do not reset to old MESH-03/04/05 wave choreography as the default.
Do not ask the human to wait for all workers merely so Guide can evaluate.
Do not ask the human to paste worker results or remember which workers ran.
Do not optimize worker verbosity.
Do not copy a single lucky worker as “best”; require reproducibility.
Do not let control-plane work consume the portfolio merely because it is easy to measure.
Do not reopen exhausted SOURCE_DEBT merely to keep workers busy.
Do not turn `/g` into a passive dashboard reader.
Do not stop after one useful Guide action merely because one action completed.
Do not claim background self-wake: chat shells still require an actual launch mechanism.

## What future /g MUST do

On a fresh/bare `/g` while this mission remains active:

1. Load `coordination/guide/CURRENT_MISSION_V1.json` before interpreting stale historical next-step text.
2. Load current GRW001, `gh-pages:live/runtime.json`, `live/claim-frontier.json` and `live/worker-scoreboard.json`.
3. Read project `STATE.json` only for projects materially implicated by current evidence.
4. Compare current durable evidence with `last_guide_writeback`.
5. Consume terminal exams/returns and determine what the best and worst worker patterns actually did.
6. If a reproducible champion exists, propagate the **protocol pattern** through worker/bootstrap/allocator/guide laws, then ratchet/test it. Never propagate personality/identity.
7. If worker throughput is low, find the single dominant measured systemic bottleneck and repair that mechanism while unrelated product work continues.
8. Keep pool production rolling. Evaluation is a rolling observation window, not a cohort barrier.
9. Use product/assist frontier vs active pool capacity to decide whether more identical pool launches are useful.
10. Continue safe useful Guide/Steward actions in the same turn until there is a real authority/safety/privacy/irreversibility/human-acceptance boundary, no grounded useful work, or context quality makes further mutation unsafe.
11. Persist material changes before replying. Use Current Mission for mission-level deltas, GRW001 for growth-control deltas, project STATE for project deltas, and a Guide session receipt for what this fresh Guide actually consumed/changed.
12. Human-facing reply should be compact: what materially changed, current production state, any real human action. No “what do you want to do next?” when durable state already answers it.

## Rolling production model

Canonical launch:

`PROMETEO /wc — autorizo beacon, eventos de telemetría, PIN/claim y commits reversibles necesarios en JuanManuelPM/prometeo para ejecutar trabajo seguro del canary, sin pedirme confirmación adicional. POOL PROD-01 → https://juanmanuelpm.github.io/prometeo/wc/`

Each pool worker:
- uses claim-first compact frontier allocation;
- keeps one worker_id throughout;
- treats 3 productive units as checkpoint;
- targets 6 and may continue to 8 while compatible product/assist work remains;
- can expose at most two bounded assist children for a long safely decomposable owned job;
- writes one evidence-backed terminal exam card before true terminal close;
- does not gain points for prose length;
- re-enters allocation after useful returns instead of waiting for Guide.

The pool remains open conceptually across launches. There is no fixed EXPECTED population and no “missing worker” condition.

## Worker exam / champion learning

Exam spec: `coordination/workers/WORKER_PRODUCTIVITY_EXAM_V1.json`
Public scoreboard: `gh-pages:live/worker-scoreboard.json`

A worker can score up to 10:
- up to 6 evidence-backed productive slots;
- +1 visible product change;
- +1 grounded reproduction/successor;
- +1 breadth across at least two product projects;
- +1 low waste.

No evidence ref => no productive slot.
BOUNDARY/NO_ACTION/telemetry/claim-only => no productive slot.
Word count never increases the score.

A champion pattern becomes eligible only after >=3 independent workers reproduce >=8/10 under the same protocol version. The intended learning loop is:

`pool workers -> exam cards -> scoreboard -> causal comparison -> reproducible champion -> protocol improvement -> more pool workers`

This loop must run while product work continues.

## Current snapshot at continuity freeze

Snapshot time: 2026-09-18T02:07:57.921Z. **Reload before decisions.**

At that snapshot:
- POOL-PROD-01 had one observed worker;
- runtime considered it ACTIVE after correcting a premature CLOSE;
- it had 3 counted productive units and no terminal exam;
- claim frontier exposed 24 total candidates, 17 product candidates;
- product projects represented: Facultad, STT, Tele, Calendar/Habits, Alumnos, José, TTS;
- scoreboard had zero terminal exams yet.

This is evidence of the state at freeze time, not a future truth claim.

## Project-level continuity

Per-project compact brains live at:
`coordination/project-guides/<project_id>/STATE.json`

Important known boundaries at freeze:
- José is SOURCE_DEBT behind a NEW_EVIDENCE_GATE; do not spin planners/recovery without genuinely new exact source evidence.
- Scroll v17 has strong machine verification and is SOURCE_DEBT only for genuinely new drift/requirements or Human visual/taste acceptance; do not manufacture more machine verification.
- Several projects (Alumnos, STT/TTS, Calendar, Tele, parts of Facultad) have real browser/network/physical/deployment capability boundaries. Capability-bound jobs are legitimate; generic workers should not hallucinate those capabilities.
- Product-first remains binding; Prometeo Live/autonomous-growth are infrastructure and should stay below the soft capacity ceiling absent a critical blocker.

Always reload newer STATE before acting.

## Human relationship

The human may now continue launching `POOL PROD-01` workers and intentionally forget this chat. A future Guide must assume that many workers may have run since this freeze and inspect durable evidence rather than asking the human for a recap.

The human's expected control loop is:

`launch identical /wc when desired -> later open /g -> Guide reconstructs + acts + writes back -> human sees compact real progress`

The human should not become the transport, scheduler, merger or memory system.

## Durable sources

Machine-readable current mission:
`coordination/guide/CURRENT_MISSION_V1.json`

Growth campaign/page:
`coordination/guide/GROWTH_CAMPAIGN_V1.json`
`GRW001 -> https://juanmanuelpm.github.io/prometeo/growth/`

Worker protocol:
`wc`

Project mesh:
`coordination/guide/PROJECT_GUIDE_MESH_V1.json`

Guide roles/metabolism:
`coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md`
`coordination/guide/METABOLISM_POLICY_V1.json`

Exam:
`coordination/workers/WORKER_PRODUCTIVITY_EXAM_V1.json`

Efficiency non-regression:
`coordination/efficiency/RATCHET_BASELINE_V1.json`

Live views:
`gh-pages:live/runtime.json`
`gh-pages:live/claim-frontier.json`
`gh-pages:live/worker-scoreboard.json`

If this document conflicts with a newer exact durable fact, the newer exact fact wins; if it conflicts with an old historical next-step pointer, this active Current Mission wins while status remains ACTIVE_BINDING.
