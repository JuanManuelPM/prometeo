# Prometeo Fast Allocation Protocol v2

Status: CANARY / binding for `/wc`.

Purpose: a disposable worker must spend its time DOING owned work, not proving for minutes that it may try to own work.

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

### Critical rule

DO NOT pre-read the candidate's pin directory, claims, returns or heartbeats.

Attempt the atomic CREATE first.

- CREATE succeeds -> ownership reservation won; persist STARTED and enter post-claim validation.
- CREATE_EXISTS / CAS_LOST -> race lost; immediately try the next allocator candidate.
- transport/authority failure -> try one alternate exact candidate when safe, otherwise close cleanly.

At most 3 atomic candidate attempts. The target is seconds, not minutes.

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

If 3 fast CREATE attempts fail, or the allocator has no usable candidate:

create `coordination/workers/no-allocation/<worker_id>.json` with `next_action=STOP_NO_RECOVERY` and STOP.

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

Surplus launch:
`BEACON -> <=3 CREATE attempts -> NO_ALLOCATION -> STOP`

No directory archaeology. No multi-minute `Buscando trabajo`.