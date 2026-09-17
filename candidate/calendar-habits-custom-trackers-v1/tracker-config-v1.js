(()=>{
  'use strict';

  const Model=window.PrometeoHabitTrackerModel;
  if(!Model)throw new Error('PrometeoHabitTrackerModel is required');
  const DONOR_TRACES='/prometeo/pages/calendar/previews/habits-traces-v1/traces-v24.js?v=20260907-ux24';
  let current={schema:Model.SCHEMA,revision:1,updated_at:new Date().toISOString(),trackers:[]};
  let lastHistory={};

  function read(){
    try{return JSON.parse(localStorage.getItem(Model.STORAGE_KEY)||'null')}catch{return null}
  }
  function write(config){
    current=Model.normalizeConfig(config);
    localStorage.setItem(Model.STORAGE_KEY,JSON.stringify(current));
    return current;
  }
  function prepare(history={}){
    lastHistory=history&&typeof history==='object'?history:{};
    const result=Model.bootstrap(read(),lastHistory);
    current=result.config;
    if(result.changed||!read())write(current);
    installManager();
    return current;
  }
  function rendererConfig(){return {groups:Model.groups(current),trackers:Model.activeTrackers(current).map(({id,label,group,kind})=>({id,label,group,kind}))}}
  function patchRendererSource(source,config=rendererConfig()){
    const block=/const GROUPS=\[[\s\S]*?\n  \];\n  const TRACKERS=\[[\s\S]*?\n  \];/;
    if(!block.test(source))throw new Error('Unexpected traces-v24 source; hardcoded roster block not found');
    return source.replace(block,`const GROUPS=${JSON.stringify(config.groups)};\n  const TRACKERS=${JSON.stringify(config.trackers)};`);
  }
  async function loadRenderer(history={}){
    prepare(history);
    const response=await fetch(DONOR_TRACES,{cache:'no-store'});
    if(!response.ok)throw new Error(`Unable to load canonical traces renderer (${response.status})`);
    const source=patchRendererSource(await response.text());
    const script=document.createElement('script');
    script.dataset.prometeoCandidate='configurable-trackers-v1';
    script.textContent=`${source}\n//# sourceURL=prometeo-traces-configurable-v1.js`;
    document.body.appendChild(script);
    return rendererConfig();
  }
  function reload(){location.reload()}
  function selectOption(value,text,selected){const o=document.createElement('option');o.value=value;o.textContent=text;o.selected=selected;return o}
  function trackerRow(tracker){
    const row=document.createElement('div');row.className='tracker-config-row';row.dataset.trackerId=tracker.id;
    const name=document.createElement('input');name.value=tracker.label;name.maxLength=80;name.setAttribute('aria-label','Nombre');
    const kind=document.createElement('select');kind.setAttribute('aria-label','Tipo');
    [['positive','Sumar'],['negative','Evitar evento'],['avoid','Evitar + ganas/caída']].forEach(([value,text])=>kind.append(selectOption(value,text,value===tracker.kind)));
    const group=document.createElement('select');group.setAttribute('aria-label','Grupo');
    [['extras','Extras'],['routine','Rutina'],['avoid','Evitar'],['other','Otros']].forEach(([value,text])=>group.append(selectOption(value,text,value===tracker.group)));
    const save=document.createElement('button');save.type='button';save.textContent='GUARDAR';
    save.onclick=()=>{write(Model.update(current,tracker.id,{label:name.value,kind:kind.value,group:group.value}));reload()};
    const archive=document.createElement('button');archive.type='button';archive.textContent=tracker.archived?'RESTAURAR':'ARCHIVAR';
    archive.onclick=()=>{write(Model.archive(current,tracker.id,!tracker.archived));reload()};
    row.append(name,kind,group,save,archive);return row;
  }
  function renderManager(dialog){
    const body=dialog.querySelector('[data-tracker-list]');body.innerHTML='';
    const trackers=Model.normalizeConfig(current).trackers;
    if(!trackers.length){const empty=document.createElement('p');empty.className='tracker-config-empty';empty.textContent='Todavía no hay trackers. Agregá el primero.';body.append(empty)}
    trackers.filter(t=>!t.archived).forEach(t=>body.append(trackerRow(t)));
    const archived=trackers.filter(t=>t.archived);
    if(archived.length){const title=document.createElement('div');title.className='tracker-config-subtitle';title.textContent='ARCHIVADOS';body.append(title);archived.forEach(t=>body.append(trackerRow(t)))}
  }
  async function exportAll(){
    const bundle=Model.exportBundle(current,lastHistory);
    try{bundle.indexeddb=await window.PrometeoHabitPersistence?.exportDatabase?.()}catch(error){bundle.indexeddb_export_error=String(error?.message||error)}
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`prometeo-habits-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  function installManager(){
    if(document.getElementById('habitTrackerManage'))return;
    const toolbar=document.querySelector('.habits-toolbar');if(!toolbar)return;
    const range=toolbar.querySelector('.range-nav');
    const manage=document.createElement('button');manage.id='habitTrackerManage';manage.type='button';manage.className='tracker-config-manage';manage.textContent='EDITAR';
    range?.before(manage);
    const dialog=document.createElement('dialog');dialog.id='habitTrackerDialog';dialog.className='tracker-config-dialog';
    dialog.innerHTML='<div class="tracker-config-head"><strong>TRACKERS</strong><button type="button" data-close aria-label="Cerrar">×</button></div><div class="tracker-config-list" data-tracker-list></div><form class="tracker-config-add" data-add><strong>NUEVO</strong><input name="label" maxlength="80" placeholder="Nombre" required><select name="kind"><option value="positive">Sumar</option><option value="negative">Evitar evento</option><option value="avoid">Evitar + ganas/caída</option></select><select name="group"><option value="extras">Extras</option><option value="routine">Rutina</option><option value="avoid">Evitar</option><option value="other">Otros</option></select><button type="submit">AGREGAR</button></form><div class="tracker-config-foot"><button type="button" data-export>EXPORTAR</button></div>';
    document.body.append(dialog);
    manage.onclick=()=>{renderManager(dialog);dialog.showModal?dialog.showModal():dialog.setAttribute('open','')};
    dialog.querySelector('[data-close]').onclick=()=>dialog.close?dialog.close():dialog.removeAttribute('open');
    dialog.querySelector('[data-export]').onclick=()=>exportAll();
    dialog.querySelector('[data-add]').onsubmit=event=>{
      event.preventDefault();const data=new FormData(event.currentTarget);
      write(Model.add(current,{label:data.get('label'),kind:data.get('kind'),group:data.get('group')}));reload();
    };
  }

  window.PrometeoHabitTrackerConfig=Object.freeze({
    schema:'prometeo.habit-tracker-runtime/v1',prepare,loadRenderer,patchRendererSource,rendererConfig,
    getConfig:()=>Model.normalizeConfig(current),exportAll
  });
  installManager();
})();
