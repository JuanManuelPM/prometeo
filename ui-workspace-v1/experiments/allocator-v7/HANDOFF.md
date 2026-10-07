# EXP-008 · Mechanical Arena · READY_TO_RUN

Purpose: finish the mechanical hot path before working on answer quality.

Five concurrent variants:
A CONTROL — separate register + first claim, verify each RETURN.
B FAST — register + first claim in one Drive CAS, verify each RETURN.
C COLISEO — B mechanics with causal resident framing.
D NO_VERIFY — C hot path, no normal RETURN reread.
E ULTRA_RESIDENT — D hot path, telemetry only every 10 returns.

There is deliberately NO task exhaustion.
The ticket counter is unbounded.
Workers may terminate only after reading a valid dealer STOP_GRANT matching STOP_NONCE.
All dealers begin STOP_GRANT|NONE.

The page records copy-click timestamps and ranks:
- click → worker_started
- worker_started → first_claim
- click → first_claim
- first_claim → first public state
- first_claim → first RETURN
- average RETURN → next CLAIM gap
- tasks/min
- external calls/task
- conflicts, retries, forbidden ops
- unauthorized stop / last durable ticket

Known boundary:
This experiment does not yet reclaim an orphaned in-flight ticket. Infinite queue means an orphan does not stall global throughput. Reclaim/lease is added after selecting the fastest stable hot path.
