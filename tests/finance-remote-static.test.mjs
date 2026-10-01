import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const clientPath = new URL('../shared/finance/v1/finance-client.js', import.meta.url);
const contractPath = new URL('../shared/finance/v1/finance-contract.js', import.meta.url);
const adapterPath = new URL('../shared/finance/v1/finance-calendar-adapter.js', import.meta.url);
const calendarPath = new URL('../pages/calendar/app-04-finance.js', import.meta.url);

const client = fs.readFileSync(clientPath, 'utf8');
const contract = fs.readFileSync(contractPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');
const calendar = fs.readFileSync(calendarPath, 'utf8');

test('default Finance stays synthetic while an authenticated live client exists', () => {
  assert.match(client, /finance-demo-v1/);
  assert.match(client, /finance-v1/);
  assert.match(client, /remote-demo/);
  assert.match(client, /remote-live/);
  assert.match(client, /Authorization/);
  assert.match(client, /FINANCE_AUTH_REQUIRED/);
});

test('Finance public code contains no provider credentials', () => {
  const publicCode = [client, contract, adapter, calendar].join('\n');
  for (const forbidden of [
    /APP_USR-/,
    /MP_CLIENT_SECRET\s*=/,
    /MP_ACCESS_TOKEN\s*=/,
    /refresh_token\s*=/i,
    /SUPABASE_SECRET_KEY\s*=/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=/
  ]) {
    assert.doesNotMatch(publicCode, forbidden);
  }
});

test('calendar upgrades from persisted Supabase session and keeps explicit demo fallback', () => {
  assert.match(calendar, /shared\/finance\/v1\/finance-calendar-adapter\.js/);
  assert.doesNotMatch(calendar, /mercadopago/i);
  assert.match(adapter, /@supabase\/supabase-js@2\.116\.0/);
  assert.match(adapter, /auth\.getSession/);
  assert.match(adapter, /createLiveFinanceClient/);
  assert.match(adapter, /demo-fallback/);
  assert.match(adapter, /PrometeoFinance\.getRange/);
});

test('Finance contracts are versioned', () => {
  assert.match(contract, /prometeo\.finance\.range\.v1/);
  assert.match(contract, /prometeo\.finance\.day\.v1/);
  assert.match(contract, /prometeo\.finance\.status\.v1/);
});

test('live client sends bearer auth and publishable apikey', async () => {
  const originalFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, options) => {
    seen = { url: String(url), options };
    return new Response(JSON.stringify({ schema: 'prometeo.finance.status.v1', mode: 'live', connections: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };
  try {
    const { createLiveFinanceClient, FINANCE_PUBLISHABLE_KEY } = await import('../shared/finance/v1/finance-client.js');
    const live = createLiveFinanceClient({ getAccessToken: async () => 'session-token' });
    const payload = await live.getStatus();
    assert.equal(payload.mode, 'live');
    assert.match(seen.url, /finance-v1/);
    assert.equal(seen.options.headers.Authorization, 'Bearer session-token');
    assert.equal(seen.options.headers.apikey, FINANCE_PUBLISHABLE_KEY);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('live client fails closed without a session token', async () => {
  const { createLiveFinanceClient } = await import('../shared/finance/v1/finance-client.js');
  const live = createLiveFinanceClient({ getAccessToken: async () => null });
  await assert.rejects(() => live.getStatus(), error => error?.code === 'FINANCE_AUTH_REQUIRED');
});
