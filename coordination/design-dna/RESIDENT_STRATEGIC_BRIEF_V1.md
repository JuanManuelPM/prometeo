# PROMETEO · RESIDENT STRATEGIC BRIEF V1

Status: REQUIRED EVOLUTION PATH

## Core idea

Prometeo should continuously maintain an answer to:

> "If the user came back right now and asked how we should continue, what would we say and what would we ask them to do?"

This is not ordinary live commentary.

COMMENTARY describes what is happening.
STRATEGIC BRIEF decides what the current state means for the next move.

The goal is to reduce dependence on one persistent Guide/chat history. A user returning later should be able to press Play and hear the current best synthesis, then optionally copy the exact next action/prompt.

No old-audio backlog is played. The latest completed strategic synthesis supersedes older versions for consumption, while historical versions remain durable for audit and learning.

## Standing user questions

Every strategic cycle should answer the recurring questions the user repeatedly brings to Prometeo:

1. How do we continue from here?
2. What is the real next step, not another planning round?
3. What human or technical friction is still unnecessary?
4. What can be delegated to universal workers now?
5. What are we waiting for that workers could be doing in parallel?
6. What assumption or perspective could materially change the plan?
7. What new evidence since the previous brief changes the recommendation?
8. Are we re-designing something already designed or measured?
9. What should become automatic so the user/Guide no longer has to carry it?
10. If the user returned now, what is the smallest useful human gesture, if any?
11. What should NOT be done yet?
12. What would falsify the current recommendation?

These questions are durable protocol semantics, not payload instructions.

## Five-perspective cycle

Every 15 minutes, create one strategic epoch with one canonical typed snapshot.

Five candidate jobs receive the same state cutoff but different trusted perspective keys:

P1 · COORDINATION / NEXT MOVE
- identify the concrete next move
- distinguish blocker from optional improvement
- minimize human gestures
- protect already-armed useful work

P2 · FRICTION / AUTONOMY
- find manual relays, wakeups, waits, duplicated context and avoidable human work
- propose which friction should move into worker/runtime protocol
- ask whether Prometeo is needlessly waiting for a Guide

P3 · EXPERIMENT / EVIDENCE
- inspect current experiment/runtime evidence
- separate observation from causality
- identify what the current run is already teaching
- prevent premature conclusions and avoid wasting the running experiment

P4 · ADVERSARY / PERSPECTIVE SHIFT
- challenge the current plan
- look for a different framing that could make the system simpler/faster/more autonomous
- identify forgotten constraints, stale assumptions and false dependencies
- ask "what if the current architecture is solving the wrong bottleneck?"

P5 · SYSTEM EVOLUTION / DELEGATION
- identify real jobs workers could execute now
- identify Guide work that can be encoded as typed worker protocols
- propose the next capability that makes Prometeo less dependent on chat identity
- preserve trust/promotion boundaries

These are not five Guide identities.
They are five typed jobs consumable by fungible universal worker chats.

## Synthesis

When the five candidates for an epoch are complete, or after a bounded timeout with at least three candidates, enqueue:

STRATEGIC_BRIEF_SYNTHESIS

The synthesizer receives:
- the same canonical snapshot
- five candidate outputs as untrusted evidence/data
- previous current strategic brief
- change set since previous epoch

It returns a single current object:

{
  "brief_id": "...",
  "epoch_id": "...",
  "generated_at": "...",
  "state_cutoff_at": "...",
  "headline": "...",
  "spoken_brief": "...",
  "what_changed": ["..."],
  "current_read": ["..."],
  "frictions": ["..."],
  "next_action": {
    "kind": "NO_HUMAN_ACTION | HUMAN_GESTURE | LAUNCH_WORKERS | COPY_PROMPT | INTEGRATE_RESULT | FIX_BLOCKER",
    "label": "...",
    "copy_text": "... or null"
  },
  "worker_jobs_to_create": ["..."],
  "do_not_do_yet": ["..."],
  "open_questions": ["..."],
  "falsification_conditions": ["..."],
  "confidence": "LOW | MEDIUM | HIGH",
  "evidence_refs": ["typed durable refs only"]
}

## Latest-only consumption

For UI/audio consumption:
- expose only the latest completed synthesis as CURRENT;
- when a newer synthesis completes, it atomically becomes CURRENT;
- do not queue every historical brief for playback;
- opening Prometeo later returns only CURRENT;
- if CURRENT was already heard and no newer brief exists, do not replay automatically unless user requests it;
- while listening, if a newer CURRENT arrives, finish current audio then make the newer one available/play next according to local playback policy.

Historical briefs remain stored for:
- retrospective experiment analysis
- recommendation drift
- measuring how often Prometeo changed its mind
- comparing predicted blockers against actual blockers
- training/evolving future strategy protocols

## Trigger policy

Baseline trigger:
- every 15 minutes.

