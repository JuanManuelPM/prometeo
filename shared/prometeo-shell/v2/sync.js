const ENDPOINT = 'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/prometeo-capture';
const SECRET_KEY = 'prometeo.capture.workspace.secret.v1';
const WORKSPACE_KEY = 'prometeo.capture.workspace.id.v1';

function randomSecret() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  let s = '';
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function getSecret() {
  let secret = localStorage.getItem(SECRET_KEY);
  if (!secret || secret.length < 32) {
    secret = randomSecret();
    localStorage.setItem(SECRET_KEY, secret);
  }
  return secret;
}

async function call(action, payload = {}, secret = getSecret()) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${secret}`
    },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export class PrometeoRemote {
  constructor({ onState } = {}) {
    this.onState = onState || (() => {});
    this.ready = null;
    this.online = navigator.onLine;
    addEventListener('online', () => { this.online = true; this.onState({ online: true }); this.init().catch(() => {}); });
    addEventListener('offline', () => { this.online = false; this.onState({ online: false }); });
  }

  secret() { return getSecret(); }
  linkCode() { return `PWS1.${this.secret()}`; }

  async importLinkCode(code) {
    const clean = String(code || '').trim();
    const secret = clean.startsWith('PWS1.') ? clean.slice(5) : clean;
    if (secret.length < 32) throw new Error('Código de vínculo inválido.');
    localStorage.setItem(SECRET_KEY, secret);
    localStorage.removeItem(WORKSPACE_KEY);
    this.ready = null;
    return this.init();
  }

  async init() {
    if (!navigator.onLine) return null;
    if (!this.ready) {
      this.ready = call('bootstrap').then(data => {
        localStorage.setItem(WORKSPACE_KEY, data.workspace_id || '');
        this.onState({ online: true, synced: true, workspaceId: data.workspace_id });
        return data;
      }).catch(error => {
        this.ready = null;
        this.onState({ online: navigator.onLine, synced: false, error });
        throw error;
      });
    }
    return this.ready;
  }

  async syncCapture(note, page) {
    if (!navigator.onLine) return { deferred: true };
    await this.init();
    const text = String(note.text || '').trim();
    return call('sync_capture', {
      capture: {
        id: note.id,
        created: note.created,
        status: note.patentedIn ? 'patented' : (note.status || (text ? 'pending' : 'queued')),
        transcript: text,
        transcript_revision: note.transcriptRevision || 1,
        sourcePath: note.sourcePath,
        sourceHref: note.sourceHref,
        sourceTitle: note.sourceTitle,
        viewport: note.viewport,
        page_id: note.pageId || page?.id,
        page: page ? {
          manifest_url: page.manifest_url || null,
          public_url: page.public_url || page.href || note.sourceHref || null,
          source_repo: page.source_repo || 'JuanManuelPM/prometeo',
          source_entrypoint: page.source_entrypoint || null
        } : null,
        metadata: {
          orientation: matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape',
          shell: 'prometeo-shell/v2'
        }
      }
    });
  }

  async deleteCapture(id) {
    if (!navigator.onLine) return { deferred: true };
    await this.init();
    return call('delete_capture', { id });
  }

  async listCaptures(pageId = null, limit = 250) {
    if (!navigator.onLine) return [];
    await this.init();
    const data = await call('list_captures', { page_id: pageId || undefined, limit });
    return data.captures || [];
  }

  async createPatent(ids) {
    if (!navigator.onLine) throw new Error('Necesitás conexión para crear una patente.');
    await this.init();
    return call('create_patent', { capture_ids: ids });
  }
}
