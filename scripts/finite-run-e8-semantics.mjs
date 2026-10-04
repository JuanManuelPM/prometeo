function rules(packet) {
  return Array.isArray(packet?.common_capsule?.execution_rules)
    ? packet.common_capsule.execution_rules.map(value => String(value).toUpperCase())
    : [];
}

function poolForbidden(packet) {
  return rules(packet).some(rule => /NO\s+POOL|NO\s+POOL\//.test(rule));
}

function availableReallocationSlots(packet) {
  return Array.isArray(packet?.reallocation_slots)
    ? packet.reallocation_slots.filter(Boolean)
    : [];
}

export function resolveFiniteRunE8(packet, primaryReturn) {
  if (!packet || typeof packet !== 'object') throw new TypeError('packet must be an object');
  if (!primaryReturn || typeof primaryReturn !== 'object') throw new TypeError('primaryReturn must be an object');

  const primaryComplete = primaryReturn.primary_complete === true;
  const productiveUnitCounted = primaryReturn.productive_unit_counted === true;
  if (!primaryComplete) {
    return {
      action: 'E7_PRIMARY_INCOMPLETE',
      terminal: false,
      preserve_primary_result: false,
      productive_unit_counted: productiveUnitCounted,
      failure_code: null
    };
  }

  const slots = availableReallocationSlots(packet);
  const pool = packet.reallocation_pool ?? null;
  const legalPool = Boolean(pool) && !poolForbidden(packet);
  if (slots.length > 0 || legalPool) {
    return {
      action: 'E8_REALLOCATE',
      terminal: false,
      preserve_primary_result: true,
      productive_unit_counted: productiveUnitCounted,
      failure_code: null,
      surface: slots.length > 0 ? 'REALLOCATION_SLOTS' : 'REALLOCATION_POOL'
    };
  }

  return {
    action: 'E8_TERMINAL_BOUNDARY',
    terminal: true,
    preserve_primary_result: true,
    productive_unit_counted: productiveUnitCounted,
    failure_code: 'RUN_E8_NO_LEGAL_REALLOCATION_SURFACE',
    boundary_stage: 'E8_REALLOCATE',
    next_action: 'PERSIST_TERMINAL_BOUNDARY_THEN_E9',
    surface: 'NONE'
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const fs = await import('node:fs');
  const [packetPath, returnPath] = process.argv.slice(2);
  if (!packetPath || !returnPath) throw new Error('usage: node finite-run-e8-semantics.mjs <PACKET.json> <RETURN.json>');
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  const primaryReturn = JSON.parse(fs.readFileSync(returnPath, 'utf8'));
  process.stdout.write(JSON.stringify(resolveFiniteRunE8(packet, primaryReturn), null, 2) + '\n');
}
