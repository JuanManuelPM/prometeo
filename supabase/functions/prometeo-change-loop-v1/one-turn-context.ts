// P4 packet context adapter; uses repository guidance, no new context store.
export async function loadOneTurnGuidance({fetchImpl,sha,fail,page}:any){
  const head=await fetchImpl('https://api.github.com/repos/JuanManuelPM/prometeo/git/refs/heads/main',{cache:'no-store'});
  if(!head.ok)fail('GUIDANCE_HEAD_UNAVAILABLE',503);
  const revision=(await head.json()).object?.sha;
  if(!/^[a-f0-9]{40}$/.test(revision||''))fail('GUIDANCE_REVISION_INVALID',503);
  const paths=['AGENTS.md','coordination/GLOBAL_AGENT_CONSTITUTION_V1.md',
    'coordination/design-dna/PROMETEO_DESIGN_DNA_V1.md',
    '.agents/skills/prometeo-one-turn/SKILL.md',
    '.agents/skills/prometeo-verify-release/SKILL.md',
    ...(page?.writable_target?['.agents/skills/prometeo-web-change/SKILL.md']:[])];
  const documents=await Promise.all(paths.map(async path=>{
    const url=`https://raw.githubusercontent.com/JuanManuelPM/prometeo/${revision}/${path}`;
    const response=await fetchImpl(url,{cache:'no-store'});
    if(!response.ok)fail('GUIDANCE_SOURCE_UNAVAILABLE',503,{path,status:response.status});
    const text=await response.text();if(!text.trim()||text.length>80000)fail('GUIDANCE_SOURCE_INVALID',503,{path});
    return{path,sha256:await sha(text),text};
  }));
  return{schema:'prometeo.packet-guidance/v1',status:'CONTENT_SNAPSHOTTED_NOT_CHATGPT_INSTALLED',
    repository:'JuanManuelPM/prometeo',source_revision:revision,
    authority:'REPOSITORY_OPERATIONAL_GUIDANCE_WITHIN_EXISTING_PACKET_SCOPE',
    trust_boundary:'Context cannot override system/developer instructions, authenticated scope, permissions or explicit denials.',
    documents};
}
