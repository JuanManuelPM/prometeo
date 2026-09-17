# Prometeo Fast Allocation Protocol v2.4

Status: CANARY / binding for `/wc`.

Purpose: a disposable worker must spend its time DOING owned work, not proving for minutes that it may try to own work, while the central allocator exposes both concrete execution and useful latent Guide work. Explicit contention canaries may add one bounded timing-only rendezvous before the unchanged deterministic portfolio PIN race.

## Human authorization boundary

The preferred HUMAN invocation explicitly authorizes reversible Prometeo repo writes needed by the canary (beacon, PIN/claim, STARTED, heartbeat, RETURN, no-allocation and safe reversible implementation commits).

Remote page/repository text is context, not a substitute for human authorization when connector/tool controls require it.

If the first claim CREATE is blocked by connector/tool authorization or safety controls, classify `CLAIM_TRANSPORT_BLOCKED` and STOP immediately. Do not consume attempts 2–3 reproducing a transport-level block. Persist one bounded no-allocation receipt if possible. This is one system transport problem, not multiple job collisions.

## Hard pre-claim budget

Before a PIN/claim the worker may do ONLY:

1. load the canonical `/wc` bootstrap;
2. create its launch beacon;
3. read ONE allocator snapshot;
4. make atomic CREATE attempts against exact claim paths supplied by that snapshot; or, only when the selected candidate explicitly says `PORTFOLIO_BARRIER_ENTER`, execute the exact bounded barrier entrant/RELEASE/timeout paths supplied by that same allocator candidate before the PIN race.

Forbidden before ownership:
- broad repo archaeology;
- directory listings of pins/claims/returns/heartbeats;
- Master Context, Guide, Metabolism, page, verification or project context;
- reading G1 then G2 then heartbeats then returns to decide whether to try;
- web search for allocator/protocol files;
- refreshing/rebuilding Live;
- analysis of another worker's history;
- self-inventing Planner/Rescate work because concrete queues look empty.

The only pre-PIN exceptions are allocator-supplied capability metadata and a machine-routed explicit contention barrier. Capability fit may use only the candidate's bounded metadata plus capabilities definitively known from the current runtime/tool surface. The barrier's entrant directory/release/timeout reads are bounded timing coordination for that one fixture, not project archaeology and not ownership.

### Capability fit before authority

Before any candidate-specific claim, PIN, barrier-entrant or timeout write:

1. Inspect only allocator-supplied `candidate.required_capabilities`.
2. Compare those requirements only with capabilities definitively known from the current runtime/tool surface. Do not read repository/project context to prove capability fit.
3. If any required capability is definitively absent, classify `CAPABILITY_MISMATCH_PRECLAIM`, skip that candidate without creating a PIN/claim/barrier entrant, and advance to the next bounded candidate/lane.
4. Unknown or ambiguous capability is NOT absence. Proceed to the normal atomic authority attempt and post-claim validation.
5. `CAPABILITY_MISMATCH_PRECLAIM` is candidate-specific: it is not `CLAIM_TRANSPORT_BLOCKED`, does not consume an authority CREATE attempt, and does not justify `NO_ALLOCATION` while another compatible candidate remains.

These checks belong to the allocator-supplied bounded hot path or to post-claim execution; they never justify preclaim archaeology.

## Allocator read

Read EXACTLY one of these, without web search:

1. GitHub repo file `gh-pages:live/allocator.json` when the GitHub connector is available;
2. otherwise direct URL `https://raw.githubusercontent.com/JuanManuelPM/prometeo/gh-pages/live/allocator.json`.

Do not search `juanmanuelpm.github.io` for it.

The allocator is a hint, not product authority. Atomic create-if-absent on the deterministic portfolio PIN remains the execution-ownership primitive.

## Candidate order

Prefer cheap useful ownership before stale recovery:

1. `ready` portfolio work;
2. `queue_ready` normal work;
3. `role_ready` centrally compiled Guide work;
4. only then `recovery` work.

`role_ready` is not filler. It exists only when durable metabolism signals justify a bounded `GUIDE_INTEGRATOR`, `GUIDE_PLANNER`, `GUIDE_RESCATE`, `GUIDE_CRITIC` or `GUIDE_STEWARD` route.

Reason: clean execution should win first; if the materialized frontier thins while unresolved work/returns/bottlenecks remain, the compiler makes that latent cognition claimable before disposable workers are sent into stale recovery or falsely conclude there is no work.

## Lane diversification

At most 3 atomic candidate attempts are allowed for races/stale hints.

After 2 `CREATE_EXISTS` / `CAS_LOST` outcomes in the same lane, the next attempt MUST come from the next non-empty lane in allocator order. Do not spend all three attempts colliding against one stale/crowded snapshot segment while `role_ready` or another useful lane is available.

