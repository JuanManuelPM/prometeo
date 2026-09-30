import {createAppendOnlyWithRetry} from './append-only-create-retry-lib.mjs';

function numericStatus(error = {}) {
  return Number(error.status ?? error.statusCode ?? error.http_status ?? 0);
}

export function normalizeGitHubContentsCreateError(error = {}) {
  const status = numericStatus(error);
  const message = String(error.message ?? '');
  const lower = message.toLowerCase();

  // GitHub Contents uses this 422 shape when a create targets an existing file:
  // updates require the current blob sha, so create-without-sha becomes an
  // existence hint. The append-only helper still re-reads the exact path
  // before deciding LOST_RACE; this normalization grants no authority.
  if (
    status === 422 &&
    (
      /sha[^\n]*(wasn['’]?t|was not|is not) supplied/i.test(message) ||
      /sha[^\n]*(required|missing)/i.test(message)
    )
  ) {
    const normalized = new Error('file already exists at path; sha required for update');
    normalized.code = 'PATH_MAY_EXIST';
    normalized.status = 422;
    normalized.cause = error;
    return normalized;
  }

  if (
    status === 409 &&
    /(branch|head|ref|fast[- ]?forward|sha|conflict)/i.test(lower)
  ) {
    const normalized = new Error(message || 'branch head moved');
    normalized.code = 'HEAD_MOVED';
    normalized.status = 409;
    normalized.cause = error;
    return normalized;
  }

  return error;
}

function assertClient(client) {
  for (const method of ['readPath', 'readHead', 'createFile']) {
    if (!client || typeof client[method] !== 'function') {
      throw new TypeError(`client.${method} must be a function`);
    }
  }
}

export function makeGitHubContentsAppendHost(client) {
  assertClient(client);

  return {
    async readPath(path) {
      try {
        return await client.readPath(path);
      } catch (error) {
        if (numericStatus(error) === 404) return null;
        throw error;
      }
    },

    async readHead() {
      return client.readHead();
    },

    async createPath({path, content, sourceHead}) {
      try {
        return await client.createFile({path, content, sourceHead});
      } catch (error) {
        throw normalizeGitHubContentsCreateError(error);
      }
    },
  };
}

export async function createGitHubContentsAppendOnly({
  path,
  content,
  client,
  sourceHead = null,
  maxHeadRetries = 2,
}) {
  const host = makeGitHubContentsAppendHost(client);
  return createAppendOnlyWithRetry({
    path,
    content,
    host,
    sourceHead,
    maxHeadRetries,
  });
}
