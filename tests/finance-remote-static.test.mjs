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

test('public Finance client points only at the synthetic endpoint', () => {
  assert.match(client, /finance-demo-v1/);
  assert.match(client, /remote-demo/);
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

test('calendar crosses the Finance boundary instead of importing Mercado Pago', () => {
  assert.match(calendar, /shared\/finance\/v1\/finance-calendar-adapter\.js/);
  assert.doesNotMatch(calendar, /mercadopago/i);
  assert.match(adapter, /PrometeoFinance\.getRange/);
});

test('Finance contracts are versioned', () => {
  assert.match(contract, /prometeo\.finance\.range\.v1/);
  assert.match(contract, /prometeo\.finance\.day\.v1/);
  assert.match(contract, /prometeo\.finance\.status\.v1/);
});
