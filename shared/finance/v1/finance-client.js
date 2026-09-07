import {
  assertISODate,
  assertRangePayload,
  assertDayPayload,
  assertStatusPayload
} from './finance-contract.js';

const DEFAULT_ENDPOINT = 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/finance-demo-v1';
const CACHE_TTL_MS = 30_000;

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  return search.toString();
}

export function createFinanceClient({ endpoint = DEFAULT_ENDPOINT, timeoutMs = 8000 } = {}) {
  const cache = new Map();

  async function request(view, params = {}) {
    const key = `${view}:${JSON.stringify(params)}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${endpoint}?${queryString({ view, ...params })}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Finance API ${response.status}`);
      const payload = await response.json();
      cache.set(key, { at: Date.now(), value: payload });
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({
    mode: 'remote-demo',
    endpoint,
    async getStatus() {
      return assertStatusPayload(await request('status'));
    },
    async getRange(from, to) {
      from = assertISODate(from, 'from');
      to = assertISODate(to, 'to');
      return assertRangePayload(await request('range', { from, to }));
    },
    async getDay(date) {
      date = assertISODate(date);
      return assertDayPayload(await request('day', { from: date, to: date }));
    },
    clearCache() {
      cache.clear();
    }
  });
}

export const PrometeoFinance = createFinanceClient();

if (typeof window !== 'undefined') {
  window.PrometeoFinance = PrometeoFinance;
}
