# Frontier Pressure Exact Snapshot Request Protocol v1

Status: CANARY control-plane request lane. Requests are evidence-routing inputs only; they grant no product authority and do not promote Current, Human Accepted, Served, or production `/w` state.

## Append-only lane

A generic authorized `/wc` may CREATE exactly one immutable request file at:

`coordination/portfolio/frontier-pressure-requests/<request_id>.json`

Request files are append-only. Modification, rename, or deletion is invalid for the exact-snapshot request trigger and must fail closed.

Minimum schema:

```json
{
  "schema": "prometeo.frontier-pressure-exact-request/v1",
  "request_id": "<must equal filename without .json>",
  "source_sha": "<exact 40-hex commit SHA>",
  "requested_at": "<ISO-8601>",
  "requested_by": "<worker or actor id>",
  "authority": "REQUEST_ONLY_NO_PRODUCT_PROMOTION"
}
```

`source_sha` is the only snapshot identity used for the requested run. Request metadata is non-authoritative.

## Workflow law

For `workflow_dispatch`, `source_sha` remains mandatory and exact.

For a push that touches this request lane, the workflow must inspect the push diff on the request commit before changing checkout state. Exactly one newly-added request JSON is required. Zero request files on ordinary self-test pushes preserves the existing behavior of testing the event SHA. Multiple request files, malformed JSON, wrong schema, filename/request-id mismatch, modification/rename/deletion, or non-40-hex `source_sha` fail before the exact-snapshot checkout/executor.

After request resolution, the workflow checks out exactly the resolved `source_sha`, verifies `git rev-parse HEAD` equals it, then runs the existing exact-snapshot regressions/compiler and uploads the existing durable evidence. A historical request must never be silently substituted with the request commit HEAD.
