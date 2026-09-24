import {
  assertISODate,
  assertRangePayload,
  assertDayPayload,
  assertStatusPayload
} from './finance-contract.js';

export const FINANCE_ENDPOINTS = Object.freeze({
  demo: 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/finance-demo-v1',
  live: 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/finance-v1'
});

export const FINANCE_PUBLISHABLE_KEY = 'sb_publishable_eqh3PngXs4UjLLWiY3pz1w_nhHtf7X-';
const CACHE_TTL_MS = 30_000;

export class FinanceAuthRequiredError extends Error {
  constructor() {
    super('Finance authentication required');
    this.name = 'FinanceAuthRequiredError';
    this.code = 'FINANCE_AUTH_REQUIRED';
  }
}

function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, String(value));
  });
  return search.toString();
}

export function createFinanceClient({
  endpoint = FINANCE_ENDPOINTS.demo,
  timeoutMs = 8000,
  mode = 'remote-demo',
  getAccessToken = null,
  apiKey = null
} = {}) {
  const cache = new Map();

  async function request(view, params = {}) {
    const key = `${view}:${JSON.stringify(params)}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    const headers = { Accept: 'application/json' };
    if (typeof getAccessToken === 'function') {
      const token = await getAccessToken();
      if (!token) throw new FinanceAuthRequiredError();
      headers.Authorization = `Bearer ${token}`;
    }
    if (apiKey) headers.apikey = apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `${endpoint}?${queryString({ view, ...params })}`;
      const response = await fetch(url, {
        method: 'GET',
        headers,
        cache: 'no-store',
        credentials: 'omit',
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
    mode,
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

export function createLiveFinanceClient({
  getAccessToken,
  endpoint = FINANCE_ENDPOINTS.live,
  apiKey = FINANCE_PUBLISHABLE_KEY,
  timeoutMs = 8000
} = {}) {
  if (typeof getAccessToken !== 'function') {
    throw new TypeError('createLiveFinanceClient requires getAccessToken');
  }
  return createFinanceClient({
    endpoint,
    timeoutMs,
    mode: 'remote-live',
    getAccessToken,
    apiKey
  });
}

export const PrometeoFinance = createFinanceClient();

if (typeof window !== 'undefined') {
  window.PrometeoFinance = PrometeoFinance;
}
