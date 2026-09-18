import fs from 'node:fs';
import path from 'node:path';

const [sourceRoot='source', siteRoot='site'] = process.argv.slice(2);
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const fail = msg => { throw new Error('CNY001_REGISTRY_HANDOFF_STATIC_GATE_FAIL '+msg); };
const must = (cond,msg) => { if (!cond) fail(msg); };

const registryPath=path.join(sourceRoot,'coordination/live/PAGE_WATCH_REGISTRY_V1.json');
const siteRegistryPath=path.join(siteRoot,'live/pages.json');
const platePath=path.join(sourceRoot,'coordination/pages/plates/CNY001.json');
const contextPath=path.join(sourceRoot,'coordination/pages/contexts/CNY001.json');
const publicationPath=path.join(sourceRoot,'coordination/pages/publications/CNY001/20260918T011200Z.json');

for (const p of [registryPath,siteRegistryPath,platePath,contextPath,publicationPath]) {
  must(fs.existsSync(p),'missing '+p);
}

const registry=readJson(registryPath);
const siteRegistry=readJson(siteRegistryPath);
const plate=readJson(platePath);
const context=readJson(contextPath);
const publication=readJson(publicationPath);

const expectedUrl='https://juanmanuelpm.github.io/prometeo/pages/canary/CNY001/';
must(plate.plate==='CNY001','plate identity');
must(plate.page_id==='publication-roundtrip-canary','plate page_id');
must(context.plate==='CNY001' && context.page_id===plate.page_id,'context identity');
must(context.current_state?.public_url===expectedUrl,'context public_url');
must(publication.plate==='CNY001' && publication.page_id===plate.page_id,'publication identity');
must(publication.public_url===expectedUrl,'publication public_url');
must(context.current_state?.publication_commit===publication.output_revision,'publication revision mismatch');
must(context.current_state?.current===false,'canary must not claim Current');
must(context.current_state?.human_accepted===false,'canary must not claim Human Accepted');

const sourceEntry=(registry.pages||[]).find(p=>p.plate==='CNY001')||null;
const siteEntry=(siteRegistry.pages||[]).find(p=>p.plate==='CNY001')||null;
const reachability=String(context.current_state?.public_reachability||'').toUpperCase();
const reachabilityVerified=reachability.startsWith('VERIFIED');

if (!sourceEntry) {
  must(context.current_state?.page_watch_registered===false,'registry absent but context says registered');
  must(publication.registry_registered===false,'registry absent but publication says registered');
  must(!reachabilityVerified,'withheld mode cannot claim verified reachability');
  must(!siteEntry,'CNY001 leaked into gh-pages Live projection before canonical registration');
  console.log('CNY001_REGISTRY_HANDOFF_STATIC_GATE_OK mode=WITHHELD');
} else {
  must(reachabilityVerified,'canonical registration requires explicitly VERIFIED public reachability');
  must(context.current_state?.page_watch_registered===true,'canonical registration requires context page_watch_registered=true');
  must(sourceEntry.id===plate.page_id,'registry page_id');
  must(sourceEntry.url===expectedUrl,'registry public_url');
  must(sourceEntry.context_path==='coordination/pages/contexts/CNY001.json','registry context_path');
  must(sourceEntry.revision===context.current_state?.publication_commit,'registry revision must equal verified publication revision');
  must(String(sourceEntry.status||'').toLowerCase()!=='current','canary registry entry must not claim Current');
  console.log('CNY001_REGISTRY_HANDOFF_STATIC_GATE_OK mode=REGISTERED_VERIFIED');
}
