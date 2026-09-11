import fs from 'node:fs';

const path=process.argv[2]||'pages/study-library/instances/modelos-teorias-ii-p1-v2.json';
const x=JSON.parse(fs.readFileSync(path,'utf8'));
const fail=(m)=>{console.error('FAIL',m);process.exitCode=1};
const ok=(m)=>console.log('OK',m);
const req=(o,k,where)=>{if(o?.[k]===undefined||o?.[k]===null||o?.[k]==='')fail(`${where}.${k}`)};

if(x.schema!=='prometeo.study.exam/v2')fail('schema'); else ok('schema');
['instance_id','course','exam','sources','exam_profile','modules'].forEach(k=>req(x,k,'root'));
const sourceIds=new Set((x.sources||[]).map(s=>s.id));
if(sourceIds.size!==(x.sources||[]).length)fail('duplicate source ids');
const allowedRoles=new Set(['current_authority','required_reading','evaluation_evidence','supporting','historical_or_old','out_of_scope']);
for(const s of x.sources||[]){req(s,'id','source');req(s,'title',`source:${s.id}`);req(s,'role',`source:${s.id}`);if(!allowedRoles.has(s.role))fail(`source role ${s.id}`);if(/palermo\.blackboard\.com/i.test(JSON.stringify(s)))fail(`private Blackboard URL published in ${s.id}`)}
const topicIds=new Set();let topicCount=0,refCount=0;
for(const m of x.modules||[]){req(m,'id','module');req(m,'title',`module:${m.id}`);if(!Array.isArray(m.topics)||!m.topics.length)fail(`module topics ${m.id}`);for(const t of m.topics||[]){topicCount++;['id','title','anchor','summary','explanation','source_refs'].forEach(k=>req(t,k,`topic:${t.id||'?'}`));if(topicIds.has(t.id))fail(`duplicate topic ${t.id}`);topicIds.add(t.id);if(!Array.isArray(t.source_refs)||!t.source_refs.length)fail(`empty refs ${t.id}`);for(const r of t.source_refs||[]){refCount++;if(!sourceIds.has(r))fail(`missing source ref ${r} in ${t.id}`)}for(const a of t.recall_atoms||[]){req(a,'id',`atom:${t.id}`);req(a,'cue',`atom:${a.id}`);req(a,'answer',`atom:${a.id}`);for(const r of a.source_refs||[])if(!sourceIds.has(r))fail(`missing atom source ${r}`)}}}
const allowedPractice=new Set(['mcq','recall','development','case','problem','oral','drawing']);
for(const p of x.practice||[]){req(p,'id','practice');req(p,'type',`practice:${p.id}`);req(p,'prompt',`practice:${p.id}`);if(!allowedPractice.has(p.type))fail(`practice type ${p.type}`);for(const r of p.source_refs||[])if(!sourceIds.has(r))fail(`missing practice source ${r}`);for(const t of p.targets||[])if(!topicIds.has(t))fail(`missing practice target ${t}`)}
for(const theme of x.themes||[]){const keys=Object.keys(theme).filter(k=>k!=='id').sort();if(keys.join(',')!=='background,ink')fail(`theme must contain exactly background+ink: ${theme.id}`);if(!/^#[0-9a-f]{6}$/i.test(theme.background||'')||!/^#[0-9a-f]{6}$/i.test(theme.ink||''))fail(`theme color ${theme.id}`)}
for(const map of x.transversal_maps||[])for(const g of map.groups||[])for(const a of g.atoms||[])for(const r of a.source_refs||[])if(!sourceIds.has(r))fail(`missing transversal source ${r}`);
if(!process.exitCode){ok(`${x.modules.length} modules`);ok(`${topicCount} topics`);ok(`${(x.practice||[]).length} practice items`);ok(`${sourceIds.size} sources`);ok(`${refCount} topic source refs`);console.log('PASS',path)}