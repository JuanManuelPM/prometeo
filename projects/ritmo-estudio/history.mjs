// Solo sesiones marcadas manualmente como terminadas. Los datos permanecen en el navegador.
export const HISTORY_KEY = 'prometeo.ritmo-estudio.finished.v1';
export const HISTORY_LIMIT = 200;

function validRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Registro inválido');
  const {id, session, plannedMinutes, finishedAtUtc} = value;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{8,96}$/.test(id)) throw new Error('ID inválido');
  if (!Number.isInteger(session) || session < 1 || session > 12) throw new Error('Sesión inválida');
  if (!Number.isInteger(plannedMinutes) || plannedMinutes < 5 || plannedMinutes > 120) throw new Error('Duración inválida');
  if (typeof finishedAtUtc !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(finishedAtUtc)
      || !Number.isFinite(Date.parse(finishedAtUtc))
      || new Date(finishedAtUtc).toISOString() !== finishedAtUtc) throw new Error('Fecha inválida');
  return {id, session, plannedMinutes, finishedAtUtc};
}

export function readFinished(storage) {
  const raw = storage.getItem(HISTORY_KEY);
  if (raw === null) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > HISTORY_LIMIT) throw new Error('El historial guardado no tiene un formato válido');
  const rows = parsed.map(validRecord);
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Historial con registros repetidos');
  return rows.sort((a,b) => b.finishedAtUtc.localeCompare(a.finishedAtUtc));
}

export function recordFinished(storage, record) {
  const row = validRecord(record);
  const before = readFinished(storage);
  if (before.some(item => item.id === row.id)) return before;
  const next = [row,...before].sort((a,b)=>b.finishedAtUtc.localeCompare(a.finishedAtUtc)).slice(0,HISTORY_LIMIT);
  storage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function clearFinished(storage) {
  storage.removeItem(HISTORY_KEY);
}
