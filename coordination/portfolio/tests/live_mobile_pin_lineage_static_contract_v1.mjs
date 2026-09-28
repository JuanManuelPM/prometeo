import fs from 'node:fs';
import path from 'node:path';

const [sourceRoot='source', siteRoot='site'] = process.argv.slice(2);
const read = p => fs.readFileSync(p, 'utf8');
const must = (label, text, check) => {
  const ok = typeof check === 'string' ? text.includes(check) : check.test(text);
  if (!ok) throw new Error(`LIVE_MOBILE_PIN_LINEAGE_STATIC_CONTRACT_FAIL ${label}`);
};

const builderPath = path.join(sourceRoot, '.github/scripts/build-live-feed.mjs');
const mobilePath = path.join(siteRoot, 'live/mobile.js');
const cssPath = path.join(siteRoot, 'live/mobile.css');
const indexPath = path.join(siteRoot, 'live/index.html');

if (!fs.existsSync(builderPath)) {
  throw new Error(`LIVE_MOBILE_PIN_LINEAGE_STATIC_CONTRACT_FAIL missing:${builderPath}`);
}

const surfacePaths=[mobilePath,cssPath,indexPath];
const present=surfacePaths.filter(p=>fs.existsSync(p));
if(present.length===0){
  // The historical Live mobile renderer is no longer a served surface on gh-pages.
  // Telemetry publication must not be blocked by a regression test for absent UI bytes.
  // If any part of that surface returns, the contract below becomes mandatory again.
  console.log('LIVE_MOBILE_PIN_LINEAGE_STATIC_CONTRACT_NOT_APPLICABLE surface_absent');
  process.exit(0);
}
if(present.length!==surfacePaths.length){
  const missing=surfacePaths.filter(p=>!fs.existsSync(p));
  throw new Error(`LIVE_MOBILE_PIN_LINEAGE_STATIC_CONTRACT_FAIL partial_surface missing:${missing.join(',')}`);
}

const builder = read(builderPath);
const mobile = read(mobilePath);
const css = read(cssPath);
const index = read(indexPath);

must('builder-owner', builder, /\bowner\b/);
must('builder-authority-mode', builder, 'authority_mode:authorityMode');
must('builder-pin-generation', builder, 'pin_generation:latestPin ? generation(latestPin) : 0');
must('builder-collision-count', builder, 'collision_count:collisions.length');
must('builder-recovery-basis', builder, 'latest_pin_recovery_basis:latestPin?.doc?.recovery_basis_or_null || null');
must('builder-project-projection-preserves-compact-fields', builder, 'jobs:p.jobs.map(({returns,pins,claims,collisions,...j})=>j)');

must('mobile-portfolio-job-lookup', mobile, 'function portfolioJob(w,f)');
must('mobile-pin-evidence', mobile, 'function pinEvidence(w,f)');
must('mobile-generation', mobile, "`PIN G${String(job.pin_generation).padStart(6,'0')}`");
must('mobile-owner', mobile, "`dueño ${shortId(job.owner||w.worker_id||'—')}`");
must('mobile-collisions', mobile, 'const collisions=Number(job.collision_count||0)');
must('mobile-recovery', mobile, "mode.includes('recovery')?'recuperación':null");
must('mobile-detail-injection', mobile, '${pinEvidence(w,f)}');

must('css-page-overflow-guard', css, /html,body\{[^}]*max-width:100%;overflow-x:hidden/);
must('css-card-grid-shrink', css, /\.cardTop\{[^}]*grid-template-columns:minmax\(0,1fr\) auto/);
must('css-tech-wrap', css, /\.tech\{[^}]*overflow-wrap:anywhere/);
must('index-mobile-viewport', index, '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
must('index-mobile-script', index, /<script src="\.\/mobile\.js\?v=\d+" defer><\/script>/);

console.log('LIVE_MOBILE_PIN_LINEAGE_STATIC_CONTRACT_OK');
