import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const site=path.resolve(process.argv[3]||path.join(root,'dist'));
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
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
  const rows=(packet.slots||[]).map(s=>'<tr><td>'+esc(s.slot_id)+'</td><td>'+esc(s.evolution_variant)+'</td><td>'+esc(s.project_id)+'</td></tr>').join('');
  const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+esc(runId)+' · Prometeo Launch</title><style>html{background:#080808;color:#f0eee9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}body{max-width:980px;margin:auto;padding:28px 18px}h1{font-size:24px}pre{white-space:pre-wrap;border:1px solid #4a453d;padding:14px;user-select:all}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #34312d;text-align:left;padding:8px}a{color:#ff9b54}.muted{color:#aaa}</style></head><body><h1>'+esc(runId)+'</h1><p class="muted">Launch Packet · '+esc(packet.status)+' · slots '+(packet.slots||[]).length+'</p><h2>Prompt único</h2><pre>'+esc(packet.human_invocation)+'</pre><p><a href="./packet.json">packet.json</a> · <a href="./manifest.json">manifest.json</a></p><h2>Slots</h2><table><thead><tr><th>slot</th><th>variant</th><th>project</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>\n';
  fs.writeFileSync(path.join(outDir,'index.html'),html);
  console.log(JSON.stringify({run_id:runId,status:packet.status,slots:(packet.slots||[]).length,outDir}));
}
