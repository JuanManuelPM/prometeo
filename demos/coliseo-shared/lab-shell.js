(function(g){
'use strict';
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function mount(cfg){
  const C=g.PROMETEO_COLISEO_CONTRACT_V1,F=g.PROMETEO_COLISEO_FIXTURE_V1;
  const snap=C.normalizeSnapshot(F.build()),report=C.validateSnapshot(snap);
  document.body.innerHTML='';
  const root=document.createElement('main');
  root.innerHTML=
    '<section class="hero"><div class="kicker">PROMETEO · COLISEO LAB</div><h1>'+esc(cfg.title)+'</h1><p>'+esc(cfg.purpose)+'</p>'+
    '<div class="badges"><span>SYNTHETIC FIXTURE</span><span>'+esc(C.id)+'</span><span>'+(report.ok?'CONTRACT OK':'CONTRACT ERROR')+'</span></div></section>'+
    '<section class="grid"><article><h2>Esta rama posee</h2><p>'+esc(cfg.owns.join(' · '))+'</p></article>'+
    '<article><h2>No toca</h2><p>'+esc(cfg.forbids.join(' · '))+'</p></article>'+
    '<article><h2>Fixture común</h2><p>'+snap.projects.length+' proyectos · '+snap.workers.length+' workers · '+snap.nodes.length+' nodos</p></article>'+
    '<article><h2>Entrega</h2><p>Editar sólo este lab y exportar el módulo acordado. Integration decide promoción.</p></article></section>'+
    '<section class="state"><h2>Estado de prueba compartido</h2><div class="projects"></div></section>'+
    '<footer>Scaffold neutral. No es una propuesta visual.</footer>';
  const style=document.createElement('style');
  style.textContent='*{box-sizing:border-box}body{margin:0;background:#0b0b0a;color:#e8e2d8;font:15px/1.45 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:32px}.kicker{font:700 11px ui-monospace;letter-spacing:.16em;color:#9c9487}h1{font-size:clamp(32px,7vw,72px);line-height:.95;margin:.22em 0}.hero p{max-width:760px;color:#b9b0a2}.badges{display:flex;gap:8px;flex-wrap:wrap}.badges span{border:1px solid #454039;padding:5px 8px;font:700 10px ui-monospace}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:30px 0}article,.state{border:1px solid #332f2a;padding:16px;background:#11110f}h2{font:800 12px ui-monospace;letter-spacing:.08em;text-transform:uppercase}.projects{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.project{border-left:3px solid #756b5c;padding:10px;background:#0d0d0c}.node{font:12px ui-monospace;color:#aaa196;padding:2px 0}.ACTIVE{color:#e0b477}.READY{color:#a4b98e}.BLOCKED{color:#8f6660}.SUCCESS{color:#718e78}footer{margin-top:28px;color:#777064;font:11px ui-monospace}';
  document.head.appendChild(style);document.body.appendChild(root);
  const box=root.querySelector('.projects');
  for(const p of snap.projects){
    const d=document.createElement('div');d.className='project';d.innerHTML='<strong>'+esc(p.title)+'</strong>';
    for(const n of snap.nodes.filter(n=>n.project_key===p.project_key)){
      const x=document.createElement('div');x.className='node '+esc(n.state);x.textContent=n.state+' · '+n.node_kind+' · '+n.title;d.appendChild(x);
    }
    box.appendChild(d);
  }
  g.__COLISEO_LAB__={config:cfg,snapshot:snap,report};
}
g.PROMETEO_COLISEO_LAB_SHELL={mount};
})(window);
