import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const siteArg=process.argv[3]?path.resolve(process.argv[3]):null;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m)};
const uniq=(xs,label)=>{if(new Set(xs).size!==xs.length) fail(label+' must be unique')};
const walkPackets=()=>{
  const base=path.join(root,'coordination','launch-packets');
  if(!fs.existsSync(base)) return [];
  return fs.readdirSync(base,{withFileTypes:true})
    .filter(x=>x.isDirectory())
    .map(x=>({run_id:x.name,path:path.join(base,x.name,'PACKET.json')}))
    .filter(x=>fs.existsSync(x.path));
};

const protocol=read(path.join(root,'coordination','workers','LAUNCH_PACKET_PROTOCOL_V1.json'));
const pipeline=read(path.join(root,'coordination','workers','WORKER_PIPELINE_V1.json'));
const evolution=read(path.join(root,'coordination','workers','WORKER_EVOLUTION_LAB_V1.json'));
const receipt=read(path.join(root,'coordination','workers','WORKER_BENCHMARK_RECEIPT_V1.json'));

if(protocol.status!=='ACTIVE_BINDING_IMPLEMENTATION_PENDING'&&protocol.status!=='ACTIVE_BINDING') fail('launch packet protocol inactive');
if(pipeline.status!=='ACTIVE_BINDING') fail('pipeline inactive');
if(!['ACTIVE_BINDING','COMPLETE_GRADUATED'].includes(evolution.status)) fail('evolution inactive');
if(receipt.status!=='ACTIVE_BINDING') fail('receipt spec inactive');
if(protocol.replenishment?.status!=='ACTIVE_BINDING') fail('run replenishment inactive');
if(protocol.residency?.terminal_reply_latch?.status!=='ACTIVE_BINDING') fail('run terminal latch inactive');

const variantMap=new Map((evolution.variants||[]).map(v=>[v.id,v]));
const stageIds=(pipeline.stages||[]).map(x=>x.id);
for(const id of receipt.stage_trace_fields||[]) if(!stageIds.includes(id)) fail('receipt stage not in pipeline '+id);

const packetEntries=walkPackets();
if(packetEntries.length<1) fail('no launch packets found');
const summaries=[];

