# PROMETEO PAGE REQUEST + PUBLICATION PROTOCOL V1

## Human interaction
The human talks to `/g` and references one or more page plates plus natural-language intent.

The Guide is the human-facing router. The human does NOT manually create worker prompts, merge worker results, allocate workers, or choose planner/executor roles.

## Durable request
Before material delegation/mutation, the Guide creates one request receipt:

`coordination/pages/requests/<request_id>.json`

Required fields:
- `schema: prometeo.page-request/v1`
- `request_id`
- `created_at`
- `source_plates[]`
- `intent_literal`
- `request_kind`: `modify | compare | compose | create | archive | inspect`
- `output_mode`: `existing_page | new_page | no_page`
- `target_plate` when modifying an existing page
- `dedupe_key`
- `status`
- `authority_boundary`
- `acceptance[]`

Request ID/dedupe must be derived from stable evidence; duplicate guides converge instead of forking the same work.

## Allocation
The Guide decides from scope/evidence:

### Small / bounded
Guide or one `/wc` may claim and execute directly.

### Complex / multi-page / ambiguous architecture
Create/claim a `PAGE_PLANNER` job first. Planner output MUST be executable work units, dependencies, ownership boundaries and acceptance checks. Analysis-only prose is incomplete.

### Parallelizable
Planner/Guide materializes deduplicated child jobs. `/wc` workers claim them through existing PIN/claim laws.

### Integration
Exactly one scoped `PAGE_STEWARD` owns integration for an exclusive output surface/version. Independent critics/verifiers do not mutate the steward's output unless they win a repair claim.

## Standard pipeline
`human intent -> page request -> context load -> plan when useful -> worker execution -> steward integration -> verification -> publication candidate -> registry/change receipt -> Live`

No stage is assumed merely because the previous stage produced a file.

## Existing page modification
1. resolve target plate;
2. load page context + current exact baseline;
3. record intent/request;
4. claim scoped mutation;
5. implement on candidate bytes;
6. test/critic as required;
7. publish only under existing authority policy;
8. update page context with decision/result;
9. update page registry `revision`, `changed_at`, new `P###`, and short `change_note`;
10. Live surfaces the change as unread until the human opens it.

## New page creation
A page is not registered as usable merely because HTML exists.

1. request defines `output_mode=new_page` and source plates/provenance;
2. planner/steward chooses a stable `page_id`, folder, title, publishing route and acceptance checks;
3. reserve a unique `AAA000` plate using `PAGE_PLATE_PROTOCOL_V1.md`;
4. CREATE its page context path;
5. build candidate;
6. verify required viewport/interaction/content checks;
7. publish bytes to a durable public path when authorized;
8. verify public reachability when relevant;
9. append the page to `PAGE_WATCH_REGISTRY_V1.json` with plate/context/revision/change ID;
10. only then can Live expose it as a normal page.

## Multi-page composition
For `CAL001 + HAB001 + GOO001: integrá...`:
- source contexts are READ inputs;
- original pages remain intact unless human explicitly requested changes to them;
- a new integrated page normally gets a new plate;
- provenance records all source plates and source revisions;
- planner must identify shared state/data contracts before visual merging when integration is functional rather than merely presentational.

## Worker recursion
Workers may create grounded successor jobs and planners may replenish the frontier. They do NOT need to return to the human or `/g` for routine scheduling. `/g` remains the human conversation surface and consumes durable receipts.

## Publication receipt
Each material publication/update leaves a receipt under:
`coordination/pages/publications/<PLATE>/<timestamp-or-revision>.json`

Fields should include source request, source revision, output revision, changed paths, tests, public URL, registry change ID, unresolved boundaries and worker/steward evidence.

## Human acceptance
Publication/visibility does not equal Human Acceptance. The human opening/reviewing a page marks notification seen, not accepted. Acceptance must remain explicit where required.

## Recovery
If planner/worker/steward disappears:
- heartbeat/recovery laws apply;
- new worker may recover after eligibility;
- deterministic request/plate/claim identities prevent duplication;
- late work is reconciled, not silently overwritten.

## Goal
The shortest human loop should be:
`open /g -> type plate(s) + intent -> continue conversation`
Everything else should be durable orchestration.
