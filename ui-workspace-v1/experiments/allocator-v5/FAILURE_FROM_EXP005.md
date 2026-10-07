# EXP-005 outcome → EXP-006 design change

Observed durable state:
- both workers registered successfully;
- both published REGISTERED on isolated branches;
- registry advanced to NEXT_WORKER 003;
- allocator remained at NEXT_TICKET 001;
- no RETURN existed.

Therefore the failure boundary was exactly:
REGISTERED → remote protocol read → GET_NEXT.

EXP-006 removes that boundary entirely.

There is no remote protocol read after registration. The launch prompt is the entire protocol and explicitly requires:
REGISTER → best-effort REGISTERED checkpoint → GET_NEXT immediately in the same turn.

Branch isolation and non-blocking telemetry are retained.
