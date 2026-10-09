// P4 Capture adapter: durable notes stay in the existing note store.
const TERMINAL = new Set(['QUEUED', 'DENIED', 'CONFLICT', 'REMOTE_ATTACHMENT']);
const HEX = /^[a-f0-9]{64}$/;
const fail = (code, message = code) => Object.assign(new Error(message), {code});
export async function textDigest(text, cryptoImpl = globalThis.crypto) {
  return Array.from(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(text))), x => x.toString(16).padStart(2, '0')).join('');
}
export async function oneTurnNoteId(page_id, request_id, cryptoImpl = globalThis.crypto) {
  return 'one-turn-' + await textDigest(page_id + '\n' + request_id, cryptoImpl);
}
export function verifyCaptureReceipt(receipt, expected) {
  if (!receipt || receipt.schema !== 'prometeo.capture-ack/v1' || receipt.durable !== true ||
      receipt.workspace_id !== expected.workspace_id || receipt.page_id !== expected.page_id ||
      receipt.request_id !== expected.request_id || receipt.digest !== expected.digest ||
      (expected.execute !== undefined && receipt.execute !== expected.execute) || !HEX.test(receipt.digest || '') || !receipt.capture_id || receipt.revision !== 1 ||
      receipt.revision_ref !== `capture:${receipt.capture_id}:rev:1`) throw fail('CAPTURE_ACK_INVALID');
  return receipt;
}
export function createOneTurnSubmitter({store, client, cryptoImpl = globalThis.crypto, onState = () => {}}) {
  const inflight = new Map();
  async function run({text, page, request_id, execute = true}) {
    const page_id = String(page?.id || '');
    const body = String(text || '').trim();
    if (!page_id || !body || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(request_id || '')) throw fail('INPUT_INVALID');
    const digest = await textDigest(body, cryptoImpl);
    const id = await oneTurnNoteId(page_id, request_id, cryptoImpl);
    let note = await store.getNote(id);
    if (note && (note.text !== body || note.one_turn.execute !== execute)) throw fail('REQUEST_CONFLICT');
    if (note?.one_turn.state === 'QUEUED') return note.one_turn;
    if (['DENIED', 'CONFLICT'].includes(note?.one_turn.state)) throw fail(note.one_turn.error_code || note.one_turn.state);
    note ||= {id, text: body, pageId: page_id, created: Date.now(), status: 'done',
      sourceTitle: page.title || page_id, sourceHref: page.href || '',
      one_turn: {request_id, page_id, digest, execute, state: 'LOCAL_ONLY'}};
    const persist = async delta => {
      note = {...note, one_turn: {...note.one_turn, ...delta}};
      await store.putNote(note); // IndexedDB transaction completion, before network.
      try { onState(note.one_turn); } catch {}
    };
    await persist({state: note.one_turn.state || 'LOCAL_ONLY', digest, page_id});
    try {
      if (!client.hasWorkspace()) throw fail('WORKSPACE_NOT_LINKED');
      const workspace = await client.workspace();
      if (!workspace.workspace_id) throw fail('WORKSPACE_ACK_INVALID');
      if (note.one_turn.workspace_id && note.one_turn.workspace_id !== workspace.workspace_id) throw fail('WORKSPACE_CHANGED');
      await persist({workspace_id: workspace.workspace_id});
      const expected = {workspace_id: workspace.workspace_id, page_id, request_id, digest, execute};
      const saved = await client.submitText({page, request_id, text: body, execute});
      const ack = verifyCaptureReceipt(saved.receipt, expected);
      // Verify against a separate authenticated read, even after ambiguous retries.
      const read = await client.captureReceipt({page, request_id});
      verifyCaptureReceipt(read.receipt, expected);
      if (read.receipt.capture_id !== ack.capture_id) throw fail('CAPTURE_ACK_INVALID');
      await persist({state: 'REMOTE_ACK', input_receipt: read.receipt, error_code: null});
      if (!execute) return note.one_turn;
      const dispatched = await client.submitOneTurn({page, request_id, input_receipt: read.receipt});
      if (dispatched.ok !== true || dispatched.request_id !== request_id ||
          !dispatched.work_item_id || dispatched.queued_to_worker_pool !== true ||
          dispatched.delivery_mode !== 'WORKER_POOL') throw fail('DISPATCH_ACK_INVALID');
      await persist({state: 'QUEUED', work_item_id: dispatched.work_item_id, return_path: dispatched.return_path});
      return note.one_turn;
    } catch (error) {
      const denied = error?.status === 401 || error?.status === 403;
      const conflict = ['REQUEST_CONFLICT', 'WORKSPACE_CHANGED'].includes(error?.code);
      await persist({state: denied ? 'DENIED' : conflict ? 'CONFLICT' : note.one_turn.input_receipt ? 'DISPATCH_PENDING' : 'LOCAL_ONLY', error_code: error?.code || 'TRANSPORT_UNAVAILABLE'});
      throw error;
    }
  }
  function submit(input) {
    const key = String(input.page?.id) + '\n' + input.request_id;
    const signature = JSON.stringify([String(input.text || '').trim(), input.execute !== false]);
    const current = inflight.get(key);
    if (current) return current.signature === signature ? current.promise : Promise.reject(fail('REQUEST_CONFLICT'));
    const promise = run(input).finally(() => inflight.delete(key));
    inflight.set(key, {promise, signature});
    return promise;
  }
  async function recover(page) {
    const results = [];
    for (const note of await store.listNotes()) {
      if (note.pageId !== page.id || !note.one_turn) continue;
      if (note.one_turn.state === 'QUEUED') { results.push(note.one_turn); continue; }
      if (TERMINAL.has(note.one_turn.state) ||
          (!note.one_turn.execute && note.one_turn.state === 'REMOTE_ACK')) continue;
      try { results.push(await submit({text: note.text, page, request_id: note.one_turn.request_id, execute: note.one_turn.execute})); }
      catch (error) { results.push({request_id: note.one_turn.request_id, error_code: error.code || 'TRANSPORT_UNAVAILABLE'}); }
    }
    return results;
  }
  return Object.freeze({submit, recover});
}
