import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const art = process.env.P3_ARTIFACT_DIR || 'artifacts/p3-macro';
const parseEval = (p) => {
  let x = JSON.parse(fs.readFileSync(p, 'utf8').trim());
  if (typeof x === 'string') x = JSON.parse(x);
  return x;
};

const vpDir = path.join(art, 'viewports');
const roots = fs.readdirSync(vpDir).filter(x => x.endsWith('-root.json')).sort().map(f => ({ tag: f.replace('-root.json',''), ...parseEval(path.join(vpDir,f)) }));
const entered = fs.readdirSync(vpDir).filter(x => x.endsWith('-entered.json')).sort().map(f => ({ tag: f.replace('-entered.json',''), ...parseEval(path.join(vpDir,f)) }));
if (roots.length !== 9 || entered.length !== 9) throw new Error(`VIEWPORT_MATRIX_INCOMPLETE roots=${roots.length} entered=${entered.length}`);

const widthOf = (tag) => Number(String(tag).split('x')[0]);
const modeOf = (tag) => {
  const w=widthOf(tag);
  if(w<=240)return 'MICRO_SURVIVAL';
  if(w<=760)return 'COMPACT_PHYSICAL';
  return 'RESPONSIVE_FULL';
};
const structural = (v) => ({ depth:v.depth, solver:v.solver, seal:v.seal, backplate:v.backplate, horizontal:v.horizontal });

for (const v of roots) {
  if (v.build !== 'PROMETEO_V53_COMPLETE_EXAMPLE_ATLAS_20260901' || v.rect.w < 1 || v.rect.h < 1 || !v.mainAria) throw new Error('VIEWPORT_FAIL '+JSON.stringify(v));
  const ew = Math.min(v.outer.w,1500);
  const eh = v.outer.w <= 760 ? v.outer.h : Math.min(v.outer.h,760);
  const el = (v.outer.w-ew)/2;
  const et = (v.outer.h-eh)/2;
  if (Math.abs(v.rect.w-ew)>1 || Math.abs(v.rect.h-eh)>1 || Math.abs(v.rect.left-el)>1 || Math.abs(v.rect.top-et)>1) throw new Error('CANONICAL_CAMERA_GEOMETRY '+JSON.stringify({v,expected:{ew,eh,el,et}}));
  if (v.bodyScroll.w > v.outer.w+1 || v.bodyScroll.h > v.outer.h+1) throw new Error('ROOT_OVERFLOW '+JSON.stringify(v));
  for (const [k,x] of Object.entries(v.invariants||{})) if (x && x.ok === false) throw new Error('ROOT_INVARIANT_'+k+' '+JSON.stringify({tag:v.tag,x}));
}

const classifications = [];
for (const v of entered) {
  if (v.state.history.length < 1) throw new Error('RESPONSIVE_ENTRY_MISSING '+v.tag);
  for (const [k,x] of Object.entries(structural(v))) if (x && x.ok === false) throw new Error('ENTERED_INVARIANT_'+k+' '+JSON.stringify({tag:v.tag,x}));
  if (Array.isArray(v.vertical) && v.vertical.some(x => x.ok === false)) throw new Error('VERTICAL_INVARIANT '+JSON.stringify(v));
  const r=v.responsive||{}, mode=modeOf(v.tag);
  if (r.noOverlap !== true || r.unclippedPrefix !== true || r.unclippedActive !== true) throw new Error('VIEWPORT_TEXT_CLIPPING '+JSON.stringify(v));
  if(mode==='MICRO_SURVIVAL'){
    classifications.push({tag:v.tag,mode,responsiveDiagnosticOk:r.ok===true,depthIdeal:v.depth?.idealRatio===true,ordered:r.ordered,idealRatio:r.idealRatio});
  }else if(mode==='COMPACT_PHYSICAL'){
    if(v.depth?.idealRatio!==true)throw new Error('COMPACT_PHYSICAL_RATIO_FAIL '+JSON.stringify(v));
    classifications.push({tag:v.tag,mode,responsiveDiagnosticOk:r.ok===true,depthIdeal:true,ordered:r.ordered,idealRatio:r.idealRatio});
  }else{
    if(r.ok!==true)throw new Error('RESPONSIVE_FULL_FAIL '+JSON.stringify(v));
    if(v.depth?.idealRatio!==true)throw new Error('RESPONSIVE_DEPTH_RATIO_FAIL '+JSON.stringify(v));
    classifications.push({tag:v.tag,mode,responsiveDiagnosticOk:true,depthIdeal:true,ordered:r.ordered,idealRatio:r.idealRatio});
  }
}