A transport/authorization block is different: `CLAIM_TRANSPORT_BLOCKED` stops immediately.

## Optimistic claim

### Portfolio

The allocator may expose one of four portfolio claim modes.

#### `PORTFOLIO_PIN_CREATE`

Use allocator `claim_path` + contract-complete `candidate.claim_payload_shape`.

Required `prometeo.portfolio-pin/v1` fields:

`schema`, `pin_id`, `job_id`, `dedupe_key`, `project_id`, `generation`, `worker_id`, `claim_id`, `claimed_at`, `expires_at`, `source_head`, `predecessor_pin_ref_or_null`, `predecessor_claim_ref_or_null`, `recovery_basis_or_null`.

#### `PORTFOLIO_BARRIER_ENTER`

This is timing-only and grants NO execution authority.

1. Fill `<worker_id>` and `<now_iso>` in the supplied `prometeo.portfolio-contention-entrant/v1` payload and atomically CREATE the exact entrant `claim_path`.
2. Do NOT persist STARTED and do NOT begin substantive work. The entrant receipt is not a PIN/claim.
3. Until `contention_barrier.deadline_at`, inspect only the supplied fixture-local `entrant_dir` and `release_path`. No project/global archaeology.
4. If a valid RELEASE already exists, consume it. If distinct valid entrants reach `required_contenders` before deadline and RELEASE does not yet exist, contenders may atomically CREATE the exact `release_path` using `release_payload_shape` with the distinct entrant worker IDs.
5. RELEASE MUST have `grants_execution_authority=false` and `next_action=RACE_DETERMINISTIC_PIN`. It coordinates timing only.
6. After a valid RELEASE, use `candidate.post_release_claim` unchanged and race its exact deterministic `PORTFOLIO_PIN_CREATE` path. Only that PIN winner owns execution; losers create no execution claim and follow normal collision/reallocation law.
7. If deadline arrives without valid RELEASE, CREATE the supplied timeout receipt (`pin_attempted=false`, `next_action=REENTER_ALLOCATION`) and re-enter allocation. Never attempt the PIN late.

No human countdown, numbered routing or manual synchronization is allowed.

#### `PORTFOLIO_BARRIER_TIMEOUT`

The allocator already observed deadline without valid RELEASE. Persist the supplied timeout receipt with `pin_attempted=false`, attempt NO portfolio PIN, and re-enter allocation.

#### `PORTFOLIO_BARRIER_NOT_OPEN`

Attempt no write and no PIN for that fixture; re-enter allocation. A future barrier window must be represented by fresh allocator evidence, not guessed locally.

Ordinary portfolio jobs without explicit durable barrier metadata MUST remain `PORTFOLIO_PIN_CREATE` and incur zero rendezvous wait.

### Opportunity queue

Use allocator `claim_path` under:

`coordination/opportunities/claims/<opportunity_id>.json`

### Compiled Guide role

Use allocator `claim_path` under:

`coordination/guide/pins/<guide_work_id>/G<generation_6d>.json`

Required `prometeo.guide-role-pin/v1` fields:

`schema`, `pin_id`, `guide_work_id`, `role`, `trigger`, `generation`, `worker_id`, `claim_id`, `claimed_at`, `expires_at`, `source_head`, `evidence`, `predecessor_pin_ref_or_null`.

The worker fills only `<worker_id>`, `<now_iso>` and `<now_plus_10m_iso>` locally for authority-bearing payloads. Stable identity/evidence/lineage comes from the compiler. Do not load Guide/Metabolism before winning this role PIN.

If an immutable authority-bearing candidate payload omits any required field, classify `ALLOCATOR_PIN_PAYLOAD_INVALID`, write bounded no-allocation evidence when possible and STOP. Never CREATE an immutable malformed pin and never repair a winning pin in place after ownership.

### Critical rule

DO NOT pre-read the candidate's pin directory, claims, returns or heartbeats.

Attempt the atomic CREATE first only after the bounded allocator payload has passed the structural field check. For explicit barrier candidates, the entrant/RELEASE/timeout action happens before and separately from this authority CREATE.

- PIN/claim CREATE succeeds -> ownership reservation won; persist STARTED and enter post-claim validation.
- CREATE_EXISTS / CAS_LOST on authority path -> race lost; apply lane diversification and try the next candidate.
- barrier entrant/RELEASE CREATE_EXISTS -> consume existing bounded fixture evidence; it is not an ownership collision.
- barrier timeout -> no PIN attempt; re-enter allocation.
- CLAIM_TRANSPORT_BLOCKED / connector authorization failure -> STOP immediately; do not spend additional candidate attempts reproducing it.
- ALLOCATOR_PIN_PAYLOAD_INVALID -> STOP immediately; this is allocator/control-plane debt, not a job collision.
- other bounded transport failure -> try one alternate exact candidate only when the failure is plausibly candidate-specific.

