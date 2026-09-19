# EFF034 bounded runtime observation — 2026-09-19T15:17:00Z

Worker: `wc-20260919T145702Z-b4a9587e3851`
Authority: `coordination/portfolio/pins/portfolio-eff034-live-stale-collision-refresh-observation-v1/G000002.json`

## Predicate required

EFF034 runtime promotion requires one real /wc execution with:
- two actual authority CREATE attempts classified CREATE_EXISTS;
- the already-loaded compact claim-frontier older than 90 seconds at the post-second-collision decision;
- at most one refresh of only `gh-pages:live/claim-frontier.json`;
- same beacon shard seed reused;
- only the remaining third authority attempt spent.

The job explicitly forbids manufacturing collisions or delaying a worker to force the predicate.

## Bounded recent evidence

Recent v3.30 PROD-01 no-allocation records inspected:
- `wc-20260919T145658Z-b8438b39688d`: 1 compatible candidate, exactly 1 CREATE_EXISTS, then compatible frontier exhausted.
- `wc-20260919T145701Z-9309ecd3c774`: exactly 1 CREATE_EXISTS; stopped on local-retention runtime boundary.
- `wc-20260919T145726Z-fd7c22b6903e`: exactly 1 CREATE_EXISTS; subsequent Guide authority attempt hit explicit transport denial.
- `wc-20260919T145619Z-60c4876eac4a`: authority write blocked by transport safety; no qualifying pair of CREATE_EXISTS.

None proves two CREATE_EXISTS on one execution, therefore none can exercise the stale-age refresh decision.

## Verdict

`BOUNDARY_UNOBSERVED`.

EFF034 remains `STATIC_GUARDED_PENDING_RUNTIME`. No collision, sleep/delay, extra authority attempt, allocator mutation, or artificial stale snapshot was introduced.
