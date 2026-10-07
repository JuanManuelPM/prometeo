# EXP-006 protocol archive

This file is documentation only. Workers MUST NOT read it during the run.
The launch prompt is self-contained and is the only execution protocol.

Core loop:
REGISTER → REGISTERED checkpoint best-effort → GET_NEXT → BLOCK_READ → local work → RETURN_PUBLISH → RETURN_VERIFY → RETURNED checkpoint best-effort → GET_NEXT → ... → EMPTY.
