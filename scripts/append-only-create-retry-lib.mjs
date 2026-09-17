const TRANSIENT_HEAD_CODES = new Set([
  'HEAD_MOVED',
  'CAS_CONFLICT',
  'REF_CONFLICT',
  'BRANCH_MOVED',
  'NON_FAST_FORWARD',
]);

export function classifyAppendCreateError(error = {}) {
  const code = String(error.code ?? error.name ?? '').toUpperCase();
  const status = Number(error.status ?? error.statusCode ?? error.http_status ?? 0);
  const message = String(error.message ?? '').toLowerCase();

  if (TRANSIENT_HEAD_CODES.has(code)) return 'HEAD_MOVED';
  if (status === 409 && /(head|ref|branch|fast[- ]?forward|sha|conflict)/i.test(message)) return 'HEAD_MOVED';
  if (status === 409 && /(exists|already|path|file)/i.test(message)) return 'PATH_MAY_EXIST';
  if (status === 422 && /(exists|already|path|file)/i.test(message)) return 'PATH_MAY_EXIST';
  return 'UNKNOWN';
}

function assertHost(host) {
  for (const method of ['readPath', 'readHead', 'createPath']) {
    if (!host || typeof host[method] !== 'function') {
      throw new TypeError(`host.${method} must be a function`);
    }
  }
}

export async function createAppendOnlyWithRetry({
  path,
  content,
  host,
  sourceHead = null,
  maxHeadRetries = 3,
}) {
  if (!path || typeof path !== 'string') throw new TypeError('path must be a non-empty string');
  if (!Number.isInteger(maxHeadRetries) || maxHeadRetries < 0) throw new TypeError('maxHeadRetries must be a non-negative integer');
  assertHost(host);

  const trace = [];
  let observedHead = sourceHead ?? await host.readHead();

  for (let attempt = 0; attempt <= maxHeadRetries; attempt += 1) {
    try {
      const receipt = await host.createPath({path, content, sourceHead: observedHead});
      trace.push({attempt, path, source_head: observedHead, outcome: 'CREATED'});
      return {
        schema: 'prometeo.append-only-create-retry-result/v1',
        state: 'CREATED',
        path,
        attempts: attempt + 1,
        final_head: observedHead,
        receipt: receipt ?? null,
        trace,
      };
    } catch (error) {
      const classification = classifyAppendCreateError(error);
      const existing = await host.readPath(path);

      if (existing != null) {
        trace.push({attempt, path, source_head: observedHead, outcome: 'LOST_RACE', classification});
        return {
          schema: 'prometeo.append-only-create-retry-result/v1',
          state: 'LOST_RACE',
          path,
          attempts: attempt + 1,
          final_head: observedHead,
          winner: existing,
          trace,
        };
      }

      if (classification !== 'HEAD_MOVED') {
        trace.push({attempt, path, source_head: observedHead, outcome: 'ABORTED', classification});
        return {
          schema: 'prometeo.append-only-create-retry-result/v1',
          state: 'ABORTED',
          path,
          attempts: attempt + 1,
          final_head: observedHead,
          reason: 'NON_RETRYABLE_CREATE_FAILURE',
          classification,
          trace,
        };
      }

      if (attempt >= maxHeadRetries) {
        trace.push({attempt, path, source_head: observedHead, outcome: 'RETRY_LIMIT', classification});
        return {
          schema: 'prometeo.append-only-create-retry-result/v1',
          state: 'RETRY_LIMIT',
          path,
          attempts: attempt + 1,
          final_head: observedHead,
          reason: 'HEAD_MOVED_RETRY_LIMIT',
          trace,
        };
      }

      const refreshedHead = await host.readHead();
      trace.push({attempt, path, source_head: observedHead, refreshed_head: refreshedHead, outcome: 'RETRY_SAME_PATH', classification});
      observedHead = refreshedHead;
    }
  }

  throw new Error('unreachable append-only retry state');
}
