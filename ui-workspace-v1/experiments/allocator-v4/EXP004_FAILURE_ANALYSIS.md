# EXP-004 · failure analysis

Observed failure: worker 002 successfully claimed TICKET 003 and durably published RESULT GET_NEXT, then failed while trying to publish the next telemetry state transition and terminated as ERROR_TELEMETRY_WRITE_BLOCKED.

Root design defect: telemetry was a blocking prerequisite for material work. In addition, both workers and UI maintenance shared `main`, creating avoidable branch-head contention.

EXP-005 changes the failure domain:
- one branch per worker;
- main/gh-pages forbidden to workers;
- telemetry best-effort and buffered;
- only allocator/RETURN operations are material blockers;
- fine-grained timing is stored locally and emitted with RETURN instead of one online write per transition.
