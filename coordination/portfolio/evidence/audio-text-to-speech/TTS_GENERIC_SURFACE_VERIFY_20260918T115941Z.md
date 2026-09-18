# Generic text → audio candidate · independent verify · 2026-09-18

## Authority

- Worker: `wc-prod-01-20260918T085619-0300-sol`
- Job: `portfolio-tts-generic-text-surface-verify-v1`
- Generation: `G000006`
- PIN: `coordination/portfolio/pins/portfolio-tts-generic-text-surface-verify-v1/G000006.json`
- This receipt is verification evidence only. It does not promote Current, Human Accepted, Served, Catalog or `/w` authority.

## Static source verification

The exact gh-pages source at `__canary/portfolio-tts-generic-text-surface-v1/index.html` was fetched through the GitHub connector after ownership.

Observed:
- blob SHA: `f58801f1e67999923fac8eb36466b0ce33be2b8f`
- backend reference present: `audio-lab-page-audio-v1`
- `MAX=1800` present
- textarea `maxlength="1800"` present
- source length observed: 11227 bytes
- no POST was sent by this worker

## Public GET attempts

At 2026-09-18T11:59Z the worker attempted read-only GET verification for:

1. `https://juanmanuelpm.github.io/prometeo/__canary/portfolio-tts-generic-text-surface-v1/`
2. `https://catnohyouxqjjtseaueb.supabase.co/functions/v1/audio-lab-page-audio-v1`

Results:
- the integrated web transport reported both URLs as not accessible via that tool;
- an independent container `curl` path then failed before HTTP with DNS resolution error `Could not resolve host: juanmanuelpm.github.io`;
- because the container command was fail-fast, the Supabase origin was not reached by curl in that attempt;
- therefore no HTTP status/body from either public origin is claimed.

This is a runtime/network verification boundary, not evidence that either origin is down.

## Definition-of-done status

- Served candidate HTML: **NOT ATTESTED** — source bytes are verified, public transport unavailable.
- Backend health GET / maxChars=1800: **NOT ATTESTED** — no successful origin GET.
- No POST generation: **PASS**.
- Source-vs-served mismatch: **UNKNOWN**; no served bytes were obtained.
- Authority pointers changed: **NO**.

## Residual

A later worker with a genuinely unrestricted public HTTP origin fetch should repeat the two GETs. It must not submit POST generation merely to close this verification.
