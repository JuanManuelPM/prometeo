import fs from 'node:fs';
import path from 'node:path';

const sourceRoot=process.argv[2]||'.';
const source=fs.readFileSync(path.join(sourceRoot,'supabase/functions/prometeo-change-loop-v1/index.ts'),'utf8');
const must=(label,needle)=>{if(!source.includes(needle))throw new Error('PAGE_CHANGE_FRONTIER_DEGRADED_FAIL '+label)};

must('pgrst002','code===\'PGRST002\'');
must('schema-cache-match','/schema cache|Could not query the database/i');
must('safe-boundary',"truth_boundary:'CONTROL_PLANE_UNAVAILABLE_NO_PAGE_CHANGE_WORK_ADDED'");
must('degraded-flag','degraded:true');
must('empty-items','items:[]');

const start=source.indexOf("if(code==='PGRST002'");
const stop=source.indexOf('throw q.error;',start);
if(start<0||stop<0)throw new Error('PAGE_CHANGE_FRONTIER_DEGRADED_FAIL degraded_block_missing');
const segment=source.slice(start,stop);
for(const forbidden of ['snapshot:','transcript:','packetToken','returnToken','asset_url']){
  if(segment.includes(forbidden))throw new Error('PAGE_CHANGE_FRONTIER_DEGRADED_FAIL private_literal_'+forbidden);
}
console.log('PAGE_CHANGE_FRONTIER_DEGRADED_PASS');
