# PROMETEO · GUIDE-2 RECOVERY HANDOFF · 2026-09-22

Purpose: recover this coordination state if the current GUIDE-2 chat is lost, truncated, or becomes unusably slow.

## Authority / topology

- GUIDE-2 is COORDINATOR.
- GUIDE-1: TV/UI/visual projection.
- GUIDE-3: C0 forensics, runtime analysis, V3 readiness.
- GUIDE-4: experimental methodology for SCREEN-10.
- GUIDE-5: Observatory/replay/data layer.
- Human should not act as message bus between guides.

Supabase project:
catnohyouxqjjtseaueb

Repo:
JuanManuelPM/prometeo

## Current experiment

Batch:
PROMETEO-RICH-CELL-V2-C0

Architecture:
- universal Rich Cell v2 workers
- global greedy useful-work scheduling
- cross-grid movement allowed
- lifecycle: EMPTY→FRAMING→FRAMED→SOLVING→PRODUCED→REVIEWING→DONE
- cognitive priority: SOLVE > REVIEW > FRAME > CREATE
- current run is evidence/baseline only; do not mutate it

Important observed facts before terminal analysis:
- 20 human launches were attempted
- 17 backend sessions/admitted workers observed
- 3 human attempts did not reach backend at the observed snapshots
- run drained grids mostly sequentially G1→G2→G3→G4
- workers progressively stopped publishing while remaining backend members could still appear ACTIVE
- latest snapshot seen by GUIDE-2 before this handoff: 302/1000 DONE, 803,593 words, 309 handoffs, semantic 289 PASS / 13 REVISE / 0 FAIL, G1=99 DONE, G2=100, G3=93, G4=10

Never reinterpret pre-backend losses as runtime admission failures without evidence.

## Durable V3 design already published

Directory:
coordination/design-dna/experiments/RICH-CELL-V3/

Files:
- PARALLEL_CELL_EXPERIMENTS_V1.md/json
- WORKER_STRATEGY_MATRIX_V1.md/json
- RICH_CELL_V3_PREBUILD_PLAN_V1.md
- SCREENING_MATRIX_V1.json
- DESIGN_RESEARCH_QUESTION_BANK_V1.md
- POST_C0_RUNBOOK_V1.md

Core invariant:
Universal workers; experimental treatment lives in versioned cell protocols and declarative collaboration policies.

## SCREEN-10 current pre-result design

10 arms, fixed frontier:
- 10 grids/arm
- 12 cells/grid
- 120 cells/arm
- 1,200 cells total
- 6 admitted workers target/arm
- 60 exact human launch attempts nominally
- no oversubscription to hide failures
- successful backend arrivals mechanically balanced across arms
- no model chooses its arm

Treatments:
S01 CONTROL_GLOBAL_GREEDY
S02 TWO_PER_GRID_THEN_FREE
S03 STICKY_PAIRS
S04 STICKY_TRIADS
S05 PHASE_SPECIALIZATION
S06 SELF_COMPARISON
S07 PEER_EXEMPLAR
S08 FRAME_OBJECTIVE_FIRST
S09 FRAME_RULE_FRONT
S10 FRAME_RULE_TAIL

Stage 2:
TOP-3-FULL
- 3 arms
- 10 grids x 100 cells = 1000/arm
- fixed frontier
- nominal 20 admitted workers/arm
- completion 1000/1000 DONE
- raw finish time + worker-exposure-normalized metrics

Later:
freeze best worker collaboration policy, then run cell-protocol A/B/C.

## GUIDE missions currently published in Mesh

GUIDE-3:
C0 tail analysis + V3 readiness.
Must reconstruct per-worker trajectories, liveness decay, role repetition effects, scheduler concentration, stop causes, and map V3 implementation gaps. Read-only on C0.

GUIDE-4:
Experimental methodology.
Stress-test causal comparability, matched-cell design, imbalance, synchronized start barrier, promotion criteria, pair/triad parameterization under missing workers, and worker-exposure normalization.

