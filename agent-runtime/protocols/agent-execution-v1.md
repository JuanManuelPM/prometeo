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

## Non-negotiable model

The chat is a worker, not memory and not authority. The durable Page Change Thread, Execution Packet, repository/runtime authorities, artifacts and RETURN/receipts survive the chat. A chat may disappear immediately after invocation without losing project continuity.

Page Change Thread and Page Change Feed are human projections. They do not replace P4 Capture, Context Foundry, Catalog, Current, Lineage, workstream owners, Human Accepted or Served authority.

## Required lifecycle

### 1. FETCH
Fetch the exact opaque Execution Packet URL supplied in the launcher. Do not alter, shorten or infer it. Require `schema=prometeo.execution-packet/v1` and matching `work_item_id`.

### 2. VALIDATE
Validate packet expiry, target, selected Capture revision identities/digests, protocol identity, return path and baseline bindings. Treat the packet as a scoped transport snapshot, not eternal authority.

Never publish Capture transcript literals, private attachments, packet tokens, return tokens, workspace secrets or other LOCAL/PROJECT-private material to GitHub or public logs.

### 3. REINCARNATE
Load the packet's `execution.stable_entry` and Prometeo Reincarnation entry. Recover the smallest durable state necessary to work independently of chat history.

### 4. RESYNC
Read current EPOCH and the current compiled Work Packet/owner relevant to the target. Revalidate Current, Catalog, source identity and writable owner against packet creation-time bindings. If they moved, reconcile forward; do not patch stale bytes blindly.

### 5. RESOLVE OWNER
Resolve the reusable capability owner before editing. A symptom visible on a page does not make the page the owner. Respect declared write scopes and concurrent work. Never create a second global shell, second Capture owner, second context authority or duplicate persistence system to satisfy a local symptom.

### 6. RECOVER THREAD
Use packet `intent`, `context.page_memory`, `context.previous_executions`, target bindings and referenced attachments as the human request. Preserve contradictions, negative knowledge, rejected approaches and previous implementation results. Do not silently convert machine transcript text into Human Accepted intent.

### 7. EXECUTE
Implement the complete materially-solvable request. Do not stop after planning, archaeology, a candidate sketch, or a list of next steps when the remaining work is executable. Re-sync before important writes if the repository is moving concurrently.

For long executions, persist intermediate state externally before context exhaustion. Another agent must be able to continue without this chat.

### 8. TEST
Run targeted functional, regression and authority tests. Preserve known-good behavior. Browser/device behavior needs browser/device evidence where applicable. A source commit is not Served verification.

### 9. PERSIST
Persist code, contracts, migrations, tests and candidate artifacts under the correct owner. Keep private human material out of public artifacts. If promotion is not authorized, leave a candidate rather than inventing approval.

### 10. RETURN
Write a sanitized durable result to the exact `execution.result_submission.github_return_path` / `execution.return_path` provided by the packet. The file MUST use:

```json
{
  "schema": "prometeo.execution-result/v1",
  "work_item_id": "<exact id>",
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
  "return_ref": "<this path>",
  "receipt_ref": null
}
```

The RETURN is public coordination evidence: never include raw Capture transcript, private file contents, opaque capability URLs/tokens, secrets or sensitive user data. The backend re-associates it with the private Page Change Thread using `work_item_id`.

If the worker can safely POST to the optional private `execution.result_submission.optional_http_post`, that is an acceleration path; GitHub RETURN remains sufficient for cross-chat continuity when HTTP action tooling is unavailable.

### 11. RECEIPT
Produce/bridge the standard Prometeo receipt required by the affected owner's workflow. Transport status cannot override Current/Human Accepted/Served authorities.

### 12. UPDATE THREAD
Do not manually publish private thread text. The Change Loop ingests the sanitized RETURN/receipt and projects completion into the private Page Change Feed. A new result remains unread until the human explicitly opens it.

## Completion law

Do not finish with “the next step would be…” if that step is software-solvable by the current agent. After implementation, perform a real critique: inspect what could still prevent the human loop `VER → HABLAR → SEGUIR → HACER → OLVIDARSE → ● → VER MEJORA`, repair those issues, rerun tests, and only then return.

Stop only for a real boundary: identity/consent, unavailable credentials, physical-device permission/evidence, an irreversible/high-risk action requiring human approval, an external service limitation, or a write collision that cannot be reconciled safely.

## Truth laws

- Chat history is not authority.
- Execution Packet is scoped transport, not Current.
- Capture existence is not Human Acceptance.
- Candidate != Human Accepted != Served.
- Highest version/newest commit is not automatically Current.
- Source commit != deployment != Served verification.
- Page Change Feed is a projection, not product authority.
- Private Capture literals never belong in public GitHub coordination.
- A disposable worker must never require the human to transport recoverable context between chats.
