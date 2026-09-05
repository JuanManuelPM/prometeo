const ENABLE_KEY = 'prometeo.shell.enabled.v1';
const V2_URL = 'https://juanmanuelpm.github.io/prometeo/shared/prometeo-shell/v2/prometeo-shell.js?v=2';

// V3 boot contract: the Capture puck is ON by default on every Prometeo surface.
// ?prometeo=0 is the explicit opt-out. ?prometeo=1 explicitly re-enables it.
const url = new URL(location.href);
const requested = url.searchParams.get('prometeo');

if (requested === '0') {
  localStorage.removeItem(ENABLE_KEY);
  localStorage.setItem('prometeo.shell.disabled.v3', '1');
} else {
  localStorage.removeItem('prometeo.shell.disabled.v3');
  localStorage.setItem(ENABLE_KEY, '1');
}

if (requested === '1' || requested === '0') {
  url.searchParams.delete('prometeo');
  try { history.replaceState(history.state, '', url.href); } catch {}
}

if (requested !== '0') {
  import(V2_URL).catch(error => {
    console.error('[Prometeo shell v3 boot]', error);
    // Fail-visible: if the real shell cannot load, show a tiny diagnostic puck
    // instead of failing silently.
    if (document.getElementById('prometeo-shell-fallback')) return;
    const b = document.createElement('button');
    b.id = 'prometeo-shell-fallback';
    b.type = 'button';
    b.textContent = '!';
    b.title = 'Prometeo Capture no pudo iniciar';
    b.setAttribute('aria-label', 'Prometeo Capture no pudo iniciar');
    b.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;width:54px;height:54px;border-radius:50%;border:1px solid #9d6d62;background:#fff4f1;color:#7d3028;font:800 18px system-ui;box-shadow:0 5px 16px rgba(0,0,0,.18)';
    b.onclick = () => alert('Prometeo Capture no pudo cargar. Recargá la página. Si sigue apareciendo este !, el shell remoto está fallando.');
    document.documentElement.appendChild(b);
  });
}
