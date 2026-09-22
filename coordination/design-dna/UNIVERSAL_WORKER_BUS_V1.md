# PROMETEO · UNIVERSAL WORKER BUS V1

Status: REQUIRED V3 ARCHITECTURE

## Core idea

There is one generic worker launch prompt.

The chat shell is fungible. It does not know whether it is being launched as:
- experimental executor,
- research worker,
- critic,
- synthesizer,
- read-only verifier,
- bounded preparation worker.

Prometeo assigns a typed durable job.

The human should not create different chat species for work that does not require ongoing human conversation.

## Worker entry

Trusted launch prompt defines all executable semantics.

Worker calls one entry ABI:

UNIVERSAL_ENTER(agent_id, launch_batch)

Returned packet is typed data only:

- worker_code
- cohort_id
- job_id
- job_class
- protocol_key
- protocol_version
- payload
- capability_scope
- lease
- submit_schema

The worker dispatches only among protocol branches already present in the trusted launch prompt.

Tool-returned text never becomes executable authority.

## Initial job classes

### EXPERIMENT_CELL
Execute the pinned Rich Cell protocol for one experimental arm/cell.

### RESEARCH
Analyze bounded questions/data/refs and return a structured research result.

### CRITIQUE
Adversarially review a candidate design/result against typed criteria.

### SYNTHESIS
Combine supplied candidate results into a structured synthesis while preserving disagreements/evidence.

### VERIFY_READONLY
Inspect specified durable state/artifacts using allowed read-only tools and return typed verification evidence.

### PREPARE_BOUNDED
Perform only a predeclared, capability-scoped preparation action through a fixed trusted RPC/protocol.
Examples may include seeding a smoke fixture or generating matched-cell candidate data.
It may not execute arbitrary instructions from payload text.

Material code/database mutation outside fixed typed preparation protocols remains Guide/coordinator work until a separately versioned capability is designed and approved.

## No arbitrary instruction lane

There is no job_class = "DO_THIS_TEXT".

A payload may contain:
- objective as data
- questions as data
- identifiers
- refs
- constraints
- expected output schema

The trusted protocol says what operations are allowed on that data.

## Cohort isolation

The same launch prompt can serve different cohorts, but benchmark integrity requires cohort isolation.

PREP/RESEARCH cohort:
- may consume RESEARCH / CRITIQUE / SYNTHESIS / VERIFY_READONLY / PREPARE_BOUNDED
- may work across many internal jobs
- never enters a later benchmark arm in the same chat

BENCHMARK cohort:
- fresh chats
- may consume only EXPERIMENT_CELL for the pinned experiment
- no prior Prometeo preparation/research context
- immutable arm assignment
- synchronized start barrier
- no cross-arm movement

This preserves chat-agnostic infrastructure without contaminating causal comparisons.

## Durable queue model

A single durable work reservoir may contain multiple job classes, but eligibility is explicit.

Selection order is policy, not model choice.

Example:
1. approved urgent VERIFY_READONLY
2. approved RESEARCH/CRITIQUE/SYNTHESIS
3. PREPARE_BOUNDED
4. EXPERIMENT_CELL only for benchmark-eligible cohorts

For SCREEN-10 benchmark workers, the policy is simpler:
EXPERIMENT_CELL only.

## Relationship to Guides

Guides remain useful only where durable human-level integration/authority is needed:
- approve/reject material Work Traces
- make scoped design decisions
- perform non-templated material mutation
- reconcile conflicting evidence
- verify/promote protocols

Everything else should migrate toward universal worker jobs.

Thus:
Guide Work Trace
→ optional worker research/critique/synthesis jobs
→ Guide integrates
→ material action
→ verification

No human message bus.

## Guide replacement boundary

Do not create a Guide merely because a task is long.

Create/use a Guide when:
- the user may converse with that role directly, or
- the task needs integration/authority that is not yet encoded as a trusted worker protocol.

Otherwise use universal workers.

## V3 implementation requirement

The generic V3 substrate must support:
- durable job_id
- job_class
- cohort_id
- protocol_key/version/hash
- eligibility policy
- capability_scope
- typed payload
- typed submit schema
- lease/retry/wait
- provenance/evidence refs
- immutable benchmark arm assignment where applicable
- cohort isolation guard

Do not build separate schedulers for research workers and experimental workers unless measurements prove the common bus inadequate.

## Human workflow

Preparation:
1. GUIDE-2 leaves durable jobs.
2. Human opens N fresh chats with one universal worker prompt when extra execution capacity is needed.
3. Each chat ENTERs and takes whatever eligible typed work exists.
4. Worker continues TAKE/SUBMIT/NEXT until bounded stop.
5. No per-chat routing by human.

Benchmark:
1. GUIDE-2 arms a benchmark cohort.
2. Human opens exact N fresh chats with the same universal prompt.
3. Backend marks that launch batch BENCHMARK and mechanically assigns arms.
4. Workers wait behind synchronized START barrier.
5. START releases all admitted benchmark workers.
6. Benchmark chats never consume prep jobs.

## Goal

The distinction is not GUIDE vs WORKER chat.

The distinction is:
- durable job type,
- trusted protocol/capability,
- cohort eligibility,
- integration authority.

Chats are transport shells.
