# Prometeo Global Agent Constitution v1

Status: MANDATORY BEFORE MATERIAL WORK
Schema: `prometeo.global-agent-constitution/v1`

This file is the smallest durable constitution every Prometeo-aware worker must load before changing product state. It exists so no chat, model, or agent may treat a conversational request as permission to discard established work, ignore another worker, or infer authority from recency.

## 1. Authority before edits

Before any material write, resolve the current target through the stable Prometeo entry, current EPOCH, compiled Work Packet, Catalog, Current, Lineage and the declared owner. Chat text, newest commit, highest version number, filename wording and visual similarity are never sufficient authority by themselves.

If a user says “change this”, interpret it as a requested delta against the current authoritative product, not permission for a clean-slate replacement.

## 2. Preserve-first law

Default edit mode is **surgical and additive**.

- Preserve already-working behavior, data, visual decisions, accepted physics, ownership boundaries and negative knowledge unless the current request explicitly contradicts them.
- Never delete, rewrite, replace or flatten a subsystem merely because rebuilding it is easier.
- A clean-slate rewrite is allowed only when the human explicitly requests replacement OR the current owner contract requires migration, and only after producing an equivalence/capability map proving what is preserved, intentionally changed, or intentionally removed.
- If a candidate loses a baseline capability that was not explicitly rejected, the candidate fails.
- Do not revive a rejected historical approach just because its code is convenient.

## 3. Conversation is not memory

Prometeo must remain usable when every execution chat disappears.

- Recover durable state from packets, workstream RETURNs, Page Change Threads, Context Foundry, Git history and product authorities.
- Never ask the human to copy a recoverable prompt, transcript, result or previous-chat explanation into another Prometeo-aware chat.
- Page-specific human intent lives in Page Change Threads; cross-workstream facts live only in scoped RETURN/DELTA/runtime coordination.
- Raw private Captures and attachments never become public coordination artifacts.

## 4. Mandatory write preflight

Immediately before the first important write, and again before promotion/publication:

1. Read the latest public EPOCH.
2. If EPOCH changed, reload only the active compiled Work Packet.
3. Re-fetch the exact file/owner being changed from its current branch/head.
4. Inspect relevant convergence events in the packet.
5. Check whether another **active writing worker** owns overlapping paths.
6. If there is a live HARD_WRITE_COLLISION, do not write stale bytes. Reconcile, narrow scope, wait for the conflicting worker’s durable return, or stop at the collision boundary.
7. Use compare-and-swap semantics where possible: write against the blob/head actually read, never against an assumed older copy.

Historical/completed/boundary-only workstreams with overlapping declared scopes are context signals, not live write locks.

## 5. Worker claim and release

A material disposable worker should publish an independent `prometeo.worker-status/v1` object when practical. The status must identify workstream, branch, precise write scope, state and frontier without private content.

States that imply active writing include `CLAIMED`, `EXECUTING`, `WRITING`, `INTEGRATING`.

States such as `COMPLETE`, `CLOSED`, `BOUNDARY`, `RECOVERY_COMPLETE`, `FAILED`, or stale/no-worker metadata do not create a live file lock.

On completion or a real boundary, update the worker status so other agents do not infer a phantom collision.

## 6. One owner per global capability

Do not solve a local symptom by creating a duplicate global capability. In particular:

- one Universal Control / top-level shell;
- one P4 Capture owner;
- one context authority;
- one canonical owner per persistence domain;
- one Current/Catalog/Lineage authority chain.

Pages may consume shared capabilities; they do not silently fork them.

## 7. Candidate, acceptance and served truth

Keep these distinct:

`implementation -> candidate -> tested/verified -> human accepted (when required) -> served`

Never infer promotion from version number, successful source commit, a green unit test, or a chat saying “done”. Served claims require actual served-byte/public-runtime evidence where applicable.

## 8. Test what can regress

Every material change must test the requested behavior plus relevant preserved behavior. For page/product changes, verify at minimum:

- target behavior;
- no unexpected capability loss;
- ownership/single-shell rules;
- persistence/data compatibility when touched;
- responsive/browser behavior when UI is touched;
- publication bytes when claiming Served.

A check that only proves syntax is not product completion.

## 9. Finish the solvable loop

A worker must continue through implementation, critique and repair while the remaining work is software-solvable. Do not end with a plan or “next step” when the agent can perform that step.

Before returning, explicitly ask internally: “What would make the human have to come back and explain this again?” Repair those causes when possible.

## 10. Page Change Loop is the human development surface

For work launched from a page:

`Capture(s) -> Page Change Thread -> HACER -> Execution Packet -> disposable worker -> durable RETURN -> Page Change Feed -> unread result -> host-routed page preview/served view`

The worker result must return the human to the Prometeo host, not eject them to a raw child-page URL as the primary navigation path. A raw page URL may exist as evidence, but the human-facing route should preserve Universal Control and the page’s Change Thread.

## 11. Failure law

If authority cannot be resolved, a live collision cannot be reconciled, required credentials are unavailable, or an irreversible/high-risk human approval is needed: stop explicitly at that real boundary. Never substitute a reconstruction, silent overwrite, guessed Current, fabricated approval or misleading “done”.

## 12. Definition of independent operation

Prometeo is independent only when a human can:

`VER -> HABLAR/ESCRIBIR -> SEGUIR -> HACER -> OLVIDARSE -> VER ● -> ABRIR CAMBIO -> CONTINUAR`

without transporting context between chats, without knowing repository internals, and without a new worker destroying prior accepted work.
