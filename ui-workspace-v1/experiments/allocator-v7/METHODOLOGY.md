# EXP-008 · Mechanical Arena

This run intentionally does NOT terminate by task exhaustion.

The dealer has an unbounded NEXT_TICKET counter and STOP_GRANT|NONE.
A worker is not authorized to stop because work feels repetitive, sufficient, long-running, expensive, or endless.

Only this exact condition authorizes a graceful stop:
- the worker reads the dealer;
- the same revision contains STOP_GRANT|ALLOW:<nonce>;
- <nonce> exactly matches STOP_NONCE in that dealer.

No EMPTY, PARKING, BLOCKED, DONE, or self-selected terminal state exists.

Tasks are derived locally from ticket modulo 4, eliminating BLOCK_READ from the hot path.

Five variants compare:
A CONTROL: separate registration and first claim, verify every RETURN.
B FAST: register + first claim in one CAS, verify every RETURN.
C COLISEO: same fast mechanics, causal CLAIMED→WORK→RETURN→CLAIM framing.
D NO_VERIFY: same causal loop, create success is durable; exact fetch only if create result is uncertain.
E ULTRA_RESIDENT: same as D, but state telemetry only every 10 returns.

All variants write one initial CLAIMED state so the UI can measure first visible life.
After that, telemetry is amortized and never blocks material work.

Important limitation:
EXP-008 measures residency and throughput, not automatic recovery of an abandoned in-flight ticket.
Because the queue is unbounded, one dead worker does not stall global progress. Orphan recovery can be added after the winning hot path is identified.
