#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {validateUniversalWorkerEnvelope} from './universal-cognitive-worker-lib.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/validate-universal-worker.mjs <worker-envelope.json> [--out <report.json>]',
    '',
    'Envelope fields:',
    '  bootstrap, opportunity, claim, run, optional return, optional attempted_paths',
    '',
    'Exit codes:',
    '  0 validation passed',
    '  1 validation failed',
    '  2 invocation/input error'
  ].join('\n');
}

function parseArgs(argv) {
  const args = [...argv];
  const input = args.shift();
  let out = null;
  while (args.length > 0) {
    const token = args.shift();
    if (token === '--out') {
      out = args.shift();
      if (!out) throw new Error('--out requires a path');
    } else if (token === '--help' || token === '-h') {
      return {help: true};
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return {input, out, help: false};
}

function readJson(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  return {absolute, value: JSON.parse(raw)};
}

function writeReport(filePath, report) {
  const absolute = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(absolute), {recursive: true});
  fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return absolute;
}

let parsed;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error(usage());
  process.exit(2);
}

if (parsed.help) {
  console.log(usage());
  process.exit(0);
}

if (!parsed.input) {
  console.error(usage());
  process.exit(2);
}

try {
  const {absolute: inputPath, value: envelope} = readJson(parsed.input);
  const report = validateUniversalWorkerEnvelope(envelope);
  const output = {
    ...report,
    input: inputPath,
    generated_by: 'scripts/validate-universal-worker.mjs'
  };
  if (parsed.out) output.report_path = writeReport(parsed.out, output);
  console.log(JSON.stringify(output, null, 2));
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  console.error(JSON.stringify({
    schema: 'prometeo.universal-worker-validation-error/v1',
    ok: false,
    error: error.message
  }, null, 2));
  process.exit(2);
}
