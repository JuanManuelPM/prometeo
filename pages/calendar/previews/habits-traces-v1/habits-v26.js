(()=>{
  /* v26: the entire left tracker cell is the graph toggle. This intentionally calls the
     canonical graph button handler directly instead of redispatching a click, avoiding the
     brittle delegated-click path from v25. */
  const host=document.getElementById('traceRows');
  if(!host)return;

  const invokeGraphToggle=(label)=>{
    const button=label.querySelector('[data-graph-toggle]');
    if(!button)return;
    const handler=button.onclick;
    if(typeof handler!=='function')return;
    const synthetic={
      preventDefault(){},
      stopPropagation(){},
      currentTarget:button,
      target:button
    };
    handler.call(button,synthetic);
  };

  function enhance(){
    host.querySelectorAll('.trace-label').forEach(label=>{
      const button=label.querySelector('[data-graph-toggle]');
      const name=label.querySelector('.trace-name')?.textContent?.trim()||'hábito';
      if(!button)return;

      const open=button.getAttribute('aria-expanded')==='true';
      button.tabIndex=-1;
      button.setAttribute('aria-hidden','true');

      label.tabIndex=0;
      label.setAttribute('role','button');
      label.setAttribute('aria-expanded',String(open));
      label.setAttribute('aria-label',`${open?'Ocultar':'Mostrar'} gráfico de ${name}`);

      /* Property handlers are deliberate: renderRows replaces these nodes, so each fresh
         label receives one and only one handler. */
      label.onclick=(event)=>{
        event.preventDefault();
        event.stopPropagation();
        invokeGraphToggle(label);
      };
      label.onkeydown=(event)=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();
        event.stopPropagation();
        invokeGraphToggle(label);
      };
    });
  }

  enhance();
  new MutationObserver((records)=>{
    if(records.some(r=>r.type==='childList'&&(r.addedNodes.length||r.removedNodes.length)))enhance();
  }).observe(host,{childList:true,subtree:true});
})();
