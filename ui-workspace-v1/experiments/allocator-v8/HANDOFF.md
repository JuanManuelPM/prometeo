# EXP-009 · Residency Trio

Status: READY_TO_RUN.

Goal:
Launch three real workers with the exact same modular prompt and measure how long each remains mechanically resident before an actual platform interruption or an externally granted stop.

Dealer:
1zPuGriPG6j7HX_nhAw9X4qNbrSbC_qP-9XrrrvNX8u4

Fresh dealer target before launch:
NEXT_WORKER|001
MAX_WORKER|003
NEXT_TICKET|000001
STOP_GRANT|NONE

Workers:
- exp009-w001
- exp009-w002
- exp009-w003

Prompt composition is fixed-position modular:
1. KERNEL v1
2. FAILURE_CASEBOOK v1
3. MECHANICS residency-v1
4. WORK cyclic-v1
5. RETURN_LEARNING v1

Mechanical choices:
- registration and ticket claim are separate CAS operations because EXP-008 showed repeated safety blocking around more aggressive combined writes;
- no BLOCK_READ;
- no normal RETURN reread after successful create_file;
- state telemetry first CLAIM + every 10 durable RETURNs;
- RETURN durable → next CLAIM immediately;
- no worker-selected terminal state;
- a hard platform/tool refusal is reported as PLATFORM_INTERRUPTION, not as authorized completion.

The workload has no known terminal count. Ticket-derived tasks cycle locally modulo 8.
Only a future valid STOP_GRANT from the dealer authorizes graceful stop.

Public launcher:
https://juanmanuelpm.github.io/prometeo/ui-workspace-v1/?v=15
