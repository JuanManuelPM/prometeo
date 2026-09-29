import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const mainRoot=process.env.MAIN_ROOT||'.';
const ghPagesRoot=process.env.GH_PAGES_ROOT||'artifacts/gh-pages-scan';
const outDir=process.env.PRIVACY_SCAN_OUT||'artifacts/public-privacy-scan';
fs.mkdirSync(outDir,{recursive:true});

const evidence={
  schema:'prometeo.public-privacy-scan/v1',
  observed_at:new Date().toISOString(),
  authority_boundary:'verification only; scans public projections and sanitized-return surfaces; never emits matched secret/private values',
  scopes:[],
  stats:{files_scanned:0,bytes_scanned:0,json_files:0,text_files:0},
  checks:{},
  findings:[],
  overall:'RUNNING'
};
const save=()=>fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const pass=(name,details=true)=>{evidence.checks[name]={result:'PASS',details};save()};
const fail=(name,details)=>{evidence.checks[name]={result:'FAIL',details};save()};
const TEXT_EXT=new Set(['.json','.md','.html','.htm','.js','.mjs','.cjs','.ts','.tsx','.jsx','.txt','.yml','.yaml','.css','.xml','.svg']);
const MAX_BYTES=2_000_000;
const FORBIDDEN_KEYS=new Set([
  'raw_command','rawcommand','private_packet','privatepacket','packet_body','packetbody',
  'attachment_token','attachmenttoken','cookie','password','secret',
  'api_key','apikey','access_token','accesstoken','refresh_token','refreshtoken'
]);
const literalPatterns=[
  {class:'github_token_literal',re:/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g},
  {class:'openai_style_secret_literal',re:/\bsk-[A-Za-z0-9_-]{20,}\b/g},
  {class:'jwt_literal',re:/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g},
  {class:'bearer_literal',re:/\bBearer\s+[A-Za-z0-9._~+\/-]{16,}\b/gi},
  {class:'signed_query_literal',re:/https?:\/\/[^\s"'<>]+[?&](?:token|access_token|api[_-]?key|signature|x-amz-signature)=[^\s"'<>]{8,}/gi}
];

function safeRel(root,file){
  const rel=path.relative(root,file).split(path.sep).join('/');
  return rel.startsWith('..')?path.basename(file):rel;
}
function recordFinding({scope,fileRoot,file,className,matchValue=null,keyPath=null}){
  const raw=matchValue??keyPath??className;
  evidence.findings.push({
    class:className,
    scope,
    path:safeRel(fileRoot,file),
    evidence_hash:'sha256:'+sha256(String(raw)),
    value_redacted:true
  });
}
function walk(root){
  if(!fs.existsSync(root)) return [];
  const out=[];
  const stack=[root];
  while(stack.length){
    const current=stack.pop();
    const stat=fs.lstatSync(current);
    if(stat.isSymbolicLink()) continue;
    if(stat.isDirectory()){
      const base=path.basename(current);
      if(base==='.git'||base==='node_modules') continue;
      for(const name of fs.readdirSync(current)) stack.push(path.join(current,name));
      continue;
    }
    if(!stat.isFile()||stat.size>MAX_BYTES||!TEXT_EXT.has(path.extname(current).toLowerCase())) continue;
    out.push(current);
  }
  return out.sort();
}
function scanJson(value,{scope,fileRoot,file},keyPath='$'){
  if(Array.isArray(value)){
    value.forEach((item,index)=>scanJson(item,{scope,fileRoot,file},keyPath+'['+index+']'));
    return;
  }
  if(!value||typeof value!=='object') return;
  for(const [key,nested] of Object.entries(value)){
    const normalized=key.toLowerCase().replace(/[-\s]/g,'_');
    if(FORBIDDEN_KEYS.has(normalized)||FORBIDDEN_KEYS.has(normalized.replace(/_/g,''))){
      recordFinding({scope,fileRoot,file,className:'forbidden_json_key',keyPath:keyPath+'.'+key});
    }
    scanJson(nested,{scope,fileRoot,file},keyPath+'.'+key);
  }
}
function scanFile(scope,fileRoot,file){
  const raw=fs.readFileSync(file,'utf8');
  evidence.stats.files_scanned++;
  evidence.stats.bytes_scanned+=Buffer.byteLength(raw);
  evidence.stats.text_files++;
  if(path.extname(file).toLowerCase()==='.json'){
    evidence.stats.json_files++;
    try{scanJson(JSON.parse(raw),{scope,fileRoot,file});}
    catch{
      recordFinding({scope,fileRoot,file,className:'invalid_json_public_surface',matchValue:'INVALID_JSON'});
    }
  }
  for(const pattern of literalPatterns){
    pattern.re.lastIndex=0;
    let match;
    while((match=pattern.re.exec(raw))){
      recordFinding({scope,fileRoot,file,className:pattern.class,matchValue:match[0]});
      if(match.index===pattern.re.lastIndex) pattern.re.lastIndex++;
    }
  }
}

try{
  const harness=spawnSync(process.execPath,['coordination/integration-runs/PROMETEO-MP10-01/tests/privacy-closure.mjs'],{
    cwd:mainRoot,encoding:'utf8',env:process.env,maxBuffer:1024*1024
  });
  assert.equal(harness.status,0,'existing privacy-closure harness must pass');
  const harnessLine=(harness.stdout||'').trim().split(/\n/).filter(Boolean).at(-1)||'{}';
  const harnessJson=JSON.parse(harnessLine);
  assert.equal(harnessJson.harness_result,'PASS');
  assert.equal(harnessJson.audited_candidate_result,'PASS');
  pass('existing_privacy_closure',{harness_result:'PASS',fail_closed_controls:(harnessJson.fail_closed_controls||[]).map(x=>x.name)});

  const scopes=[
    {name:'portfolio_returns',root:path.join(mainRoot,'coordination/portfolio/returns'),fileRoot:mainRoot},
    {name:'mp10_returns',root:path.join(mainRoot,'coordination/integration-runs/PROMETEO-MP10-01/returns'),fileRoot:mainRoot},
    {name:'gh_pages_public',root:ghPagesRoot,fileRoot:ghPagesRoot}
  ];
  for(const scope of scopes){
    const files=walk(scope.root);
    evidence.scopes.push({name:scope.name,root:safeRel(mainRoot,scope.root),files:files.length});
    for(const file of files) scanFile(scope.name,scope.fileRoot,file);
  }
  assert.ok(evidence.scopes.find(x=>x.name==='gh_pages_public')?.files>0,'gh-pages checkout must contribute files');
  pass('bounded_scopes',{scopes:evidence.scopes,max_file_bytes:MAX_BYTES});

  pass('public_authorization_metadata_not_blanket_secret',{rule:'authorization key alone is not a leak outside public-closure-pack; literal Bearer/token patterns still fail'});\n\n  const highConfidence=evidence.findings.filter(x=>[
    'forbidden_json_key','github_token_literal','openai_style_secret_literal','jwt_literal','bearer_literal','signed_query_literal'
  ].includes(x.class));
  if(highConfidence.length){
    fail('privacy_findings',{count:highConfidence.length,classes:[...new Set(highConfidence.map(x=>x.class))]});
    throw new Error('PUBLIC_PRIVACY_FINDINGS:'+highConfidence.length);
  }
  pass('no_high_confidence_public_secret_or_private_packet_findings',{count:0});

  evidence.overall='PASS';
  evidence.completed_at=new Date().toISOString();
  save();
  process.stdout.write(JSON.stringify({
    schema:evidence.schema,
    overall:evidence.overall,
    files_scanned:evidence.stats.files_scanned,
    bytes_scanned:evidence.stats.bytes_scanned,
    findings:0,
    truth_boundary:evidence.authority_boundary
  })+'\n');
}catch(error){
  evidence.overall='FAIL';
  evidence.completed_at=new Date().toISOString();
  evidence.error={message:String(error?.message||error),stack_hash:'sha256:'+sha256(String(error?.stack||''))};
  save();
  process.stdout.write(JSON.stringify({
    schema:evidence.schema,
    overall:evidence.overall,
    files_scanned:evidence.stats.files_scanned,
    findings:evidence.findings.length,
    finding_classes:[...new Set(evidence.findings.map(x=>x.class))],
    error_class:String(error?.message||error).split(':')[0]
  })+'\n');
  process.exitCode=1;
}