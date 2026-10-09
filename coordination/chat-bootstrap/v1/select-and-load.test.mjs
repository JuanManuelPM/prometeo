// Pure tests use fixture skill texts only. They DO NOT pretend to see other ChatGPT chats.
// Live connector cold recovery is recorded separately.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectForTask,loadSelected} from './select-and-load.mjs';
const cfg=JSON.parse(await readFile(new URL('./ROUTES_V1.json',import.meta.url)));
test('explicit one-turn, books, TV, widget, prepare, and isolated dot',()=>{
 const cases=[
 ['🔥prometeo estudiá Piaget','EXECUTE_THIS_TURN',['prometeo-fire','prometeo-knowledge']],
 ['🔥tv demo','EXECUTE_THIS_TURN',['prometeo-tv-show']],
 ['🔥prometeo mejorá widget calendario','EXECUTE_THIS_TURN',['prometeo-web-change']],
 ['🔥preparar publicar widget','PREPARE_ONLY',['prometeo-skill-scout']],
 ['🔥prometeo','PREPARE_ONLY',['prometeo-skill-scout']],
 ['Necesito ayuda con facultad','EXECUTE_THIS_TURN',['prometeo-knowledge']]
 ];
 for(const [input,mode,expected] of cases){const r=selectForTask(input,cfg);assert.equal(r.mode,mode);for(const x of expected)assert.ok(r.skill_names.includes(x),input+': '+x);}
 assert.equal(selectForTask('.',cfg).mode,'PLAN_NOT_FOUND');
 assert.equal(selectForTask('texto que menciona 🔥tv',cfg).fire,false);
});
test('fresh blank context selects and actually reads full selected skills',async()=>{
 const r=selectForTask('🔥prometeo preparar parcial de psicología',cfg);
 const reads=[];const loaded=await loadSelected(r,cfg,async(source,path)=>{reads.push([source.ref,path]);const n=path.split('/')[2];return '---\nname: '+n+'\ndescription: test\n---\n\n# Full instructional body\nDO_NOT_CALL_IT_INSTALLED\n';});
 assert.equal(loaded.length,r.skill_names.length);assert.equal(reads.length,loaded.length);
 assert.ok(loaded.every(s=>s.content.includes('DO_NOT_CALL_IT_INSTALLED')));
 assert.ok(loaded.some(s=>s.source==='pr71'));
});
test('fails closed on broken source or incomplete skill read',async()=>{
 const r=selectForTask('🔥libros',cfg);
 await assert.rejects(()=>loadSelected(r,cfg,async()=>''),/SKILL_INVALID/);
 assert.throws(()=>selectForTask('🔥tv',{...cfg,version:99}),/INVALID_BOOTSTRAP/);
});
test('no unseen chat authority or publication from source',()=>{
 assert.equal(cfg.status,'CANDIDATE_ISOLATED_BRANCH_NOT_INSTALLED');
 assert.equal(cfg.sources.pr71.authority,'PR_71_DRAFT_CANDIDATE_NOT_MERGED');
 assert.ok(cfg.mandatory_checks.some(s=>s.includes('No private')));
});
