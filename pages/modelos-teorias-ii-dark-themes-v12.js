(()=>{
  const extra=[
    {id:'carbon',name:'carbón',a:'#151515',b:'#F0E6D2'},
    {id:'tinta',name:'tinta',a:'#111827',b:'#D9E4FF'},
    {id:'ciruela',name:'ciruela',a:'#201427',b:'#E9C8FF'},
    {id:'bosque',name:'bosque',a:'#10231C',b:'#D8EED0'},
    {id:'petroleo',name:'petróleo',a:'#0C2630',b:'#CDECF2'},
    {id:'borgona',name:'borgoña',a:'#2A1017',b:'#F1D0C7'},
    {id:'cacao',name:'cacao',a:'#241812',b:'#F0D3AF'},
    {id:'medianoche',name:'medianoche',a:'#121526',b:'#D8D4FF'},
    {id:'pizarra',name:'pizarra',a:'#182020',b:'#D5E7DF'},
    {id:'espresso',name:'espresso',a:'#1D1512',b:'#EED8C4'}
  ];
  const apply=x=>{
    document.documentElement.style.setProperty('--a',x.a);
    document.documentElement.style.setProperty('--b',x.b);
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',x.a);
    localStorage.setItem('modelos2_theme',x.id);
    document.querySelector('#themePanel')?.classList.remove('open');
  };
  const panel=document.querySelector('#themePanel');
  if(!panel) return;
  for(const t of extra){
    if(panel.querySelector(`[data-theme="${t.id}"]`)) continue;
    const b=document.createElement('button');
    b.className='themeChoice';
    b.dataset.theme=t.id;
    b.title=t.name;
    b.innerHTML=`<span class="themeSwatch"><span style="background:${t.a}"></span><span style="background:${t.b}"></span></span><small>${t.name}</small>`;
    b.addEventListener('click',e=>{e.stopPropagation();apply(t)});
    panel.appendChild(b);
  }
  const saved=localStorage.getItem('modelos2_theme');
  const custom=extra.find(x=>x.id===saved);
  if(custom) apply(custom);
})();
