#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REQUEST_DIR = 'coordination/portfolio/frontier-pressure-requests';
export const REQUEST_SCHEMA = 'prometeo.frontier-pressure-exact-request/v1';
const SHA40 = /^[0-9a-f]{40}$/i;

export function normalizeSha(value, label = 'source_sha') {
  const sha = String(value ?? '').trim();
  if (!SHA40.test(sha)) throw new Error(`${label} must be exactly 40 hex characters`);
  return sha.toLowerCase();
}

export function isRequestPath(value) {
  const p = String(value ?? '').replaceAll('\\', '/');
  return new RegExp(`^${REQUEST_DIR.replaceAll('/', '\\/')}\\/[^/]+\\.json$`).test(p);
}

export function parseNameStatus(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const fields = line.split('\t');
      const status = fields[0] ?? '';
      const paths = fields.slice(1);
      if (!status || !paths.length) throw new Error(`Malformed git diff --name-status row: ${line}`);
      return { status, paths };
    });
}

export function selectRequestEntry(entries) {
  const touched = entries.filter((entry) => entry.paths.some(isRequestPath));
  if (touched.length === 0) return null;
  if (touched.length !== 1) throw new Error(`Expected exactly one changed frontier-pressure request file, found ${touched.length}`);
  const entry = touched[0];
  if (entry.status !== 'A' || entry.paths.length !== 1 || !isRequestPath(entry.paths[0])) {
    throw new Error(`Frontier-pressure requests are append-only CREATEs; got ${entry.status} ${entry.paths.join(' -> ')}`);
  }
  return entry.paths[0];
}

export function validateRequest(value, requestPath) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Request must be a JSON object');
  if (value.schema !== REQUEST_SCHEMA) throw new Error(`Request schema must be ${REQUEST_SCHEMA}`);
  const requestId = String(value.request_id ?? '').trim();
  if (!requestId) throw new Error('Request request_id is required');
  const expectedId = path.basename(requestPath, '.json');
  if (requestId !== expectedId) throw new Error(`request_id must match filename (${expectedId})`);
  const sourceSha = normalizeSha(value.source_sha, 'request.source_sha');
  return {
    mode: 'request_push',
    source_sha: sourceSha,
    request_id: requestId,
    request_path: requestPath,
  };
}

export async function resolvePush({ repoRoot, beforeSha, eventSha }) {
  const before = normalizeSha(beforeSha, 'before_sha');
  const event = normalizeSha(eventSha, 'event_sha');
  if (/^0{40}$/.test(before)) throw new Error('before_sha may not be all-zero for main push resolution');

  const diff = spawnSync('git', ['diff', '--name-status', '--find-renames', before, event, '--'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (diff.status !== 0) throw new Error(`git diff failed: ${(diff.stderr || diff.stdout || '').trim()}`);

  const entries = parseNameStatus(diff.stdout);
  const requestPath = selectRequestEntry(entries);
  if (!requestPath) {
    return {
      mode: 'self_test_push',
      source_sha: event,
      request_id: null,
      request_path: null,
    };
  }

  let value;
  try {
    value = JSON.parse(await fs.readFile(path.join(repoRoot, requestPath), 'utf8'));
  } catch (error) {
    throw new Error(`Malformed request JSON at ${requestPath}: ${error.message}`);
  }
  return validateRequest(value, requestPath);
}

export async function resolveExactSource({ repoRoot='.', eventName, dispatchSha='', beforeSha='', eventSha='' }) {
  if (eventName === 'workflow_dispatch') {
    return {
      mode: 'workflow_dispatch',
      source_sha: normalizeSha(dispatchSha, 'dispatch source_sha'),
      request_id: null,
      request_path: null,
    };
  }
  if (eventName === 'push') return resolvePush({ repoRoot, beforeSha, eventSha });
  throw new Error(`Unsupported event_name: ${eventName}`);
}

function parseArgs(argv) {
  const args = [...argv];
  const take = (flag, fallback='') => {
    const i = args.indexOf(flag);
    if (i < 0) return fallback;
    const value = args[i + 1];
    if (value === undefined) throw new Error(`Missing value for ${flag}`);
    args.splice(i, 2);
    return value;
  };
  const options = {
    repoRoot: path.resolve(take('--root', '.')),
    eventName: take('--event-name'),
    dispatchSha: take('--dispatch-sha'),
    beforeSha: take('--before-sha'),
    eventSha: take('--event-sha'),
    githubOutput: take('--github-output'),
  };
  if (args.length) throw new Error(`Unknown arguments: ${args.join(' ')}`);
  if (!options.eventName) throw new Error('--event-name is required');
  return options;
}

async function main(argv) {
  const options = parseArgs(argv);
  const result = await resolveExactSource(options);
  if (options.githubOutput) {
    const lines = [
      `source_sha=${result.source_sha}`,
      `request_mode=${result.mode}`,
      `request_id=${result.request_id ?? ''}`,
      `request_path=${result.request_path ?? ''}`,
    ];
    await fs.appendFile(options.githubOutput, `${lines.join('\n')}\n`, 'utf8');
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error?.stack ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
