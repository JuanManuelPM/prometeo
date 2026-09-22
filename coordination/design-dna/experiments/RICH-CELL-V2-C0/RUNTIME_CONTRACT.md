# Prometeo Rich Cell v2 — Runtime Contract

Status: **ARMED FOR REAL FRESH WORKERS**
Batch: `PROMETEO-RICH-CELL-V2-C0`
Worker limit: **20**

## Durable lifecycle

`EMPTY → FRAMING → FRAMED → SOLVING → PRODUCED → REVIEWING (when required) → DONE`

FRAMING persists a five-question mini-exam before SOLVING. The framer and solver may differ; SOLVE prefers another framer when available. REVIEW is assigned to a different solver whenever another active worker exists.

## Work priority

1. SOLVE a FRAMED cell.
2. REVIEW a PRODUCED cell that requires review.
3. FRAME an existing EMPTY cell.
4. CREATE a new cell only when no higher-priority work is claimable.

Workers claim globally across the ten logical grids. Grid ownership never pins a worker.

## Elastic frontier

- 10 logical grids.
- 100 initial EMPTY cells per grid.
- `cell_no` is monotonic, unique per grid and has no 100-cell cap.
- Creation is serialized with an advisory lock and protected by unique `(batch_id, grid_no, cell_no)`.
- A verified smoke created cell **101** after a grid whose first 100 cells were DONE.
- TV uses 100-cell windows; storage identity never resets per page.

## Phase payloads

FRAMING: exactly 5 distinct question objects with:
`question, why_it_matters, required_evidence_or_reasoning, failure_modes[], expected_output`.

SOLVING: 5 answers + synthesis + assumptions + self-checks + evidence + gaps + optional artifact. Batch mechanical floor is 1200 non-artifact words; launch prompt targets ~2000–4000+ useful words where justified.

REVIEW: independent semantic record with PASS/REVISE/FAIL; it is separate from transport/mechanical acceptance.

## Metrics

Persisted:
- framer / solver / reviewer worker;
- words per phase;
- phase timestamps;
- artifact bytes;
- handoffs;
- cells created/framed/solved/reviewed per worker;
- semantic status separate from mechanical claim acceptance.

## Runtime RPCs

- `public.prometeo_rich_enter_v2(agent_id,batch_id)`
- `public.prometeo_rich_take_v2(agent_id,batch_id)`
- `public.prometeo_rich_submit_v2(agent_id,packet_token,result)`
- `public.prometeo_rich_wait_v2(agent_id,batch_id,max_wait_seconds)`
- `public.prometeo_rich_batch_status_v2(batch_id)`
- `public.prometeo_rich_reap_v2(batch_id)`

## TV

Read-only bridge:
`public.prometeo_tv_rich_cell_bridge_v2`

Truth flags:
- `synthetic=false`
- `demo_fallback_allowed=false`
- source = `SUPABASE_RICH_CELL_CANONICAL_PROJECTION`

It exposes real lifecycle state, latest 100-cell window per grid, worker metrics, words, handoffs, semantic state, recent canonical artifacts and sanitized events.

## Admission

First 20 backend arrivals become members. Later backend arrivals persist as sessions and return `NO_WORK / RICH_BATCH_FULL`.

Recommended human fresh-chat wakes: **42**. This is an empirical launch recommendation, not a seat count: E0B observed 22 backend sessions from approximately 37 human wakes. The batch itself still admits exactly 20.
