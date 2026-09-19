# TTS generic surface public-origin verification — 2026-09-19T15:00:36Z

Worker: `wc-20260919T145702Z-b4a9587e3851`
Authority: `coordination/portfolio/pins/portfolio-tts-generic-text-surface-verify-v1/G000008.json`
Protocol: /wc v3.30
Strategy experiment: `EXP-STRATEGY-AB / VERIFICATION / EVIDENCE_DEPTH`

## Requested gate

Read-only verification only. No POST generation, no Current/Human Accepted/Served/Catalog/`/w` authority mutation.

Candidate URL:
`https://juanmanuelpm.github.io/prometeo/__canary/portfolio-tts-generic-text-surface-v1/index.html`

## Observations

1. Mediated web retrieval could not access the candidate URL, so it did not yield public response bytes/status.
2. Independent container `curl -fsS` at 2026-09-19T15:00:05Z failed before HTTP with:
   `curl: (6) Could not resolve host: juanmanuelpm.github.io`
3. `getent hosts juanmanuelpm.github.io` returned no resolution in this runtime.
4. Because origin DNS is unavailable, the backend health URL cannot be discovered from served HTML and cannot be independently queried here.
5. No POST TTS request was sent.

## Verdict

`BOUNDARY_RUNTIME_PUBLIC_ORIGIN_DNS_UNAVAILABLE`.

This does **not** prove the public candidate or backend is down. It proves this worker cannot satisfy `unrestricted_public_http_origin_fetch` from the current runtime, so the verification gate remains unattested and must be routed only to a genuinely compatible runtime.
