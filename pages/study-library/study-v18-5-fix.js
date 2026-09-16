(()=>{'use strict';
const seen=new WeakSet();
function resetNewShelves(){
  document.querySelectorAll('.v18Shelf').forEach(shelf=>{
    if(seen.has(shelf))return;
    seen.add(shelf);
    const reset=()=>{shelf.scrollLeft=0};
    reset();
    requestAnimationFrame(()=>{reset();requestAnimationFrame(reset)});
    setTimeout(reset,80);
  });
}
const observer=new MutationObserver(resetNewShelves);
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resetNewShelves,{once:true});
else resetNewShelves();
})();
