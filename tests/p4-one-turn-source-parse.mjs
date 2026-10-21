import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {spawnSync} from 'node:child_process';
for(const file of ['index.ts','one-turn.ts','one-turn-context.ts']){
  const path=`supabase/functions/prometeo-change-loop-v1/${file}`;
  const js=stripTypeScriptTypes(readFileSync(path,'utf8'));
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:js,encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stderr);process.exit(result.status||1)}
  console.log(`PARSE PASS ${path}`);
}
