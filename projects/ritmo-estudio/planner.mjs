// Ritmo de estudio · motor puro, sin almacenamiento ni conexiones de red.
export function planBlocks({startIso, rounds = 4, focusMinutes = 25, breakMinutes = 5}) {
  const t0 = Date.parse(startIso);
  if (!Number.isFinite(t0)) throw new RangeError("Inicio UTC inválido.");
  for (const [name, value, min, max] of [
    ["Sesiones", rounds, 1, 12],
    ["Minutos de enfoque", focusMinutes, 5, 120],
    ["Minutos de pausa", breakMinutes, 0, 60]
  ]) {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new RangeError(`${name}: se espera un entero entre ${min} y ${max}.`);
    }
  }
  const blocks = [];
  let cursor = t0;
  for (let session = 1; session <= rounds; session++) {
    const focusEnd = cursor + focusMinutes * 60000;
    blocks.push({ kind: "enfoque", session, startUtc: new Date(cursor).toISOString(), endUtc: new Date(focusEnd).toISOString() });
    cursor = focusEnd;
    if (session < rounds && breakMinutes > 0) {
      const pauseEnd = cursor + breakMinutes * 60000;
      blocks.push({ kind: "pausa", session, startUtc: new Date(cursor).toISOString(), endUtc: new Date(pauseEnd).toISOString() });
      cursor = pauseEnd;
    }
  }
  return {
    timeZone: "America/Argentina/Buenos_Aires",
    totalMinutes: rounds * focusMinutes + (rounds - 1) * breakMinutes,
    finishUtc: new Date(cursor).toISOString(),
    blocks
  };
}

export function formatArgentineDate(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) throw new RangeError("Fecha inválida.");
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(d) + " ART";
}
