function nonNegativeInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

export function deriveCapacityProjection({ target, ready, working, claimed } = {}) {
  const t = nonNegativeInteger(target);
  const r = nonNegativeInteger(ready);
  const w = nonNegativeInteger(working);
  const c = nonNegativeInteger(claimed);
  const needed = Math.min(t, Math.max(0, r + w));
  const missing = Math.max(0, needed - c);
  const reserve = Math.max(0, c - needed);
  return {
    target: t,
    ready: r,
    working: w,
    claimed: c,
    needed,
    missing,
    reserve,
    refill_n: missing,
    should_refill: missing > 0
  };
}
