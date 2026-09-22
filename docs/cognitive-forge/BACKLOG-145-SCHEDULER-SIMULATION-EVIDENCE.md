# BACKLOG-145 — simulación del scheduler

Status: IMPLEMENTED

Target: `pages/forge-blueprint/index.html`.

The Blueprint ETA now prefers a deterministic JavaScript simulation of the remaining scheduler queue instead of only extrapolating aggregate throughput.

Simulation model:
- capacity comes from observed Blueprint workers, falling back to configured expected workers;
- each point is treated as its remaining sequential phase chain;
- currently `LEASED` jobs occupy worker lanes and contribute predicted remaining time from observed phase duration;
- a job cannot start before the prior phase in its point has projected completion;
- remaining jobs are greedily assigned to the earliest available worker lane;
- per-job durations reuse the existing phase-median estimator, with normalized historical timing fallback;
- if the simulation lacks enough evidence or encounters an inconsistent state, it returns no estimate and preserves the prior history/current-throughput ETA fallback.

Committed-byte verification confirmed worker capacity, per-point chains, active-job remaining time, dependency release times, worker lanes, scheduler preference, fallback preservation, and UI provenance text.

Implementation commit: `5bf82bb947611aac3a91d10edf2762604d340ebb`.
Verified blob: `03fe7bdc2f2039b2ab9dd8280cecdfe0c3e4b310`.
