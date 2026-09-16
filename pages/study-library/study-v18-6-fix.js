(()=>{'use strict';
/* Preserve the vertical viewport when switching academic year. */
document.addEventListener('click',e=>{
  const year=e.target.closest?.('[data-v18-year]');
  if(!year)return;
  const y=window.scrollY;
  requestAnimationFrame(()=>{
    window.scrollTo({top:y,left:window.scrollX,behavior:'auto'});
    requestAnimationFrame(()=>window.scrollTo({top:y,left:window.scrollX,behavior:'auto'}));
  });
},true);
})();
