Prometeo.registerWidget({
 id:'experiments',name:'EXPERIMENTOS',version:3,widgetApi:1,defaultHeight:360,
 pages:[{title:'ACTUAL'},{title:'HISTORIAL'},{title:'CONTINUIDAD'}],
 css:`
 .e3{width:100%;height:100%;overflow:auto;text-align:left;padding:0 2px 16px;color:var(--fg)}
 .e3-hero{border-top:2px solid var(--fg);padding-top:9px}.e3-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
 .e3-id{font-size:26px;font-weight:900;line-height:1}.e3-pass{border:1px solid var(--fg);border-radius:99px;padding:3px 7px;font-size:10px;font-weight:900}
 .e3-title{font-size:12px;color:var(--muted);margin:6px 0 12px}.e3-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
 .e3-metric{border-top:1px solid var(--line);padding-top:6px}.e3-metric b{display:block;font-size:20px}.e3-metric span{font-size:9px;color:var(--muted)}
 .e3-split{height:8px;background:rgba(17,17,17,.12);display:flex;margin:12px 0 5px}.e3-a{width:60%;background:var(--fg)}.e3-b{width:40%;background:rgba(17,17,17,.45)}
 .e3-row{display:grid;grid-template-columns:64px 1fr auto;gap:8px;padding:8px 0;border-top:1px solid var(--line);font-size:11px}.e3-row b{font-size:12px}
 .e3-note{font-size:10px;color:var(--muted);line-height:1.4;margin-top:9px}.e3-link{display:inline-block;margin-top:10px;color:var(--fg)}
 `,
 render(ctx){
  if(ctx.page===0)return '<div class="e3"><div class="e3-hero"><div class="e3-top"><div><div class="e3-id">EXP-003</div><div class="e3-title">Allocator V2 · 2 workers · 10 bloques</div></div><span class="e3-pass">PASS</span></div><div class="e3-metrics"><div class="e3-metric"><b>10/10</b><span>BLOQUES</span></div><div class="e3-metric"><b>0</b><span>DUPLICADOS</span></div><div class="e3-metric"><b>3</b><span>CONFLICTS</span></div><div class="e3-metric"><b>45</b><span>OPS EXT.</span></div></div><div class="e3-split"><i class="e3-a"></i><i class="e3-b"></i></div><div class="e3-note">reparto: W001 6 · W002 4 · siguiente capa: lease + expiry + requeue + fencing</div><a class="e3-link" href="experiments/EXP-003_RESULT.md">resultado durable</a></div></div>';
  if(ctx.page===1)return '<div class="e3"><div class="e3-row"><b>EXP-001</b><span>CAS por revisión desde supervisor</span><span>PARTIAL</span></div><div class="e3-row"><b>EXP-002</b><span>dos chats · un claim</span><span>PARTIAL</span></div><div class="e3-row"><b>EXP-003</b><span>allocator 2W/10B</span><span>PASS</span></div></div>';
  return '<div class="e3"><div class="e3-hero"><b>CONTINUIDAD</b><div class="e3-note">No repetir claims básicos. El próximo cambio aislado es lease + expiry + requeue + fencing. WORKERS es la superficie de observabilidad integrada.</div><a class="e3-link" href="experiments/allocator-v2/CONTINUITY_HANDOFF.md">handoff</a></div></div>';
 }
});