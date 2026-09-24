# Prometeo Mobile Protocol v1

Schema: `prometeo.mobile/v1`

The Android app is a native thin client. It never receives executable UI code and never reads Prometeo tables directly.

## Trust model

- Pairing uses a single-use high-entropy token. Only its SHA-256 hash is stored server-side.
- The device creates two RSA-2048 keys in Android Keystore.
- The normal device key signs every request.
- The approval key is protected by device authentication and signs material actions.
- Private keys never leave Android Keystore.
- Signed requests include timestamp, nonce and SHA-256 of the exact request body.
- Used nonces are stored server-side to reject replay.
- Material actions include a stable `actionId`; receipts make retries idempotent.

Canonical request string:

```
prometeo.mobile.request/v1
POST
/functions/v1/prometeo-mobile-v1
<TIMESTAMP_SECONDS>
<NONCE>
<SHA256_HEX_BODY>
```

Material approval signs the canonical request plus a final line containing `APPROVE`.

## Operations

### pair
Unsigned, but requires a valid unused pairing token and public keys. Returns a device session ID.

### bootstrap
Signed read. Returns the current declarative home surface, strategic voice metadata, world/run projection and allowed strategic choices.

### voice_audio
Signed read. The server only synthesizes/cache-serves deterministic chunks of the current strategic message. Client supplies `messageId` and zero-based `partIndex`.

### action / strategic_select
Signed request plus approval signature. Server validates current epoch and option IDs, then executes through an atomic idempotency wrapper.

## Declarative surface

The response contains a `blocks` array. V1 understands only known native block types:

- `voice`
- `run_status`
- `strategic_choices`

Unknown block types must be ignored safely. The backend may reorder or omit known blocks without requiring a binary update. New behavior requiring new native capabilities increments the protocol contract.

## Binary compatibility

Every bootstrap returns:

- `contract_version`
- `min_app_version_code`
- `recommended_app_version_code`
- capability flags

The app remains read-capable from local cache when the network is unavailable. Material actions are disabled when the binary is below the server minimum.
