import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const siteArg=process.argv[3]?path.resolve(process.argv[3]):null;
const runId='CATLAB-P2B-01';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const packet=read(path.join(root,'coordination','launch-packets',runId,'PACKET.json'));
const evolution=read(path.join(root,'coordination','workers','WORKER_EVOLUTION_LAB_V1.json'));
const pipeline=read(path.join(root,'coordination','workers','WORKER_PIPELINE_V1.json'));
const result=read(path.join(root,'coordination','launch-packets','CATLAB-EVO-01','P2A_RESULT.json'));
const fail=m=>{throw new Error(m)};
const uniq=(xs,label)=>{if(new Set(xs).size!==xs.length) fail(label+' must be unique')};

if(packet.run_id!==runId||packet.status!=='ARMED') fail('P2B packet not armed');
if(packet.expected_human_launches!==6||packet.same_prompt_for_every_worker!==true||packet.human_numbers_slots!==false) fail('P2B human contract drift');
for(const marker of ['RUN '+runId,'NUEVO_WORKER=1','PRIMERA_ACCIÓN_DURABLE','NO reutilices identidad/slot','RUN-slot claim','https://juanmanuelpm.github.io/prometeo/wc/']){
  if(!String(packet.human_invocation||'').includes(marker)) fail('P2B prompt missing '+marker);
}
if(JSON.stringify(packet.selected_candidates)!==JSON.stringify(['V3_EVIDENCE_MAP','V4_TWO_PASS_REVIEW'])) fail('candidate drift');
if(JSON.stringify(result.selected_candidates)!==JSON.stringify(packet.selected_candidates)) fail('P2A/P2B candidate mismatch');
const slots=packet.slots||[], realloc=packet.reallocation_slots||[];
if(slots.length!==6||realloc.length!==6) fail('P2B denominator drift');
uniq(slots.map(x=>x.slot_id),'primary ids'); uniq(slots.map(x=>x.claim_path),'primary claims'); uniq(slots.flatMap(x=>x.write_scope||[]),'primary scopes');
uniq(realloc.map(x=>x.slot_id),'realloc ids'); uniq(realloc.map(x=>x.claim_path),'realloc claims'); uniq(realloc.flatMap(x=>x.write_scope||[]),'realloc scopes');
const counts={}; for(const s of slots){counts[s.evolution_variant]=(counts[s.evolution_variant]||0)+1;if(!packet.selected_candidates.includes(s.evolution_variant)) fail('unexpected variant '+s.evolution_variant);if(!String(s.public_route).includes('/bench/cat-lab/'+runId+'/'+s.slot_id+'/')) fail('primary route drift '+s.slot_id);}
if(counts.V3_EVIDENCE_MAP!==3||counts.V4_TWO_PASS_REVIEW!==3) fail('P2B needs 3+3 confirmations');
const vmap=new Map((evolution.variants||[]).map(v=>[v.id,v])); for(const id of packet.selected_candidates){if(vmap.get(id)?.changed_stage!=='E6_VERIFY') fail(id+' no longer targets E6_VERIFY');}
for(const s of realloc){if(!String(s.public_route).includes('/bench/dog-notes/'+runId+'/'+s.slot_id+'/')) fail('realloc route drift '+s.slot_id);}
const stageIds=(pipeline.stages||[]).map(x=>x.id); for(const id of ['E0_ENVELOPE','E1_IDENTITY','E2_ASSIGN','E3_CONTEXT','E4_PLAN_LOCK','E5_PRODUCE','E6_VERIFY','E7_RETURN','E8_REALLOCATE','E9_EXAM_CLOSE']) if(!stageIds.includes(id)) fail('pipeline stage missing '+id);
const claimed=new Set(); for(let i=0;i<slots.length;i++){let chosen=null;for(let off=0;off<slots.length;off++){const s=slots[(off)%slots.length];if(!claimed.has(s.slot_id)){chosen=s.slot_id;break;}}if(!chosen) fail('cyclic reachability');claimed.add(chosen);} if(claimed.size!==6) fail('not all P2B slots reachable');
if(siteArg){
 const pp=read(path.join(siteArg,'launch',runId,'packet.json')); if(JSON.stringify(pp)!==JSON.stringify(packet)) fail('public P2B packet drift');
 const st=read(path.join(siteArg,'launch',runId,'status.json')); if(st.run_id!==runId||st.slots_total!==6||st.reallocation_slots_total!==6) fail('public P2B status drift');
 for(const s of slots){const cap=read(path.join(siteArg,'launch',runId,'slots',s.slot_id+'.json'));if(cap.slot?.slot_id!==s.slot_id||cap.variant?.id!==s.evolution_variant) fail('bad public P2B capsule '+s.slot_id);}
 for(const s of realloc){const cap=read(path.join(siteArg,'launch',runId,'reallocation-slots',s.slot_id+'.json'));if(cap.slot?.slot_id!==s.slot_id||cap.objective?.objective_id!=='DOG-NOTES-V1') fail('bad public P2B realloc '+s.slot_id);}
}
console.log(JSON.stringify({ok:true,run_id:runId,slots:6,variant_counts:counts}));
