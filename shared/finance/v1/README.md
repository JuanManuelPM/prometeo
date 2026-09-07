# Prometeo Finance v1

Finance v1 is the provider-independent boundary between Prometeo pages and private financial data.

## Public side

`finance-client.js` is safe to ship through GitHub Pages. It contains no Mercado Pago credentials and currently points only to the synthetic demo endpoint.

Pages consume:

- `PrometeoFinance.getStatus()`
- `PrometeoFinance.getRange(from, to)`
- `PrometeoFinance.getDay(date)`

Pages must not import Mercado Pago-specific code.

## Private side

Two Supabase Edge Functions now exist:

- `finance-demo-v1`: public, intentionally unauthenticated, hard-wired to synthetic data only.
- `finance-v1`: JWT-verified and intended for future live/private data. It is already deployed and returns 401 without a valid user session.

The Finance database tables have RLS enabled and direct access for `anon` / `authenticated` revoked. Browser clients do not query those tables directly.

## Remaining gates before real financial data

1. create the owner identity in Supabase Auth;
2. create a live finance profile linked to that `auth.users` identity;
3. wire the Prometeo browser session to the authenticated `finance-v1` endpoint;
4. verify the same private data from at least two devices;
5. verify logout / missing-session denial and browser failure fallback;
6. only then add a Mercado Pago provider and run reconciliation against a short known period.

## Invariant

GitHub contains Finance code, contracts, migrations and server source. It must never contain real transactions, provider tokens, client secrets, refresh tokens, financial exports or private backups.
