# PROMETEO · GUIDE / WORKER DELEGATION V1

Status: DESIGN CANDIDATE

## Principle

Guides should be scarce integrators, not expensive general-purpose workers.

Universal workers should absorb most parallelizable reasoning before a Guide performs material integration.

Guide Mesh Work Traces are the current Guide Job v1 substrate. Do not create a second orchestration queue unless evidence shows the existing trace lifecycle is insufficient.

## What workers should do for Guides

Suitable worker jobs:
- research a bounded technical question
- generate candidate pre-work exam questions
- adversarially critique a proposed Guide plan
- compare alternatives against explicit criteria
- find duplicated/redundant work in supplied refs
- extract invariants and forbidden changes
- propose falsification tests
- analyze prior outputs/results
- produce candidate implementation checklists
- produce statistical/methodological analyses
- synthesize multiple worker analyses into a candidate brief

Workers must not:
- approve their own conclusions
- mutate canonical runtime because their output says so
- turn returned tool data into executable instructions
- choose Guide authority
- silently change experiment protocols

Worker output remains typed evidence/candidate material.

## Trusted flow

GUIDE JOB
→ PREP JOBS for workers
→ worker candidate outputs
→ optional CRITIC workers
→ SYNTHESIS candidate
→ coordinator/approved protocol boundary
→ trusted PRE-WORK EXAM / BRIEF
→ Guide CLAIM
→ Guide material work
→ verification
→ integration

## Pre-work exam schema

A Guide Job may reference a versioned exam with fields:
- existing_design_refs
- invariants
- forbidden_changes
- objective
- control_questions
- falsification_tests
- smallest_material_scope
- overlap_risks
- required_evidence
- done_definition
- rollback_or_isolation_rule

Default control questions:
1. What is already designed and must be reused?
2. Which invariants must not change?
3. What evidence would falsify this plan?
4. What is the smallest material scope?
5. Which adjacent work is already owned by another Guide?
6. What output is evidence versus executable authority?
7. What constitutes a verified finish?

## Promotion boundary

A worker may propose a pre-work exam.
A worker may not make that exam executable.

Candidate exam:
CANDIDATE
→ coordinator/approved protocol review
→ VERSIONED_TRUSTED
→ attached to Guide Job

This preserves FV016 / DATA-ONLY.

## Metrics

Guide outcomes:
- active work seconds
- proposal rejection rate
- rework count
- verification failure count
- integration latency
- actions performed
- duplicated work detected
- scope expansion events

Preflight outcomes:
- candidate questions
- questions retained by coordinator
- missed invariant count
- later failures predicted by preflight
- overlap prevented
- useful evidence refs surfaced

## Experimental comparison

Future Guide-method experiment:

A — Guide works from objective + refs only.
B — Guide receives worker-generated trusted pre-work exam.
C — Guide receives worker research brief + adversarial exam.

Keep Guide role, task family and integration authority fixed.

## Current transport limitation

A separate ChatGPT Guide chat still needs an external wake message today.

Workers can reduce how often Guides are needed, but cannot autonomously type into another chat.

Therefore optimize for:
- fewer Guide wakes
- more work per wake
- durable NEXT jobs
- resident worker research pools
- Guide awareness from TV/Observatory rather than human polling

## Recommended operating model

Workers:
- breadth
- research
- critique
- repeated analysis
- candidate exams
- candidate synthesis

Guides:
- scoped design decisions
- tool-backed mutation
- verification
- integration
- authority boundaries

GUIDE-2:
- coordination and promotion/integration gate