GUIDE-5:
Observatory/replay/data.
Use canonical Rich events as truth. Define replay contract, ~60s seek checkpoints, live replay/catch-up, multi-arm synchronized replay, admission/liveness/throughput/quality trajectories, read-only projections.

GUIDE-1:
TV/UI autonomous in read-only projection scope. No repeated human approval. Rich renderer and worker-animation work may proceed without touching Grid runtime/canonical results.

## Observatory / replay requirements

Source of truth already exists:
public.prometeo_rich_events
(event_id, batch_id, cell_id, grid_no, cell_no, agent_id, worker_code, phase, event_type, payload, created_at)

Supporting canonical timing/state:
- prometeo_rich_claims
- prometeo_rich_cells
- prometeo_rich_members
- prometeo_rich_sessions
- prometeo_rich_semantic_evaluations

Required experience:
- LIVE / REPLAY
- arbitrary scrub
- 1x / 5x / 20x / 60x
- replay from start
- replay last 5m / 15m
- catch-up-to-live
- synchronized arm comparison
- visible timeline marks for joins, stops, milestones, rescues, REVISE, grid completion
- replay while real run continues

Persist raw events at full resolution.
Use derived checkpoints around every 60 seconds only for fast seeking, never as source of truth.

## Guide system evolution: GUIDE JOBS

The user explicitly wants to extrapolate worker architecture to guides.

Long-term target:
Guides should not require human '.' wakeups for routine work.

Separate:
1. durable guide job
2. disposable chat/model shell
3. guide role/authority
4. evidence/result
5. coordinator integration

A GUIDE JOB should contain:
- guide_job_id
- role/capability required
- objective
- trusted protocol/version
- input refs
- control questions / exam
- status
- claimed_by agent/chat
- started_at
- heartbeat/last_seen
- finished_at
- result refs
- verification
- integration status

Lifecycle candidate:
READY → CLAIMED → WORKING → SUBMITTED → REVIEWED → INTEGRATED
with WAIT/STALE/RETRY as needed.

Human wakeups should be treated as transport, not orchestration.

Until cross-chat autonomous wake exists, fresh guide chats still need a human wake/enter. But all work selection, questions, state and completion should be server-side so the human only supplies the transport gesture.

## Guide Observatory

Track guides exactly like workers:
- joined_at
- work proposed/start/claim/finish
- duration
- words
- actions
- control questions
- waiting time
- pending approval time
- verification outcome
- rework/revision count
- integration latency
- useful output / total time

TV cues:
- GUIDE_JOINED: brief distinct chime
- WORKING: subtle status
- WORK_FINISHED: completion chime + guide code + duration
- WORK_REJECTED/needs-rework: different subtle cue
- dedupe by canonical Mesh event_id
- never replay historical cue on normal LIVE join

## Guide pre-work exam idea

Before material work, optional typed preflight should generate/answer a compact exam:
- what is already designed?
- what must not change?
- what evidence would falsify the plan?
- what is the smallest material scope?
- what are the likely duplicate/redundant paths?
- what would count as verified finish?

The exam may be generated by research workers but becomes trusted/versioned input only after coordinator approval.

Goal:
reduce duplicated work, forgotten prior design and avoidable implementation mistakes.

## Immediate post-C0 order

1. freeze final C0 evidence
2. GUIDE-3 final forensic analysis
3. GUIDE-4 methodology audit
4. GUIDE-5 Observatory/replay substrate plan/work traces
5. GUIDE-2 reconciles KEEP / MODIFY / DROP / UNRESOLVED
6. optional research-worker batch only for unresolved design questions
7. freeze SCREEN-10 manifest
8. implement isolated generic V3 substrate
9. implement/read-only Observatory and replay
10. smokes/canaries
11. ARM
12. next substantial human gesture = launch exact worker cohort with one trusted prompt

## Fresh GUIDE-2 recovery prompt

Paste this into a fresh chat if this coordinator chat is lost:

PROMETEO · GUIDE-2 RECOVERY

