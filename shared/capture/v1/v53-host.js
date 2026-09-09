import {resolveV53Page,semanticNavigatorSnapshot,createContextSnapshot} from './identity.js';
import {appendTranscriptRevision,revisionRef,archiveCapture} from './capture-core.js';
import {digest as patentDigest} from './patent-v2.js';

const fail=(code,message,detail={})=>{const e=new Error(message);e.code=code;e.detail=detail;throw e};

export class V53CaptureHost{
  constructor({frameWindow=window,catalog,catalogManifest,store,recorder,queue,remote=null,ownership=null,assetBase='/prometeo/shared/capture/v1/',onPatent=()=>{}}={}){
    if(!catalog||!store||!recorder||!queue)fail('PROMETEO_CAPTURE_HOST_CONFIG','catalog, store, recorder and queue required');
    this.win=frameWindow;this.doc=frameWindow.document;this.catalog=catalog;this.catalogManifest=catalogManifest||{pages:[]};this.store=store;this.recorder=recorder;this.queue=queue;this.remote=remote;this.ownership=ownership;this.assetBase=assetBase;this.onPatent=onPatent;
    this.mo=null;this.currentTerminal=null;this.selected=new Set();this.filter='page';this.renderTimer=0;this.toastTimer=0;
  }
  async context(){
    const api=this.win.__PROMETEO_V53__;if(!api)fail('PROMETEO_CAPTURE_V53_API','V53 API unavailable');
    const page=resolveV53Page({api,catalog:this.catalogManifest.pages?.length?this.catalogManifest:this.catalog});
    const nav=semanticNavigatorSnapshot({api,shellAdapter:this.win.__PROMETEO_SHELL__||null});
    return createContextSnapshot({page,locationHref:page.href||this.win.location.href,documentTitle:page.title,viewport:{width:this.win.innerWidth,height:this.win.innerHeight,orientation:this.win.matchMedia?.('(orientation: portrait)').matches?'portrait':'landscape'},navigator:nav,route:{path:nav?.path||[],currentNode:nav?.currentNode||null}});
  }
  async mount(){
    if(!this.doc.getElementById('prometeo-capture-style')){
      const link=this.doc.createElement('link');link.id='prometeo-capture-style';link.rel='stylesheet';link.href=new URL('capture.css',new URL(this.assetBase,this.win.location.href)).href;this.doc.head.appendChild(link);
    }
    this.mo=new MutationObserver(()=>this.scheduleReconcile());
    this.mo.observe(this.doc.getElementById('worldStage')||this.doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    this.win.addEventListener('resize',()=>this.scheduleReconcile(),{passive:true});
    this.scheduleReconcile();return this;
  }
  destroy(){this.mo?.disconnect();this.currentTerminal?.querySelector('.prometeo-capture-accessory')?.remove();this.currentTerminal?.querySelector('.prometeo-capture-drawer')?.remove();this.currentTerminal=null}
  scheduleReconcile(){clearTimeout(this.renderTimer);this.renderTimer=setTimeout(()=>this.reconcile(),30)}
  async reconcile(){
    const terminal=this.doc.querySelector('.vertical-card[data-node-kind="page"].is-front .terminal')||this.doc.querySelector('.vertical-card.is-front .terminal');
    if(!terminal){this.currentTerminal=null;return}
    if(this.currentTerminal===terminal&&terminal.querySelector('.prometeo-capture-accessory')){await this.refreshBadge();return}
    this.currentTerminal=terminal;terminal.querySelectorAll('.prometeo-capture-accessory,.prometeo-capture-drawer').forEach(x=>x.remove());
    const accessory=this.doc.createElement('div');accessory.className='prometeo-capture-accessory';accessory.innerHTML=`
      <button class="prometeo-capture-button" data-role="mic" type="button" aria-label="Grabar nota" title="Grabar nota"><span class="prometeo-capture-dot"></span><span class="prometeo-capture-count" data-role="count" hidden></span></button>
      <div class="prometeo-capture-controls" data-role="controls" data-open="false">
        <button class="prometeo-capture-mini" data-role="pause" type="button">Pausa</button>
        <button class="prometeo-capture-mini" data-role="save" type="button">Guardar</button>
        <button class="prometeo-capture-mini" data-role="discard" type="button">Borrar</button>
      </div>
      <button class="prometeo-capture-mini" data-role="inbox" type="button" aria-label="Capturas">Notas</button>
      <div class="prometeo-capture-toast" data-role="toast"></div>`;
    const drawer=this.doc.createElement('section');drawer.className='prometeo-capture-drawer';drawer.dataset.open='false';drawer.innerHTML='<div class="prometeo-capture-head"><strong>Capturas</strong><button class="prometeo-capture-mini" data-role="scope" type="button">Esta página</button><button class="prometeo-capture-mini" data-role="close" type="button">×</button></div><div data-role="list"></div><div class="prometeo-capture-footer"><button data-role="selectall" type="button">Seleccionar</button><button data-role="patent" type="button">Preparar patente</button></div>';
    terminal.append(drawer,accessory);
    this.bind(accessory,drawer);await this.renderDrawer(drawer);await this.refreshBadge();
  }
  bind(accessory,drawer){
    const q=s=>accessory.querySelector(`[data-role="${s}"]`),d=s=>drawer.querySelector(`[data-role="${s}"]`);
    q('mic').addEventListener('click',async()=>{
      if(this.recorder.state().active)return;
      try{await this.recorder.start();q('mic').dataset.state='recording';q('controls').dataset.open='true';this.toast(accessory,'Grabando')}
      catch(e){this.toast(accessory,e?.name==='NotAllowedError'?'Permití el micrófono en Chrome':(e.message||'No pude grabar'))}
    });
    q('pause').addEventListener('click',()=>{this.recorder.pauseResume();q('pause').textContent=this.recorder.state().paused?'Seguir':'Pausa'});
    q('save').addEventListener('click',async()=>{try{const c=await this.recorder.save();q('mic').dataset.state='idle';q('controls').dataset.open='false';q('pause').textContent='Pausa';this.toast(accessory,'Guardado · podés seguir navegando');this.queue.process();await this.syncOneWhenReady(c.id);await this.renderDrawer(drawer);await this.refreshBadge()}catch(e){this.toast(accessory,e.message||'No pude guardar')}});
    q('discard').addEventListener('click',()=>{this.recorder.discard();q('mic').dataset.state='idle';q('controls').dataset.open='false';q('pause').textContent='Pausa';this.toast(accessory,'Audio eliminado')});
    q('inbox').addEventListener('click',async()=>{drawer.dataset.open=drawer.dataset.open==='true'?'false':'true';if(drawer.dataset.open==='true')await this.renderDrawer(drawer)});
    d('close').addEventListener('click',()=>drawer.dataset.open='false');
    d('scope').addEventListener('click',async()=>{this.filter=this.filter==='page'?'all':'page';d('scope').textContent=this.filter==='page'?'Esta página':'Todas';await this.renderDrawer(drawer)});
    d('selectall').addEventListener('click',async()=>{const visible=await this.visibleCaptures();const eligible=visible.filter(c=>c.transcript_revision&&c.archive_state==='ACTIVE');const all=eligible.every(c=>this.selected.has(c.id));for(const c of eligible){if(all)this.selected.delete(c.id);else this.selected.add(c.id)}await this.renderDrawer(drawer)});
    d('patent').addEventListener('click',async()=>{try{await this.preparePatent(accessory,drawer)}catch(e){this.toast(accessory,e.message||'No pude preparar la patente')}});
  }
  async visibleCaptures(){
    let all=await this.store.listCaptures({includeArchived:false});if(this.filter==='all')return all;
    try{const page=resolveV53Page({api:this.win.__PROMETEO_V53__,catalog:this.catalogManifest.pages?.length?this.catalogManifest:this.catalog});return all.filter(c=>c.immutable_creation?.context?.page_id===page.id||c.page_id===page.id)}catch{return all}
  }
  async renderDrawer(drawer){
    const list=drawer.querySelector('[data-role="list"]');const captures=await this.visibleCaptures();list.innerHTML='';
    if(!captures.length){list.innerHTML='<div class="prometeo-capture-note"><small>No hay capturas todavía.</small></div>';return}
    for(const c of captures){
      const row=this.doc.createElement('article');row.className='prometeo-capture-note';const checked=this.selected.has(c.id);const page=c.immutable_creation?.context?.page_id||c.page_id||'sin página';
      row.innerHTML=`<small>${escapeHtml(page)} · ${escapeHtml(statusLabel(c))}</small><label><input data-role="pick" type="checkbox" ${checked?'checked':''}> <span class="prometeo-capture-state">${c.transcript_revision?'✓':'◌'}</span></label>${c.transcript_revision?'<textarea data-role="text"></textarea>':'<div class="prometeo-capture-state">'+escapeHtml(c.processing_state)+'</div>'}<div><button class="prometeo-capture-mini" data-role="confirm" type="button">Confirmar</button> <button class="prometeo-capture-mini" data-role="archive" type="button">Archivar</button></div>`;
      row.querySelector('[data-role="pick"]').addEventListener('change',e=>{if(e.target.checked)this.selected.add(c.id);else this.selected.delete(c.id)});
      const ta=row.querySelector('[data-role="text"]');if(ta){ta.value=c.active_transcript||'';ta.addEventListener('change',async()=>{const current=await this.store.getCapture(c.id);if(!current||ta.value.trim()===current.active_transcript)return;const edited=appendTranscriptRevision(current,{text:ta.value,state:'EDITED',source:'human-edit'});await this.store.putCapture(edited);await this.syncCapture(edited);await this.refreshBadge()})}
      row.querySelector('[data-role="confirm"]').disabled=!c.transcript_revision;row.querySelector('[data-role="confirm"]').addEventListener('click',async()=>{const current=await this.store.getCapture(c.id);if(!current?.transcript_revision)return;const confirmed=appendTranscriptRevision(current,{text:current.active_transcript,state:'CONFIRMED',source:'human-confirm'});await this.store.putCapture(confirmed);await this.syncCapture(confirmed);this.selected.add(c.id);await this.renderDrawer(drawer)});
      row.querySelector('[data-role="archive"]').addEventListener('click',async()=>{const current=await this.store.getCapture(c.id);if(!current)return;const archived=archiveCapture(current,{reason:'human-archive'});await this.store.putCapture(archived);this.selected.delete(c.id);try{await this.remote?.archiveCapture(c.id,{reason:'human-archive'})}catch{}await this.renderDrawer(drawer);await this.refreshBadge()});
      list.append(row);
    }
  }
  async refreshBadge(){if(!this.currentTerminal)return;const count=this.currentTerminal.querySelector('[data-role="count"]');if(!count)return;const all=await this.store.listCaptures({includeArchived:false});const n=all.filter(c=>c.transcript_revision&&c.archive_state==='ACTIVE').length;count.textContent=String(n);count.hidden=!n}
  async syncCapture(c){if(!this.remote)return c;try{const result=await this.remote.syncCapture(c);await this.store.putCapture(result.capture);return result.capture}catch{return c}}
  async syncOneWhenReady(id){let guard=0;const poll=async()=>{if(guard++>120)return;const c=await this.store.getCapture(id);if(!c)return;if(c.transcript_revision){await this.syncCapture(c);await this.refreshBadge();return}if(c.processing_state==='ERROR')return;setTimeout(poll,1000)};setTimeout(poll,500)}
  async preparePatent(accessory,drawer){
    if(!this.remote)fail('PROMETEO_PATENT_REMOTE','Remote private transport is not configured');
    const all=await this.store.listCaptures({includeArchived:false});const selected=all.filter(c=>this.selected.has(c.id)&&c.transcript_revision);
    if(!selected.length)fail('PROMETEO_PATENT_SELECTION','Seleccioná al menos una captura transcripta');
    await this.remote.connect();
    const exportReceipt=await this.remote.prepareExport(selected);
    const request=selected.map(c=>`[${c.immutable_creation.context.page_id||'unknown'}] ${revisionRef(c).text}`).join('\n');
    const Workflow=this.win?.PrometeoWorkflow||globalThis.PrometeoWorkflow;if(!Workflow)fail('PROMETEO_PATENT_WORKFLOW','PrometeoWorkflow no está cargado');
    const seed=await Workflow.seed({request,privacy:'PROJECT',source_refs:selected.map(c=>revisionRef(c).ref)});
    const pageIds=[...new Set(selected.map(c=>c.immutable_creation.context.page_id).filter(Boolean))];
    const work=await Workflow.workItem(seed,{target:{kind:'capture-batch',page_ids:pageIds},owner:'fresh-agent',dependencies:pageIds});
    const current=await fetchJSON('https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/state/CURRENT_GRAPH.json');
    const manifest=await fetchJSON('https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/catalog/CATALOG_MANIFEST.json');
    const protocolText=await fetchText('https://raw.githubusercontent.com/JuanManuelPM/prometeo/main/coordination/P4_CAPTURE_AGENT_PROTOCOL.md');
    const currentBinding={revision:current.revision,digest:await patentDigest(current),last_durable_receipt:current.last_durable_receipt};
    const catalogBinding={identity:manifest.source_contract.identity,digest:await patentDigest(manifest)};
    const protocolBinding={id:'PROMETEO_EXHAUSTIVE_100/v2',digest:await patentDigest(protocolText),ref:'coordination/P4_CAPTURE_AGENT_PROTOCOL.md'};
    const pageBindings=pageIds.map(id=>{const p=(manifest.pages||[]).find(x=>x.page_id===id);if(!p)fail('PROMETEO_PATENT_PAGE','Catalog Manifest page missing',{id});return{page_id:id,source_identity:p.source_identity,writable_target:p.writable_target,href:p.href}});
    const result=await this.remote.createPatent({captures:selected,export_receipt_id:exportReceipt.id,seed,work_item:work,current_binding:currentBinding,catalog_binding:catalogBinding,page_bindings:pageBindings,protocol_binding:protocolBinding});
    this.toast(accessory,`${result.patent_code} lista`);this.onPatent(result);drawer.dataset.open='false';return result;
  }
  toast(accessory,text){const t=accessory.querySelector('[data-role="toast"]');if(!t)return;t.textContent=text;t.dataset.show='true';clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>t.dataset.show='false',2200)}
}

function statusLabel(c){if(c.processing_state==='ERROR')return 'error';if(!c.transcript_revision)return c.processing_state.toLowerCase();return `${c.transcript_state.toLowerCase()} · ${c.sync_state.toLowerCase()}`}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function fetchJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`No pude leer ${url}`);return r.json()}
async function fetchText(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`No pude leer ${url}`);return r.text()}