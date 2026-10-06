(() => {
  const modules = new Map();
  const workspace = document.getElementById('workspace');
  const globalDrawer = document.getElementById('globalDrawer');
  const backdrop = document.getElementById('backdrop');
  const globalMenu = document.getElementById('globalMenu');
  const dropGuide = document.getElementById('dropGuide');
  const dragLabel = document.getElementById('dragLabel');
  let selected = null;
  let gesture = null;
  let state = null;
  let currentConfig = null;

  function registerWidget(mod){
    if(!mod || !mod.id) throw new Error('Widget module requires id');
    if(mod.widgetApi !== 1) throw new Error(`Unsupported widgetApi for ${mod.id}`);
    modules.set(mod.id, mod);
    if(mod.css && !document.querySelector(`style[data-widget-css="${mod.id}"]`)){
      const s=document.createElement('style');
      s.dataset.widgetCss=mod.id;
      s.textContent=mod.css;
      document.head.appendChild(s);
    }
  }

  function defaultWidgetState(id){
    const mod=modules.get(id);
    return {
      id,
      height: mod?.defaultHeight || 260,
      min:false, full:false, editing:false, drawer:false,
      page:0, closed:false
    };
  }

  function storageKey(){ return `prometeo-ui-page-${currentConfig.page_version}`; }
  function save(){ try{ localStorage.setItem(storageKey(), JSON.stringify(state)); }catch(e){} }
  function load(){
    try{
      const raw=localStorage.getItem(storageKey());
      if(!raw) return;
      const parsed=JSON.parse(raw);
      if(parsed?.rows && parsed?.widgets){
        state.rows=parsed.rows;
        Object.assign(state.widgets, parsed.widgets);
      }
    }catch(e){}
  }

  function cleanRows(){
    state.rows=state.rows
      .map(row=>row.filter(id=>state.widgets[id] && !state.widgets[id].closed))
      .filter(row=>row.length);
  }
  function removeFromRows(id){
    state.rows=state.rows.map(row=>row.filter(x=>x!==id)).filter(row=>row.length);
  }
  function insertAbove(sourceId,targetId){
    if(sourceId===targetId) return;
    removeFromRows(sourceId);
    const rowIndex=state.rows.findIndex(r=>r.includes(targetId));
    if(rowIndex<0){ state.rows.push([sourceId]); return; }
    state.rows.splice(rowIndex,0,[sourceId]);
  }
  function insertRight(sourceId,targetId){
    if(sourceId===targetId) return;
    removeFromRows(sourceId);
    const rowIndex=state.rows.findIndex(r=>r.includes(targetId));
    if(rowIndex<0){ state.rows.push([sourceId]); return; }
    const row=state.rows[rowIndex];
    row.splice(row.indexOf(targetId)+1,0,sourceId);
  }

  function normalizeUIState(){
    Object.values(state.widgets).forEach(w=>{
      if(w.closed){ w.drawer=false; w.editing=false; w.full=false; return; }
      if(w.min){ w.drawer=false; w.editing=false; w.full=false; }
      if(w.full){ w.min=false; w.editing=false; w.drawer=false; }
    });
  }

  function universalMenu(mod){
    const custom=(mod.actions||[]).map(a =>
      `<button class="option" data-custom-action="${a.id}">${a.label}</button>`
    ).join('');
    return `
      <button class="widget-close-drawer" data-close-drawer>→</button>
      <button class="option" data-action="minimize">− Minimizar</button>
      <button class="option" data-action="fullscreen">□ Pantalla completa</button>
      <button class="option" data-action="edit">✎ Editar</button>
      <button class="option" data-action="close">× Cerrar</button>
      ${custom ? `<div class="option-sep"></div>${custom}` : ''}
    `;
  }

  function renderWidget(id){
    const mod=modules.get(id);
    const w=state.widgets[id];
    if(!mod || !w) return '';
    const pages=mod.pages?.length ? mod.pages : [{title:mod.name || id.toUpperCase()}];
    const pg=pages[w.page] || pages[0];
    const many=pages.length>1;
    const cls=['widget', selected===id?'selected':'', w.min?'minimized':'',
      w.full?'fullscreen':'', w.editing?'editing':'', w.drawer?'options-open':''
    ].filter(Boolean).join(' ');
    const ctx={id, widgetState:w, module:mod, page:w.page, state, currentConfig};
    let body='';
    try{ body=mod.render ? mod.render(ctx) : `<div class="placeholder">${pg.title}</div>`; }
    catch(err){ body=`<div class="placeholder">ERROR ${String(err.message||err)}</div>`; }

    return `
      <section class="${cls}" data-widget="${id}" style="height:${w.height}px">
        <div class="widget-top" data-titlebar="${id}">
          <div class="tab-corner" data-tab-title>${pg.title}</div>
          ${many?`<div class="pagers">${pages.map((_,i)=>
            `<button class="pager ${i===w.page?'active':''}" data-page="${i}" aria-label="página ${i+1}"></button>`
          ).join('')}</div>`:''}
          <button class="menu-icon widget-menu" data-widget-menu="${id}" aria-label="opciones">
            <span class="menu-glyph"><span></span><span></span><span></span></span>
          </button>
        </div>
        <div class="widget-body"><div class="widget-content">${body}</div></div>
        <aside class="widget-options">${universalMenu(mod)}</aside>
        <div class="resize-bottom" data-resize-bottom="${id}"></div>
      </section>`;
  }

  function render(){
    cleanRows(); normalizeUIState();
    workspace.innerHTML=state.rows.map(row=>`
      <div class="widget-row" data-count="${row.length}"
           style="grid-template-columns:repeat(${Math.max(1,row.length)},minmax(0,1fr))">
        ${row.map(renderWidget).join('')}
      </div>`).join('');
    wire();
    modules.forEach((mod,id)=>{
      if(!state.widgets[id]?.closed && mod.afterRender){
        try{ mod.afterRender({root:document.querySelector(`[data-widget="${id}"]`), state, widgetState:state.widgets[id]}); }
        catch(e){ console.error(e); }
      }
    });
  }

  function wire(){
    document.querySelectorAll('[data-widget]').forEach(el=>{
      el.addEventListener('pointerdown',e=>{
        if(e.target.closest('button') || e.target.closest('.resize-bottom')) return;
        selected=el.dataset.widget;
        document.querySelectorAll('.widget').forEach(x=>x.classList.toggle('selected',x.dataset.widget===selected));
      });
    });

    document.querySelectorAll('[data-widget-menu]').forEach(btn=>{
      btn.onclick=e=>{
        e.stopPropagation();
        const id=btn.dataset.widgetMenu, w=state.widgets[id];
        selected=id;
        Object.values(state.widgets).forEach(other=>other.drawer=false);
        if(w.min) w.min=false;
        w.drawer=true; save(); render();
      };
    });

    document.querySelectorAll('[data-close-drawer]').forEach(btn=>{
      btn.onclick=e=>{
        e.stopPropagation();
        const id=btn.closest('[data-widget]').dataset.widget;
        state.widgets[id].drawer=false; save(); render();
      };
    });

    document.querySelectorAll('[data-action]').forEach(btn=>{
      btn.onclick=e=>{
        e.stopPropagation();
        const el=btn.closest('[data-widget]'), id=el.dataset.widget;
        const w=state.widgets[id], action=btn.dataset.action;
        if(action==='minimize'){ w.full=false; w.editing=false; w.drawer=false; w.min=!w.min; }
        if(action==='fullscreen'){
          w.min=false; w.editing=false; w.drawer=false;
          Object.values(state.widgets).forEach(other=>{ if(other!==w) other.full=false; });
          w.full=!w.full;
        }
        if(action==='edit'){
          w.min=false; w.full=false; w.drawer=false;
          Object.values(state.widgets).forEach(other=>other.editing=false);
          w.editing=true; selected=id;
        }
        if(action==='close'){
          w.closed=true; w.drawer=false; w.editing=false; removeFromRows(id);
          if(selected===id) selected=null;
        }
        save(); render();
      };
    });

    document.querySelectorAll('[data-custom-action]').forEach(btn=>{
      btn.onclick=e=>{
        e.stopPropagation();
        const el=btn.closest('[data-widget]'), id=el.dataset.widget;
        const mod=modules.get(id), a=mod.actions?.find(x=>x.id===btn.dataset.customAction);
        if(a?.run) a.run({id,state,widgetState:state.widgets[id],render,save});
      };
    });

    document.querySelectorAll('.pager').forEach(p=>{
      p.onclick=e=>{
        e.stopPropagation();
        const id=p.closest('[data-widget]').dataset.widget;
        state.widgets[id].page=+p.dataset.page; save(); render();
      };
    });

    document.querySelectorAll('[data-titlebar]').forEach(bar=>{
      const id=bar.dataset.titlebar, w=state.widgets[id], mod=modules.get(id);
      const pageCount=mod.pages?.length||1;
      if(w.editing){ bar.onpointerdown=startMove; }
      else if(pageCount>1){
        let sx=0,sy=0,tracking=false;
        bar.onpointerdown=e=>{
          if(e.target.closest('button')) return;
          sx=e.clientX; sy=e.clientY; tracking=true;
        };
        bar.onpointerup=e=>{
          if(!tracking) return; tracking=false;
          const dx=e.clientX-sx, dy=e.clientY-sy;
          if(Math.abs(dx)<36 || Math.abs(dx)<=Math.abs(dy)*1.15) return;
          if(dx<0 && w.page<pageCount-1) w.page++;
          if(dx>0 && w.page>0) w.page--;
          save(); render();
        };
        bar.onpointercancel=()=>tracking=false;
      }
    });

    document.querySelectorAll('[data-resize-bottom]').forEach(handle=>{
      handle.onpointerdown=startResize;
    });
  }

  function startResize(e){
    const handle=e.currentTarget, id=handle.dataset.resizeBottom, w=state.widgets[id];
    if(!w.editing || w.min || w.full) return;
    e.stopPropagation();
    const widget=handle.closest('[data-widget]');
    const startY=e.clientY, startH=widget.getBoundingClientRect().height;
    let liveH=startH;
    handle.setPointerCapture(e.pointerId);
    const move=ev=>{ liveH=Math.max(120,Math.min(900,startH+(ev.clientY-startY))); widget.style.height=liveH+'px'; };
    const cleanup=()=>{ handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',cancel); };
    const up=()=>{ w.height=Math.round(liveH); save(); cleanup(); };
    const cancel=()=>{ widget.style.height=w.height+'px'; cleanup(); };
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',cancel);
  }

  function startMove(e){
    if(e.target.closest('button')) return;
    const bar=e.currentTarget, id=bar.dataset.titlebar, w=state.widgets[id];
    if(!w.editing) return;
    const startX=e.clientX,startY=e.clientY;
    gesture={id,active:false,target:null};
    bar.setPointerCapture(e.pointerId);
    const move=ev=>{
      const dist=Math.hypot(ev.clientX-startX,ev.clientY-startY);
      if(!gesture.active && dist<8) return;
      gesture.active=true;
      bar.closest('.widget').classList.add('dragging');
      dragLabel.textContent=(modules.get(id)?.pages?.[w.page]?.title)||modules.get(id)?.name||id;
      dragLabel.style.left=Math.max(6,Math.min(window.innerWidth-90,ev.clientX+10))+'px';
      dragLabel.style.top=Math.max(6,Math.min(window.innerHeight-34,ev.clientY+10))+'px';
      dragLabel.classList.add('show');
      const under=document.elementFromPoint(ev.clientX,ev.clientY);
      const target=under?.closest?.('[data-widget]');
      if(!target || target.dataset.widget===id){
        gesture.target=null; dropGuide.classList.remove('show'); autoScrollDuringMove(ev.clientY); return;
      }
      const r=target.getBoundingClientRect();
      const side=(ev.clientX>r.left+r.width*.62)?'right':'above';
      gesture.target={id:target.dataset.widget,side};
      if(side==='right'){
        Object.assign(dropGuide.style,{left:(r.right-2)+'px',top:(r.top+8)+'px',width:'3px',height:Math.max(20,r.height-16)+'px'});
      }else{
        Object.assign(dropGuide.style,{left:(r.left+8)+'px',top:(r.top-2)+'px',width:Math.max(20,r.width-16)+'px',height:'3px'});
      }
      dropGuide.classList.add('show'); autoScrollDuringMove(ev.clientY);
    };
    const cleanup=()=>{
      bar.removeEventListener('pointermove',move);bar.removeEventListener('pointerup',up);bar.removeEventListener('pointercancel',cancel);
      document.querySelectorAll('.widget').forEach(x=>x.classList.remove('dragging'));
      dragLabel.classList.remove('show');dropGuide.classList.remove('show');gesture=null;
    };
    const up=()=>{ if(gesture?.active&&gesture.target){ gesture.target.side==='right'?insertRight(id,gesture.target.id):insertAbove(id,gesture.target.id); save(); } cleanup(); render(); };
    const cancel=()=>{ cleanup(); render(); };
    bar.addEventListener('pointermove',move);bar.addEventListener('pointerup',up);bar.addEventListener('pointercancel',cancel);
  }
  function autoScrollDuringMove(y){
    const zone=64,h=window.innerHeight;
    if(y<zone) window.scrollBy(0,-10); else if(y>h-zone) window.scrollBy(0,10);
  }

  function setGlobal(open){
    globalDrawer.classList.toggle('open',open);
    backdrop.classList.toggle('open',open);
  }
  globalMenu.onclick=e=>{ e.stopPropagation(); setGlobal(!globalDrawer.classList.contains('open')); };
  backdrop.onclick=()=>setGlobal(false);
  document.addEventListener('pointerdown',e=>{
    document.querySelectorAll('.widget.options-open').forEach(el=>{
      if(!el.contains(e.target)){ const id=el.dataset.widget; state.widgets[id].drawer=false; save(); render(); }
    });
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ setGlobal(false);Object.values(state.widgets).forEach(w=>{w.drawer=false;w.editing=false});save();render(); }
  });

  function start(config){
    currentConfig=config;
    state={
      rows: JSON.parse(JSON.stringify(config.layout.rows)),
      widgets:{}
    };
    config.widgets.forEach(w=>{
      if(!modules.has(w.id)) throw new Error(`Missing widget module: ${w.id}`);
      state.widgets[w.id]=defaultWidgetState(w.id);
      if(w.height) state.widgets[w.id].height=w.height;
    });
    selected=config.widgets[0]?.id||null;
    load();
    // Ensure newly added configured widgets exist even with older localStorage.
    config.widgets.forEach(w=>{ if(!state.widgets[w.id]) state.widgets[w.id]=defaultWidgetState(w.id); });
    render();
    document.getElementById('refreshBtn').onclick=()=>location.reload();
  }

  window.Prometeo={registerWidget,start,getState:()=>state,getModules:()=>modules};
})();
