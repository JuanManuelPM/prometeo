import {
  PrometeoFinance,
  createLiveFinanceClient,
  FINANCE_PUBLISHABLE_KEY
} from './finance-client.js';

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

const SUPABASE_URL = 'https://catnohyouxqjjtseaueb.supabase.co';
const SUPABASE_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';
let requestSerial = 0;
let authClientPromise = null;
let liveClient = null;

function setRemoteState(state, text, title = '') {
  document.documentElement.dataset.financeRemote = state;
  const node = document.getElementById('financeContext');
  if (!node) return;
  node.dataset.localFinanceText ||= node.textContent || '';
  const base = node.dataset.localFinanceText;
  node.textContent = `${base} · ${text}`;
  node.title = title;
}

async function getAuthClient() {
  if (!authClientPromise) {
    authClientPromise = import(SUPABASE_SDK_URL).then(({ createClient }) => createClient(
      SUPABASE_URL,
      FINANCE_PUBLISHABLE_KEY,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
    ));
  }
  return authClientPromise;
}

async function getLiveClient() {
  if (!liveClient) {
    liveClient = createLiveFinanceClient({
      getAccessToken: async () => {
        const sb = await getAuthClient();
        const { data, error } = await sb.auth.getSession();
        if (error) throw error;
        return data.session?.access_token || null;
      }
    });
  }
  return liveClient;
}

async function resolveSource() {
  try {
    const sb = await getAuthClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (data.session?.access_token) {
      return { mode: 'live', client: await getLiveClient() };
    }
  } catch (error) {
    console.warn('Prometeo Finance auth unavailable:', error instanceof Error ? error.message : 'unknown');
  }
  return { mode: 'demo', client: PrometeoFinance };
}

function summarize(payload) {
  const net = Number(payload.totals.net || 0);
  const count = Object.values(payload.days || {}).reduce((sum, day) => sum + Number(day.count || 0), 0);
  const sign = net > 0 ? '+' : '';
  return { net, count, text: `${sign}${money.format(net)} · ${count} mov.` };
}

async function loadRange(source, from, to) {
  try {
    return { source, payload: await source.client.getRange(from, to) };
  } catch (error) {
    if (source.mode !== 'live') throw error;
    source.client.clearCache();
    console.warn('Prometeo private Finance unavailable; using synthetic fallback:', error instanceof Error ? error.message : 'unknown');
    return {
      source: { mode: 'demo-fallback', client: PrometeoFinance },
      payload: await PrometeoFinance.getRange(from, to)
    };
  }
}

async function refreshRemote(dates) {
  if (!Array.isArray(dates) || !dates.length || typeof window.isoDate !== 'function') return;
  const serial = ++requestSerial;
  const from = window.isoDate(dates[0]);
  const to = window.isoDate(dates[dates.length - 1]);
  const source = await resolveSource();
  if (serial !== requestSerial) return;
  setRemoteState(
    'loading',
    source.mode === 'live' ? 'Finance privado …' : 'remoto demo …',
    source.mode === 'live' ? 'Consultando Finance v1 con tu sesión privada.' : 'Consultando Finance v1 con datos sintéticos.'
  );
  try {
    const result = await loadRange(source, from, to);
    if (serial !== requestSerial) return;
    const summary = summarize(result.payload);
    if (result.source.mode === 'live') {
      setRemoteState('live', `Finance privado ${summary.text}`, 'Datos privados obtenidos desde Finance v1. El calendario no accede directamente a Mercado Pago.');
    } else if (result.source.mode === 'demo-fallback') {
      setRemoteState('demo-fallback', `privado sin conexión · demo ${summary.text}`, 'La sesión privada no respondió; se muestra únicamente el fallback sintético.');
    } else {
      setRemoteState('demo', `demo remoto ${summary.text}`, 'Datos sintéticos obtenidos desde Supabase. No son movimientos reales ni datos de Mercado Pago.');
    }
  } catch (error) {
    if (serial !== requestSerial) return;
    setRemoteState('error', 'Finance remoto sin conexión', 'El calendario local sigue funcionando aunque Finance remoto falle.');
    console.warn('Prometeo Finance unavailable:', error instanceof Error ? error.message : 'unknown');
  }
}

export function attachFinanceCalendarAdapter() {
  const original = window.updateFinance;
  if (typeof original !== 'function' || original.__prometeoRemoteFinance) return false;

  function wrappedUpdateFinance(dates) {
    original(dates);
    const node = document.getElementById('financeContext');
    if (node) node.dataset.localFinanceText = node.textContent || '';
    refreshRemote(dates);
  }
  wrappedUpdateFinance.__prometeoRemoteFinance = true;
  window.updateFinance = wrappedUpdateFinance;

  if (typeof window.render === 'function') window.render();
  return true;
}

attachFinanceCalendarAdapter();
