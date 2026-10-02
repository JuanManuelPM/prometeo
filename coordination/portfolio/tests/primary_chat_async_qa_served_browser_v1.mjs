import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { primaryChatQaUiBlocks } from '../../../scripts/lib/primary-chat-async-qa-v1.mjs';

const root=path.resolve(process.argv[2] || '.');
const publicBase=String(process.env.PRIMARY_CHAT_PUBLIC_BASE || 'https://juanmanuelpm.github.io/prometeo/current-tree/control-v11/chat-canary').replace(/\/$/,'');
const runKey=String(process.env.GITHUB_RUN_ID || Date.now());
const evidenceDir=path.join(root,'artifacts/primary-chat-async-qa-served-browser');
const evidencePath=path.join(evidenceDir,'evidence.json');
const fixtureRel='current-tree/control-v11/chat-canary/async-qa-browser-fixture-v1.json';
const progressRel='current-tree/control-v11/chat-canary/progress-v1.js';
const indexRel='current-tree/control-v11/chat-canary/index.html';
const fixtureSource=fs.readFileSync(path.join(root,fixtureRel));
const progressSource=fs.readFileSync(path.join(root,progressRel));
const fixture=JSON.parse(fixtureSource.toString('utf8'));
const sha256=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const sha12=buf=>sha256(buf).slice(0,12);
const evidence={
  schema:'prometeo.primary-chat-async-qa-served-browser-evidence/v1',
  overall:'RUNNING',
  synthetic_fixture:true,
  authority:'EVIDENCE_ONLY_NO_PROMOTION_AUTHORITY',
  run_id:process.env.GITHUB_RUN_ID || null,
  head_sha:process.env.GITHUB_SHA || null,
  public_base:publicBase,
  source:{
    fixture_ref:fixtureRel,
    fixture_sha256:sha256(fixtureSource),
    progress_ref:progressRel,
    progress_sha256:sha256(progressSource),
    progress_version:sha12(progressSource),
    index_ref:indexRel
  },
  served:{},
  assertions:{},
  page_errors:[],
  console_errors:[],
  authority_boundary:'Synthetic public fixture and browser evidence do not mutate CURRENT, HUMAN_ACCEPTED, SERVED governance, acceptance or promotion authority.'
};

function writeEvidence(){
  fs.mkdirSync(evidenceDir,{recursive:true});
  fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
}

async function fetchBytes(url){
  const response=await fetch(url,{headers:{'Cache-Control':'no-cache'}});
  if(!response.ok) throw new Error(`HTTP_${response.status}_${url}`);
  return Buffer.from(await response.arrayBuffer());
}