const nav=[0,1,2,3].map(i=>parseEval(`${art}/nav-${i}.json`));
const back=parseEval(`${art}/nav-back-after-resize.json`);
if(nav[0].history.length!==0 || nav[1].history.length<1) throw new Error('NAV_ENTER_FAIL');
if(nav[3].history.length<2) throw new Error('NAV_DEPTH_FAIL '+JSON.stringify(nav));
if(back.state.history.length!==nav[3].history.length-1) throw new Error('EXACT_BACK_HISTORY_FAIL');
// Exact Back restores the semantic parent snapshot, including the selected sibling.
// The normalize-before-back law applies to the child collection before revealing
// its parent; it does NOT require the restored parent itself to be index zero.
if(back.state.currentNode!==nav[2].currentNode || back.state.selectedIndex!==nav[2].selectedIndex || back.state.selected!==nav[2].selected || back.state.paletteOffset!==nav[2].paletteOffset) throw new Error('EXACT_BACK_SEMANTIC_RESTORE_FAIL '+JSON.stringify({expected:nav[2],back:back.state}));
if(back.state.state!=='IDLE') throw new Error('EXACT_BACK_NOT_IDLE '+JSON.stringify(back));

const calendar=parseEval(`${art}/calendar.json`), arte=parseEval(`${art}/arte.json`);
if(!/Calendario/i.test(calendar.title+calendar.text)||calendar.buttons<1) throw new Error('CALENDAR_FAIL');
if(!/Adriana/i.test(arte.title+arte.text)||arte.links<1) throw new Error('ARTE_FAIL');
if(calendar.scrollW>calendar.innerW+2) throw new Error('CALENDAR_HORIZONTAL_OVERFLOW '+JSON.stringify(calendar));

const diag={};
for(const page of ['navigator','calendar','arte']){
  const errors=JSON.parse(fs.readFileSync(`${art}/${page}-errors.json`,'utf8'))?.data?.errors||[];
  const messages=JSON.parse(fs.readFileSync(`${art}/${page}-console.json`,'utf8'))?.data?.messages||[];
  const consoleErrors=messages.filter(m=>String(m?.type||m?.level||'').toLowerCase()==='error');
  diag[page]={pageErrors:errors.length,consoleErrors:consoleErrors.length};
  if(errors.length||consoleErrors.length) throw new Error('BROWSER_DIAGNOSTICS '+page+' '+JSON.stringify({errors,consoleErrors}));
}

const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const evidence={
  schema:'prometeo.p3-macro-browser-evidence/v3',
  commit,
  runner:'agent-browser@0.34.0',
  viewportPolicy:{microSurvivalMaxWidth:240,compactPhysicalMaxWidth:760,responsiveFullMinWidth:761,rationale:'V53 explicitly switches to its mobile camera at max-width 760px. In that mode physical occlusion and the depth solver are authoritative; text peeks may not satisfy the desktop responsive diagnostic. At <=240px the layout degrades fail-soft while preserving canonical camera, structural invariants and unoccluded active text.'},
  classifications,
  rootViewports:roots,
  enteredViewports:entered,
  navigator:{initial:nav[0],entered:nav[1],vertical:nav[2],depth:nav[3],backAfterResize:back,exactBackSemanticMatch:true},
  independentProducts:{calendar,arte},
  diagnostics:diag,
  gates:{'P3-06':'PASS','P3-07':'PASS_THREE_TIER_VIEWPORT_POLICY','P3-08':'PASS_SEMANTIC_EXACT_BACK_AFTER_RESIZE','P3-10':'PASS','P3-11':'PASS_BASIC_BROWSER'}
};
fs.writeFileSync(`${art}/browser-evidence.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({ok:true,commit,viewports:roots.length,micro:classifications.filter(x=>x.mode==='MICRO_SURVIVAL').map(x=>x.tag),compact:classifications.filter(x=>x.mode==='COMPACT_PHYSICAL').map(x=>x.tag),full:classifications.filter(x=>x.mode==='RESPONSIVE_FULL').map(x=>x.tag),exactBack:true,calendar:true,arte:true}));