Use Supabase project_id catnohyouxqjjtseaueb and repo JuanManuelPM/prometeo.

Read:
1. public.prometeo_guide_mesh_context()
2. coordination/design-dna/experiments/RICH-CELL-V3/GUIDE2_RECOVERY_HANDOFF_2026-09-22.md
3. all RICH-CELL-V3 refs named in that handoff.

Take the Guide Mesh as coordination truth.
You are the replacement/coordinator continuation for GUIDE-2 only if the Mesh shows that coordinator continuity is required and no conflicting active coordinator action is in progress.

First:
- inspect GUIDE-3/4/5 latest OBSERVATION / Work Trace state;
- inspect current C0 status read-only;
- do not mutate C0;
- reconcile existing work before opening new design;
- preserve universal-worker / cell-protocol separation;
- preserve exact-launch experimental philosophy;
- preserve DATA-ONLY trust boundary;
- avoid asking the human to relay messages between Guides.

Then continue the post-C0 runbook toward SCREEN-10 ARMED.


## Update · 2026-09-22 22:33Z

C0 is analytically classified as effectively stalled without mutating batch state: snapshots at 22:06:39Z and 22:29:56Z were identical at 302/1000 DONE and 803,593 words.

GUIDE-3 Phase A findings now durable in Mesh:
- strong low-grid greedy seriality;
- 17/17 observed backend sessions admitted; exact human-attempt denominator is not backend-durable;
- review became de facto mandatory because every produced cell required review;
- repeated roles got faster and shorter, but causal quality improvement remains unresolved;
- no new confirmed engine continuity defect yet; WAIT/terminal instrumentation is missing prospectively.

GUIDE-4 methodology findings:
- keep 10 SCREEN arms but separate inference lanes;
- S01-S07 are worker-policy promotion lane;
- S08-S10 are protocol probes, not competitors in one Top-3 ranking;
- 60 launch attempts are not 60 admissions;
- use a synchronized common start barrier;
- define n=5 degraded behavior for pair/triad/specialization arms;
- promotion requires integrity invariants plus >=96/120 DONE with evidence from all 10 grids unless durable terminal/no-rescue occurs, and joint quality + active-worker-seconds evidence.

Approved Work Traces:
- #22 GUIDE-3 rich/observatory-v1 — prospective transition instrumentation + read-only Observatory; C0 history immutable.
- #23 GUIDE-3 rich/v3-screen10-substrate — isolated generic V3 substrate/smoke only; no real ARM before methodology/Observatory.
- #24 GUIDE-5 rich/replay-read-model-v1 — normalized replay/read model, on-demand ~60s checkpoints, catch-up-to-live, multi-arm sync; C0 arm_id remains null.
- #25 GUIDE-4 rich/screen10-methodology-finalization-v1 — docs/methodology only.
- #21 GUIDE-1 worker-animation-lab-v1 — reconcile already-published visual lab and close trace.

Guide Observatory v1 now exists:
- public.prometeo_guide_observatory_v1
- public.prometeo_guide_jobs_v1
- public.prometeo_guide_timeline_v1

Guide timeline cue semantics:
- GUIDE_JOINED → join cue
- CLAIMED → work-start cue
- WORK_FINISHED → completion cue
- WORK_REJECTED → rework cue
- dedupe by canonical event_id

Guide Work Traces are treated as Guide Jobs v1. Avoid creating a duplicate Guide scheduler until this lifecycle proves insufficient.

Worker support for Guides is defined in:
coordination/design-dna/GUIDE_WORKER_DELEGATION_V1.md

Immediate coordinator order now:
1. consume GUIDE-4 finalized methodology;
2. consume GUIDE-3 Phase B forensic snapshot;
3. consume GUIDE-5 replay implementation;
4. integrate Observatory/replay with GUIDE-1 TV;
5. spend research workers only on unresolved Q10/Q21 power-horizon calibration and Q24/Q31 order-bias questions before SCREEN implementation is frozen;
6. keep C0 immutable;
7. do not ask human to relay Guide results.
