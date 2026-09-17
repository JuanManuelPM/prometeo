export function compactOwner(value = '') {
  const s = String(value || '');
  if (!s) return '';
  return s.length <= 18 ? s : `${s.slice(0, 8)}…${s.slice(-6)}`;
}

export function formatLineage(job = {}) {
  const generation = Number(job.pin_generation || 0);
  const collisions = Number(job.collision_count || 0);
  const parts = [];
  if (generation > 0) parts.push(`PIN G${String(generation).padStart(6, '0')}`);
  if (job.owner) parts.push(`dueño ${compactOwner(job.owner)}`);
  if (collisions > 0) parts.push(`${collisions} ${collisions === 1 ? 'colisión' : 'colisiones'}`);
  if (job.authority_mode === 'recovery-pin' || generation > 1) parts.push('recuperación');
  return parts.join(' · ');
}

export function indexFeed(feed = {}) {
  const jobs = new Map();
  for (const project of feed.projects || []) {
    for (const job of project.jobs || []) if (job?.job_id) jobs.set(job.job_id, job);
  }
  const workers = new Map((feed.workers || []).filter(w => w?.worker_id).map(w => [w.worker_id, w]));
  return { jobs, workers };
}

async function loadFeed() {
  const response = await fetch(`./feed.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`feed ${response.status}`);
  return response.json();
}

export async function enhanceWorkerCard(card, feed) {
  if (!card?.open || card.querySelector('[data-lineage-evidence]')) return false;
  const workerId = card.dataset.worker;
  const { jobs, workers } = indexFeed(feed);
  const worker = workers.get(workerId);
  if (!worker?.job_id) return false;
  const job = jobs.get(worker.job_id);
  if (!job) return false;
  const text = formatLineage(job);
  if (!text) return false;
  const tech = card.querySelector('.tech');
  if (!tech) return false;
  const line = document.createElement('div');
  line.dataset.lineageEvidence = '1';
  line.textContent = text;
  tech.appendChild(line);
  return true;
}

function install() {
  let feedPromise = null;
  const getFeed = () => (feedPromise ||= loadFeed().catch(() => null));
  document.addEventListener('click', event => {
    const card = event.target?.closest?.('details.workerCard');
    if (!card) return;
    setTimeout(async () => {
      if (!card.open) return;
      const feed = await getFeed();
      if (feed) enhanceWorkerCard(card, feed);
    }, 0);
  });
}

if (typeof document !== 'undefined' && typeof fetch === 'function') install();
