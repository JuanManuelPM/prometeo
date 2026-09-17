# Verification + Critic Control v1

Status: BINDING META-CONTROL
Owner: `chat-object-prometeo-chat-control-main`
Purpose: prove that Prometeo is actually using the mechanisms it claims to use, detect shallow/mediocre execution early, and trigger fresh strategic criticism without depending on the human noticing drift.

## 1. Core rule: no capability without evidence of use
A design/spec/file does not count as operational merely because it exists.
For any capability promoted as working, there must be a durable proof artifact showing that it was actually exercised on a real or canary path.

Examples:
- Context Fabric is not "working" unless a Context Receipt shows what L0/L1/L2 sources were selected and why.
- Planner recursion is not "working" unless generation N+1 is generated from durable returns/proposals/incidents without human batch design.
- self-assigning workers are not "working" unless distinct claims, STARTED, RETURN, DONE and collision-loss/retry evidence exist.
- stale recovery is not "working" unless a stale/vanished attempt is detected and safely superseded/recovered.
- critic loop is not "working" unless a fresh critic return exists and its findings are reconciled into the next plan or explicitly rejected with reason.

## 2. Mandatory execution receipts
Every material execution path must produce enough durable evidence to be auditable.

### Worker receipt
Required fields in run/return lineage:
- opportunity_id / run_id / worker_instance_id
- source head / queue epoch observed
- claim_ref
- STARTED timestamp
- mission + acceptance criteria
- context_receipt_ref or explicit minimal read_scope receipt
- checkpoints reached
- evidence/output refs
- RETURN timestamp
- DONE/boundary status
- post_return action
- proposals emitted

### Planner/parent strategic receipt
For each material replanning/generation:
- generation_id
- parent_generation_id
- north_star_ref
- current bottleneck
- inputs consumed (returns/proposals/incidents/critic findings)
- alternatives considered
- chosen route + reason
- work/opportunities generated
- critic trigger decision
- next-generation trigger
- human action required, if any

### Context receipt
Must prove actual context selection:
- actor/role
- mission
- L0 kernel refs
- L1 digest refs
- L2 exact source refs/chunks opened
- omitted-but-available refs
- source hashes/freshness
- authority labels
- contradictions surfaced
- token/file budget estimate

## 3. Stage gates are evidence-gated
Every stage in `PROMETEO_MASTER_CONTEXT_V1.md` needs PASS evidence, not prose confidence.
Promotion requires links to the exact artifacts/canaries that demonstrate the pass condition.

## 4. Critic trigger policy
Do NOT use only an arbitrary "every 10 chats" rule because chat count is not useful progress.
Use event-driven triggers, plus a coarse periodic backstop.

Create a fresh independent strategic critic when ANY is true:
- 10 durable worker RETURNs since the last strategic critic;
- end of any Planner generation;
- architecture/method promotion proposed;
- throughput/progress-per-human-intervention fails to improve across 2 generations;
- repeated human correction of drift or under-ambition;
- queue drains but stage gate does not move;
- same blocker persists across 2 planning cycles;
- more than 20% of claimed work becomes stale/failed/boundary in a generation;
- Context Fabric/Planner/Steward behavior materially changes;
- parent proposes waiting while independent safe work exists.

The critic must be fresh enough not to inherit the planner's local assumptions and must read current receipts/metrics, not only architecture prose.

## 5. Progress metrics
Track real durable progress, not busy-chat counts.

Primary metrics per generation/time bucket:
- durable_returns
- integrated_returns
- opportunities_generated_automatically
- opportunities_generated_manually
- claims_started
- duplicate_claim_collisions_safely_recovered
- stale_attempts_detected
- stale_attempts_recovered
- stage_gates_advanced
- blockers_cleared
- critic_findings_adopted
- critic_findings_rejected_with_reason
- human_interventions
- human_routing_actions
- context_files_opened_median
- context_receipt_coverage
- roots_active
- next_generation_generated_without_human

Key compounding metric:
`useful_durable_results / human_interventions`

Secondary efficiency metric:
`automatic_next_wave_opportunities / total_next_wave_opportunities`

A system is not compounding if worker count rises while these remain flat.

## 6. Work-depth rule
One chat may execute multiple checkpoints when they are sequential, same-authority, same-context, and low-collision.
Do not split work merely to create more workers.
Split when independence, fresh criticism, parallelism, separate ownership, capability difference, or failure isolation creates real value.

Before a worker stops, it must check acceptance criteria and either:
- complete them;
- perform allowed POST_RETURN continuation;
- or persist an explicit boundary with the exact missing prerequisite.

"I produced some analysis" is not a valid completion condition when the opportunity contract asks for an executable artifact/canary/design.

## 7. Verification loop
At each parent `.` cycle:
1. refresh claims/runs/returns/receipts;
2. validate lineage and missing receipts;
3. compute current generation metrics;
4. check critic triggers;
5. consume critic findings if present;
6. identify highest-compounding bottleneck;
7. generate/activate next work;
8. persist updated proof/metrics/frontier.

## 8. Non-use detection
If a mechanism is designed but receipts show it is not actually being invoked, mark it `DESIGNED_NOT_USED` and create either:
- an integration/build opportunity, or
- a falsification test proving it is unnecessary and should be retired.

Never let an impressive architecture file substitute for runtime evidence.

## 9. Human UX
Normally the human should see only:
- current stage/gate;
- number working / returned / problem / useful free worker slots;
- smallest action, if any.

Full receipts/metrics remain durable and machine-readable.