for(const ent of packetEntries){
  const packet=read(ent.path);
  const runId=packet.run_id;
  if(!runId||runId!==ent.run_id) fail('run directory/id mismatch '+ent.run_id);
  if(packet.same_prompt_for_every_worker!==true||packet.human_numbers_slots!==false) fail(runId+': human routing/numbering regression');
  if(!String(packet.human_invocation||'').includes('RUN '+runId)) fail(runId+': run prompt missing run id');
  if(!String(packet.human_invocation||'').includes('RUN-slot claim')) fail(runId+': run prompt missing slot authorization');
  for(const marker of ['NUEVO_WORKER=1','PRIMERA_ACCIÓN_DURABLE','NO reutilices identidad/slot','https://juanmanuelpm.github.io/prometeo/wc/']){
    if(!String(packet.human_invocation||'').includes(marker)) fail(runId+': run prompt missing '+marker);
  }

  const slots=Array.isArray(packet.slots)?packet.slots:[];
  const realloc=Array.isArray(packet.reallocation_slots)?packet.reallocation_slots:[];
  const expected=Number(packet.expected_human_launches??slots.length);
  if(!Number.isInteger(expected)||expected<1) fail(runId+': invalid expected_human_launches');
  if(slots.length!==expected) fail(runId+': primary slot count must equal expected_human_launches');
  if(realloc.length!==slots.length) fail(runId+': reallocation slots must match primary slot count');

  uniq(slots.map(x=>x.slot_id),runId+' primary slot ids');
  uniq(slots.map(x=>x.claim_path),runId+' primary claim paths');
  uniq(slots.flatMap(x=>x.write_scope||[]),runId+' primary write scopes');
  uniq(slots.map(x=>x.public_route),runId+' primary public routes');
  uniq(realloc.map(x=>x.slot_id),runId+' reallocation slot ids');
  uniq(realloc.map(x=>x.claim_path),runId+' reallocation claim paths');
  uniq(realloc.flatMap(x=>x.write_scope||[]),runId+' reallocation write scopes');
  uniq(realloc.map(x=>x.public_route),runId+' reallocation public routes');

  const counts={};
  for(const s of slots){
    if(!/^S\d{3}$/.test(s.slot_id)) fail(runId+': bad slot id '+s.slot_id);
    if(!variantMap.has(s.evolution_variant)) fail(runId+': unknown variant '+s.evolution_variant);
    counts[s.evolution_variant]=(counts[s.evolution_variant]||0)+1;
    if((s.required_capabilities||[]).length!==0) fail(runId+': primary slots must stay generic');
    if(s.claim_path!==`coordination/launch-packets/${runId}/claims/${s.slot_id}.json`) fail(runId+': claim path mismatch '+s.slot_id);
    if(!(s.write_scope||[]).every(x=>String(x).includes(`/cat-lab/${runId}/${s.slot_id}/`))) fail(runId+': primary write scope mismatch '+s.slot_id);
    if(!String(s.public_route).includes(`/bench/cat-lab/${runId}/${s.slot_id}/`)) fail(runId+': public route mismatch '+s.slot_id);
    if(!String(s.receipt_path_pattern||'').includes(`benchmark-receipts/${runId}/`)) fail(runId+': receipt path mismatch '+s.slot_id);
  }
  for(const s of realloc){
    if(!/^R\d{3}$/.test(s.slot_id)) fail(runId+': bad reallocation slot '+s.slot_id);
    if((s.required_capabilities||[]).length!==0) fail(runId+': reallocation slots must stay generic');
    if(s.claim_path!==`coordination/launch-packets/${runId}/reallocation-claims/${s.slot_id}.json`) fail(runId+': reallocation claim path mismatch '+s.slot_id);
    if(!(s.write_scope||[]).every(x=>String(x).includes(`/dog-notes/${runId}/${s.slot_id}/`))) fail(runId+': reallocation write scope mismatch '+s.slot_id);
    if(!String(s.public_route).includes(`/bench/dog-notes/${runId}/${s.slot_id}/`)) fail(runId+': reallocation route mismatch '+s.slot_id);
  }

  if(runId==='CATLAB-EVO-01'){
    for(const v of evolution.variants||[]) if(counts[v.id]!==2) fail(runId+': '+v.id+' needs exactly two exploration replicas');
  }
  const selected=packet.selected_candidates||packet.confirmation?.candidates?.map(x=>x.id)||packet.evaluation?.selected_candidates||[];
  const confirmationN=Number(packet.confirmation_workers_per_candidate||packet.confirmation?.candidates?.[0]?.replicas||packet.evaluation?.confirmation_workers_per_candidate||0);
  if(selected.length){
    if(selected.length>2) fail(runId+': candidate limit exceeded');
    for(const id of selected){
      if(!variantMap.has(id)) fail(runId+': unknown selected candidate '+id);
      if(confirmationN>0 && counts[id]!==confirmationN) fail(runId+': candidate '+id+' confirmation replica count mismatch');
    }
    const nonSelected=Object.entries(counts).filter(([id,n])=>n>0&&!selected.includes(id));
    if(nonSelected.length) fail(runId+': confirmation packet contains unselected variants '+nonSelected.map(x=>x[0]).join(','));
  }

  const selectors=packet?.common_capsule?.machine_contract?.selectors||{};
  for(const k of ['chapters','current_chapter','tts_play','tts_prev','tts_next','tts_rate','radio_play','radio_volume','notes','palette_controls']){
    if(!selectors[k]) fail(runId+': machine contract missing '+k);
  }
  if(String(packet.common_capsule?.primary_return_path_pattern||'').includes('CATLAB-EVO-01') && runId!=='CATLAB-EVO-01') fail(runId+': inherited primary return path points at exploration run');
  for(const ref of packet.common_capsule?.exact_sources||[]){
    if(String(ref).includes('coordination/launch-packets/') && !String(ref).includes('/'+runId+'/')) fail(runId+': exact source points at different run '+ref);
  }

  function choose(seedIndex,claimed){
    for(let off=0;off<slots.length;off++){
      const idx=(seedIndex+off)%slots.length;
      if(!claimed.has(slots[idx].slot_id)) return slots[idx].slot_id;
    }
    return null;
  }
  const simulated=new Set();
  for(let i=0;i<slots.length;i++){
    const id=choose(0,simulated);
    if(!id) fail(runId+': cyclic probing failed before all slots claimed');
    simulated.add(id);
  }
  if(simulated.size!==slots.length) fail(runId+': not all slots reachable');

  if(siteArg){
    const publicPacket=read(path.join(siteArg,'launch',runId,'packet.json'));
    if(JSON.stringify(publicPacket)!==JSON.stringify(packet)) fail(runId+': public packet differs from canonical packet');
    for(const s of slots){
      const cap=read(path.join(siteArg,'launch',runId,'slots',s.slot_id+'.json'));
      if(cap.run_id!==runId||cap.packet_status!==packet.status||cap.slot?.slot_id!==s.slot_id||cap.variant?.id!==s.evolution_variant) fail(runId+': bad public capsule '+s.slot_id);
      if(cap.authority_mode!==packet.authority_mode) fail(runId+': public capsule authority drift '+s.slot_id);
      if(JSON.stringify(cap.common_capsule)!==JSON.stringify(packet.common_capsule)) fail(runId+': public common capsule drift '+s.slot_id);
      if(JSON.stringify(cap.reallocation_pool)!==JSON.stringify(packet.reallocation_pool)) fail(runId+': public reallocation pool drift '+s.slot_id);
    }
    for(const s of realloc){
      const cap=read(path.join(siteArg,'launch',runId,'reallocation-slots',s.slot_id+'.json'));
      if(cap.run_id!==runId||cap.packet_status!==packet.status||cap.slot?.slot_id!==s.slot_id) fail(runId+': bad public reallocation capsule '+s.slot_id);
      if(cap.authority_mode!==packet.authority_mode) fail(runId+': public reallocation authority drift '+s.slot_id);
      if(JSON.stringify(cap.objective)!==JSON.stringify(packet.reallocation_pool?.objective||null)) fail(runId+': public reallocation objective drift '+s.slot_id);
    }
    const status=read(path.join(siteArg,'launch',runId,'status.json'));
    if(status.run_id!==runId||status.packet_status!==packet.status) fail(runId+': public status identity drift');
    if(status.slots_total!==slots.length||status.reallocation_slots_total!==realloc.length) fail(runId+': public status denominator drift');
    if(status.human_numbering_required!==false) fail(runId+': public status human-routing regression');
    if(!Number.isInteger(status.workers_beaconed_without_primary_claim)) fail(runId+': public status missing beacon-without-claim count');
    if(!Number.isInteger(status.replacement_launches_recommended)) fail(runId+': public status missing refill recommendation');
    if(!Number.isInteger(status.workers_terminal)) fail(runId+': public status missing terminal count');
    if(!Array.isArray(status.incomplete_worker_states)) fail(runId+': public status missing incomplete worker states');
  }
  summaries.push({run_id:runId,status:packet.status,slots:slots.length,reallocation_slots:realloc.length,variant_counts:counts});
}
console.log(JSON.stringify({ok:true,runs:summaries}));
