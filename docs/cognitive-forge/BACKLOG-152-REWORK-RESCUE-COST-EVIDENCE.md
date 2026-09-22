# BACKLOG-152 — retrabajo y rescates

Status: IMPLEMENTED

Target: `pages/forge-blueprint/index.html`.

The Blueprint observer now exposes rescue cost instead of only counting rescue events.

The durable source is each job's existing `rescue_count`. The UI derives:
- rescue attempts;
- number of rescued jobs;
- estimated rework cost as `jobWeight(job) × rescue_count`, summed across the run.

This cost is displayed as expected-word-equivalent work next to the rescue count. It deliberately does not invent lost wall-clock time because failed-attempt elapsed time is not durably available for every rescue.

Live backend verification on `FORGE-BLUEPRINT-84-01` at implementation time:
- rescued jobs: 13
- rescue attempts: 13
- expected rework equivalent: 45,250 weighted words

Committed-byte verification confirmed the visible rescue-cost metric, deterministic derivation from `rescue_count`, and explicit wording that the value is an estimated work equivalent rather than fabricated time loss.

Implementation commit: `d24f3c5afbadc627ba7a8986efff6332191f17ca`.
Verified blob: `823272fd50b64b3ade47e29d915003b25769a11d`.
