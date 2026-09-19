const clean = value => value == null ? null : String(value).trim() || null;
const iso = value => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function classifyEventType(text = '') {
  const s = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/recuperatorio|recuperacion/.test(s)) return 'makeup_exam';
  if (/parcial|examen|evaluacion|final/.test(s)) return 'exam';
  if (/entrega|trabajo practico|tp\b|assignment/.test(s)) return 'assignment_due';
  if (/feriado|sin clase|no hay clase|no-class/.test(s)) return 'no_class';
  if (/clase/.test(s)) return 'class';
  return 'important_date';
}

export function blackboardCalendarEventToDerivedEvent(event, context = {}) {
  const startsAt = iso(event?.starts_at);
  if (!startsAt) return null;
  const uid = clean(event.uid);
  if (!uid) throw new Error('calendar uid is required');
  const sourceId = clean(context.source_id) || `bb:calendar:${uid}`;
  return {
    schema: 'prometeo.study-derived-event/v1',
    event_id: `event:${sourceId}`,
    title: clean(event.title) || 'Blackboard event',
    starts_at: startsAt,
    ends_at: iso(event.ends_at),
    all_day: !!event.all_day,
    event_type: classifyEventType(`${event.title || ''} ${event.description || ''}`),
    course_id: clean(context.course_id),
    source_id: sourceId,
    document_id: clean(context.document_id),
    source_locator: { kind: 'blackboard-calendar', uid, href: clean(event.href) },
    extraction_confidence: 'direct-source-date',
    extraction_status: context.course_id ? 'derived' : 'derived-unmapped-course',
    conflict_group_id: null,
    provenance: { provider: 'blackboard', source_kind: 'calendar', source_id: sourceId, authority: 'source-event-preserved' }
  };
}

const MONTHS = new Map([
  ['enero',0],['febrero',1],['marzo',2],['abril',3],['mayo',4],['junio',5],
  ['julio',6],['agosto',7],['septiembre',8],['setiembre',8],['octubre',9],['noviembre',10],['diciembre',11]
]);
function parseExplicitDate(line) {
  let m = line.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))).toISOString();
  m = line.toLowerCase().match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})\b/);
  if (m) return new Date(Date.UTC(Number(m[3]), MONTHS.get(m[2]), Number(m[1]))).toISOString();
  return null;
}

export function deriveScheduleCandidates(bodyText, context = {}) {
  const sourceId = clean(context.source_id);
  if (!sourceId) throw new Error('source_id is required for schedule provenance');
  const lines = String(bodyText || '').split(/\r?\n/);
  const out = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const startsAt = parseExplicitDate(line);
    if (startsAt) {
      out.push({
        schema: 'prometeo.study-derived-event/v1',
        event_id: `event:${sourceId}:line:${i + 1}`,
        title: clean(line.replace(/\s+/g, ' ')) || 'Fecha importante',
        starts_at: startsAt,
        ends_at: null,
        all_day: true,
        event_type: classifyEventType(line),
        course_id: clean(context.course_id),
        source_id: sourceId,
        document_id: clean(context.document_id),
        source_locator: { kind: 'text-span', line: i + 1, start: offset, end: offset + line.length },
        extraction_confidence: 'explicit-full-date',
        extraction_status: 'candidate',
        conflict_group_id: null,
        provenance: { provider: clean(context.provider), source_id: sourceId, derivation: 'schedule-derive-v1', document_authority_preserved: true }
      });
    }
    offset += line.length + 1;
  }
  return out;
}

function semanticKey(event) {
  const title = String(event.title || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b\d{1,2}[\/-]\d{1,2}[\/-]20\d{2}\b/g, '')
    .replace(/\b\d{1,2}\s+de\s+[a-z]+\s+(?:de\s+)?20\d{2}\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  return `${event.course_id || 'unmapped'}|${event.event_type || 'important_date'}|${title}`;
}

export function markScheduleConflicts(events) {
  const groups = new Map();
  events.forEach((event, index) => {
    const key = semanticKey(event);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ event, index });
  });
  const result = events.map(event => ({ ...event }));
  for (const [key, rows] of groups) {
    const dates = new Set(rows.map(x => iso(x.event.starts_at)).filter(Boolean));
    const sources = new Set(rows.map(x => x.event.source_id).filter(Boolean));
    if (rows.length > 1 && dates.size > 1 && sources.size > 1) {
      const groupId = `conflict:${key}`;
      for (const row of rows) {
        result[row.index].conflict_group_id = groupId;
        result[row.index].extraction_status = 'conflict';
      }
    }
  }
  return result;
}
