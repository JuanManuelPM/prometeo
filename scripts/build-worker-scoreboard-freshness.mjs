#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const scoreboardPath=process.argv[2];
const outPath=process.argv[3];
const sourceSha=String(process.argv[4]||process.env.PROMETEO_SOURCE_SHA||process.env.GITHUB_SHA||'').trim().toLowerCase();
const sourceRef=String(process.argv[5]||process.env.PROMETEO_SOURCE_REF||process.env.GITHUB_REF||'').trim()||null;

if(!scoreboardPath||!outPath) throw new Error('usage: build-worker-scoreboard-freshness.mjs <scoreboard.json> <freshness.json> <source_sha> [source_ref]');
if(!/^[0-9a-f]{40}$/.test(sourceSha)) throw new Error('source_sha must be exactly 40 lowercase/uppercase hexadecimal characters');

const scoreboard=JSON.parse(fs.readFileSync(scoreboardPath,'utf8'));
const generatedAt=String(scoreboard?.generated_at||'').trim();
if(!generatedAt||!Number.isFinite(Date.parse(generatedAt))) throw new Error('scoreboard.generated_at must be a valid timestamp');
if(scoreboard?.schema!=='prometeo.worker-scoreboard/v1') throw new Error(`unexpected scoreboard schema: ${scoreboard?.schema||'MISSING'}`);

const contract={
  schema:'prometeo.worker-scoreboard-generation-freshness/v1',
  status:'SOURCE_BOUND',
  scoreboard_schema:scoreboard.schema,
  scoreboard_generated_at:generatedAt,
  source_sha:sourceSha,
  source_ref:sourceRef,
  producer:'scripts/build-worker-scoreboard.mjs',
  truth_boundary:'This sidecar proves which source revision produced the scoreboard generation. It does not prove liveness, freshness-at-read-time, or authority.'
};

fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(contract,null,2)+'\n');
console.log(JSON.stringify({ok:true,out:outPath,source_sha:sourceSha,scoreboard_generated_at:generatedAt}));
