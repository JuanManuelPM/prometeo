# Prometeo Agent Execution Protocol v1

Status: ACTIVE PROTOCOL
Schema: `prometeo.agent-execution-protocol/v1`

## Invocation

A disposable execution agent may receive only:

```text
PROMETEO EXECUTE · <work_item_id>
<execution_packet_url>
```

That is sufficient. Do not ask the human for the previous chat, copied prompts, old screenshots, or context that is recoverable from the packet and Prometeo runtime.

## Mandatory constitution

Before material work, load and obey:

`https://juanmanuelpm.github.io/prometeo/agent-runtime/protocols/global-constitution-v1.md`

Source: `coordination/GLOBAL_AGENT_CONSTITUTION_V1.md`.

The constitution is mandatory even if the user says something short such as “change this”, “fix it”, or “make it better”. Those requests mean **apply a delta against the current authoritative product while preserving established work**. They do not authorize a clean-slate rewrite, stale overwrite, authority promotion, or bypass of another active writer.

## Non-negotiable model

The chat is a worker, not memory and not authority. The durable Page Change Thread, Execution Packet, repository/runtime authorities, artifacts and RETURN/receipts survive the chat. A chat may disappear after invocation without losing project continuity.

Page Change Thread and Page Change Feed are human projections. They do not replace P4 Capture, Context Foundry, Catalog, Current, Lineage, workstream owners, Human Accepted or Served authority.

## Required lifecycle

### 0. LOAD CONSTITUTION
Fetch the current Global Agent Constitution and treat it as a hard precondition for material writes. If it cannot be loaded, do not improvise a weaker mutation policy.

### 1. FETCH
Fetch the exact opaque Execution Packet URL supplied in the launcher. Do not alter, shorten or infer it. Require `schema=prometeo.execution-packet/v1` and matching `work_item_id`.

### 2. VALIDATE
Validate packet expiry, target, selected Capture revision identities/digests, protocol identity, return path and baseline bindings. Treat the packet as a scoped transport snapshot, not eternal authority.

Never publish Capture transcript literals, private attachments, packet tokens, return tokens, workspace secrets or other LOCAL/PROJECT-private material to GitHub or public logs.

### 3. REINCARNATE
Load the packet's `execution.stable_entry` and Prometeo Reincarnation entry. Recover the smallest durable state necessary to work independently of chat history.

### 4. RESYNC
Read current EPOCH and the current compiled Work Packet/owner relevant to the target. Revalidate Current, Catalog, source identity and writable owner against packet creation-time bindings. If they moved, reconcile forward; do not patch stale bytes blindly.

### 5. CLAIM
Before the first material write, publish or refresh an independent `prometeo.worker-status/v1` object when the connected tools allow it. Use the Work Item as the worker identity when practical and declare the narrowest actual write scope.

Active-writing states include `CLAIMED`, `EXECUTING`, `WRITING`, `INTEGRATING` and equivalent explicit active states. Do not use a shared mutable master-status file.

After the claim, re-read EPOCH. If it changed, reload the active compiled packet and inspect relevant convergence before writing.

### 6. RESOLVE OWNER
Resolve the reusable capability owner before editing. A symptom visible on a page does not make the page the owner. Respect declared write scopes and concurrent work. Never create a second global shell, second Capture owner, second context authority or duplicate persistence system to satisfy a local symptom.

### 7. RECOVER THREAD
Use packet `intent`, `context.page_memory`, `context.previous_executions`, target bindings and referenced attachments as the human request. Preserve contradictions, negative knowledge, rejected approaches and previous implementation results. Do not silently convert machine transcript text into Human Accepted intent.

For a Page Change Thread, the history is conceptually:

`human captures -> prior execution result(s) -> current served/candidate state -> new captures`

Do not require the originating ChatGPT conversation to reconstruct that sequence.

### 8. PREWRITE
Immediately before every important write, and again before promotion/publication:

1. Read the latest EPOCH.
2. Reload only the active compiled packet if EPOCH changed.
3. Re-fetch the exact current owner/file/branch head being modified.
4. Inspect relevant convergence events in the packet.
5. Treat a `HARD_WRITE_COLLISION` as blocking only when it represents overlapping **active writing workers**.
6. Historical/completed/closed/boundary-only overlapping scopes are non-blocking context signals.
7. Reconcile concurrent changes before writing.
8. Use compare-and-swap/blob-SHA/head-aware writes where the tool supports them. Never overwrite an older assumed copy.

### 9. EXECUTE
Implement the complete materially-solvable request. Default mutation mode is surgical/additive preservation.

