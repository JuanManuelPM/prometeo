export const FINANCE_SCHEMA_VERSION = 'prometeo.finance.v1';

export function assertISODate(value, name = 'date') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new TypeError(`${name} must be YYYY-MM-DD`);
  }
  return String(value);
}

export function assertRangePayload(payload) {
  if (!payload || payload.schema !== 'prometeo.finance.range.v1') {
    throw new TypeError('Invalid finance range payload');
  }
  if (!payload.totals || typeof payload.days !== 'object') {
    throw new TypeError('Incomplete finance range payload');
  }
  for (const key of ['income', 'expense', 'net']) {
    if (!Number.isFinite(Number(payload.totals[key]))) {
      throw new TypeError(`Invalid totals.${key}`);
    }
  }
  return payload;
}

export function assertDayPayload(payload) {
  if (!payload || payload.schema !== 'prometeo.finance.day.v1') {
    throw new TypeError('Invalid finance day payload');
  }
  if (!Array.isArray(payload.transactions) || !payload.totals) {
    throw new TypeError('Incomplete finance day payload');
  }
  return payload;
}

export function assertStatusPayload(payload) {
  if (!payload || payload.schema !== 'prometeo.finance.status.v1') {
    throw new TypeError('Invalid finance status payload');
  }
  return payload;
}
