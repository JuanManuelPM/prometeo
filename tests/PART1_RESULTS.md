# Part 1 test results · adversarial repair pass

Status: **AUDITED / REPAIRED / TESTED CANDIDATE — NOT HUMAN ACCEPTED — NOT SERVED**

## Core and regression suite

| Test | Result |
|---|---|
| `r1_candidate.test.mjs` | PASS |
| `runtime-ownership.test.mjs` | PASS |
| `platform-engines.test.mjs` | PASS |
| `part1-static.test.mjs` | PASS |
| `part1-contract.test.mjs` | PASS |
| `part1-runtime-services.test.mjs` | PASS |
| `part1-persistent-engines.test.mjs` | PASS |
| `part1-semantic-restore.test.mjs` | PASS |
| `part1-persistence-cas.test.mjs` | PASS |
| `part1-engine-invariants.test.mjs` | PASS |
| patched JS syntax (`node --check`) | PASS |
| critical JSON parse | PASS |

## Exact-repository CI evidence

GitHub Actions workflow: `Part 1 Candidate CI`

- run ID: `33868680112`
- tested head: `c35bb67d37aa6a5a34b9b7369cd3126bac37c690`
- conclusion: **SUCCESS**

The workflow runs the original candidate/ownership/platform tests plus the strengthened Part 1 regression suite, patched JavaScript syntax checks, and critical JSON parsing.

## New adversarial guards added during audit

- commit-time CAS race rejection;
- stage-time stale write rejection;
- runtime revision ownership;
- in-memory rollback after persistence conflict;
- reload after conflict;
- semantic fingerprint ignores `capturedAt` write churn;
- nested Focus Lease prevents shell destruction;
- PageKit nests under terminal focus;
- PageKit reparenting preserves persistent iframe instance;
- multiple-answer set semantics;
- function-based class checker survives normalization;
- locked Class actions fail;
- duplicate/cyclic Student World topology fails;
- locked Student World progress/complete fails;
- generic Shell v1 is not imported by V53 integration;
- wrapper delegates fullscreen/clipboard capabilities;
- V53 adapter does not observe animation `style/class` attributes;
- source contract pins V53 + tree + pages identities.

## Gates intentionally still open

| Gate | State |
|---|---|
| Chromium composition in this sandbox | BLOCKED BY ENVIRONMENT (`ERR_BLOCKED_BY_ADMINISTRATOR`) |
| Real served browser matrix | DEFERRED / PART 3 |
| Perceptual visual QA | DEFERRED / PART 3 |
| Human visual acceptance | DEFERRED / PART 3 |
| Served correctness | DEFERRED / PART 3 |

The browser block is a sandbox-policy limitation and is **not** converted into PASS or product failure. CI success proves the exact repository code/tests run successfully; it does not prove browser, perceptual, Human, or Served correctness.