Extra trigger candidates:
- experiment milestone
- admission/liveness discontinuity
- worker cohort materially changes
- FAIL/runtime anomaly
- Guide/worker result materially closes a blocker
- new user directive
- work becomes ARMED / DONE / stalled
- previous recommended human action becomes obsolete

Debounce:
- never create multiple active strategic epochs for the same state cutoff;
- high-priority event may supersede a not-yet-synthesized older epoch.

## Supersession

Each epoch has:
- state = PENDING | CANDIDATES | SYNTHESIZING | CURRENT | SUPERSEDED | EXPIRED
- state_cutoff_at
- trigger_reasons
- previous_epoch_id

When epoch N+1 becomes CURRENT:
- epoch N becomes SUPERSEDED;
- N's audio is not added to a playback backlog;
- history remains queryable.

If workers are offline:
- only the latest pending epoch survives;
- older unclaimed epochs are marked EXPIRED/SUPERSEDED.
This prevents workers from returning later and narrating stale advice one-by-one.

## Chat-agnostic execution

The five worker chats are transport shells, not named Guides.

One universal trusted prompt may consume:
- STRATEGIC_PERSPECTIVE
- STRATEGIC_BRIEF_SYNTHESIS
- COMMENTARY
- RESEARCH
- CRITIQUE
- SYNTHESIS
- VERIFY_READONLY
- other approved job classes

Eligibility/policy decides what each chat can take.

The user should not remember which chat owns P1/P2/etc.
Backend assigns the perspective.

If one worker dies, another can take that perspective job.

## Relationship to current Guides

Guides remain integration/authority fallback until material mutation is encoded safely.

Strategic workers may:
- diagnose
- propose
- generate copyable next actions
- create candidate follow-up jobs
- prepare Work Trace candidates

They may not:
- silently approve their own material mutations
- convert payload text into authority
- bypass coordinator/promotion policy

Long-term evolution:
human question/directive
→ strategic worker epoch
→ universal worker jobs
→ verification/promotion
→ new state
→ next strategic epoch

This is the path toward replacing persistent Guide/chat dependence.

## State snapshot

The strategic snapshot should aggregate only canonical typed state, including:

Experiment:
- active experiments
- progress, arms, admissions
- recent activity / liveness
- phase timings
- anomalies
- current evidence quality

Universal worker bus:
- cohorts
- queued/active/completed jobs by class
- queue age
- worker availability
- wait/stale/expiry
- candidate jobs produced by workers

Guide/integration:
- current Work Traces
- approvals/integration blockers
- finished results awaiting integration
- stale/duplicate work

Prometeo design state:
- pinned protocol/policy versions
- ARMED batches
- pending promotions
- unresolved declared hypotheses
- durable user directives

Strategic continuity:
- previous brief
- previous next_action
- whether it was executed/superseded
- recommendation drift

## Audio

Use the existing Qwen3 TTS path.

Spoken brief should normally be 90–180 seconds max and optimized for listening, not reading.

It should sound like the current strategic coordinator, not a sports commentator.

Tone:
- direct
- Argentine Spanish / Rioplatense
- concise but analytical
- no ceremony
- say what changed and what to do
- explicitly say "no hagas nada" when no human gesture is useful

The audio layer reads only CURRENT.

## Copyable action

CURRENT may expose:
- one primary button: COPY / LAUNCH / OPEN / NO ACTION
- optional secondary copyable payloads

Examples:
- launch prompt
- exact worker count
- exact "." wake only if still genuinely unavoidable
- exact URL
- exact human approval text
- no-op when Prometeo should continue autonomously

The user should never need to reconstruct instructions from spoken audio.

## Metrics

Measure the strategic system itself:

Per epoch:
- trigger→candidate-start
- candidate generation seconds by perspective
- candidate completion count
- synthesis queue/generation seconds
- state_cutoff→CURRENT latency
- CURRENT→heard latency
- audio TTS latency
- human action latency
- superseded-before-heard
- recommendation changed vs previous

Quality/outcome:
- next_action executed?
- did it unblock the predicted blocker?
- did later evidence falsify the recommendation?
- unnecessary human gesture count
- jobs launched from strategic recommendation
- worker work created before next user return
- duplicate/redundant planning detected
- Guide work avoided
- time from new evidence to changed recommendation

This lets Prometeo experimentally improve its own "what next?" reasoning.

## Initial operating topology

Resident strategic pool:
- 5 fresh universal worker chat shells.
- No persistent P1-P5 identity.
- Every 15-minute epoch creates exactly 5 perspective jobs.
- Any eligible worker can consume any perspective.
- One of the same workers later consumes synthesis.
- Workers remain resident with bounded WAIT/NEXT loops.
- If fewer than five workers remain alive, the system continues; jobs are fungible.

The number 5 is an initial operating point, not a permanent architectural constant.

## Important distinction

COMMENTARY:
"What is happening?"

STRATEGIC BRIEF:
"What does this mean, what is missing, and what should we do next?"

Both use the same Universal Worker Bus and TTS infrastructure, but they are different job protocols.
