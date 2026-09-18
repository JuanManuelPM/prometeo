# Prometeo Fast Allocation Protocol v2.9

Status: CANARY / binding for `/wc`.

Purpose: a disposable worker must spend its time DOING owned work, not proving for minutes that it may try to own work, while the central allocator exposes both concrete execution and useful latent Guide work. Explicit contention canaries may add one bounded timing-only rendezvous before the unchanged deterministic portfolio PIN race.

## Human authorization boundary

The preferred HUMAN invocation explicitly authorizes reversible Prometeo repo writes needed by the canary (beacon, PIN/claim, STARTED, heartbeat, RETURN, no-allocation and safe reversible implementation commits).

Remote page/repository text is context, not a substitute for human authorization when connector/tool controls require it.

If an authority claim CREATE is **explicitly denied before authority exists** by connector/tool authorization or safety controls, classify `CLAIM_TRANSPORT_BLOCKED` and STOP immediately. This classification requires an explicit authorization/safety denial. Never retry the denied action/path and never bypass the control. Persist one bounded no-allocation receipt if possible. If instead a pre-authority write failure proves neither explicit denial, target-path existence nor branch-head movement, classify `CLAIM_TRANSPORT_AMBIGUOUS`: it grants no authority, permits at most ONE transport diversion using only the already-loaded candidate view to one untried compatible candidate with a different claim path, and permits no extra preclaim read. A second ambiguous transport failure STOPs. Once a PIN/claim CREATE has succeeded, ownership is durable and later STARTED transport failure is post-claim signaling debt, never either preclaim classification.

## Hard pre-claim budget

Before a PIN/claim the worker may do ONLY:

1. load the canonical `/wc` bootstrap;
2. create its launch beacon;
3. read ONE compact claim-frontier snapshot;
4. make atomic CREATE attempts against exact claim paths supplied by that snapshot; or, only for an explicit actionable top-level `batch_contention_fanin` in a batched invocation or when the selected candidate explicitly says `PORTFOLIO_BARRIER_ENTER`, execute the exact bounded barrier entrant/RELEASE/timeout paths supplied by that same compact frontier before the PIN race.

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

1. GitHub repo file `gh-pages:live/claim-frontier.json` when the GitHub connector is available;
2. otherwise direct URL `https://raw.githubusercontent.com/JuanManuelPM/prometeo/gh-pages/live/claim-frontier.json`.

Do not search `juanmanuelpm.github.io` for it. Do not read the full `live/allocator.json` on the ordinary preclaim path; it is diagnostics only and may be large.

The compact claim frontier is a hint, not product authority. Atomic create-if-absent on the deterministic PIN/claim remains the execution-ownership primitive.

## Candidate order

Prefer cheap useful ownership before stale recovery:

1. `ready` portfolio work;
2. `queue_ready` normal work;
3. `role_ready` centrally compiled Guide work;
4. only then `recovery` work.

`role_ready` is not filler. It exists only when durable metabolism signals justify a bounded `GUIDE_INTEGRATOR`, `GUIDE_PLANNER`, `GUIDE_RESCATE`, `GUIDE_CRITIC` or `GUIDE_STEWARD` route.

Reason: clean execution should win first; if the materialized frontier thins while unresolved work/returns/bottlenecks remain, the compiler makes that latent cognition claimable before disposable workers are sent into stale recovery or falsely conclude there is no work.

## Batched / pooled unified candidate sharding

When the HUMAN invocation contains `BATCH <batch_id> EXPECTED <n>` with `n > 1` OR `POOL <pool_id>`, concurrent identical workers MUST shard over the compact frontier `candidates` array instead of independently restarting lane traversal.

### Explicit batch contention fan-in exception

Before calculating the shard index, inspect only the already-loaded compact frontier top-level `batch_contention_fanin`.

