(()=>{
  'use strict';

  const MIRROR_KEY='prometeo-calendar-event-links-v32';
  const FACTORIES=[
    ['classNode','class'],
    ['personalNode','personal'],
    ['universityNode','university'],
    ['potentialNode','potential'],
    ['bocaNode','boca']
  ];
  const LABELS={class:'CLASE',personal:'PERSONAL',university:'UNIVERSIDAD',potential:'POTENCIAL',boca:'BOCA'};
  const CHAIN_SVG=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a4.6 4.6 0 0 0 6.5 0l2.4-2.4A4.6 4.6 0 0 0 13 4.5l-1.4 1.4"/><path d="M13.4 10.6a4.6 4.6 0 0 0-6.5 0L4.5 13a4.6 4.6 0 0 0 6.5 6.5l1.4-1.4"/><path d="m8.8 15.2 6.4-6.4"/></svg>`;

  let active=null;
  let dialog=null;
  let kindEl=null;
  let titleEl=null;
  let input=null;
  let removeButton=null;
  let editClassButton=null;

  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  function parseObject(raw){try{const x=JSON.parse(raw||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {}}}
  function readMirror(){return parseObject(localStorage.getItem(MIRROR_KEY))}
  function readCanonical(){
    try{
      const state=window.PrometeoCalendarState?.read?.();
      const links=state?.calendar?.eventLinks;
      return links&&typeof links==='object'&&!Array.isArray(links)?links:{};
    }catch{return {}}
  }
  function readLinks(){return {...readMirror(),...readCanonical()}}
  function writeLinks(next){
    const clean={};
    for(const [key,value] of Object.entries(next||{})){
      const url=String(value?.url||'').trim();
      if(url)clean[key]={url,updatedAt:String(value.updatedAt||new Date().toISOString())};
    }
    localStorage.setItem(MIRROR_KEY,JSON.stringify(clean));
    try{
      const state=window.PrometeoCalendarState?.read?.();
      if(state){
        state.calendar=state.calendar||{};
        state.calendar.eventLinks=clone(clean);
        window.PrometeoCalendarState.write(state);
      }
    }catch(error){console.warn('[Prometeo event links] canonical write deferred to mirror',error)}
    return clean;
  }

  function stableText(value){return String(value??'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,160)}
  function eventKey(kind,item){
    const id=item?.id||item?.source_id||item?.external_id||item?.sourceId||item?.externalId;
    if(id)return `event-link:v32:${kind}:id:${String(id)}`;
    const fallback=[item?.date,item?.weekday,item?.start,item?.subject,item?.title,item?.name,item?.label,item?.rival,item?.competition].map(stableText).join('|');
    return `event-link:v32:${kind}:fallback:${fallback}`;
  }
  function eventTitle(kind,item){
    if(kind==='class')return item?.name||'Clase';
    if(kind==='personal')return item?.title||'Evento personal';
    if(kind==='university')return item?.subject||'Universidad';
    if(kind==='potential')return item?.label||'Evento potencial';
    if(kind==='boca')return item?.home?`Boca vs. ${item?.rival||''}`:`${item?.rival||''} vs. Boca`;
    return 'Evento';
  }

  function normalizeDestination(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    if(/[\u0000-\u001F\u007F]/.test(raw))throw new Error('El link contiene caracteres inválidos.');
    if(/^(javascript|data|vbscript):/i.test(raw))throw new Error('Ese tipo de link no está permitido.');
    if(raw.startsWith('/')||raw.startsWith('./')||raw.startsWith('../')||raw.startsWith('#'))return raw;
    if(/^[a-z][a-z0-9+.-]*:/i.test(raw))return raw;
    return `https://${raw}`;
  }
  function followDestination(url){
    const target=String(url||'').trim();if(!target)return;
    if(/^(javascript|data|vbscript):/i.test(target))return;
    if(/^(https?:|\/|\.\/|\.\.\/|#)/i.test(target)){
      const href=/^https?:/i.test(target)?target:new URL(target,location.href).href;
      const opened=window.open(href,'_blank','noopener,noreferrer');
      if(opened)opened.opener=null;
      return;
    }
    location.href=target;
  }

  function occurrenceDateForNode(node){
    const slot=node.closest('.slot');
    const gridHost=document.getElementById('grid');
    if(slot&&gridHost&&typeof visibleDates==='function'&&typeof isoDate==='function'){
      const slots=Array.from(gridHost.querySelectorAll('.slot'));
      const index=slots.indexOf(slot);
      if(index>=0){const dayIndex=index%7;const dates=visibleDates();if(dates[dayIndex])return isoDate(dates[dayIndex])}
    }
    const day=node.closest('.mobile-day');
    if(day&&typeof visibleDates==='function'&&typeof isoDate==='function'){
      const days=Array.from(day.parentElement?.querySelectorAll('.mobile-day')||[]);
      const index=days.indexOf(day),dates=visibleDates();if(index>=0&&dates[index])return isoDate(dates[index]);
    }
    const raw=node?.dataset?.eventDate||'';
    return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:null;
  }

  function ensureDialog(){
    if(dialog)return;
    dialog=document.createElement('dialog');
    dialog.id='eventLinkDialog';dialog.className='event-link-dialog';
    dialog.innerHTML=`<form class="dialog-inner" id="eventLinkForm">
      <div class="dialog-date" id="eventLinkKind">EVENTO</div>
      <h2 class="dialog-title" id="eventLinkTitle">Link</h2>
      <div class="event-link-preview">Tocá el evento para editar este destino. Cuando hay un link, la cadena aparece siempre arriba a la derecha; tocarla abre el destino.</div>
      <label class="field-label" for="eventLinkInput">LINK</label>
      <input class="input event-link-input" id="eventLinkInput" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="url" placeholder="https://…">
      <div class="dialog-actions event-link-actions">
        <button data-p-touch class="p-bi-control button3d event-link-remove hidden" id="eventLinkRemove" type="button">Quitar link</button>
        <button data-p-touch class="p-bi-control button3d hidden" id="eventLinkEditClass" type="button">Editar clase</button>
        <button data-p-touch class="p-bi-control button3d" id="eventLinkCancel" type="button">Cancelar</button>
        <button data-p-touch class="p-bi-control button3d primary" type="submit">Guardar</button>
      </div>
    </form>`;
    document.body.appendChild(dialog);
    kindEl=dialog.querySelector('#eventLinkKind');titleEl=dialog.querySelector('#eventLinkTitle');input=dialog.querySelector('#eventLinkInput');removeButton=dialog.querySelector('#eventLinkRemove');editClassButton=dialog.querySelector('#eventLinkEditClass');
    dialog.querySelector('#eventLinkCancel').onclick=()=>dialog.close();
    removeButton.onclick=()=>{
      if(!active)return;const links=readLinks();delete links[active.key];writeLinks(links);dialog.close();rerender();
    };
    editClassButton.onclick=()=>{
      if(!active||active.kind!=='class'||typeof openEditor!=='function')return;
      const dateISO=active.date||active.item?.date||null;
      dialog.close();
      if(dateISO)openEditor(dateISO,Number(active.item.start)||0,active.item.id||null);
    };
    dialog.querySelector('#eventLinkForm').addEventListener('submit',ev=>{
      ev.preventDefault();if(!active)return;
      let url='';try{url=normalizeDestination(input.value)}catch(error){alert(error.message||'No pude guardar ese link.');return}
      const links=readLinks();
      if(url)links[active.key]={url,updatedAt:new Date().toISOString()};else delete links[active.key];
      writeLinks(links);dialog.close();rerender();
    });
  }

  function openEditorFor(node,kind,item){
    ensureDialog();
    const key=eventKey(kind,item),links=readLinks(),record=links[key]||null;
    active={key,kind,item,date:occurrenceDateForNode(node)};
    kindEl.textContent=LABELS[kind]||'EVENTO';titleEl.textContent=eventTitle(kind,item);
    input.value=record?.url||'';
    removeButton.classList.toggle('hidden',!record?.url);
    editClassButton.classList.toggle('hidden',kind!=='class'||typeof openEditor!=='function');
    dialog.showModal();requestAnimationFrame(()=>{input.focus();input.select()});
  }

  function addLinkButton(node,url){
    const button=document.createElement('button');button.type='button';button.className='event-link-open';button.setAttribute('aria-label','Abrir link del evento');button.title='Abrir link';button.innerHTML=CHAIN_SVG;
    button.addEventListener('pointerdown',ev=>ev.stopPropagation());
    button.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();followDestination(url)});
    node.appendChild(button);node.classList.add('has-event-link');
  }

  function attachNode(node,kind,item){
    if(!node||node.dataset.eventLinkBound==='1')return node;
    const key=eventKey(kind,item),url=readLinks()[key]?.url||'';
    node.dataset.eventLinkBound='1';node.dataset.eventLinkKey=key;node.dataset.eventKind=kind;if(item?.date)node.dataset.eventDate=String(item.date);
    node.tabIndex=0;
    node.addEventListener('click',ev=>{
      if(ev.target.closest('.remove,.event-link-open'))return;
      ev.preventDefault();ev.stopPropagation();openEditorFor(node,kind,item);
    });
    node.addEventListener('keydown',ev=>{
      if(ev.key!=='Enter'&&ev.key!==' ')return;if(ev.target.closest('button,input,select,a'))return;
      ev.preventDefault();ev.stopPropagation();openEditorFor(node,kind,item);
    });
    if(url)addLinkButton(node,url);
    return node;
  }

  function wrapFactory(name,kind){
    const original=window[name];if(typeof original!=='function'||original.__prometeoEventLinksV32)return false;
    const wrapped=function(item){return attachNode(original(item),kind,item)};
    wrapped.__prometeoEventLinksV32=true;wrapped.__original=original;window[name]=wrapped;return true;
  }
  function rerender(){if(typeof render==='function')render()}

  FACTORIES.forEach(([name,kind])=>wrapFactory(name,kind));
  ensureDialog();
  rerender();

  window.PrometeoEventLinks=Object.freeze({
    schema:'prometeo.calendar-event-links/v32',
    mirrorKey:MIRROR_KEY,
    read:()=>clone(readLinks()),
    keyFor:(kind,item)=>eventKey(kind,item),
    normalize:normalizeDestination
  });
})();
