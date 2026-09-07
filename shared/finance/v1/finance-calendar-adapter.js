import { PrometeoFinance } from './finance-client.js';

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

let requestSerial = 0;

function setRemoteState(state, text, title = '') {
  document.documentElement.dataset.financeRemote = state;
  const node = document.getElementById('financeContext');
  if (!node) return;
  node.dataset.localFinanceText ||= node.textContent || '';
  const base = node.dataset.localFinanceText;
  node.textContent = `${base} · ${text}`;
  node.title = title;
}

async function refreshRemote(dates) {
  if (!Array.isArray(dates) || !dates.length || typeof window.isoDate !== 'function') return;
  const serial = ++requestSerial;
  const from = window.isoDate(dates[0]);
  const to = window.isoDate(dates[dates.length - 1]);
  setRemoteState('loading', 'remoto demo …', 'Consultando Finance v1 con datos sintéticos.');
  try {
    const payload = await PrometeoFinance.getRange(from, to);
    if (serial !== requestSerial) return;
    const net = Number(payload.totals.net || 0);
    const count = Object.values(payload.days || {}).reduce((sum, day) => sum + Number(day.count || 0), 0);
    const sign = net > 0 ? '+' : '';
    setRemoteState(
      'ok',
      `demo remoto ${sign}${money.format(net)} · ${count} mov.`,
      'Datos sintéticos obtenidos desde Supabase. No son movimientos reales ni datos de Mercado Pago.'
    );
  } catch (error) {
    if (serial !== requestSerial) return;
    setRemoteState('error', 'remoto demo sin conexión', 'El calendario local sigue funcionando aunque Finance remoto falle.');
    console.warn('Prometeo Finance demo unavailable:', error instanceof Error ? error.message : 'unknown');
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