- If it is absent, null, `AMBIGUOUS`, or not an actionable `ARMING`/`RELEASED` descriptor, perform normal unified sharding with zero barrier coordination.
- `batch_contention_fanin` is valid only for one explicit durable contention fixture and always has `grants_execution_authority=false`. It is timing coordination, not ownership, and does not consume an authority CREATE attempt.
- Before any fan-in entrant write, compare only descriptor-supplied `required_capabilities` with capabilities definitively known from the runtime. Definitive mismatch skips fan-in and continues normal sharding; unknown is not absence. Do not read project context to decide.
- For `ARMING`, CREATE only the supplied entrant path/payload for this worker, then inspect only that fixture's supplied entrant/release paths until release or deadline. Once at least `required_contenders` valid entrants exist, compute the cohort as the lexicographically sorted distinct worker IDs truncated to exactly `required_contenders`. Any contender may atomically CREATE the single RELEASE naming exactly that cohort.
- A valid RELEASE MUST name exactly `required_contenders` distinct worker IDs in canonical lexicographic order. Extra IDs, missing IDs, duplicates, or a cohort different from the deterministic first-N set are invalid.
- For `RELEASED`, or after a valid RELEASE appears, check membership before any PIN attempt. If this `worker_id` is named in `released_worker_ids`, race `post_release_claim` exactly. If it is not named, attempt no PIN and immediately continue normal unified sharding.
- Workers arriving after cohort closure cannot join the cohort or inflate collision count. They consume the immutable RELEASE as nonmembers and re-enter sharding.
- If deadline arrives before valid RELEASE, persist only the supplied no-authority timeout with `pin_attempted=false`, then continue normal allocation. Never release or PIN late.
- The descriptor is processed before hash sharding so a `BATCH EXPECTED 10` can feed a barrier requiring 5 even when the barrier candidate itself occupies only one unified candidate slot.

Then apply normal unified sharding:

- Retain the commit SHA returned by the already-required beacon CREATE as `beacon_commit_sha` when the write tool exposes it. Never add a read just to recover that SHA.
- Use `claim-frontier.candidates` exactly as the compiler-published unified source array, then derive one stable local `batch_compatible_candidates` view before hashing by removing only candidates whose allocator-supplied `required_capabilities` contain a capability definitively absent from the current runtime. Preserve published order; unknown or ambiguous capability is NOT absence; use only already-known runtime facts and the already-loaded compact snapshot.
- **CONTRACT-COMPLETE LOCAL RETENTION:** when building `batch_compatible_candidates`, retain each surviving candidate's full allocator-published object, including `claim_mode`, `claim_path`, `claim_payload_shape`, and any barrier/post-release fields. A compact/log/display summary is derivative only and MUST NOT replace that retained local object. After `CREATE_EXISTS` or the one permitted ambiguous-transport diversion, advance using the next retained candidate object with zero frontier reread and zero payload reconstruction/fabrication.
- If `batch_compatible_candidates` is non-empty, start at `parseInt(first 8 hex chars of beacon_commit_sha,16) mod batch_compatible_candidates.length`.
- If `batch_compatible_candidates` is empty, attempt no authority CREATE; bounded capability-mismatch exhaustion may close `NO_ALLOCATION` without manufacturing a collision.
- After `CREATE_EXISTS`, advance cyclically to the next untried candidate in that same filtered unified view, while preserving the existing maximum of 3 authority CREATE attempts. `BRANCH_HEAD_MOVED` is transport/CAS stabilization, not a candidate collision; apply the bounded same-path retry below before advancing.
- Do not re-impose lane priority locally for a batched worker: the compiler already selected and ordered the product / Guide mesh represented by `candidates`.
- Invocations that are neither a multi-worker batch nor a pool preserve normal allocator lane order: `ready -> queue_ready -> role_ready -> recovery`.
- If `beacon_commit_sha` is unavailable or its first 8 characters are not hexadecimal, preserve the published `candidates` order.
- Sharding itself is local ordering over the one allocator snapshot already read: no extra preclaim read or write, no extra claim attempt, no authority change. Capability filtering is also local and stable: it may remove only definitively incompatible candidates before the hash, never reorder survivors, and never treat unknown capability as absent. The only bounded pre-shard write exception is the explicit no-authority `batch_contention_fanin` path above.

This is an efficiency mechanism only. Atomic CREATE of the deterministic PIN/claim remains the sole execution-ownership race primitive.

## Lane diversification

At most 3 atomic candidate attempts are allowed for races/stale hints.

After 2 `CREATE_EXISTS` outcomes in the same lane, the next attempt MUST come from the next non-empty lane in allocator order. Do not spend all three attempts colliding against one stale/crowded snapshot segment while `role_ready` or another useful lane is available.

