# Prometeo Mobile — One Human Action Install Plan

Status: DESIGN CANON
Goal: remove every avoidable human step before and after Android installation.

## Product rule

The install path must never ask the human to:
- download an APK manually;
- enable "unknown sources";
- copy or paste a pairing token;
- configure Supabase;
- configure a server URL;
- choose a release channel;
- run ADB;
- run a terminal command on the phone;
- manually update the app;
- interpret technical errors.

The phone is a thin trusted client. Installation does not grant access to Prometeo.

## Reality boundary

On a normal unmanaged Android phone, Android/Google Play owns some trust prompts.
Prometeo must not bypass or simulate them.

For a brand-new install the irreducible user gestures are:
1. Google Play: INSTALL.
2. First launch: OPEN / tap app icon.
3. Android 13+: ALLOW NOTIFICATIONS, only if Prometeo alerts are enabled.

Everything else is automated.

If the app is already installed, a verified Prometeo App Link should open it directly and skip the store.

## Final user experience

### Existing trusted computer / Prometeo surface

One command or one web control:

    PROMETEO > PREPARE PHONE

The system:
1. verifies backend/mobile compatibility;
2. verifies a current healthy Play release exists;
3. creates a high-entropy one-use pairing token with a short TTL;
4. stores only its hash;
5. creates an install URL carrying the token through the Google Play Install Referrer;
6. renders a QR and a large INSTALL PROMETEO link;
7. starts a short-lived pairing watch for observability only. No polling is required on the phone.

Human action: scan/tap the install link and press INSTALL in Google Play.

### First launch

The app automatically:
1. reads Play Install Referrer exactly once;
2. extracts the one-use pair token;
3. generates device and approval keys in Android Keystore;
4. atomically exchanges the token + public keys for a device session;
5. consumes the pair token server-side;
6. deletes/forgets the referrer token locally;
7. fetches prometeo.mobile/v1;
8. writes the offline snapshot atomically;
9. registers optional push capability;
10. renders the real current Prometeo state;
11. prewarms metadata for the current voice, not audio bytes;
12. reports READY to the mobile gateway.

No token entry screen is shown on the happy path.

### Existing installation

A verified Android App Link under the Prometeo domain opens the app directly.
If a re-pair token is present, the app handles it as a one-use recovery/bootstrap request.

### Updates

Source change -> CI:
1. tests;
2. lint;
3. release build;
4. signing check;
5. contract compatibility test;
6. upload AAB through Google Play Developer API;
7. publish to selected track;
8. verify Play accepted the version;
9. only then update prometeo_mobile_release_channels;
10. retain previous compatible server contract for rollback window.

Phone:
- Google Play auto-updates normally.
- Server-driven block/content changes do not require an APK.
- If server min_version exceeds the installed binary, reads from local cache remain available but material actions are disabled until Play updates the app.

No in-app arbitrary APK installer exists.

## Distribution strategy

### Development
Google Play internal testing.
Fast and safe but tester opt-in adds friction, so it is not the final UX.

### Final personal use
Normal Google Play production distribution.
The app may be installable by others, but an unpaired install has zero access to Prometeo data/actions.
Security is at the identity/session boundary, not by hoping nobody finds the package.

This removes the tester opt-in page from the owner's steady-state install path.

## Link architecture

Canonical human link:

    https://juanmanuelpm.github.io/prometeo/mobile/i/<ONE_TIME_INVITE>

Behavior:
- app installed -> verified App Link opens Prometeo;
- app absent -> landing page sends the user to the Play listing with the invite encoded as Install Referrer.

The invite:
- is random high entropy;
- expires quickly;
- is single use;
- server stores only SHA-256;
- is bound to the session at atomic pairing;
- cannot be reused after success.

## Android App Links

The app manifest declares the Prometeo mobile install/recovery paths with autoVerify.
The site publishes .well-known/assetlinks.json containing the production app signing certificate fingerprint.

The signing identity is therefore required before the public App Link association is finalized.

## Notifications

Prometeo must never request notification permission before explaining what it is for.
When voice alerts are enabled:
- Android 13+ system notification permission is requested once;
- denial does not break the app;
- the app continues as pull/on-open;
- the permission can be requested again only after an explicit user action.

Notification permission is an Android authority boundary and must not be bypassed.

## Push design

Preferred:
- FCM sends only a small typed event: message/version/event cursor.
- No sensitive Prometeo state or strategic brief is embedded in push payloads.
- The app receives the event, fetches the signed current mobile contract, compares cursor/version, and notifies only if useful.
- Notification tap opens the current native surface.
- Audio is fetched only after explicit playback.

Fallback without push:
- refresh on open;
- bounded WorkManager sync only when product requirements justify it;
- no permanent polling service.

## Terminal/CI automation

Canonical developer command:

    ./tools/prometeo-mobile ship

It should perform:
1. git/preflight;
2. assert clean branch and monotonic versionCode;
3. assert backend contract compatibility;
4. test + lint;
5. build AAB;
6. verify signing configuration exists outside repository;
7. upload to Play;
8. commit Play edit;
9. verify resulting release/version;
10. update mobile release metadata in Supabase;
11. run gateway smoke;
12. produce release receipt.

Canonical phone-prep command:

    ./tools/prometeo-mobile invite

It should:
1. assert a healthy installable release;
2. create one-use pair token;
3. build install/app-link URL;
4. display QR;
5. print only one human instruction: INSTALL PROMETEO;
6. optionally observe pairing receipt;
7. expire/revoke unused invite on timeout.

These commands contain no secrets in arguments or logs.

## Self-healing

Recoverable failures:
- transient network -> exponential bounded retry;
- Play referrer temporarily unavailable -> retry on next foreground;
- pairing token expired -> show one button: GENERAR NUEVO ENLACE on trusted surface;
- server newer than app -> read-only cache + Play update route;
- audio generation failure -> retain text/state, retry audio independently;
- pending material action -> preserve actionId and replay idempotently after re-authentication.

Non-recoverable:
- signature mismatch;
- revoked device;
- corrupted/unsupported contract.

For non-recoverable cases the app shows one plain state and no technical stack trace.

## Rollback

Backend:
- mobile contract versions are additive;
- previous contract remains available during rollout;
- unknown blocks are ignored by old apps.

App:
- Play release can be halted;
- server recommended version can roll back;
- minimum version is raised only after the new binary is proven healthy.

Actions:
- idempotency receipts prevent duplicated material actions across retry/restart.

## Acceptance test: "baby mode"

A fresh owner phone passes only if:
- no APK file is manually handled;
- no Android Settings navigation is required for install;
- no URL, API key or token is typed;
- no terminal is used on phone;
- first app launch pairs automatically;
- the first screen contains real Prometeo state or a plain recoverable error;
- voice plays with screen locked;
- app survives network loss using the last snapshot;
- updates arrive through Play without manual APK replacement;
- a copied/expired install invite cannot pair a second device;
- an unpaired public install cannot read or mutate Prometeo;
- every material action still requires device approval and remains idempotent.

## Implementation order

1. Freeze stable app signing identity.
2. Create Play Console app + Play App Signing + service account/API access.
3. Add AAB build and automated Play publication.
4. Add Play Install Referrer auto-pairing.
5. Add verified App Links and assetlinks.json.
6. Add /mobile/i/<invite> installer landing route.
7. Add invite command/control and QR.
8. Add FCM device registration + typed push events.
9. Add notification permission corridor.
10. Run fresh-device acceptance test.
11. Only then replace the current manual APK path as canonical.
