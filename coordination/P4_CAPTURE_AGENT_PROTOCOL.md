# PROMETEO · PATENT EXECUTION PROTOCOL

Protocol ID: **PROMETEO_EXHAUSTIVE_100/v2**  
Status: **FROZEN PRE-EXECUTION CANDIDATE PROTOCOL**

This protocol defines what a fresh execution agent must do after receiving a Prometeo Patent. It is intentionally independent of chat history. A Patent is task transport; repository Reincarnation remains authority reconstruction.

## 1. Trigger

A human may provide only:

```text
PROMETEO PATENT · PAT-...
https://.../patent/<opaque-token>
```

That is sufficient instruction to begin this protocol when the agent has the necessary web/repository access. Do not ask the human to restate the task before attempting Patent resolution.

If Patent retrieval is impossible in the current product/session, ask only for the Patent's full copied payload or identify the exact access blocker. Do not substitute remembered context.

## 2. Phase A — Patent validation before interpretation

Before reading implementation files or proposing a solution:

1. Fetch the Patent snapshot.
2. Validate Patent schema/version.
3. Validate expiry and revocation state.
4. Recompute/verify snapshot digest when material permits.
5. Verify selected Capture revision identities/digests.
6. Verify the privacy/export receipt covers every exported Capture/summary source.
7. Read the execution profile ID/path/digest.
8. Record Patent creation Current Graph revision and Catalog identity.
9. Record Seed/Work Item IDs.
10. If any required field is missing/corrupt, stop with exact `PATENT_INVALID_*` blocker. Never infer missing material from conversation memory.

## 3. Phase B — Reincarnate Prometeo independently of the Patent

Read `reincarnation/PROMETEO_REINCARNATE.md`, then `reincarnation/BOOTSTRAP.json`, and validate every required source. At minimum reconstruct:

- what Prometeo is;
- Current Graph and revision;
- Human Accepted scopes;
- Served inherited state;
- active visible frontend identity;
- Catalog identity/pages/writable targets;
- Lineage and Capability Registry;
- HOT context and relevant WARM/COLD context;
- Pending/CARRY/Watermarks;
- receipt-ledger validity;
- change/test/release contracts.

A Patent may narrow the work but may not redefine these authorities.

## 4. Phase C — Reconcile Patent creation state with live durable state

Compare:

- creation Current Graph revision/digest vs current;
- creation Catalog identity vs current;
- page source identities/writable targets vs current;
- relevant shared capability owners vs current;
- selected Capture revisions vs frozen Patent data;
- open/recent context vs Patent frozen snapshot.

Classify each difference as:

- `NO_DRIFT`;
- `COMPATIBLE_ADVANCE`;
- `REPLAN_REQUIRED`;
- `AUTHORITY_CONFLICT`;
- `SOURCE_UNAVAILABLE`.

Do not write until `AUTHORITY_CONFLICT` and `SOURCE_UNAVAILABLE` are resolved or truthfully block execution.

## 5. Phase D — Understand the Human intent before planning

Read all exported new Captures literally before summarizing them. Then read bounded recent literal context and rolling historical summary/negative knowledge for affected pages. Keep separate:

- exact new user wording;
- machine transcript status;
- user edits/confirmation;
- prior Human decisions;
- derived summaries;
- product authority/current source.

Build a short internal intent model: requested outcome, likely targets, ambiguous references, constraints, explicit non-goals, previous failed approaches and regressions to preserve.

Do not turn every spoken suggestion into an accepted product decision automatically. The execution request determines what is in scope; authority metadata determines what is already accepted.

## 6. Phase E — Mandatory 100-title planning pass

**Before material writes, print exactly 100 task-specific titles in one contiguous numbered index.**

The 100 titles are a coverage matrix, not a word-count trick. They must be planned after Patent + Reincarnation + drift reconciliation, and must collectively cover all task-relevant layers such as:

- authority/source reconstruction;
- user intent and ambiguity;
- current implementation inspection;
- reuse/capability ownership;
- interaction/input/persistence;
- data/schema/privacy;
- desktop/mobile/browser behavior;
- error/failure modes;
- regressions/known diseases;
- implementation order/dependencies;
- tests/evidence;
- candidate/rollback;
- Human acceptance;
- Served verification;
- receipts/context metabolism/closure.

Rules:

1. Exactly 100 distinct numbered titles.
2. No titles whose only purpose is to inflate the count.
3. No repeated title with cosmetic wording changes.
4. No fake test/experiment titles if the task cannot exercise them.
5. A trivial/not-applicable dimension may still occupy a planned slot only if later classified `N/A` with a concrete reason.
6. Planning the 100 titles does not itself satisfy any item.

## 7. Phase F — Expand the 100-title plan at materially higher depth

After printing all titles, classify every one:

- `ACTIVE` — must be executed/verified for this Work Item;
- `N/A` — demonstrably not applicable;
- `DEFER` — valid but outside current authority/scope/dependency, with explicit reason.

For every ACTIVE point, the specification must include enough of the following to remove important decisions from the later coding phase:

- exact objective;
- why this point exists;
- current evidence/source;
- affected owner/path/component;
- dependencies;
- constraints/invariants;
- alternatives considered;
- selected approach and reason;
- write scope;
- risks/failure modes;
- test method;
- pass condition;
- evidence to capture;
- rollback/non-regression requirement;
- output consumed by later points.

