#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BRANCH = 'gh-pages';
const RAW_ROOT = `https://raw.githubusercontent.com/JuanManuelPM/prometeo/${BRANCH}/`;
const SPECS = {
  index: { path: 'pages/study-library/index.html', sha: 'b088b71517f081e641e984bd8378e22e9be3f368' },
  v11: { path: 'pages/study-library/study-v11-experience.js', sha: '787c09e69551a0b889cde141823dc46d87d36eed' },
  v18: { path: 'pages/study-library/study-v18.js', sha: '4cd21828c71aeb87dd957c18977abb9bd440a252' },
  fix5: { path: 'pages/study-library/study-v18-5-fix.js', sha: '26ead844db7e93934fe742ce86a16d60f71beff6' },
  fix6: { path: 'pages/study-library/study-v18-6-fix.js', sha: '1754527feefbda95b59e79a0235d367ce16591a5' },
  css: { path: 'pages/study-library/study-v18.css', sha: 'd06e0df3580c64c86a06e5eb3db2798b255b745b' }
};

function gitBlobSha(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

function parseArgs(argv) {
  const out = { dir: process.env.PROMETEO_STUDY_LIBRARY_DIR || null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dir') out.dir = argv[++i];
    else if (argv[i] === '--help') out.help = true;
    else throw new Error(`UNKNOWN_ARG:${argv[i]}`);
  }
  return out;
}

async function loadOne(spec, dir) {
  try {
    let bytes;
    let source;
    if (dir) {
      const local = path.join(dir, path.basename(spec.path));
      bytes = await readFile(local);
      source = local;
    } else {
      const url = RAW_ROOT + spec.path;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      source = url;
    }
    return { ok: true, bytes, text: bytes.toString('utf8'), source, observed_sha: gitBlobSha(bytes) };
  } catch (error) {
    return { ok: false, error: error?.message || String(error), source: dir ? dir : RAW_ROOT + spec.path };
  }
}

function containsAll(text, fragments) {
  return fragments.every(fragment => text.includes(fragment));
}

function jsParses(text) {
  try { new Function(text); return true; }
  catch { return false; }
}

function evaluate(bundle) {
  return [
    {
      id: 'candidate_wiring',
      ok: containsAll(bundle.index.text, [
        './study-v18.css?v=182',
        './study-v18.js?v=184',
        './study-v18-5-fix.js?v=185',
        './study-v18-6-fix.js?v=186'
      ])
    },
    {
      id: 'year_vertical_position',
      ok: containsAll(bundle.fix6.text, [
        "closest?.('[data-v18-year]')",
        'const y=window.scrollY',
        "window.scrollTo({top:y,left:window.scrollX,behavior:'auto'})",
        'requestAnimationFrame(()=>window.scrollTo'
      ])
    },
    {
      id: 'shelf_horizontal_start',
      ok: containsAll(bundle.fix5.text, [
        "querySelectorAll('.v18Shelf')",
        'shelf.scrollLeft=0',
        'requestAnimationFrame(()=>{reset();requestAnimationFrame(reset)})',
        'setTimeout(reset,80)'
      ])
    },
    {
      id: 'drag_click_separation',
      ok: containsAll(bundle.v18.text, [
        'Math.hypot(e.clientX-sx,e.clientY-sy)>7',
        'suppressUntil=Date.now()+350',
        'e.preventDefault();e.stopPropagation()'
      ])
    },
    {
      id: 'enter_space_activation',
      ok: containsAll(bundle.v18.text, [
        "e.key==='Enter'||e.key===' '",
        'e.preventDefault();open()'
      ])
    },
    {
      id: 'course_deeplink_popstate',
      ok: containsAll(bundle.v18.text, [
        "qs.get('course')",
        "u.searchParams.set('course',id)",
        "history.pushState({v18:'course',course:id}",
        "window.addEventListener('popstate'"
      ])
    },
    {
      id: 'javascript_parse',
      ok: jsParses(bundle.v11.text) && jsParses(bundle.v18.text) &&
          jsParses(bundle.fix5.text) && jsParses(bundle.fix6.text)
    },
    {
      id: 'login_capability_honesty',
      ok: containsAll(bundle.v18.text, [
        'data-v18-login disabled',
        'Inicio de sesión no configurado',
        'No hay un proveedor de autenticación configurado para esta vista'
      ]) && !bundle.v18.text.includes('Inicio de sesión · próximamente')
    },
    {
      id: 'native_schedule_legacy_bridge',
      ok: containsAll(bundle.v11.text, [
        'window.PrometeoStudyCalendarV11',
        'async courseSchedule(courseId,title)',
        'events:scheduleMatch11(courseId,title)'
      ]) && containsAll(bundle.v18.text, [
        'scheduleState=new Map()',
        'function schedulePanel(row)',
        "if(activeTab==='schedule')return schedulePanel(row)",
        'window.__STUDY_ENSURE_LEGACY',
        'window.PrometeoStudyCalendarV11',
        "if(activeTab==='schedule')loadSchedule(row)",
        'Versión anterior'
      ]) && !bundle.v18.text.includes('Acá se va a conectar el cronograma real')
    },
    {
      id: 'theme_persistence',
      ok: containsAll(bundle.index.text, ["localStorage.getItem('study:v18:theme')||'mono'"]) &&
          containsAll(bundle.v18.text, ["localStorage.setItem('study:v18:theme',t)"])
    },
    {
      id: 'responsive_620',
      ok: containsAll(bundle.css.text, [
        '@media(max-width:620px)',
        '.v18ResourceList{grid-template-columns:1fr}',
        '.v18Semester{grid-template-columns:46px minmax(0,1fr)'
      ])
    },
    {
      id: 'responsive_300',
      ok: containsAll(bundle.css.text, [
        '@media(max-width:300px)',
        '.v18Brand img{width:70px;height:70px}',
        '.v18Semester{grid-template-columns:40px minmax(0,1fr)}'
      ])
    }
  ];
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (error) {
    console.error(JSON.stringify({ status: 'HOST_BOUNDARY', reason: error.message }));
    process.exit(2);
  }

  if (args.help) {
    console.log('Usage: node scripts/check-facultad-v18-regression.mjs [--dir <pages/study-library>]');
    return;
  }

  const bundle = {};
  const sources = [];
  for (const [key, spec] of Object.entries(SPECS)) {
    const loaded = await loadOne(spec, args.dir);
    if (!loaded.ok) {
      console.error(JSON.stringify({
        schema: 'prometeo.facultad-v18-regression/v1',
        status: 'HOST_BOUNDARY',
        file: spec.path,
        source: loaded.source,
        error: loaded.error
      }, null, 2));
      process.exit(2);
    }
    bundle[key] = loaded;
    sources.push({ path: spec.path, expected_sha: spec.sha, observed_sha: loaded.observed_sha, source: loaded.source });
  }

  const shaFailures = sources.filter(item => item.expected_sha !== item.observed_sha);
  if (shaFailures.length) {
    console.error(JSON.stringify({
      schema: 'prometeo.facultad-v18-regression/v1',
      status: 'PRODUCT_REGRESSION',
      reason: 'PINNED_BYTES_DRIFT',
      sources,
      failures: shaFailures
    }, null, 2));
    process.exit(1);
  }

  const checks = evaluate(bundle);
  const failures = checks.filter(check => !check.ok);
  const result = {
    schema: 'prometeo.facultad-v18-regression/v1',
    status: failures.length ? 'PRODUCT_REGRESSION' : 'PASS',
    branch: BRANCH,
    sources,
    checks,
    authority: 'CANDIDATE_VERIFICATION_ONLY_NO_PROMOTION'
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(failures.length ? 1 : 0);
}

await main();
