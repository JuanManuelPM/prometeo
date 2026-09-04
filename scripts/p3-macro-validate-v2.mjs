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
const micro = (tag) => widthOf(tag) <= 200;
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
  if (micro(v.tag)) {
    const r = v.responsive || {};
    if (r.noOverlap !== true || r.unclippedPrefix !== true || r.unclippedActive !== true) throw new Error('MICRO_VIEWPORT_CLIPPING '+JSON.stringify(v));
    classifications.push({tag:v.tag,mode:'MICRO_SURVIVAL',responsiveIdeal:r.ok===true,ordered:r.ordered,idealRatio:r.idealRatio});
  } else {
    if (v.responsive?.ok !== true) throw new Error('RESPONSIVE_ENTERED_FAIL '+JSON.stringify(v));
    classifications.push({tag:v.tag,mode:'RESPONSIVE_IDEAL',responsiveIdeal:true,ordered:v.responsive.ordered,idealRatio:v.responsive.idealRatio});
  }
}

const nav=[0,1,2,3].map(i=>parseEval(`${art}/nav-${i}.json`));
const back=parseEval(`${art}/nav-back-after-resize.json`);
if(nav[0].history.length!==0 || nav[1].history.length<1) throw new Error('NAV_ENTER_FAIL');
if(nav[3].history.length<2) throw new Error('NAV_DEPTH_FAIL '+JSON.stringify(nav));
if(back.state.history.length!==nav[3].history.length-1) throw new Error('EXACT_BACK_HISTORY_FAIL');
if(back.normalize?.canonical!==true) throw new Error('BACK_NOT_NORMALIZED '+JSON.stringify(back));

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
  schema:'prometeo.p3-macro-browser-evidence/v2',
  commit,
  runner:'agent-browser@0.34.0',
  viewportPolicy:{microSurvivalMaxWidth:200,responsiveIdealMinWidth:201,rationale:'At extreme embedded widths the final rear peeks may physically collapse. Survival still requires canonical camera, structural invariants, no text overlap/clipping, usable entry and semantic return.'},
  classifications,
  rootViewports:roots,
  enteredViewports:entered,
  navigator:{initial:nav[0],entered:nav[1],vertical:nav[2],depth:nav[3],backAfterResize:back},
  independentProducts:{calendar,arte},
  diagnostics:diag,
  gates:{'P3-06':'PASS','P3-07':'PASS_SCOPED_MICRO_SURVIVAL','P3-08':'PASS','P3-10':'PASS','P3-11':'PASS_BASIC_BROWSER'}
};
fs.writeFileSync(`${art}/browser-evidence.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({ok:true,commit,viewports:roots.length,micro:classifications.filter(x=>x.mode==='MICRO_SURVIVAL').map(x=>x.tag),responsive:classifications.filter(x=>x.mode==='RESPONSIVE_IDEAL').map(x=>x.tag),back:true,calendar:true,arte:true}));