let browser=null;
try {
  assert.equal(fixture.schema,'prometeo.chat-thread-projection/v1');
  assert.equal(fixture.synthetic_fixture,true);
  assert.equal(fixture.authority,'NONE_TEST_ONLY');
  assert.equal(fixture.chat_object_id,'chat-object-prometeo-chat-control-main');
  assert.equal(fixture.messages.length,1);
  const message=fixture.messages[0];
  assert.equal(message.actor_type,'WORKER');
  assert.equal(message.privacy,'PUBLIC_SANITIZED_SYNTHETIC_FIXTURE');
  assert.equal(message.qa_status,'QA_PENDING');
  assert.equal(message.qa?.promotion_signal,'NONE');
  assert.equal(message.qa?.promotion_authority,false);
  assert.equal('raw_payload' in message,false);
  assert.deepEqual(message.ui_blocks,primaryChatQaUiBlocks(message.qa));
  evidence.assertions.fixture_contract=true;

  const cache=`run=${encodeURIComponent(runKey)}&t=${Date.now()}`;
  const servedIndex=await fetchBytes(`${publicBase}/?${cache}`);
  const servedFixture=await fetchBytes(`${publicBase}/async-qa-browser-fixture-v1.json?${cache}`);
  const indexText=servedIndex.toString('utf8');
  const progressMatch=indexText.match(/progress-v1\.js\?v=([a-f0-9]{12})/i);
  assert.ok(progressMatch,'SERVED_INDEX_PROGRESS_VERSION_MISSING');
  const expectedProgressVersion=sha12(progressSource);
  assert.equal(progressMatch[1].toLowerCase(),expectedProgressVersion,'SERVED_INDEX_PROGRESS_VERSION_STALE');
  const servedProgress=await fetchBytes(`${publicBase}/progress-v1.js?v=${expectedProgressVersion}&${cache}`);
  assert.equal(sha256(servedProgress),sha256(progressSource),'SERVED_PROGRESS_BYTES_DIVERGE');
  assert.equal(sha256(servedFixture),sha256(fixtureSource),'SERVED_QA_FIXTURE_BYTES_DIVERGE');
  evidence.served={
    index_http_200:true,
    progress_reference:`progress-v1.js?v=${progressMatch[1]}`,
    progress_sha256:sha256(servedProgress),
    fixture_sha256:sha256(servedFixture),
    fixture_url:`${publicBase}/async-qa-browser-fixture-v1.json`
  };
  evidence.assertions.served_byte_identity=true;

  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  page.on('pageerror',error=>evidence.page_errors.push(String(error?.message || error)));
  page.on('console',msg=>{ if(msg.type()==='error') evidence.console_errors.push(msg.text()); });
  const fixtureBody=servedFixture.toString('utf8');
  await page.route('**/CHAT_THREAD_MIRROR_CANARY_V1.json**',async route=>{
    await route.fulfill({
      status:200,
      contentType:'application/json; charset=utf-8',
      headers:{'Cache-Control':'no-store','X-Prometeo-Fixture':'PUBLIC_SERVED_SYNTHETIC'},
      body:fixtureBody
    });
  });
  await page.goto(`${publicBase}/?qa_browser_fixture=${encodeURIComponent(runKey)}`,{waitUntil:'domcontentloaded',timeout:60000});
  const article=page.locator('article.msg[data-message-id="MSG-QA-BROWSER-FIXTURE-001"]');
  await article.waitFor({state:'visible',timeout:30000});
  const details=article.locator('details.details-block');
  await details.waitFor({state:'visible',timeout:10000});
  const summary=details.locator('summary');
  assert.equal((await summary.textContent())?.trim(),'QA · QA_PENDING');
  await summary.click();
  assert.equal(await details.evaluate(node=>node.open),true);
  const detailsBody=(await details.locator('.details-body').textContent()) || '';
  assert.match(detailsBody,/pending: REPRESENTATIVE_INTERACTION/);
  assert.match(detailsBody,/promotion: NONE/);
  evidence.assertions.rendered_qa_details=true;
  evidence.assertions.details_interaction_opened=true;

  const qaProbe=await page.evaluate(thread=>{
    const api=window.PrometeoChatCanaryProgress?.capacity;
    return api?.explicitQa ? api.explicitQa(thread) : null;
  },fixture);
  assert.equal(qaProbe?.status,'QA_PENDING');
  assert.equal(qaProbe?.version_ref,'fixture-v1');
  evidence.assertions.served_progress_api_observes_qa_pending=true;
  evidence.qa_probe=qaProbe;

  await page.waitForTimeout(500);
  assert.deepEqual(evidence.page_errors,[],'PAGE_ERRORS_PRESENT');
  assert.deepEqual(evidence.console_errors,[],'CONSOLE_ERRORS_PRESENT');
  evidence.assertions.page_errors_empty=true;
  evidence.assertions.console_errors_empty=true;
  evidence.assertions.qa_pending_not_promoted=message.qa?.promotion_signal==='NONE' && message.qa?.promotion_authority===false && qaProbe?.status==='QA_PENDING';
  assert.equal(evidence.assertions.qa_pending_not_promoted,true);

  evidence.overall='PASS';
  writeEvidence();
  console.log(JSON.stringify(evidence,null,2));
} catch(error) {
  evidence.overall='FAIL';
  evidence.error={name:error?.name || 'Error',message:String(error?.message || error)};
  writeEvidence();
  console.error(JSON.stringify(evidence,null,2));
  process.exitCode=1;
} finally {
  if(browser) await browser.close();
}

// wc-trigger: wc-20261002T185156Z-ccd5053fb327 G000002
