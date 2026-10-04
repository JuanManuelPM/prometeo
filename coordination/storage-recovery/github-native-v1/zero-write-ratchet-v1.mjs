import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const fail = message => { throw new Error(message); };
const pass = message => process.stdout.write('PASS ' + message + '\n');

const DATA_LAYER = 'current-tree/control-v11/data-layer.js';
const INPUT = 'current-tree/control-v11/chat-canary/input-module-v1.js';

const projections = [
  {
    name: 'prometeo_current_tree_v2',
    path: 'supabase/migrations/20260925132506_prometeo_current_tree_v2_light_bootstrap.sql'
  },
  {
    name: 'prometeo_organism_projection_v1',
    path: 'supabase/migrations/20260925163500_prometeo_organism_projection_v1.sql'
  },
  {
    name: 'prometeo_organism_projection_v1_1',
    path: 'supabase/migrations/20260925170500_prometeo_history_work_context_v1.sql'
  },
  {
    name: 'prometeo_work_contexts_projection_v1',
    path: 'supabase/migrations/20260925170500_prometeo_history_work_context_v1.sql'
  },
  {
    name: 'prometeo_control_room_activity_v1',
    path: 'supabase/migrations/20260925173500_prometeo_control_room_v7.sql'
  },
  {
    name: 'prometeo_statistics_v3',
    path: 'supabase/migrations/20260925220200_prometeo_statistics_v3.sql'
  }
];

function extractFunction(sql, name) {
  const lower = sql.toLowerCase();
  const needle = 'function public.' + name.toLowerCase();
  const start = lower.indexOf(needle);
  if (start < 0) fail(name + ': definition not found');

  const headerTail = sql.slice(start, Math.min(sql.length, start + 1800));
  const dollarFunction = headerTail.toLowerCase().indexOf('as $function$');
  const dollarPlain = headerTail.toLowerCase().indexOf('as $$');
  let opener;
  let relative;
  if (dollarFunction >= 0 && (dollarPlain < 0 || dollarFunction < dollarPlain)) {
    opener = '$function$';
    relative = dollarFunction + 'as '.length;
  } else if (dollarPlain >= 0) {
    opener = '$$';
    relative = dollarPlain + 'as '.length;
  } else {
    fail(name + ': body delimiter not found');
  }

  const bodyStart = start + relative + opener.length;
  const bodyEnd = sql.indexOf(opener, bodyStart);
  if (bodyEnd < 0) fail(name + ': closing delimiter not found');

  return {
    header: sql.slice(start, bodyStart),
    body: sql.slice(bodyStart, bodyEnd)
  };
}

function stripSqlStrings(sql) {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/'(?:''|[^'])*'/g, "''");
}

const dataLayer = read(DATA_LAYER);
if (dataLayer.includes('prometeo-change-loop-v1')) {
  fail('V11 data-layer must not depend on write-capable change-loop for observation');
}
for (const forbidden of [
  'mark_seen',
  'prometeo_work_context_append_event_v1',
  'prometeo_work_context_checkpoint_v1',
  'last_seen_at'
]) {
  if (dataLayer.includes(forbidden)) fail('V11 data-layer contains write-on-observation marker: ' + forbidden);
}
if (!/method:\s*'POST'[\s\S]{0,260}body:\s*'\{\}'/.test(dataLayer)) {
  fail('RPC read wrapper must keep an empty immutable request body');
}
pass('V11 observation layer has no known write-on-read endpoint');

const dml = /\b(insert\s+into|update\s+[a-z_"']|delete\s+from|truncate\s+|vacuum\b|create\s+(table|index|function)|alter\s+|drop\s+|nextval\s*\(|setval\s*\()/i;
for (const spec of projections) {
  const sql = read(spec.path);
  const fn = extractFunction(sql, spec.name);
  if (!/\bstable\b/i.test(fn.header)) {
    fail(spec.name + ': projection is not declared STABLE');
  }
  const cleaned = stripSqlStrings(fn.body);
  const hit = cleaned.match(dml);
  if (hit) fail(spec.name + ': direct durable mutation detected: ' + hit[0]);
  pass(spec.name + ' is STABLE and directly read-only');
}

const input = read(INPUT);
for (const marker of [
  "OUTBOX_KEY = 'prometeo.primary-chat.outbox.v1'",
  "BREAKER_KEY = 'prometeo.primary-chat.storage-breaker.v1'",
  "LOCAL_DURABLE",
  "STORAGE_DEGRADED",
  'saveOutbox(localEntry)',
  'flushPendingOutbox'
]) {
  if (!input.includes(marker)) fail('Primary Chat local-durable marker missing: ' + marker);
}
const sendStart = input.indexOf('async function send()');
const saveAt = input.indexOf('saveOutbox(localEntry)', sendStart);
const flushAt = input.indexOf('flushPendingOutbox({ interactive: true })', sendStart);
if (sendStart < 0 || saveAt < 0 || flushAt < 0 || !(saveAt < flushAt)) {
  fail('Primary Chat must persist local outbox before remote flush');
}
pass('Primary Chat saves local outbox before remote transport');

const audit = JSON.parse(read('coordination/storage-recovery/github-native-v1/ZERO_WRITE_AUDIT.json'));
if (audit.principle !== 'Read, refresh and poll paths must not mutate durable state merely because observation occurred.') {
  fail('Zero-write principle drifted');
}
pass('Zero-write preservation contract present');

process.stdout.write('ZERO_WRITE_STATIC_RATCHET_PASS\n');
