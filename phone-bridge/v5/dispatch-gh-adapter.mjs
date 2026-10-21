// OPTIONAL adapter for *existing* Riel Dispatch; not a second job controller.
// Uses the already-authorized gh api client. Never echoes a token or runs shell.
import {spawn} from 'node:child_process';
import {Buffer} from 'node:buffer';
const REPO=/^[\w.-]+\/[\w.-]+$/;
const BRANCH=/^[\w./-]+$/;
const REL=/^(?:[A-Za-z0-9][A-Za-z0-9._-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_BYTES=800_000;
function fail(message){const e=new Error(message);e.code='github_adapter_error';return e}
function pathFor(repo,key){
  if(!REL.test(key)||key.includes('..')||key.startsWith('/')||key.endsWith('/'))throw fail('Invalid repository file path');
  return '/repos/'+repo+'/contents/'+key.split('/').map(encodeURIComponent).join('/');
}
async function gh(args,{input='',runner=spawn}={}){
  if(args.some(a=>typeof a!=='string'))throw fail('Invalid GitHub argument');
  const child=runner('gh',['api',...args],{stdio:['pipe','pipe','pipe'],timeout:22000});
  let stdout='',stderr='',overflow=false;
  for(const name of ['stdout','stderr'])child[name].on('data',buf=>{
    if((stdout.length+stderr.length)+buf.length>2_100_000){overflow=true;child.kill();return;}
    if(name==='stdout')stdout+=buf.toString('utf8'); else stderr+=buf.toString('utf8');
  });
  child.stdin.end(input);
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)});
  if(overflow)throw fail('GitHub response too large');
  if(code!==0){const error=fail(/HTTP 404/.test(stderr)?'GitHub 404':'GitHub operation failed');error.status=/HTTP 404/.test(stderr)?404:503;throw error}
  try{return JSON.parse(stdout)}catch{throw fail('GitHub returned invalid JSON')}
}
export function createDispatchGhAdapter({repo,branch='main',runner=spawn}={}){
  if(!REPO.test(repo||'')||!BRANCH.test(branch)||branch.includes('..'))throw fail('Invalid private repo configuration');
  const request=(args,input='')=>gh(args,{input,runner});
  let privateChecked=false;
  async function authorize(){
    const info=await request(['-X','GET','/repos/'+repo]);
    if(info.private!==true||info.permissions?.push!==true)throw fail('Private repository with write permissions required');
    privateChecked=true;
    return {connected:true,private:true,repo};
  }
  async function get(file){
    const p=pathFor(repo,file);
    try{return await request(['-X','GET',p+'?ref='+encodeURIComponent(branch)])}
    catch(e){if(e.status===404)return null;throw e}
  }
  async function publish(file,body,{publicApproved=false}={}){
    if(publicApproved!==true)throw fail('Explicit local approval required');
    if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>MAX_BYTES)throw fail('File too large');
    await authorize();
    const p=pathFor(repo,file),previous=await get(file);
    const input=JSON.stringify({message:'Prometeo reviewed candidate '+file.split('/').pop(),branch,
      content:Buffer.from(body,'utf8').toString('base64'),...(previous?.sha?{sha:previous.sha}:{})});
    const saved=await request(['-X','PUT',p,'--input','-'],input);
    if(!saved.content?.sha)throw fail('GitHub did not acknowledge file SHA');
    return {repo,file,sha:saved.content.sha,private_verified:privateChecked,stage:'PUBLISHED_PENDING_READBACK'};
  }
  return {authorize,get,publish};
}
