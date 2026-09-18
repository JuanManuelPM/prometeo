(()=>{
  'use strict';

  const Model=window.PrometeoHabitTrackerModel;
  const Adapter=window.PrometeoHabitSourceAdapter;
  if(!Model||!Adapter)throw new Error('Prometeo habit tracker model + source adapter are required');
  const DONOR_TRACES='/prometeo/pages/calendar/previews/habits-traces-v1/traces-v24.js?v=20260907-ux24';
  const BEHAVIOR_MIRROR_KEY='prometeo-db-habit-projection-v31';
  let current={schema:Model.SCHEMA,revision:1,updated_at:new Date().toISOString(),trackers:[]};
  let lastHistory={};

  function readLocal(){
    try{return JSON.parse(localStorage.getItem(Model.STORAGE_KEY)||'null')}catch{return null}
  }
  async function readCanonical(){
    const local=readLocal();
    if(window.PrometeoDB?.getMeta){
      try{
        const stored=await PrometeoDB.getMeta(Model.META_KEY,null);
        if(stored&&typeof stored==='object')return {saved:stored,source:'indexeddb-meta'};
      }catch(error){console.warn('[Prometeo trackers] config meta read failed; using local mirror',error)}
    }
    return {saved:local,source:'local-mirror'};
  }
  async function write(config){
    current=Model.normalizeConfig(config);
    localStorage.setItem(Model.STORAGE_KEY,JSON.stringify(current));
    if(window.PrometeoDB?.setMeta){
      try{
        await PrometeoDB.setMeta(Model.META_KEY,current);
        document.documentElement.dataset.habitTrackerConfig='indexeddb-meta';
      }catch(error){
        document.documentElement.dataset.habitTrackerConfig='local-mirror';
        console.warn('[Prometeo trackers] config meta write failed; local mirror retained',error);
      }
    }else document.documentElement.dataset.habitTrackerConfig='local-mirror';
    return current;
  }
  async function prepare(history={}){
    lastHistory=history&&typeof history==='object'?history:{};
    const {saved}=await readCanonical();
    const result=Model.bootstrap(saved,lastHistory);
    current=result.config;
    await write(current);
    installManager();
    return current;
  }
  function rendererConfig(){return {groups:Model.groups(current),trackers:Model.activeTrackers(current).map(({id,label,group,kind})=>({id,label,group,kind}))}}
  function patchRendererSource(source,config=rendererConfig()){return Adapter.patchTraces(source,config)}
  async function loadRenderer(history={}){
    await prepare(history);
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
  function groupOptions(selected){return [['extras','Extras'],['routine','Rutina'],['addictions','Adicciones'],['avoid','Evitar'],['other','Otros']].map(([value,text])=>selectOption(value,text,value===selected))}
  function trackerRow(tracker){
    const row=document.createElement('div');row.className='tracker-config-row';row.dataset.trackerId=tracker.id;
    const name=document.createElement('input');name.value=tracker.label;name.maxLength=80;name.setAttribute('aria-label','Nombre');
    const kind=document.createElement('select');kind.setAttribute('aria-label','Tipo');
    [['positive','Sumar'],['negative','Evitar evento'],['avoid','Evitar + ganas/caída']].forEach(([value,text])=>kind.append(selectOption(value,text,value===tracker.kind)));
    const group=document.createElement('select');group.setAttribute('aria-label','Grupo');groupOptions(tracker.group).forEach(option=>group.append(option));
    const save=document.createElement('button');save.type='button';save.textContent='GUARDAR';
    save.onclick=async()=>{save.disabled=true;await write(Model.update(current,tracker.id,{label:name.value,kind:kind.value,group:group.value}));reload()};
    const archive=document.createElement('button');archive.type='button';archive.textContent=tracker.archived?'RESTAURAR':'ARCHIVAR';
    archive.onclick=async()=>{archive.disabled=true;await write(Model.archive(current,tracker.id,!tracker.archived));reload()};
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
  function latestMirrorHistory(){
    const key=window.PrometeoHabitPersistence?.mirror_key||BEHAVIOR_MIRROR_KEY;
    try{const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&typeof value==='object'&&!Array.isArray(value))return value}catch{}
    return lastHistory;
  }
  async function exportAll(){
    const persistence=window.PrometeoHabitPersistence;
    try{await persistence?.flush?.()}catch{}
    const bundle=Model.exportBundle(current,latestMirrorHistory());
    bundle.config_authority=window.PrometeoDB?.getMeta?'indexeddb-meta-with-local-mirror':'local-mirror';
    try{bundle.persistence_status=persistence?.status?.()||null}catch{bundle.persistence_status=null}
    try{bundle.indexeddb=await persistence?.exportDatabase?.()}catch(error){bundle.indexeddb_export_error=String(error?.message||error)}
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
    dialog.innerHTML='<div class="tracker-config-head"><strong>TRACKERS</strong><button type="button" data-close aria-label="Cerrar">×</button></div><div class="tracker-config-list" data-tracker-list></div><form class="tracker-config-add" data-add><strong>NUEVO</strong><input name="label" maxlength="80" placeholder="Nombre" required><select name="kind"><option value="positive">Sumar</option><option value="negative">Evitar evento</option><option value="avoid">Evitar + ganas/caída</option></select><select name="group"><option value="extras">Extras</option><option value="routine">Rutina</option><option value="addictions">Adicciones</option><option value="avoid">Evitar</option><option value="other">Otros</option></select><button type="submit">AGREGAR</button></form><div class="tracker-config-foot"><button type="button" data-export>EXPORTAR</button></div>';
    document.body.append(dialog);
    manage.onclick=()=>{renderManager(dialog);dialog.showModal?dialog.showModal():dialog.setAttribute('open','')};
    dialog.querySelector('[data-close]').onclick=()=>dialog.close?dialog.close():dialog.removeAttribute('open');
    dialog.querySelector('[data-export]').onclick=()=>exportAll();
    dialog.querySelector('[data-add]').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector('button[type="submit"]');button.disabled=true;
      const data=new FormData(form);
      await write(Model.add(current,{label:data.get('label'),kind:data.get('kind'),group:data.get('group')}));reload();
    };
  }

  window.PrometeoHabitTrackerConfig=Object.freeze({
    schema:'prometeo.habit-tracker-runtime/v1',prepare,loadRenderer,patchRendererSource,rendererConfig,
    getConfig:()=>Model.normalizeConfig(current),exportAll
  });
  installManager();
})();
