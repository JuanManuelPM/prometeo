# CORE-V1 · ADMISSION · BUILD evidence

Status: VERIFIED — no code change required

Scope: `prometeo_bootstrap + OBEY-v2`.

## Atomic bootstrap

Current canonical `o/index.html` requires one first Prometeo server call:

`ADMISSION → BOOTSTRAP(PREFLIGHT+ENTER) → WORK | WAIT`

and explicitly forbids splitting initial admission into separate PREFLIGHT/ENTER calls or substituting repository/scheduler archaeology for failed bootstrap.

Versioned adoption evidence:
- `cd31c1526ae2c4e3c25b59ac3f614c55b17b1be7` — AGENTS OBEY entry aligned to atomic bootstrap.
- `f28422332c9ff9bcda2776a91781e012984a9d20` — generated worker launcher aligned to atomic bootstrap.
- `04be223410a5c295a4c99b789be22029d05f49ff` — OBEY production rule aligned to ADMISSION→BOOTSTRAP.

## Rate-limit retry behavior

Current `o/index.html` preserves the same `agent_id` across admission retries and requires retrying the same `prometeo_bootstrap` operation. It defines bounded admission retry attempts and terminal BLOCKED behavior instead of lateral routing.

Generic connector backoff is also explicit in the worker prompt: respect RATE_LIMITED/Retry-After and retry the same operation without changing route. Versioned evidence: `dab5f8ab51fcafc1120ef7bccb178b3281f1f70e`.

## Live evidence from this worker session

Agent `wc-20260922T0122-8f3c9d20` entered through `prometeo_bootstrap` and received the durable OBEY-v2 WORK state/session used for this closeout. The first connector attempt was security-blocked; the same bootstrap operation was retried without lateral routing and succeeded.

## Independent cross-fill verification

K145 independently inspected the current backend definition of `public.prometeo_bootstrap(p_agent_id, p_declaration)`. The function:

- calls `public.prometeo_preflight(..., 'OBEY-v2', ...)`;
- returns immediately with `bootstrap_complete=false` if PREFLIGHT does not return `PREFLIGHT_OK`;
- calls `public.prometeo_enter(p_agent_id)` only after PREFLIGHT succeeds;
- records one BOOTSTRAP session touch;
- returns the ENTER result augmented with `bootstrap_state='BOOTSTRAP_OK'`, `bootstrap_complete=true`, the PREFLIGHT state and the original t0.

This closes the earlier evidence-access gap: atomic PREFLIGHT+ENTER is now verified from the live backend function body, not only from protocol text.

The canonical OBEY-v2 page independently preserves the same `agent_id` across admission retries, retries the same bootstrap operation on rate limit, and forbids lateral GitHub/SQL/scheduler substitution after bootstrap failure.

## Remaining gaps

No functional admission gap was found in the canonical protocol or in the current backend implementation inspected by the cross-fill worker.
