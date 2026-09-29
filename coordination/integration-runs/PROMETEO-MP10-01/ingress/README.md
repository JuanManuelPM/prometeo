# PROMETEO-MP10-01 · S003 · Browser ingress candidate

Status: **CANDIDATE · fail-closed · V11 remains CANDIDATE**

This slot adds the browser contract required by the MP10 integration ABI:

`window.PROMETEO_INGRESS_V1.submit({page,text,kind}) -> Promise<{status,ref,queued,error}>`

## What is implemented

- `current-tree/control-v11/ingress-v1.js` installs the contract without embedding a GitHub token.
- Raw command text is separated from the public metadata envelope.
- No transport means `BOUNDARY_AUTH_REQUIRED / AUTH_BRIDGE_REQUIRED`.
- A transport may confirm `queued=true` only with schema `prometeo.ingress-transport-result/v1` and a durable ref in `JuanManuelPM/prometeo`.
- Transport failures or malformed “success” responses fail closed.
- The adapter creates no scheduler, queue, CURRENT pointer, worker claim or liveness signal.

## Why browser → GitHub is not silently enabled

A public GitHub Pages script cannot safely contain a PAT, GitHub App private key, OAuth access token or other repository-write credential. Putting one in JavaScript would make the credential public to every browser session. GitHub Pages also does not provide an authenticated write endpoint by itself.

Therefore strict `GITHUB_ONLY=1` with **no trusted authenticated HTTP transport at all** has a real authentication boundary. This candidate records that boundary instead of pretending a browser write happened.

The smallest safe continuation is a trusted transport already controlled by Prometeo, or a zero-mandatory-cost bridge, that:

1. receives `{public_envelope, private_payload}` over HTTPS;
2. keeps repository credentials server-side;
3. does **not** commit `private_payload.text` to public GitHub;
4. maps sanitized durable metadata into the existing Page Change / worker authority path;
5. returns a durable GitHub ref only after that write exists.

The bridge is transport only. It must not become another scheduler, queue, feedback database or CURRENT authority.

## Integration boundary

At the time of S003 production, V11 already contains the MP10 command UI contract and calls `window.PROMETEO_INGRESS_V1` when present, but the current V11 document does not yet load `ingress-v1.js`. S003 cannot edit `index.html` or `v11.js`; wiring the script is therefore an integration task outside this slot's write scope.

## Evidence

- Browser adapter: `current-tree/control-v11/ingress-v1.js`
- Bridge/privacy contract: `coordination/integration-runs/PROMETEO-MP10-01/ingress/BRIDGE_CONTRACT.json`
- Deterministic smoke: `coordination/integration-runs/PROMETEO-MP10-01/ingress/browser-ingress-smoke.mjs`

No Supabase call is required to execute this slot or its smoke test.
