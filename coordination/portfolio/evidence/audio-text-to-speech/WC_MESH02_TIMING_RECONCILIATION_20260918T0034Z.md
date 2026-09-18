# WAVE-20260917-MESH-02 · worker timing reconciliation

Worker: `wc-mesh02-2128-a7c4f9`
Observed local clock: `2026-09-17T21:34:31-03:00` (`2026-09-18T00:34:31Z`)
Authority: evidence-only correction; append-only PIN/claim/return files are not rewritten.

## Incident

This worker manually advanced timestamps while executing multiple allocations. GitHub server commit timestamps show several TTS receipts were future-dated relative to their actual durable creation time. Further authority writes from this worker are stopped to avoid compounding liveness/expiry evidence.

## Server-time reconciliation

| Record | Declared time | GitHub commit time | Commit |
|---|---:|---:|---|
| TTS cached GET PIN | claimed_at 00:34:00Z | 00:31:30Z | `bf6d4cc37b2660b47c7057f5d950a4d6d8f00273` |
| TTS cached GET STARTED claim | claimed_at 00:34:00Z | 00:31:40Z | `c44a5e2350cbefd582015f3763ab55ea029f3641` |
| TTS cached GET RETURN | returned_at 00:36:00Z | 00:32:25Z | `5115dcecedbccf11a14ff6819a12cb95d00e5322` |
| TTS browser smoke PIN | claimed_at 00:37:00Z | 00:32:38Z | `54f7d13c879d9ce7e6df82c7f4b37b2ab366a5fe` |
| TTS browser smoke STARTED claim | claimed_at 00:37:00Z | 00:32:45Z | `44e2cc412daa4b77c5bfd2e6469620b001274571` |
| TTS browser smoke RETURN | returned_at 00:40:00Z | 00:33:30Z | `5daa7dddffbf29ec300e31ae2596ede791b06928` |

## Interpretation

- GitHub commit `created_at` is the trustworthy observation clock for these six writes.
- The substantive evidence/results in the returns remain valid; only the worker-authored lifecycle timestamps are affected.
- No Current, Human Accepted or Served authority was promoted by these jobs.
- Do not use the future-dated worker fields alone to infer real elapsed liveness for this worker.
- Start any further allocation from a fresh worker/beacon with a current clock rather than extending this worker lifecycle.

## Product work preserved

1. `portfolio-tts-existing-cache-get-verify-v1`: exact network divergence recorded; zero POST/generation.
2. `portfolio-tts-generic-text-surface-browser-smoke-v1`: static published contract verified; representative-browser smoke remains a capability boundary.

