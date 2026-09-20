import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const site=path.resolve(process.argv[3]||path.join(root,'dist'));
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const walk=dir=>{if(!fs.existsSync(dir)) return [];const out=[];for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()) out.push(...walk(p)); else out.push(p);}return out;};
const readJsonSafe=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const packetsRoot=path.join(root,'coordination','launch-packets');
const evolution=readJson(path.join(root,'coordination','workers','WORKER_EVOLUTION_LAB_V1.json'));
const pipeline=readJson(path.join(root,'coordination','workers','WORKER_PIPELINE_V1.json'));
const receipt=readJson(path.join(root,'coordination','workers','WORKER_BENCHMARK_RECEIPT_V1.json'));
const variantMap=new Map((evolution.variants||[]).map(v=>[v.id,v]));

if(!fs.existsSync(packetsRoot)) process.exit(0);
for(const ent of fs.readdirSync(packetsRoot,{withFileTypes:true})){
  if(!ent.isDirectory()) continue;
  const source=path.join(packetsRoot,ent.name,'PACKET.json');
  if(!fs.existsSync(source)) continue;
  const packet=readJson(source);
  const runId=packet.run_id;
  if(!runId||runId!==ent.name) throw new Error('run directory/id mismatch '+ent.name);
  const outDir=path.join(site,'launch',runId);
  fs.mkdirSync(path.join(outDir,'slots'),{recursive:true});
  fs.mkdirSync(path.join(outDir,'reallocation-slots'),{recursive:true});
  fs.writeFileSync(path.join(outDir,'packet.json'),JSON.stringify(packet,null,2)+'\n');
  fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({
    schema:'prometeo.launch-public-manifest/v1',
    run_id:runId,status:packet.status,
    slots_total:(packet.slots||[]).length,
    reallocation_slots_total:(packet.reallocation_slots||[]).length,
    packet_url:'./packet.json',
    human_invocation:packet.human_invocation
  },null,2)+'\n');
  const claimDir=path.join(packetsRoot,runId,'claims');
  const reallocClaimDir=path.join(packetsRoot,runId,'reallocation-claims');
  const primaryClaims=walk(claimDir).filter(x=>x.endsWith('.json')).map(readJsonSafe).filter(Boolean);
  const reallocationClaims=walk(reallocClaimDir).filter(x=>x.endsWith('.json')).map(readJsonSafe).filter(Boolean);
  const receiptDir=path.join(root,'coordination','workers','benchmark-receipts',runId);
  const receipts=walk(receiptDir).filter(x=>x.endsWith('.json')).map(readJsonSafe).filter(Boolean);
  const beaconDir=path.join(root,'coordination','workers','beacons');
  const runBeacons=walk(beaconDir).filter(x=>x.endsWith('.json')).map(readJsonSafe).filter(x=>x?.run_id===runId);
  const examDir=path.join(root,'coordination','workers','exams');
  const runExams=walk(examDir).filter(x=>x.endsWith('.json')).map(readJsonSafe).filter(x=>x?.run_id===runId);
  const claimedIds=new Set(primaryClaims.map(x=>x.slot_id).filter(Boolean));
  const reallocClaimedIds=new Set(reallocationClaims.map(x=>x.slot_id).filter(Boolean));
  const claimedWorkerIds=new Set(primaryClaims.map(x=>x.worker_id).filter(Boolean));
  const unassignedBeacons=runBeacons.filter(x=>x?.worker_id&&!claimedWorkerIds.has(x.worker_id));
  const examWorkerIds=new Set(runExams.map(x=>x.worker_id).filter(Boolean));
  const receiptByWorker=new Map(receipts.filter(x=>x?.worker_id).map(x=>[x.worker_id,x]));
  const terminalWorkers=runBeacons.filter(x=>x?.worker_id&&examWorkerIds.has(x.worker_id)&&receiptByWorker.get(x.worker_id)?.reallocation_complete===true);
  const incompleteWorkers=runBeacons.filter(x=>x?.worker_id&&!terminalWorkers.some(t=>t.worker_id===x.worker_id)).map(x=>{
    const rcpt=receiptByWorker.get(x.worker_id)||null;
    let state='UNKNOWN_INCOMPLETE';
    if(!claimedWorkerIds.has(x.worker_id)) state='E2_ASSIGN_NOT_REACHED_NO_PRIMARY_CLAIM';
    else if(rcpt?.primary_complete===true&&rcpt?.reallocation_complete!==true) state='E8_REALLOCATE_NOT_COMPLETED';
    else if(rcpt?.reallocation_complete===true&&!examWorkerIds.has(x.worker_id)) state='E9_EXAM_CLOSE_NOT_COMPLETED';
    else if(!rcpt) state='CLAIMED_WITHOUT_BENCHMARK_RECEIPT';
    return {worker_id:x.worker_id,state};
  });
  const slots=packet.slots||[];
  const variantStatus={};
  for(const slot of slots){
    const id=slot.evolution_variant||'UNSPECIFIED';
    variantStatus[id]??={slots_total:0,slots_claimed:0,primary_complete:0,reallocation_complete:0};
    variantStatus[id].slots_total++;
    if(claimedIds.has(slot.slot_id)) variantStatus[id].slots_claimed++;
  }
  for(const rcpt of receipts){
    const id=rcpt.evolution_variant||'UNSPECIFIED';
    variantStatus[id]??={slots_total:0,slots_claimed:0,primary_complete:0,reallocation_complete:0};
    if(rcpt.primary_complete===true) variantStatus[id].primary_complete++;
    if(rcpt.reallocation_complete===true) variantStatus[id].reallocation_complete++;
  }
  const status={
    schema:'prometeo.launch-run-status/v1',
    generated_at:new Date().toISOString(),
    run_id:runId,
    packet_status:packet.status,
    expected_human_launches:packet.expected_human_launches??slots.length,
    slots_total:slots.length,
    slots_claimed:claimedIds.size,
    slots_unclaimed:Math.max(0,slots.length-claimedIds.size),
    unclaimed_slot_ids:slots.map(x=>x.slot_id).filter(id=>!claimedIds.has(id)),
    distinct_primary_workers:new Set(primaryClaims.map(x=>x.worker_id).filter(Boolean)).size,
    workers_beaconed:new Set(runBeacons.map(x=>x.worker_id).filter(Boolean)).size,
    workers_beaconed_without_primary_claim:unassignedBeacons.length,
    unassigned_beacon_workers:unassignedBeacons.map(x=>({worker_id:x.worker_id,launched_at:x.launched_at||null,stage_observation:'E2_ASSIGN:NOT_REACHED_NO_CLAIM_EVIDENCE'})),
    assignment_success_rate:runBeacons.length?Number((claimedWorkerIds.size/runBeacons.length).toFixed(3)):null,
    replacement_launches_recommended:(runBeacons.length>=(packet.expected_human_launches??slots.length))?Math.min(Math.max(0,slots.length-claimedIds.size),unassignedBeacons.length):0,
    workers_terminal:terminalWorkers.length,
    terminal_completion_rate:slots.length?Number((terminalWorkers.length/slots.length).toFixed(3)):null,
    workers_incomplete:incompleteWorkers.length,
    incomplete_worker_states:incompleteWorkers,
    reallocation_slots_total:(packet.reallocation_slots||[]).length,
    reallocation_slots_claimed:reallocClaimedIds.size,
    primary_complete:new Set(receipts.filter(x=>x.primary_complete===true).map(x=>x.worker_id)).size,
    reallocation_complete:new Set(receipts.filter(x=>x.reallocation_complete===true).map(x=>x.worker_id)).size,
    receipts:receipts.length,
    variants:variantStatus,
    human_numbering_required:false,
    truth_boundary:'Durable main-branch beacons, packet claims and benchmark receipts only. A beacon without a primary claim is an observable E1-complete/E2-not-reached launch outcome, not proof of why the chat stopped.'
  };
  fs.writeFileSync(path.join(outDir,'status.json'),JSON.stringify(status,null,2)+'\n');
  for(const slot of packet.slots||[]){
    const variant=variantMap.get(slot.evolution_variant)||null;
    const capsule={
      schema:'prometeo.launch-slot-capsule/v1',
      run_id:runId,
      packet_status:packet.status,
      slot,
      variant,
      pipeline_stages:pipeline.stages,
      common_capsule:packet.common_capsule,
      reallocation_pool:packet.reallocation_pool,
      benchmark_receipt:{path_pattern:receipt.path_pattern,required_fields:receipt.required_fields,stage_trace_fields:receipt.stage_trace_fields,evidence_rule:receipt.evidence_rule},
      authority_mode:packet.authority_mode,
      authority_rule:packet.authority_rule
    };
    fs.writeFileSync(path.join(outDir,'slots',slot.slot_id+'.json'),JSON.stringify(capsule,null,2)+'\n');
  }
  for(const slot of packet.reallocation_slots||[]){
    fs.writeFileSync(path.join(outDir,'reallocation-slots',slot.slot_id+'.json'),JSON.stringify({
      schema:'prometeo.launch-reallocation-capsule/v1',
      run_id:runId,packet_status:packet.status,slot,objective:packet.reallocation_pool?.objective||null,
      authority_mode:packet.authority_mode,authority_rule:packet.authority_rule
    },null,2)+'\n');
  }
  const rows=(packet.slots||[]).map(slot=>'<tr><td>'+esc(slot.slot_id)+'</td><td>'+esc(slot.evolution_variant)+'</td><td>'+esc(slot.project_id)+'</td><td>'+(claimedIds.has(slot.slot_id)?'CLAIMED':'OPEN')+'</td></tr>').join('');
  const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+esc(runId)+' · Prometeo Launch</title><style>html{background:#080808;color:#f0eee9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}body{max-width:980px;margin:auto;padding:28px 18px}h1{font-size:24px}pre{white-space:pre-wrap;border:1px solid #4a453d;padding:14px;user-select:all}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #34312d;text-align:left;padding:8px}a{color:#ff9b54}.muted{color:#aaa}.metrics{display:flex;gap:18px;flex-wrap:wrap}.metrics b{display:block;font-size:20px}</style></head><body><h1>'+esc(runId)+'</h1><p class="muted">Launch Packet · '+esc(packet.status)+'</p><div class="metrics"><span>slots<b>'+status.slots_claimed+'/'+status.slots_total+'</b></span><span>primary complete<b>'+status.primary_complete+'</b></span><span>reallocated<b>'+status.reallocation_complete+'</b></span></div><h2>Prompt único</h2><pre>'+esc(packet.human_invocation)+'</pre><p><a href="./packet.json">packet.json</a> · <a href="./status.json">status.json</a> · <a href="./manifest.json">manifest.json</a></p><h2>Slots</h2><table><thead><tr><th>slot</th><th>variant</th><th>project</th><th>state</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>\n';
  fs.writeFileSync(path.join(outDir,'index.html'),html);
  console.log(JSON.stringify({run_id:runId,status:packet.status,slots:(packet.slots||[]).length,outDir}));
}
