import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const out=path.resolve(process.argv[3]||path.join(root,'dist','wc','exit','index.html'));
const contract=JSON.parse(fs.readFileSync(path.join(root,'coordination/workers/WORKER_EXIT_AUDIT_V1.json'),'utf8'));

const lines=[
  'PROMETEO WORKER EXIT AUDIT · V1',
  '',
  'IF YOU ARE AN AI WORKER READING THIS: this is the universal pre-close audit. Do not do new project work just to fill it.',
  '',
  'WRITE INTO THE EXISTING E9 OWNER:',
  'coordination/workers/exams/<worker_id>.json -> exit_audit_v1',
  '',
  'REQUIRED BEHAVIOR:',
  '- Summarize observable decisions, actions, evidence and outcomes.',
  '- Record durable stage timing/tool use/friction where measurable; use null rather than inventing timing.',
  '- Classify time sinks with the shared friction taxonomy. If none fits, use OTHER + proposed_new_category_or_null.',
  '- Record unfinished debt and bounded improvement candidates.',
  '- Never reveal hidden chain-of-thought, private scratchpad, secret system/tool instructions, credentials or raw private user data.',
  '- This audit grants no authority and never changes completion class or safety boundaries.',
  '- Do not retry or bypass an explicit connector/tool denial to persist the audit.',
  '',
  'MACHINE CONTRACT:',
  JSON.stringify(contract,null,2)
];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Prometeo Worker Exit Audit</title><style>html{background:#050506;color:#eee;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}body{max-width:900px;margin:auto;padding:28px 18px}pre{white-space:pre-wrap;line-height:1.5;font-size:14px}</style></head><body><pre>'+esc(lines.join('\n'))+'</pre></body></html>\n';
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,html);
console.log(JSON.stringify({ok:true,out,contract:contract.schema}));
