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

The current synthetic backend lives in Supabase as `finance-demo-v1`. The database tables have RLS enabled and direct access for `anon` / `authenticated` revoked. The demo Edge Function is intentionally unauthenticated only because it exposes synthetic data.

Before any real financial data is enabled:

1. create the owner identity in Supabase Auth;
2. deploy an authenticated `finance-v1` endpoint with JWT verification;
3. create a live finance profile linked to `auth.users`;
4. keep the demo endpoint separate;
5. only then add a Mercado Pago provider.

## Invariant

GitHub contains Finance code and contracts. It must never contain real transactions, provider tokens, client secrets, refresh tokens, financial exports or private backups.
