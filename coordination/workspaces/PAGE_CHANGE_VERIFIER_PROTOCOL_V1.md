# PROMETEO · PAGE CHANGE INDEPENDENT VERIFIER PROTOCOL V1

Status: CURRENT protocol for independent verification of a Page Change `WORKER_POOL` candidate.

This protocol is an adapter into the existing Prometeo allocator and claim law.
It does not create a scheduler, queue, worker family, Guide, source owner or promotion authority.

## Entry condition

A verifier opportunity exists only after the material Page Change builder has produced a durable `CANDIDATE_READY` result.

The compact candidate must provide:

- `kind=PAGE_CHANGE_VERIFY`
- the original `work_item_id`
- a normal atomic opportunity `claim_path`
- the exact private packet lookup for that work item
- `return_path=coordination/executions/<work_item_id>/VERIFY.json`
- `forbidden_worker_ids` containing the source builder worker id

If the current worker id appears in `forbidden_worker_ids`, do not claim this candidate.

## Authority

The verifier is read-only with respect to the product candidate.

Allowed writes are limited to its ordinary claim/liveness evidence and the exact verification result path supplied by the candidate.

The verifier must not:

- edit the product/source target;
- repair the candidate while reviewing it;
- promote CURRENT;
- mark Human Accepted;
- mark Served;
- weaken acceptance criteria because evidence is unavailable.

## After claim

1. Retrieve exactly the owned private Execution Packet from the connected Prometeo Supabase project using the supplied `work_item_id`.
2. Read the source builder's sanitized RETURN from the packet's canonical GitHub return path.
3. Re-resolve CURRENT/source owner and re-read the actual candidate/source bytes.
4. Read the source builder claim at `coordination/opportunities/claims/page-change-<work_item_id>.json`.
5. Require that its `worker_id` differs from this verifier's worker id.
6. Reconstruct the requirements from the private packet without publishing Capture literals.

If any identity/fencing condition fails, perform no product mutation and return `BLOCKED`.

## Verification

Verify independently, as applicable:

- requested human changes are materially present;
- preserved baseline/KEEP behavior remains intact;
- rejected/negative knowledge was not revived;
- changed paths match the bounded owner/target;
- tests claimed by the builder are reproducible or otherwise evidenced;
- public/candidate route actually corresponds to the claimed candidate;
- console/network/runtime errors relevant to the change;
- representative browser rendering and interaction for page/UI changes;
- mobile/touch behavior when required by the packet/target;
- no privacy literals or private capability URLs leaked into public artifacts;
- no unrelated source-owner changes were smuggled into the candidate.

A visual PASS requires actual visual/browser evidence. HTML/CSS inspection alone is not visual evidence.

## Output

Write exactly the supplied `VERIFY.json` path using:

```json
{
  "schema": "prometeo.verification-result/v1",
  "id": "<stable verification id>",
  "work_item_id": "<original work item>",
  "result": "PASS|FAIL|BLOCKED",
  "builder_worker_id": "<worker id from builder claim>",
  "verifier_worker_id": "<this worker id>",
  "verified_at": "<ISO timestamp>",
  "candidate_identity": "<candidate identity or null>",
  "evidence": {
    "summary": "<concise independent conclusion>",
    "checks": [],
    "evidence_refs": [],
    "failures": [],
    "residual_risks": []
  }
}
```

Never include raw Capture transcripts, audio, attachment tokens, packet tokens, workspace secrets or private session payloads.

## Result law

- `PASS`: backend may upgrade the Page Change result from `CANDIDATE_READY` to `VERIFIED`.
- `FAIL`: candidate remains `CANDIDATE_READY`; verification failure is attached durably and must not be represented as verified.
- `BLOCKED`: candidate remains `CANDIDATE_READY`; missing capability/evidence is explicit.
- None of these states means Human Accepted, Served or CURRENT.

A builder RETURN can never substitute for this independent verification result.
