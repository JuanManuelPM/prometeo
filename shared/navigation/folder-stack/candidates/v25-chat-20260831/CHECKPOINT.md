# PROMETEO FOLDER STACK — CHAT CANDIDATE V25

Status: **CHAT-DERIVED TESTED CANDIDATE — HUMAN ACCEPTANCE PENDING**  
Date ingested: 2026-08-31 (America/Argentina/Buenos_Aires)  
Candidate id: `V25_CHAT_20260831_SINGLE_OWNER_DOCKING_WORD`  
Uploaded source: `PROMETEO_V25_SINGLE_OWNER_DOCKING_WORD.html`  
Raw bytes: `57429`  
Lines: `2130`  
SHA-256: `f857ad318b7f3dc6fd5cce7d4df90b3c5ce598feb1c7025041d5f81a8a361aea`

## Authority / lineage warning

This candidate is **not** a replacement for the repository's Human-Accepted V23. The supplied chat uses local labels V23/V24/V25, and explicitly says its V24 restarted from V22 after a chat-local V23 movement regression. Therefore the integer labels are not safely ancestry-comparable with `ACCEPTED_CHECKPOINT_V23.md`.

Use exact artifact identity and hashes. Keep the accepted repository V23 as rollback authority until the Human explicitly accepts this exact candidate or a later exact derivative.

## Final correction captured from the supplied chat

The last reported V24 defect had two text owners for the same incoming word: a prewritten copy plus a moving/revealed copy. V25 changes the visible breadcrumb to:

- `PREFIX`: fixed at its final x;
- `ACTIVE`: exactly one local word owned by that sheet;
- during vertical UP the one `ACTIVE` word moves from its rear-tab x to its final dock x;
- no second active copy exists;
- no late word spawn;
- no opacity/visibility reveal;
- no letter-by-letter/typewriter clipping;
- no old/new token swap at commit.

The uploaded source exposes the regression surface as `window.__PROMETEO_V25_TEXT__` with rule `PREFIX fixed + exactly one ACTIVE word`.

## Other laws carried by this candidate

- Vertical UP/DOWN are siblings in the current collection.
- RIGHT remains the horizontal/deeper movie; LEFT returns horizontally/parent-wise in the preserved model.
- Font size stays constant.
- `MAIN` is adaptive to the measured breadcrumb.
- `REST = viewport - MAIN`, then rear exposure remains `4u : 2u : 1u`.
- V22 curve/corner behavior is explicitly treated as frozen by the source chat.
- The horizontal V13 engine is deliberately not restructured in this candidate.

## Verification truth

### Reported by the source chat

The previous assistant reported UP, DOWN, `matemática → química`, five siblings in both directions, and zero runtime errors as PASS. Those are preserved here as **source-chat claims**, not independently re-certified by this ingestion.

### Re-checked during GitHub ingestion

- exact uploaded bytes read successfully;
- byte count: `57429`;
- line count: `2130`;
- SHA-256: `f857ad318b7f3dc6fd5cce7d4df90b3c5ce598feb1c7025041d5f81a8a361aea`;
- inline JavaScript extracted and `node --check` passed;
- independent browser-runtime verification was **not established** in this ingestion environment because the browser automation CLI was unavailable.

Do not upgrade the verification claim beyond this without a real browser run or Human acceptance.

## Important conflict vaccine

The accepted repository V23 checkpoint says incoming breadcrumb x coordinates remain fixed during vertical-up and rejects independent word translation as the normal reveal mechanism. This V25 candidate intentionally uses one `ACTIVE` word whose x interpolates into a docking position to solve the duplicate/typewriter defect described in the supplied chat.

Therefore:

1. never merge the two behavioral contracts by intuition;
2. never assume a higher version number makes V25 product-current;
3. use this exact V25 artifact when evaluating the docking experiment;
4. use the exact accepted V23 artifact when regression safety or rollback is required;
5. promotion requires explicit Human acceptance of exact bytes.

## Durable GitHub representation

The exact uploaded HTML is stored losslessly as `PROMETEO_V25_SINGLE_OWNER_DOCKING_WORD.html.gz.b64` as base64 text of deterministic `gzip -n -9` bytes. Its compressed SHA-256 is `c1c6e27020ccba0ac22c5b07966729c230c3b35ea13ca2d914a376a5b688d549` . Base64-decoding and decompressing it reproduces the uploaded 57,429-byte HTML with SHA-256 `f857ad318b7f3dc6fd5cce7d4df90b3c5ce598feb1c7025041d5f81a8a361aea`.

`SOURCE_MANIFEST.json` records both identities. `index.html` is only a thin GitHub Pages loader that decompresses and writes the exact candidate; it is not a second navigator implementation.

## Truth pointers

- Human-Accepted rollback: `shared/navigation/folder-stack/ACCEPTED_CHECKPOINT_V23.md`
- Accepted-current pointer: `shared/navigation/folder-stack/CURRENT.json`
- Latest chat candidate pointer: `shared/navigation/folder-stack/LATEST.json`
- This checkpoint: `shared/navigation/folder-stack/candidates/v25-chat-20260831/CHECKPOINT.md`
