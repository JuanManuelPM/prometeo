(()=>{
  /* v25: category bands already toggle from their full width. Tracker labels now follow the
     same interaction grammar: tap/click anywhere in the left label rail to open/close its graph. */
  const host=document.getElementById('traceRows');
  if(!host)return;

  function enhance(){
    host.querySelectorAll('.trace-label').forEach(label=>{
      const button=label.querySelector('[data-graph-toggle]');
      const name=label.querySelector('.trace-name')?.textContent?.trim()||'hábito';
      if(button){
        button.tabIndex=-1;
        button.setAttribute('aria-hidden','true');
      }
      label.tabIndex=0;
      label.setAttribute('role','button');
      label.setAttribute('aria-expanded',button?.getAttribute('aria-expanded')||'false');
      label.setAttribute('aria-label',`${button?.getAttribute('aria-expanded')==='true'?'Ocultar':'Mostrar'} gráfico de ${name}`);
    });
  }

  function activate(label){
    const button=label?.querySelector('[data-graph-toggle]');
    if(button)button.click();
  }

  host.addEventListener('click',event=>{
    const label=event.target.closest('.trace-label');
    if(!label||!host.contains(label))return;
    event.preventDefault();
    activate(label);
  });

  host.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const label=event.target.closest('.trace-label');
    if(!label||!host.contains(label))return;
    event.preventDefault();
    activate(label);
  });

  enhance();
  new MutationObserver(enhance).observe(host,{childList:true,subtree:true});
})();