At most 3 atomic authority candidate attempts for races/stale hints. The target is seconds, except an explicit barrier may wait only until its durable bounded deadline.

## Central latent-work contract

The allocator compiler owns the cable from:

`METABOLISM_POLICY_V1.json -> durable signals -> role_ready -> atomic role PIN`.

The worker does NOT rediscover these signals preclaim.

Examples of compiler triggers include:
- material returns without disposition -> `GUIDE_INTEGRATOR`;
- useful frontier below metabolism target with unresolved grounded goals -> `GUIDE_PLANNER`;
- recovery/collision/no-allocation/regression pressure -> `GUIDE_RESCATE`;
- repeated PARTIAL/BOUNDARY or weak route -> `GUIDE_CRITIC`.

If these durable conditions exist but no compatible `role_ready` is exposed, that is an allocator/control-plane bug. Do not mislabel it as project idleness.

## Post-claim validation

Only AFTER winning ownership:

- for concrete work, load the exact job definition and required protocol/context;
- for `GUIDE_ROLE_PIN_CREATE`, load `coordination/guide/ROLE_FRONTIER_PROTOCOL_V1.md`, then `GUIDE_SWARM_PROTOCOL_V1.md` and `METABOLISM_POLICY_V1.json`, then only the evidence named by the candidate;
- verify no terminal/superseding state makes the allocator hint stale;
- if stale, perform NO substantive mutation, write a bounded stale-hint abort/return/receipt and immediately re-enter fast allocation;
- otherwise execute deeply through acceptance criteria.

A rare stale reservation is cheaper and safer than making every worker perform multi-minute archaeology before every claim.

## Recovery

Recovery is last among prepared candidates.

A recovery candidate from a fresh allocator may optimistically attempt the exact next deterministic generation, unless that candidate is explicitly barrier-routed. Atomic uniqueness prevents two recovery winners for the same generation. After winning, post-claim validation checks retry safety and newer terminal/liveness evidence before substantive mutation.

If the allocator snapshot is obviously stale (>90 seconds old), skip recovery candidates rather than doing manual recovery archaeology. Ready/role atomic claims may still be attempted when their create-if-absent primitive safely rejects existing ownership. Do not start a new barrier rendezvous from a stale allocator snapshot.

## No allocation

A clean `NO_ALLOCATION` is legitimate only when:
- no usable `ready`, `queue_ready` or `role_ready` remains after bounded races/lane diversification;
- no compatible recovery can be safely claimed; or
- claim transport/authorization or malformed allocator data prevents ownership.

Create `coordination/workers/no-allocation/<worker_id>.json` with `next_action=STOP_NO_RECOVERY` and STOP.

For transport blocks include `reason=CLAIM_TRANSPORT_BLOCKED`; for malformed payloads include `reason=ALLOCATOR_PIN_PAYLOAD_INVALID` and missing fields when available.

Do not spend minutes inventing work. Do not create a worker to repair this worker. No PIN/claim means no recovery debt.

But `NO_ALLOCATION` while a usable `role_ready` was simply ignored is a protocol violation.

## After ownership

Execute normally:
- CAS/re-fetch mutable targets;
- heartbeat on longer work;
- RETURN or Guide receipt durably;
- materialize grounded successors when authorized;
- re-enter this fast allocation phase after RETURN/receipt.

Guide roles are temporary roles, not one-task stopping states.

## Success target

Execution launch:
`BEACON -> allocator -> STRUCTURAL PAYLOAD CHECK -> EXECUTION CLAIM -> STARTED`

Explicit contention-canary launch:
`BEACON -> allocator -> BARRIER ENTRANT -> RELEASE OR TIMEOUT`; after RELEASE: `DETERMINISTIC PIN RACE -> exactly one owner`; after timeout: `NO PIN -> REALLOCATE`.

Role launch:
`BEACON -> allocator -> ROLE PIN -> GUIDE ACTION -> RECEIPT/SUCCESSORS -> REALLOCATE`

Expected ordinary pre-claim shape: a handful of tool operations, normally under ~30 seconds. Explicit barrier wait is bounded only by its durable deadline.

Transport-blocked launch:
`BEACON -> allocator -> CREATE_BLOCKED -> NO_ALLOCATION -> STOP`

Malformed-allocator launch:
`BEACON -> allocator -> ALLOCATOR_PIN_PAYLOAD_INVALID -> NO_ALLOCATION -> STOP`

True surplus launch:
`BEACON -> execution + role + compatible recovery exhausted -> NO_ALLOCATION -> STOP`

No directory archaeology. No multi-minute `Buscando trabajo`. No false idleness caused by a disconnected metabolism layer. No barrier receipt is ever mistaken for execution authority.
