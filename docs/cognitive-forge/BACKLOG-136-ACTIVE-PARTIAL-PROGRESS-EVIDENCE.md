# BACKLOG-136 — progreso parcial activo

Status: IMPLEMENTED

Target: `pages/forge-blueprint/index.html`.

The weighted Blueprint estimator now allows an active `LEASED` job to contribute estimated partial progress before publication.

Method:
- completed jobs still contribute 100% of their expected-word weight;
- an active job estimates expected duration from the median `elapsed_ms` of completed outputs in the same phase;
- if that phase has no completed timing samples yet, it falls back to the median observed milliseconds per unit of expected-word weight across completed outputs;
- elapsed/expected duration determines the active fraction;
- active credit is capped at 90%, so unpublished work cannot be counted as complete;
- READY/BLOCKED/non-started jobs contribute zero partial credit;
- ETA remaining work uses completed + estimated-active effective work, while throughput continues to be based on published DONE work.

Backend evidence before implementation showed timed completed outputs for phases 1–3, providing real historical timing data.

Implementation commit: `7d3c59abfb06fee344ee0a34c6835b5074549f65`.
Verified blob: `a5873100eb8d5b4421e2b5469a9b5014bb1b6931`.
