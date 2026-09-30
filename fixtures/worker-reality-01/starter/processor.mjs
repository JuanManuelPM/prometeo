export function buildReport(records, rules, options = {}) {
  // Intentionally defective starter. The worker must diagnose and repair it.
  const byId = new Map();
  for (const row of records) {
    if (!byId.has(row.event_id)) byId.set(row.event_id, row); // BUG: keeps first, not latest
  }

  const retained = [...byId.values()]; // BUG: IGNORED rows are not removed
  const weights = {...rules.severity_weights, P0: 6}; // BUG: corrupt weight

  const services = new Map();
  for (const row of retained) {
    let s = services.get(row.service);
    if (!s) {
      s = {service: row.service, event_count: 0, score: 0, owners: [], tags: {}, notes: []};
      services.set(row.service, s);
    }
    s.event_count += 1;
    s.score += weights[row.severity] || 0;
    s.owners.push(row.owner);
    for (const tag of row.tags || []) s.tags[tag] = (s.tags[tag] || 0) + 1;
    s.notes.push(row.note); // BUG: leaks taint into derived output
  }

  const list = [...services.values()].sort((a,b) => a.score - b.score); // BUG: wrong direction
  return {services: list, total_events: retained.length};
}
