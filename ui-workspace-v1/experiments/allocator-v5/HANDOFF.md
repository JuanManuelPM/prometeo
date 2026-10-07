# EXP-006 HANDOFF

Status: READY_TO_RUN.

Observed problem in EXP-005:
- two workers registered correctly;
- isolated branches worked;
- both published REGISTERED;
- allocator stayed at NEXT_TICKET 001;
- no RETURN existed;
- both stopped before GET_NEXT.

EXP-006 removes the remote protocol-read step entirely.

Execution invariant:
REGISTER → best-effort REGISTERED checkpoint → GET_NEXT immediately in the same execution.

No START_HERE fetch exists in the worker path.
The launch prompt is self-contained.

Branches:
- exp006-w001
- exp006-w002

Drive:
- registry: 14Qew_GFeTEZsxfCjPCvGsT4cSp1t8neGepe028QOEhk
- allocator: 1tclVHjED7-lyYO39AkMYY2tgDjwJA0hDIB1ebizeeW4

Fresh state verified before launch:
- NEXT_WORKER 001
- NEXT_TICKET 001
- both worker state blobs untouched.

PASS target:
- 2 unique worker slots;
- 10 unique tickets;
- 10 verified RETURNS;
- 0 duplicate tickets;
- 0 forbidden ops;
- both workers terminal EMPTY;
- telemetry failures, if any, do not stop material work.

Next only after PASS:
lease + expiry + requeue + fencing.
