# Prometeo Finance v1

Finance v1 is the provider-independent boundary between Prometeo pages and private financial data.

## Public browser boundary

`finance-client.js` is safe to ship through GitHub Pages. It contains no Mercado Pago credentials and exposes two explicit transports:

- the default synthetic demo client, which calls `finance-demo-v1` without authentication;
- `createLiveFinanceClient(...)`, which calls JWT-protected `finance-v1` using the current Supabase owner session plus the public publishable key.

Pages consume only the Finance contract:

- `getStatus()`
- `getRange(from, to)`
- `getDay(date)`

Pages must not import Mercado Pago-specific code.

`finance-calendar-adapter.js` now inspects the persisted Supabase session. When an owner session exists it upgrades Calendar to private Finance automatically. If no session exists it stays on the synthetic demo. If a live request fails, the adapter falls back to the synthetic endpoint and labels that fallback explicitly; local Calendar state remains usable.

The adapter pins `@supabase/supabase-js` to `2.116.0` and does not process Auth callback fragments on Calendar pages.

## Private side

Two Supabase Edge Functions exist:

- `finance-demo-v1`: public, intentionally unauthenticated, hard-wired to synthetic data only.
- `finance-v1`: JWT-verified and live/private. It resolves the authenticated owner to a live Finance profile before reading private Finance tables.

The Finance database tables have RLS enabled and direct access for `anon` / `authenticated` revoked. Browser clients do not query those tables directly.

The Prometeo owner has already been claimed, a live Finance profile exists, and the one-time initial bootstrap is consumed. Future devices must authenticate as the existing owner; they must not recreate owner state or create replacement Auth users merely to gain access.

## Remaining gates before Mercado Pago

1. verify the authenticated private Finance bridge on a second physical device using the existing owner identity;
2. verify sign-out / missing-session behavior and the explicit synthetic fallback in a real browser;
3. only then perform a minimal Mercado Pago provider/auth probe over a tiny known period;
4. reconcile provider output against activity visible to the owner before enabling automated sync or wider history.

Mercado Pago remains `not_connected` until those gates pass.

## Invariant

GitHub contains Finance code, contracts, migrations and server source. It must never contain real transactions, provider tokens, client secrets, refresh tokens, financial exports, private backups or reusable private session material.
