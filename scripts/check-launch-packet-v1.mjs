import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const siteArg=process.argv[3]?path.resolve(process.argv[3]):null;
const packetPath=path.join(root,'coordination','launch-packets','CATLAB-EVO-01','PACKET.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const packet=read(packetPath);
const protocol=read(path.join(root,'coordination','workers','LAUNCH_PACKET_PROTOCOL_V1.json'));
const pipeline=read(path.join(root,'coordination','workers','WORKER_PIPELINE_V1.json'));
const evolution=read(path.join(root,'coordination','workers','WORKER_EVOLUTION_LAB_V1.json'));
const receipt=read(path.join(root,'coordination','workers','WORKER_BENCHMARK_RECEIPT_V1.json'));

const fail=(m)=>{throw new Error(m)};
const uniq=(xs,label)=>{if(new Set(xs).size!==xs.length) fail(label+' must be unique')};

if(protocol.status!=='ACTIVE_BINDING_IMPLEMENTATION_PENDING'&&protocol.status!=='ACTIVE_BINDING') fail('launch packet protocol inactive');
if(pipeline.status!=='ACTIVE_BINDING') fail('pipeline inactive');
if(evolution.status!=='ACTIVE_BINDING') fail('evolution inactive');
if(receipt.status!=='ACTIVE_BINDING') fail('receipt spec inactive');
if(packet.run_id!=='CATLAB-EVO-01') fail('run id drift');
if(packet.same_prompt_for_every_worker!==true||packet.human_numbers_slots!==false) fail('human routing/numbering regression');
if(!String(packet.human_invocation||'').includes('RUN CATLAB-EVO-01')) fail('run prompt missing run id');
if(!String(packet.human_invocation||'').includes('RUN-slot claim')) fail('run prompt missing slot authorization');
for(const marker of ['NUEVO_WORKER=1','PRIMERA_ACCIÓN_DURABLE','NO reutilices identidad/slot','https://juanmanuelpm.github.io/prometeo/wc/']){
  if(!String(packet.human_invocation||'').includes(marker)) fail('run prompt missing '+marker);
}

const slots=Array.isArray(packet.slots)?packet.slots:[];
const realloc=Array.isArray(packet.reallocation_slots)?packet.reallocation_slots:[];
if(slots.length!==10) fail('expected 10 primary slots');
if(realloc.length!==10) fail('expected 10 reallocation slots');
uniq(slots.map(x=>x.slot_id),'primary slot ids');
uniq(slots.map(x=>x.claim_path),'primary claim paths');
uniq(slots.flatMap(x=>x.write_scope||[]),'primary write scopes');
uniq(realloc.map(x=>x.slot_id),'reallocation slot ids');
uniq(realloc.map(x=>x.claim_path),'reallocation claim paths');
uniq(realloc.flatMap(x=>x.write_scope||[]),'reallocation write scopes');

const variants=new Map((evolution.variants||[]).map(v=>[v.id,v]));
const counts={};
for(const s of slots){
  if(!/^S\d{3}$/.test(s.slot_id)) fail('bad slot id '+s.slot_id);
  if(!variants.has(s.evolution_variant)) fail('unknown variant '+s.evolution_variant);
  counts[s.evolution_variant]=(counts[s.evolution_variant]||0)+1;
  if((s.required_capabilities||[]).length!==0) fail('CATLAB-EVO-01 primary slots must stay generic');
  if(!String(s.claim_path).endsWith('/'+s.slot_id+'.json')) fail('claim path mismatch '+s.slot_id);
  if(!String(s.public_route).includes('/bench/cat-lab/CATLAB-EVO-01/'+s.slot_id+'/')) fail('public route mismatch '+s.slot_id);
}
for(const v of evolution.variants||[]){
  if(counts[v.id]!==2) fail('variant '+v.id+' needs exactly two replicas');
}
for(const s of realloc){
  if(!/^R\d{3}$/.test(s.slot_id)) fail('bad reallocation slot '+s.slot_id);
  if((s.required_capabilities||[]).length!==0) fail('reallocation slots must stay generic');
  if(!String(s.public_route).includes('/bench/dog-notes/CATLAB-EVO-01/'+s.slot_id+'/')) fail('reallocation route mismatch');
}

const selectors=packet?.common_capsule?.machine_contract?.selectors||{};
for(const k of ['chapters','current_chapter','tts_play','tts_prev','tts_next','tts_rate','radio_play','radio_volume','notes','palette_controls']){
  if(!selectors[k]) fail('machine contract missing '+k);
}
const stageIds=(pipeline.stages||[]).map(x=>x.id);
for(const id of receipt.stage_trace_fields||[]) if(!stageIds.includes(id)) fail('receipt stage not in pipeline '+id);

// Simulate worst-case same-seed cyclic probing. Atomic CREATE collisions must still span all slots.
function choose(seedIndex, claimed){
  for(let off=0;off<slots.length;off++){
    const idx=(seedIndex+off)%slots.length;
    if(!claimed.has(slots[idx].slot_id)) return slots[idx].slot_id;
  }
  return null;
}
const claimed=new Set();
for(let i=0;i<slots.length;i++){
  const id=choose(0,claimed);
  if(!id) fail('cyclic probing failed before all slots claimed');
  claimed.add(id);
}
if(claimed.size!==slots.length) fail('not all slots reachable');

if(siteArg){
  const publicPacket=read(path.join(siteArg,'launch','CATLAB-EVO-01','packet.json'));
  if(JSON.stringify(publicPacket)!==JSON.stringify(packet)) fail('public packet differs from canonical packet');
  for(const s of slots){
    const cap=read(path.join(siteArg,'launch','CATLAB-EVO-01','slots',s.slot_id+'.json'));
    if(cap.run_id!==packet.run_id||cap.packet_status!==packet.status||cap.slot?.slot_id!==s.slot_id||cap.variant?.id!==s.evolution_variant) fail('bad public capsule '+s.slot_id);
    if(cap.authority_mode!==packet.authority_mode) fail('public capsule authority drift '+s.slot_id);
    if(JSON.stringify(cap.common_capsule)!==JSON.stringify(packet.common_capsule)) fail('public common capsule drift '+s.slot_id);
    if(JSON.stringify(cap.reallocation_pool)!==JSON.stringify(packet.reallocation_pool)) fail('public reallocation pool drift '+s.slot_id);
  }
  for(const s of realloc){
    const cap=read(path.join(siteArg,'launch','CATLAB-EVO-01','reallocation-slots',s.slot_id+'.json'));
    if(cap.run_id!==packet.run_id||cap.packet_status!==packet.status||cap.slot?.slot_id!==s.slot_id) fail('bad public reallocation capsule '+s.slot_id);
    if(cap.authority_mode!==packet.authority_mode) fail('public reallocation authority drift '+s.slot_id);
    if(JSON.stringify(cap.objective)!==JSON.stringify(packet.reallocation_pool?.objective||null)) fail('public reallocation objective drift '+s.slot_id);
  }
  const status=read(path.join(siteArg,'launch','CATLAB-EVO-01','status.json'));
  if(status.run_id!==packet.run_id||status.packet_status!==packet.status) fail('public status identity drift');
  if(status.slots_total!==slots.length||status.reallocation_slots_total!==realloc.length) fail('public status denominator drift');
  if(status.human_numbering_required!==false) fail('public status human-routing regression');
}

console.log(JSON.stringify({ok:true,run_id:packet.run_id,status:packet.status,slots:slots.length,reallocation_slots:realloc.length,variant_counts:counts}));