Do not stop after planning, archaeology, a candidate sketch, or a list of next steps when the remaining work is executable. Do not clean-slate rewrite because rebuilding is easier. If replacement is explicitly required, first preserve an equivalence/capability map and prove that baseline capabilities not explicitly rejected survive.

For long executions, persist intermediate state externally before context exhaustion. Another agent must be able to continue without this chat.

### 10. TEST
Run targeted functional, regression and authority tests. Preserve known-good behavior. Browser/device behavior needs browser/device evidence where applicable. A source commit is not Served verification.

At minimum test:

- the requested behavior;
- relevant baseline behavior that could regress;
- single-owner/single-shell rules when shared UI is involved;
- persistence compatibility when storage is touched;
- responsive/browser behavior when UI is touched;
- live bytes/runtime when claiming Served.

### 11. PERSIST
Persist code, contracts, migrations, tests and candidate artifacts under the correct owner. Keep private human material out of public artifacts. If promotion is not authorized, leave a candidate rather than inventing approval.

### 12. RETURN
Write a sanitized durable result to the exact `execution.result_submission.github_return_path` / `execution.return_path` provided by the packet. The file MUST use at least:

```json
{
  "schema": "prometeo.execution-result/v1",
  "work_item_id": "<exact id>",
  "page_id": "<target page id or null>",
  "thread_id": "<thread id or null>",
  "status": "CANDIDATE_READY|VERIFIED|SERVED|BLOCKED|FAILED",
  "finished_at": "<ISO timestamp>",
  "summary": {
    "text": "human-readable concise result",
    "changes": ["..."],
    "tests": ["..."]
  },
  "changed_files": ["public/sanitized paths only"],
  "tests": {"status":"PASS|FAIL|PARTIAL"},
  "regressions_checked": ["..."],
  "negative_knowledge": ["..."],
  "candidate_identity": null,
  "candidate_url": null,
  "served_identity": null,
  "served_url": null,
  "prometeo_url": "https://juanmanuelpm.github.io/prometeo/?page=<page_id>&changes=<work_item_id>",
  "return_ref": "<this path>",
  "receipt_ref": null
}
```

The RETURN is public coordination evidence: never include raw Capture transcript, private file contents, opaque capability URLs/tokens, secrets or sensitive user data. The backend re-associates it with the private Page Change Thread using `work_item_id`.

`candidate_url` and `served_url` may be raw evidence URLs. **The primary human-facing navigation is `prometeo_url`**, which keeps the user inside the Universal Host and can reopen the page/thread/result. Do not make the human leave Prometeo merely to inspect a result.

If the worker can safely POST to the optional private `execution.result_submission.optional_http_post`, that is an acceleration path; GitHub RETURN remains sufficient for cross-chat continuity when HTTP action tooling is unavailable.

### 13. RECEIPT
Produce/bridge the standard Prometeo receipt required by the affected owner's workflow. Transport status cannot override Current/Human Accepted/Served authorities.

### 14. UPDATE THREAD
Do not manually publish private thread text. The Change Loop ingests the sanitized RETURN/receipt and projects completion into the private Page Change Feed. A new result remains unread until the human explicitly opens it.

The feed should expose enough sanitized result detail for the human to understand: what was requested, what changed, what was preserved, tests/evidence, candidate/served state, and any unresolved boundary.

### 15. RELEASE
Update the worker status to a non-writing state (`COMPLETE`, `CLOSED`, `BOUNDARY`, `FAILED`, or equivalent) so the network does not retain a phantom live collision. Persist the final frontier/RETURN reference.

## Completion law

Do not finish with “the next step would be…” if that step is software-solvable by the current agent. After implementation, perform a real critique:

> What could still force the human to return to a chat and explain this again?

Repair those causes when possible, rerun tests, persist the result, and only then return.

The target human loop is:

`VER -> HABLAR/ESCRIBIR -> SEGUIR -> HACER -> OLVIDARSE -> ● -> VER MEJORA -> CONTINUAR`

Stop only for a real boundary: identity/consent, unavailable credentials, physical-device permission/evidence, an irreversible/high-risk action requiring human approval, an external service limitation, or a live write collision that cannot be reconciled safely.

## Truth laws

- Chat history is not authority.
- Global Constitution is mandatory before material writes.
- Execution Packet is scoped transport, not Current.
- “Change this” means preserve-first delta, not clean-slate permission.
- Capture existence is not Human Acceptance.
- Candidate != Human Accepted != Served.
- Highest version/newest commit is not automatically Current.
- Source commit != deployment != Served verification.
- Page Change Feed is a projection, not product authority.
- Private Capture literals never belong in public GitHub coordination.
- Only active overlapping writers create a live hard lock; completed/boundary scope overlap does not.
- A disposable worker must never require the human to transport recoverable context between chats.
- A completed worker must release its active-write claim.
