// Direct mobile launcher for Trabajar: open a disposable chat from the same user gesture.
(()=>{
  const spring=document.querySelector('.spring[data-mode="work"]');
  if(!spring)return;
  const knob=spring.querySelector('.springKnob');
  const COMMAND_KEY='prometeo.button.only.v1.command';
  let gesture=null;
  spring.addEventListener('pointerdown',e=>{
    if(!e.target.closest('.springKnob'))return;
    gesture={id:e.pointerId,start:e.clientX,before:localStorage.getItem(COMMAND_KEY)||''};
  },{capture:true});
  spring.addEventListener('pointercancel',()=>{gesture=null},{capture:true});
  spring.addEventListener('pointerup',e=>{
    const g=gesture;if(!g||g.id!==e.pointerId)return;gesture=null;
    const max=Math.max(1,spring.clientWidth-knob.clientWidth-8);
    if(e.clientX-g.start<=max*.80)return;
    let tab=null;
    try{
      tab=window.open('about:blank','_blank');
      if(tab){
        tab.document.title='Prometeo · preparando';
        tab.document.body.style.cssText='margin:0;background:#000;color:#aaa;font:14px system-ui;display:grid;place-items:center;min-height:100vh';
        tab.document.body.textContent='Preparando Prometeo…';
      }
    }catch{}
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const command=localStorage.getItem(COMMAND_KEY)||'';
      if(command&&command!==g.before){
        clearInterval(timer);
        const url='https://chatgpt.com/?q='+encodeURIComponent(command);
        if(tab&&!tab.closed){try{tab.location.href=url}catch{}}
        else{
          const openBtn=document.querySelector('#openChat');
          if(openBtn){openBtn.textContent='Abrir chat';openBtn.classList.add('needs-open')}
        }
      }else if(tries>120){
        clearInterval(timer);
        try{if(tab&&!tab.closed)tab.close()}catch{}
      }
    },150);
  },{capture:true});
})();