The specification must be materially more informative than the 100-title index. Repetition, generic software advice and long prose without new decisions are failures.

## 8. Phase G — Resolve implementation ownership before first write

Use Catalog, Capability Registry, Lineage, WHERE_USED and the Modification Resolver.

For each requested change determine whether the real owner is:

- page-local content/source;
- shared capability;
- Navigator adapter/runtime;
- Capture core;
- persistence/context/privacy/workflow;
- remote transport;
- release/publishing layer.

A symptom observed on one page is not proof that that page owns the defect.

Before a shared change, enumerate representative consumers. Preserve product visual identity even when sharing mechanisms.

## 9. Phase H — Declare the exact write contract

Before the first mutation, state:

- repositories allowed;
- branches/candidate paths allowed;
- exact files/directories expected to change;
- forbidden stable/Human Accepted files;
- expected source identities/hashes;
- test layers required;
- publication owner;
- rollback identity;
- Human authority boundary.

If new evidence requires expanding the write scope, record an explicit amended scope before doing so.

## 10. Phase I — Execute continuously through worker-soluble gates

Once scope is declared, implement in dependency order. The agent must not stop after every substep merely to summarize or ask for another `.`.

During one execution run:

- repair technical failures that are solvable with available tools;
- rerun failed tests after repairs;
- add regression coverage for discovered worker-soluble defects;
- continue until all automatable gates are complete or a genuine external/Human authority boundary is reached.

Do not promise background work. Do not claim a tool action that was not executed.

## 11. Phase J — Evidence laws

Always preserve these distinctions:

```text
configured != executed
exists != participates
latest != current
source commit != Served observation
Candidate != Human Accepted
Human Accepted != Served
receipt/declaration != proof unless inspectable evidence is linked
```

Tests must bind to final candidate bytes they claim to validate.

## 12. Phase K — Candidate and Human authority

A normal Work Item returns a Candidate after verification. It does not directly overwrite Human Accepted/Served state.

If the change has a visual/behavioral surface that genuinely requires Human acceptance:

1. publish an isolated exact candidate/canary;
2. provide the shortest useful test script;
3. stop at that exact authority boundary;
4. do not infer approval from silence, preview loading or technical passes.

After explicit acceptance, continue through receipt-backed Current transition, stable publication and Served verification if tools/authority permit.

## 13. Phase L — Release and Served verification

Publication has one declared owner. Avoid multiple workflows writing the same target.

After promotion:

- independently inspect/fetch stable Served bytes;
- run browser gates on the stable URL;
- verify expected identity/build and no critical console/page errors;
- test rollback A→B→A when required by release contract;
- record stable Served evidence separately from source/publish receipt.

## 14. Phase M — Receipt return to Capture

Execution completion/blocked state must produce a standard Prometeo receipt or exact blocker. The receipt/return must link:

- Patent code/internal ID;
- Seed and Work Item IDs;
- exact selected Capture revisions;
- base/source identities;
- files changed;
- candidate/commit identity;
- tests/evidence;
- privacy decisions;
- Human acceptance identity if any;
- Served identity only if independently verified;
- rollback refs;
- next state.

The private Capture transport may cache this status for UI, but it must reference the standard durable receipt rather than becoming a competing authority ledger for product state.

## 15. Phase N — Memory metabolism

After a Work Item is accepted/integrated, update the private Capture memory under `P4_CAPTURE_MEMORY_CONTRACT.json`:

- mark covered Capture intent metabolized;
- keep the latest ten eligible literal revisions;
- roll older covered material into DERIVED_EVIDENCE summary;
- preserve covered revision IDs/digests;
- advance watermark only after durable summary persistence;
- retain unresolved/rejected/blocked material as open or negative knowledge;
- never mutate historical Patent snapshots.

## 16. Failure behavior

Stop only on a blocker that cannot be repaired with available tools/authority in the current turn, such as:

- required private source unavailable;
- Patent invalid/expired with no authorized fallback;
- ambiguous target after Catalog/Lineage resolution genuinely requires Human choice;
- exact Human visual/behavioral acceptance required;
- external device test required and no device automation exists;
- repository/backend write permission denied after actual attempt.

When blocked, state exactly:

- last completed gate;
- failed gate;
- evidence;
- what remains unchanged;
- smallest Human/external action needed;
- exact restart pointer.

Do not replace a blocker with invented results.

## 17. Special rule for `.` during a Patent execution

If the active durable `NEXT_DOT` contract says execution is prepared, `.` means continue the active Work Item from the durable frontier through all automatable gates in dependency order. It does not mean "do one numbered point".

A dot is a continuation signal, not permission to ignore authority, privacy or Human acceptance boundaries.

## 18. Completion condition

A Patent execution is complete only when its Work Item reaches a truthful terminal or authority-bound state and the corresponding evidence is durable. Possible truthful outcomes include:

- `INTEGRATED_AND_SERVED_VERIFIED`;
- `HUMAN_ACCEPTANCE_REQUIRED`;
- `CANDIDATE_READY`;
- `BLOCKED_EXTERNAL`;
- `REJECTED`;
- `ARCHIVED`.

Never convert partial work into a false `COMPLETE` merely to close the conversation.
