function asMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function projectClockTime(value, domain) {
  const pointMs = asMs(value);
  const startMs = asMs(domain?.startMs);
  const endMs = asMs(domain?.endMs);
  if (pointMs === null || startMs === null || endMs === null || endMs <= startMs) return null;
  return clamp01((pointMs - startMs) / (endMs - startMs)) * 100;
}

export function formatClockTime(value, options = {}) {
  const valueMs = asMs(value);
  if (valueMs === null) return null;
  const locale = options.locale || 'en-GB';
  const timeZone = options.timeZone || 'UTC';
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(valueMs));
}

export function buildClockTimeTicks(domain, tickCount = 4, options = {}) {
  const count = Math.max(2, Math.floor(Number(tickCount) || 4));
  const startMs = asMs(domain?.startMs);
  const endMs = asMs(domain?.endMs);
  if (startMs === null || endMs === null || endMs <= startMs) return [];
  const durationMs = endMs - startMs;
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    const atMs = startMs + durationMs * ratio;
    return {
      atMs,
      leftPct: ratio * 100,
      label: formatClockTime(atMs, options)
    };
  });
}
