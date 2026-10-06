Prometeo.registerWidget({
  id:'workers',
  name:'WORKERS',
  version:1,
  widgetApi:1,
  defaultHeight:250,
  pages:[{title:'WORKERS'}],
  css:`
    .worker-list{width:min(92%,380px);text-align:left}
    .worker-line{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}
    .worker-note{font-size:11px;color:var(--muted);margin-bottom:8px}
  `,
  render(){
    return `<div class="worker-list">
      <div class="worker-note">UI shell únicamente · runtime real todavía no conectado</div>
      <div class="worker-line"><span>allocator feed</span><b>UNWIRED</b></div>
      <div class="worker-line"><span>claims</span><b>EXPERIMENTAL</b></div>
      <div class="worker-line"><span>liveness</span><b>NO CLAIM</b></div>
    </div>`;
  }
});
