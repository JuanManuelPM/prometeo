(() => {
  if(window.__PROMETEO_COMPONENTS_V1__)return;
  window.__PROMETEO_COMPONENTS_V1__=true;

  document.addEventListener('click',event=>{
    const toggle=event.target.closest('[data-p-toggle]');
    if(toggle){
      const next=toggle.getAttribute('aria-pressed')!=='true';
      toggle.setAttribute('aria-pressed',String(next));
      toggle.dispatchEvent(new CustomEvent('p:change',{bubbles:true,detail:{value:next}}));
    }

    const swatch=event.target.closest('[data-palette-value]');
    if(swatch){
      const palette=swatch.dataset.paletteValue;
      document.body.dataset.palette=palette;
      document.querySelectorAll('[data-palette-value]').forEach(el=>el.setAttribute('aria-pressed',String(el===swatch)));
      try{localStorage.setItem('prometeo.proposal.palette',palette)}catch{}
    }
  });

  let saved=null;try{saved=localStorage.getItem('prometeo.proposal.palette')}catch{}
  if(saved&&document.querySelector(`[data-palette-value="${CSS.escape(saved)}"]`))document.body.dataset.palette=saved;
})();
