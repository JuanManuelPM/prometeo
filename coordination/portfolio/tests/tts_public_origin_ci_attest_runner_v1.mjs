import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const candidateUrl=process.env.TTS_CANDIDATE_URL||'https://juanmanuelpm.github.io/prometeo/__canary/portfolio-tts-generic-text-surface-v1/';
const healthUrl=process.env.TTS_HEALTH_URL||'https://catnohyouxqjjtseaueb.supabase.co/functions/v1/audio-lab-page-audio-v1';
const outDir=process.env.TTS_ATTEST_OUT||'artifacts/tts-public-origin-ci-attest';
fs.mkdirSync(outDir,{recursive:true});

const evidence={
  schema:'prometeo.tts-public-origin-ci-attestation/v1',
  observed_at:new Date().toISOString(),
  candidate_url:candidateUrl,
  health_url:healthUrl,
  authority_boundary:'read-only technical attestation; no generation POST; no Current/Human Accepted/Served/Catalog promotion',
  requests:[],
  checks:{},
  overall:'RUNNING'
};
const save=()=>fs.writeFileSync(path.join(outDir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const pass=(name,details=true)=>{evidence.checks[name]={result:'PASS',details};save()};
const fail=(name,details)=>{evidence.checks[name]={result:'FAIL',details};save()};

async function readOnlyFetch(url,options={}){
  const method=String(options.method||'GET').toUpperCase();
  if(method!=='GET'&&method!=='HEAD') throw new Error('READ_ONLY_GUARD_BLOCKED_METHOD:'+method);
  const started=Date.now();
  const response=await fetch(url,{...options,method,redirect:'follow',cache:'no-store'});
  evidence.requests.push({
    method,
    requested_url:url,
    final_url:response.url,
    status:response.status,
    elapsed_ms:Date.now()-started
  });
  save();
  return response;
}

await assert.rejects(
  ()=>readOnlyFetch('https://example.invalid',{method:'POST'}),
  /READ_ONLY_GUARD_BLOCKED_METHOD:POST/
);
pass('mutating_method_guard',{blocked_method:'POST',network_request_emitted:false});

try{
  const candidateResponse=await readOnlyFetch(candidateUrl);
  const html=await candidateResponse.text();
  const candidate={
    status:candidateResponse.status,
    ok:candidateResponse.ok,
    final_url:candidateResponse.url,
    bytes:Buffer.byteLength(html),
    sha256:sha256(html),
    content_type:candidateResponse.headers.get('content-type'),
    marker:html.includes('candidate · no current'),
    backend_reference:html.includes('audio-lab-page-audio-v1'),
    max_constant:/\bconst\s+MAX\s*=\s*1800\s*;/.test(html),
    textarea_maxlength:/<textarea\b[^>]*\bmaxlength=["']1800["']/i.test(html)
  };
  evidence.candidate=candidate;
  assert.equal(candidate.status,200,'public candidate must return HTTP 200');
  assert.equal(candidate.marker,true,'served HTML must contain candidate marker');
  assert.equal(candidate.backend_reference,true,'served HTML must reference audio-lab-page-audio-v1');
  assert.equal(candidate.max_constant,true,'served HTML must preserve MAX=1800');
  assert.equal(candidate.textarea_maxlength,true,'served HTML must preserve textarea maxlength=1800');
  pass('public_candidate_served',candidate);

  const healthResponse=await readOnlyFetch(healthUrl);
  const healthText=await healthResponse.text();
  let healthJson=null;
  try{healthJson=JSON.parse(healthText)}catch{}
  const health={
    status:healthResponse.status,
    ok:healthResponse.ok,
    final_url:healthResponse.url,
    bytes:Buffer.byteLength(healthText),
    sha256:sha256(healthText),
    content_type:healthResponse.headers.get('content-type'),
    body_preview:healthText.slice(0,1600),
    json:healthJson
  };
  evidence.health=health;
  assert.equal(health.status,200,'read-only health GET must return HTTP 200');
  assert.ok(healthJson&&typeof healthJson==='object','health body must be JSON');
  assert.equal(healthJson.ok,true,'health JSON must report ok=true');
  assert.equal(healthJson.maxChars,1800,'health JSON must report maxChars=1800');
  assert.equal(healthJson.service,'audio lab page','health JSON service must match recovered backend');
  pass('read_only_health',health);

  assert.ok(evidence.requests.length>=2,'attestation must record public candidate and health requests');
  assert.ok(evidence.requests.every(request=>request.method==='GET'||request.method==='HEAD'),'all emitted network requests must be read-only');
  assert.equal(evidence.requests.some(request=>request.method==='POST'),false,'no generation POST may be emitted');
  pass('request_log_read_only',{count:evidence.requests.length,methods:[...new Set(evidence.requests.map(request=>request.method))]});

  evidence.overall='PASS';
  evidence.completed_at=new Date().toISOString();
  save();
  console.log('tts_public_origin_ci_attest_runner_v1: PASS');
}catch(error){
  evidence.overall='FAIL';
  evidence.completed_at=new Date().toISOString();
  evidence.error={message:String(error?.message||error),stack:String(error?.stack||'')};
  fail('terminal',evidence.error);
  save();
  console.error(error);
  process.exitCode=1;
}
