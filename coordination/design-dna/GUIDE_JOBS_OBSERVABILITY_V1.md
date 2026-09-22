# PROMETEO · GUIDE JOBS & GUIDE OBSERVABILITY V1

Status: DESIGN CANDIDATE

## Problem

Current Guide chats are durable only through Guide Mesh state, but execution still depends on a human sending a wake message (often ".") to a chat.

This makes the human a transport/wakeup layer even when the orchestration decision is already known.

## Principle

A Guide is not a chat.
A Guide is:
- durable role/authority
- durable job state
- trusted protocol
- evidence/result
- disposable model/chat executor

This mirrors universal worker architecture.

## Guide Job object

Fields:
- guide_job_id
- capability/role
- priority
- objective
- protocol_id/version/hash
- trusted input refs
- control exam
- state
- claimed_by_agent_id
- claimed_by_guide_code
- created_at
- claimed_at
- started_at
- heartbeat_at
- submitted_at
- reviewed_at
- integrated_at
- result refs
- verification
- remaining gaps
- integration decision

Candidate lifecycle:
READY
→ CLAIMED
→ WORKING
→ SUBMITTED
→ REVIEWED
→ INTEGRATED

Recovery:
WAIT / RETRY / STALE / REASSIGN

## Transport boundary

Today, separate ChatGPT chats cannot be autonomously woken by Prometeo.
Therefore:
- human wake remains temporarily unavoidable for a fresh chat shell
- but it must not select work, relay context, or decide next action
- one wake should cause ENTER → CLAIM → WORK → SUBMIT → NEXT until bounded stop

Future supported transport may remove even this final gesture.

## Pre-work exam

Before material execution, every Guide Job may carry a compact trusted preflight:
1. What is already designed and must be reused?
2. Which invariants must not change?
3. What evidence would falsify the intended plan?
4. What is the smallest material scope?
5. What adjacent work is already owned by another Guide?
6. What would count as a verified finish?
7. What needs coordinator approval?

The exam can be proposed by research workers, but must be approved/versioned before becoming trusted execution semantics.

## Metrics

Per Guide:
- join count
- jobs claimed/completed
- active work seconds
- waiting-for-approval seconds
- integration latency
- total response words
- actions performed
- control questions
- rework count
- rejected proposals
- verification failures
- useful artifacts
- coordinator acceptance

Per job:
- queue latency
- claim→start
- start→submit
- submit→review
- review→integrated
- number of retries/reassignments
- result size
- verification count
- final gaps

## TV / Observatory events

Guide Mesh canonical events become replayable:
- GUIDE_JOINED
- WORK_PROPOSED
- WORK_APPROVED
- CLAIMED
- WORK_FINISHED
- WORK_REJECTED
- DECISION
- OBSERVATION

LIVE cue policy:
- GUIDE_JOINED: brief chime
- CLAIMED/WORK_START: subtle start cue
- WORK_FINISHED: completion bell with guide code + elapsed time
- rejection/rework: distinct low-priority cue
- dedupe by event_id
- do not replay old cues when TV reloads

Replay:
Guide activity shares the same timeline/replay transport as Rich workers, but remains a separate layer/filter.

## Goal

The user should be able to look at TV and know:
- which Guides are working
- what job each owns
- how long each has worked
- which are blocked on approval
- which have finished
- which result awaits integration

No manual polling of individual Guide chats should be required for awareness.
