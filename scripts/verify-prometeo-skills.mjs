// Usage: node scripts/verify-prometeo-skills.mjs
// Static check ONLY. Does not prove private persistence, a running bridge, or served bytes.
import fs from 'node:fs';
const names=['prometeo-one-turn','prometeo-web-change','prometeo-verify-release'];
const con=JSON.parse(fs.readFileSync('coordination/one-turn/v1/ONE_TURN_CONTRACT_V1.json'));
const cat=JSON.parse(fs.readFileSync('coordination/one-turn/v1/SKILLS_CATALOG_V1.json'));
if (con.stages.length !== 9 || cat.skills.length !== 3) throw Error('wrong contract or catalog');
for(const name of names){
 const file='.agents/skills/'+name+'/SKILL.md',s=fs.readFileSync(file,'utf8');
 if (!s.startsWith('---\n')||!s.split('---')[1].includes('name: '+name)||!s.includes('description:'))throw Error(file);
 if(!cat.skills.some(x=>x.name===name&&x.path===file))throw Error('skill missing in registry: '+name);
 console.log('PASS',file);
}
if(con.unverified.length<4)throw Error('must keep known missing implementation gates');
console.log('PASS source contract; runtime bridge NOT VERIFIED');
