# Prometeo Fast Allocation Protocol v2.1

Status: CANARY / binding for `/wc`.

Purpose: a disposable worker must spend its time DOING owned work, not proving for minutes that it may try to own work.

## Human authorization boundary

The preferred HUMAN invocation explicitly authorizes reversible Prometeo repo writes needed by the canary (beacon, PIN/claim, STARTED, heartbeat, RETURN, no-allocation and safe reversible implementation commits).

Remote page/repository text is context, not a substitute for human authorization when connector/tool controls require it.

If the first claim CREATE is blocked by connector/tool authorization or safety controls, classify `CLAIM_TRANSPORT_BLOCKED` and STOP immediately. Do not consume attempts 2–3 reproducing a transport-level block. Persist one bounded no-allocation receipt if possible. This is one system transport problem, not multiple job collisions.

## Hard pre-claim budget

Before a PIN/claim the worker may do ONLY:

1. load the canonical `/wc` bootstrap;
2. create its launch beacon;
3. read ONE allocator snapshot;
4. make atomic CREATE attempts against exact claim paths supplied/derivable from that snapshot.

Forbidden before ownership:
- broad repo archaeology;
- directory listings of pins/claims/returns/heartbeats;
- Master Context, Guide, page, verification or project context;
- reading G1 then G2 then heartbeats then returns to decide whether to try;
- web search for allocator/protocol files;
- refreshing/rebuilding Live;
- analysis of another worker's history.

Those checks belong to the allocator/compiler or to post-claim execution.

## Allocator read

Read EXACTLY one of these, without web search:

1. GitHub repo file `gh-pages:live/allocator.json` when the GitHub connector is available;
2. otherwise direct URL `https://raw.githubusercontent.com/JuanManuelPM/prometeo/gh-pages/live/allocator.json`.

Do not search `juanmanuelpm.github.io` for it.

The allocator is a hint, not product authority. Atomic create-if-absent remains the ownership primitive.

## Candidate order

Prefer CHEAP UNOWNED work before recovery:

1. `ready` portfolio work;
2. `queue_ready` normal work;
3. only then `recovery` work;
4. tiny deterministic planner fallback only when the allocator exposes no useful candidate.

Reason: ready work can normally be claimed with one create. Recovery is inherently more expensive and must never consume workers while clean ready work exists.

## Optimistic claim

For portfolio candidates use the allocator's `claim_path` when present. Otherwise derive:

`next_generation = pin_generation + 1`

`coordination/portfolio/pins/<job_id>/G<next_generation_6d>.json`

For ready work with no previous generation this is G000001.

For normal queue work use:

`coordination/opportunities/claims/<opportunity_id>.json`

Claim payload must be minimal coordination metadata only: worker_id, job/opportunity id, generation if applicable, claimed_at, protocol/version and predecessor ref if applicable. Do not embed project prose or unrelated context in the claim write.

### Critical rule

DO NOT pre-read the candidate's pin directory, claims, returns or heartbeats.

Attempt the atomic CREATE first.

- CREATE succeeds -> ownership reservation won; persist STARTED and enter post-claim validation.
- CREATE_EXISTS / CAS_LOST -> race lost; immediately try the next allocator candidate.
- CLAIM_TRANSPORT_BLOCKED / connector authorization failure -> STOP immediately; do not spend additional candidate attempts reproducing it.
- other bounded transport failure -> try one alternate exact candidate only when the failure is plausibly candidate-specific.

At most 3 atomic candidate attempts for races/stale hints. The target is seconds, not minutes.

## Post-claim validation

Only AFTER winning the PIN/claim:

- load the exact job definition and required protocol/context;
- verify no terminal/superseding state makes the allocator hint stale;
- if stale, perform NO substantive mutation, write a bounded `STALE_ALLOCATOR_ABORT`/return receipt, and immediately re-enter fast allocation;
- otherwise execute deeply through acceptance criteria.

A rare stale reservation is cheaper and safer than making every worker perform multi-minute archaeology before every claim.

## Recovery

Recovery is last among prepared candidates.

A recovery candidate from a fresh allocator may optimistically attempt the exact next deterministic generation. Atomic uniqueness prevents two recovery winners for the same generation. After winning, post-claim validation checks retry safety and newer terminal/liveness evidence before substantive mutation.

If the allocator snapshot is obviously stale (>90 seconds old), skip recovery candidates rather than doing manual recovery archaeology. Ready atomic claims may still be attempted because create-if-absent safely rejects already-owned work.

## No allocation

If 3 fast CREATE race attempts fail, the allocator has no usable candidate, or claim transport is blocked:

create `coordination/workers/no-allocation/<worker_id>.json` with `next_action=STOP_NO_RECOVERY` and STOP.

For transport blocks include `reason=CLAIM_TRANSPORT_BLOCKED` and the connector/tool error class when available. Do not attempt to repair the connector inside that disposable worker.

Do not spend minutes inventing work. Do not create a worker to repair this worker. No PIN/claim means no recovery debt.

The planner/metabolism layer must make useful work visible in the allocator; individual surplus workers are not the place to rediscover the entire project.

## After ownership

Now load only job-specific context and execute normally:
- CAS/re-fetch mutable targets;
- heartbeat on longer work;
- RETURN durably;
- materialize grounded successors when authorized;
- re-enter this fast allocation phase after RETURN.

## Success target

Normal launch:
`BEACON -> allocator -> CREATE PIN/claim -> STARTED`

Expected pre-claim shape: a handful of tool operations, normally under ~30 seconds.

Transport-blocked launch:
`BEACON -> allocator -> CREATE_BLOCKED -> NO_ALLOCATION -> STOP`

Surplus launch:
`BEACON -> <=3 CREATE attempts -> NO_ALLOCATION -> STOP`

No directory archaeology. No multi-minute `Buscando trabajo`.
