# PROMETEO · PART 1 ADVERSARIAL AUDIT

Status: **REPAIRED CANDIDATE — NOT HUMAN ACCEPTED — NOT SERVED**

Code anchor after repairs: `8f6c319577565acf1aa916d9813b7d8890d7b8e2`

## Purpose

Audit Part 1 as if its own claims were wrong. Preserve V53 visually, attack the new backstage layers, repair concrete failures, and expose residual work before Part 2.

## Major findings and disposition

| ID | Severity | Finding | Disposition |
|---|---|---|---|
| A01 | Critical | Treating V23 as the visible base caused a visual regression. | FIXED earlier: V53 is visible canonical base; V23 is physics oracle/rollback donor. |
| A02 | High | Generic Shell v1 would create a second terminal/grip over V53. | FIXED: V53 adapter only; generic shell marked archived/not for V53. |
| A03 | Critical | Persistence checked stale revision at `stage()` but not again at `commit()`. Two staged writes could overwrite. | FIXED: commit-time compare-and-swap (`PROMETEO_STALE_STATE_COMMIT`). |
| A04 | High | Persistence comments implied durable receipts although receipt array was process-local. | FIXED TRUTH: receipts are explicitly session diagnostics; durable authority ledger moved to Part 2. |
| A05 | High | V53 persistence fingerprint included `capturedAt`, causing semantically identical states to look changed. | FIXED: semantic fingerprint excludes timestamps. |
| A06 | High | Adapter observed `class/style` mutations through V53 animations, creating unnecessary synchronization/persistence pressure. | FIXED: observer reduced to structural `childList`; semantic fingerprint suppresses no-op writes. |
| A07 | High | Offscreen/preloaded terminal cards could be mistaken for the current terminal. | FIXED: terminal lookup must match `__PROMETEO_V53__.getState().currentNode`. |
| A08 | High | Destroying shell adapter while PageKit held a nested focus lease could orphan focus state. | FIXED: destruction fails closed with `PROMETEO_SHELL_DESTROY_WITH_NESTED_FOCUS`. |
| A09 | High | PageKit could acquire focus before the V53 terminal lease existed. | FIXED: PageKit synchronously asks V53 adapter to ensure terminal lease first. |
| A10 | Medium | Persistent PageKit instance could remain attached to an old container after page re-render. | FIXED: explicit `attach(container)` / reparenting. |
| A11 | Critical | Class/Student runtimes wrote state without revision ownership; another tab/runtime could be silently overwritten. | FIXED: runtimes track revision, write with CAS, roll back in-memory state on conflict, and expose `reload()`. |
| A12 | High | Runtime exposed mutable core engine, allowing persistence bypass. | FIXED: public runtime API wraps dispatch; raw mutable engine is no longer exposed. |
| A13 | High | Classes supported `exercise.check()` but normalized config via cloning that could reject functions. | FIXED: normalization preserves executable check functions. |
| A14 | High | `POSTPONE`/reset semantics could bypass locks when called by ID. | FIXED: locked postpone/hint/answer fail; reset preserves lock state. |
| A15 | Medium | Multiple-correct answers were ambiguous. | FIXED: explicit set semantics via `multiple`, `inputType=multi`, or `answerMode=set`; arrays otherwise remain alternative accepted answers. |
| A16 | Critical | Student World allowed duplicate IDs, prerequisite cycles, and progress/complete on locked nodes. | FIXED: duplicates/cycles rejected; locked progress/complete fail. |
| A17 | High | Semantic restore trusted build string even though catalog files are independently loaded. | PARTIALLY FIXED: tree/pages Git blobs are pinned statically and runtime bridge pins catalog metadata/source-contract ID. Part 2 must compute/verify content identity as durable authority. |
| A18 | Medium | Part 1 outer iframe was described too much like a product candidate. | FIXED: reclassified as composition harness only; fullscreen/clipboard capability delegation added. |

## New regression guards

The Part 1 suite now includes or strengthens coverage for:

- stage-time and commit-time CAS;
- stale runtime write rejection;
- in-memory rollback after persistence conflict;
- reload after conflict;
- semantic snapshot route replay without pixel coordinates;
- timestamp-insensitive persistence fingerprint;
- nested-focus destroy fail-closed;
- PageKit focus nesting under V53 terminal;
- PageKit reparenting without iframe replacement;
- multi-answer set semantics;
- function-based answer checker survival;
- class locked-action rejection;
- Student World duplicate/cycle rejection;
- Student World locked progress/complete rejection;
- wrapper fullscreen/clipboard delegation;
- generic Shell v1 absent from V53 bridge;
- animation `style/class` mutations absent from adapter observation.

## Truth corrections

Part 1 must **not** claim:

1. that the outer iframe composition harness is the final product surface;
2. that PageKit state survives a browser reload unless PageKit itself proves that behavior;
3. that session diagnostic persistence receipts are the durable authority ledger;
4. that Context Foundry v1 is the complete Context Foundry;
5. that build ID alone proves catalog compatibility;
6. that browser/perceptual/served correctness has passed;
7. that any Human Accepted or production pointer moved.

## Residual risks intentionally handed to Part 2

### R01 · Context Foundry is only a kernel
Current v1 is memory-only. It lacks durable byte/index/retrieval layers, watermarks, supersession, privacy inheritance, reopenability, and deterministic context-pack receipts.

### R02 · Privacy inheritance is not yet closed
A derived record can currently be classified independently of a LOCAL source. Part 2 must propagate privacy through lineage and fail closed on ambiguous derivation.

### R03 · Durable authority receipts are not implemented
Part 1 persistence receipts are diagnostic/session evidence only. Part 2 owns append-only durable operation/authority receipts.

### R04 · Catalog identity is not yet runtime-cryptographic
Static Git source contract pins exact blobs; the browser bridge checks build/catalog metadata. Part 2 must introduce deterministic catalog/content IDs used by Current Graph and migrations.

### R05 · Cross-version state migration is incomplete
Persistence has deterministic migration mechanics, but real Navigator/Class/World schema migrations and compatibility matrices are not authored yet.

### R06 · Multi-tab conflict UX is fail-closed, not merged
CAS prevents silent corruption. Part 2 must decide per namespace whether conflict means reload, merge, fork, or human decision.

### R07 · Browser storage failure policy needs a durable strategy
`localStorage` fallback to memory avoids crashes but cannot satisfy reincarnation. Part 2 must distinguish ephemeral fallback from durable state authority and surface degradation appropriately backstage.

### R08 · PageKit reload persistence is unproven
Host close/open preserves the iframe instance in-session. Full reload/reincarnation of whiteboard/laser/image state must be verified or explicitly designed.

### R09 · Class/World event arrays can grow without bound
Part 2 must separate durable evidence/event history from compact current state, rather than truncating silently.

### R10 · Composition harness adds an iframe boundary
Useful for injection testing, but not the final serving architecture. Final build should preserve V53 visible DOM/physics while loading backstage runtimes without an unnecessary outer product iframe.

## Gate to Part 2

Part 2 may start only from:

- V53 visible source contract;
- repaired Part 1 runtime/code anchor or later descendant containing these repairs;
- explicit supersession records;
- no production promotion;
- browser/perceptual gate still open.

The next phase should build **durable truth and metabolism**, not revisit V53 visual design unless a regression is demonstrated.