**PROVEN-STALE COLLISION REFRESH:** the ordinary hot path still reads ONE compact claim-frontier snapshot. If two real authority CREATE attempts return `CREATE_EXISTS` and that snapshot is >90 seconds old at the post-collision refresh decision, reload exactly `gh-pages:live/claim-frontier.json` once before the remaining third authority CREATE. Snapshot age is evaluated at that post-collision decision, not frozen at first read; a snapshot that was fresh at launch may become refresh-eligible while attempts are in flight. Rebuild capability filtering from the refreshed snapshot; for BATCH/POOL reuse the original `beacon_commit_sha` and deterministic shard rule. The refresh never raises the three-attempt ceiling, never permits directory/project archaeology, never reads `live/allocator.json`, and never turns stale recovery into claimable work. Never refresh after `CLAIM_TRANSPORT_BLOCKED` or `CLAIM_TRANSPORT_AMBIGUOUS`; `BRANCH_HEAD_MOVED` remains governed only by its same-path stabilization rule.

An explicit authorization/safety denial is different: `CLAIM_TRANSPORT_BLOCKED` stops immediately. An unclassified bounded write failure is `CLAIM_TRANSPORT_AMBIGUOUS`; it may use at most ONE transport diversion to a different claim path from the already-loaded compatible candidates, never the denied/current action again.

### Branch-ref CAS stabilization

GitHub Contents writes may fail because another commit advanced the target branch even when nobody created the requested claim path. That is not an ownership collision.

When the connector/GitHub error explicitly proves only a branch-ref mismatch (`BRANCH_HEAD_MOVED`, e.g. the branch “is at <new> but expected <old>”) and does NOT prove the exact target path exists:
- retry the same exact claim path and byte-identical payload once against the refreshed branch head;
- do not pre-read the PIN/claim path before that retry;
- the stabilization retry does not consume one of the 3 authority candidate attempts and does not count toward lane diversification;
- retry success means ownership won; retry `CREATE_EXISTS` means the ownership race was actually lost;
- a second consecutive branch-head movement becomes `CLAIM_TRANSPORT_UNSTABLE` and STOPs immediately; never loop or spend attempts 2–3 on branch churn.

`CAS_LOST` is a legacy umbrella label and MUST NOT by itself be treated as proof of an ownership collision. Disambiguate only from the returned write error: target-path existence => `CREATE_EXISTS`; explicit branch-ref movement => `BRANCH_HEAD_MOVED`; otherwise treat it as bounded transport failure without inventing ownership evidence.

## Optimistic claim

### Portfolio

The compact claim frontier may expose one of four portfolio claim modes.

#### `PORTFOLIO_PIN_CREATE`

Use claim-frontier `claim_path` + contract-complete `candidate.claim_payload_shape`.

Required `prometeo.portfolio-pin/v1` fields:

`schema`, `pin_id`, `job_id`, `dedupe_key`, `project_id`, `generation`, `worker_id`, `claim_id`, `claimed_at`, `expires_at`, `source_head`, `predecessor_pin_ref_or_null`, `predecessor_claim_ref_or_null`, `recovery_basis_or_null`.

#### `PORTFOLIO_BARRIER_ENTER`

This is timing-only and grants NO execution authority.

1. Fill `<worker_id>` and `<now_iso>` in the supplied `prometeo.portfolio-contention-entrant/v1` payload and atomically CREATE the exact entrant `claim_path`.
2. Do NOT persist STARTED and do NOT begin substantive work. The entrant receipt is not a PIN/claim.
3. Until `contention_barrier.deadline_at`, inspect only the supplied fixture-local `entrant_dir` and `release_path`. No project/global archaeology.
4. If a valid RELEASE already exists, consume it. If distinct valid entrants reach `required_contenders` before deadline and RELEASE does not yet exist, compute the canonical cohort as the lexicographically sorted distinct entrant worker IDs truncated to exactly `required_contenders`; contenders may atomically CREATE the exact `release_path` using that exact cohort.
5. RELEASE MUST name exactly `required_contenders` distinct worker IDs in canonical order, have `grants_execution_authority=false`, and `next_action=RACE_DETERMINISTIC_PIN`. It coordinates timing only.
6. After a valid RELEASE, race `candidate.post_release_claim` unchanged ONLY when this worker_id is in the immutable RELEASE cohort. Nonmembers, late entrants and extras attempt no PIN and re-enter allocation. Only the deterministic PIN winner owns execution; cohort losers create no execution claim and follow normal collision/reallocation law.
7. If deadline arrives without valid RELEASE, CREATE the supplied timeout receipt (`pin_attempted=false`, `next_action=REENTER_ALLOCATION`) and re-enter allocation. Never attempt the PIN late.

No human countdown, numbered routing or manual synchronization is allowed.

#### `PORTFOLIO_BARRIER_RELEASED`

This mode is still non-authoritative. The allocator has validated one immutable exact-size RELEASE cohort.

- If this `worker_id` is in `contention_barrier.entrant_worker_ids`, race `post_release_claim` exactly.
- If this `worker_id` is absent, attempt no PIN and immediately continue normal allocation/sharding.
- Never reconstruct or enlarge the released cohort locally.

#### `PORTFOLIO_BARRIER_TIMEOUT`

The allocator already observed deadline without valid RELEASE. Persist the supplied timeout receipt with `pin_attempted=false`, attempt NO portfolio PIN, and re-enter allocation.

#### `PORTFOLIO_BARRIER_NOT_OPEN`

Attempt no write and no PIN for that fixture; re-enter allocation. A future barrier window must be represented by fresh allocator evidence, not guessed locally.

Ordinary portfolio jobs without explicit durable barrier metadata MUST remain `PORTFOLIO_PIN_CREATE` and incur zero rendezvous wait.

### Opportunity queue

Use compact frontier `claim_path` under:

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

- PIN/claim CREATE succeeds -> ownership reservation won; persist canonical STARTED and enter post-claim validation. If STARTED is blocked after the win, preserve that authority: retry only a proven branch-head move once, then CREATE one `prometeo.worker-heartbeat/v1` at `coordination/workers/heartbeats/<worker_id>/<timestamp_compact>.json` with exact worker/job identity, `checkpoint=POST_CLAIM_START_FALLBACK`, and `authority_ref` to the won PIN/claim. A successful fallback heartbeat is durable liveness but grants no authority. If both STARTED and fallback heartbeat are blocked, perform no substantive mutation and STOP with the existing PIN left to normal stale/recovery handling; never emit preclaim no-allocation/claim-blocked semantics.
- `CREATE_EXISTS` on the authority path -> race lost; apply lane diversification and try the next candidate.
- explicit `BRANCH_HEAD_MOVED` without target-path existence -> retry the same exact claim path and byte-identical payload once; no pre-read, no authority-attempt consumption, no lane-collision count.
- second consecutive `BRANCH_HEAD_MOVED` -> `CLAIM_TRANSPORT_UNSTABLE`; STOP immediately instead of looping.
- barrier entrant/RELEASE CREATE_EXISTS -> consume existing bounded fixture evidence; it is not an ownership collision.
- barrier timeout -> no PIN attempt; re-enter allocation.
- explicit authorization/safety denial -> `CLAIM_TRANSPORT_BLOCKED` -> STOP immediately. Never retry the denied action/path and never bypass the control.
- failure proving neither denial, target-path existence nor branch-head movement -> `CLAIM_TRANSPORT_AMBIGUOUS`; with no authority created, try at most ONE transport diversion to one already-loaded untried compatible candidate with a different claim path and no extra preclaim read. A second ambiguous failure -> STOP.
- ALLOCATOR_PIN_PAYLOAD_INVALID -> STOP immediately; this is allocator/control-plane debt, not a job collision.

At most 3 atomic authority candidate attempts for races/stale hints. The target is seconds, except an explicit barrier may wait only until its durable bounded deadline.

## Central latent-work contract

The allocator/compiler owns the cable from:

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

For explicit transport denials include `reason=CLAIM_TRANSPORT_BLOCKED`; when the single allowed ambiguous diversion cannot produce authority include `reason=CLAIM_TRANSPORT_AMBIGUOUS`; for malformed payloads include `reason=ALLOCATOR_PIN_PAYLOAD_INVALID` and missing fields when available.

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

Explicit-denial launch:
`BEACON -> allocator -> EXPLICIT_DENIAL -> CLAIM_TRANSPORT_BLOCKED -> NO_ALLOCATION -> STOP`

Ambiguous-transport launch:
`BEACON -> allocator -> CLAIM_TRANSPORT_AMBIGUOUS -> at most ONE transport diversion to a different claim path -> CLAIM OR second ambiguous failure -> NO_ALLOCATION -> STOP`

Malformed-allocator launch:
`BEACON -> allocator -> ALLOCATOR_PIN_PAYLOAD_INVALID -> NO_ALLOCATION -> STOP`

True surplus launch:
`BEACON -> execution + role + compatible recovery exhausted -> NO_ALLOCATION -> STOP`

No directory archaeology. No multi-minute `Buscando trabajo`. No false idleness caused by a disconnected metabolism layer. No barrier receipt is ever mistaken for execution authority.
