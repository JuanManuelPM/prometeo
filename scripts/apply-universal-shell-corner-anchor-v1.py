from pathlib import Path
import base64, gzip, hashlib, re, json

ROOT = Path('.')
CHUNK_DIR = ROOT / 'shared/universal-shell/v5'
INDEX = ROOT / 'index.html'
README = CHUNK_DIR / 'README.md'
PUBLISH = ROOT / '.github/workflows/publish-universal-shell-v5.yml'
MARKER = 'prometeo.universal-control.corner.v1'


def load_html():
    b64 = ''.join((CHUNK_DIR / f'chunk-{i}.b64').read_text().strip() for i in range(1, 6))
    return gzip.decompress(base64.b64decode(b64)).decode('utf-8')


def req_replace(s, old, new, label):
    if old not in s:
        raise SystemExit(f'missing patch anchor: {label}')
    return s.replace(old, new, 1)


def patch_html(s):
    if MARKER in s:
        return s

    s = req_replace(
        s,
        ':root{--surface:#ffffff;--face:#151A20;--text:#151A20;--on:#ffffff;--safeB:env(safe-area-inset-bottom,0px)}',
        ':root{--surface:#ffffff;--face:#151A20;--text:#151A20;--on:#ffffff;--safeT:env(safe-area-inset-top,0px);--safeR:env(safe-area-inset-right,0px);--safeB:env(safe-area-inset-bottom,0px);--safeL:env(safe-area-inset-left,0px)}',
        'safe areas'
    )
    s = s.replace('@media(max-width:420px){.selector{--cx:calc(100vw - 52px);--cy:calc(100dvh - 58px - var(--safeB))}', '@media(max-width:420px){', 1)
    s = req_replace(s, '.puck{position:absolute;left:0;top:0;width:64px;height:64px;', '.puck{position:absolute;left:0;top:0;width:64px;height:64px;touch-action:none;', 'puck touch action')
    s = req_replace(s, '\n#pageHost{', '\n/* Corner Anchor v1: closed puck drags freely, release snaps exactly once. */\n.selector.corner-dragging .puck{cursor:grabbing;box-shadow:0 13px 22px rgba(0,0,0,.24),0 4px 8px rgba(0,0,0,.11),inset 0 1px 0 rgba(255,255,255,.055),inset 0 -1px 0 rgba(0,0,0,.14)}\n.selector.corner-snapping .puck{pointer-events:none}\n.safe-probe{position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}\n\n#pageHost{', 'corner css')
    s = req_replace(s, '<div id="blankLayer" aria-hidden="true"></div>', '<div id="blankLayer" aria-hidden="true"></div>\n<div class="safe-probe" id="safeProbe" aria-hidden="true"></div>', 'safe probe')
    s = req_replace(
        s,
        "const labelRing=$('#labelRing'),labelTextPath=$('#labelTextPath'),labelCount=$('#labelCount'),neutral=$('#neutral'),meta=$('#meta');",
        "const labelRing=$('#labelRing'),labelTextPath=$('#labelTextPath'),labelCount=$('#labelCount'),neutral=$('#neutral'),meta=$('#meta'),safeProbe=$('#safeProbe');\nconst intentEnter=selector.querySelector('.intent-arrow.enter'),intentBack=selector.querySelector('.intent-arrow.back');",
        'dom refs'
    )
    s = req_replace(
        s,
        "const state={stack:[ROOT],index:0,drag:null,armed:null,open:false};\nconst visual={flow:0,targetFlow:0,energy:0,targetEnergy:0,rot:0,targetRot:0};",
        "const CORNER_KEY='prometeo.universal-control.corner.v1';\nconst CORNERS=['top-left','top-right','bottom-left','bottom-right'];\nlet controlCorner=loadControlCorner();\nconst OR={mx:1,my:1};\nlet closedPuckDrag=null,suppressClosedClickUntil=0,cornerSnapAnimation=null;\nconst state={stack:[ROOT],index:0,drag:null,armed:null,open:false};\nconst visual={flow:0,targetFlow:0,energy:0,targetEnergy:0,rot:0,targetRot:0};",
        'corner state'
    )
    s = req_replace(
        s,
        "function arcPoint(t){t=clamp(t,0,1);const a=A0+(A1-A0)*t;return {x:Math.cos(a)*R,y:Math.sin(a)*R,a}}",
        "function arcPoint(t){t=clamp(t,0,1);const a=A0+(A1-A0)*t;return {x:Math.cos(a)*R*OR.mx,y:Math.sin(a)*R*OR.my,a}}",
        'arc orientation'
    )
    tangent = "function tangentAngle(t,forward=true){const a=A0+(A1-A0)*t;let deg=(a+Math.PI/2)*180/Math.PI;if(!forward)deg+=180;return deg}"
    machinery = r'''function tangentAngle(t,forward=true){
  const a=A0+(A1-A0)*clamp(t,0,1),dx=-Math.sin(a)*OR.mx,dy=Math.cos(a)*OR.my;
  let deg=Math.atan2(dy,dx)*180/Math.PI;if(!forward)deg+=180;return deg
}
function loadControlCorner(){try{const v=localStorage.getItem(CORNER_KEY);return CORNERS.includes(v)?v:'bottom-right'}catch{return'bottom-right'}}
function saveControlCorner(){try{localStorage.setItem(CORNER_KEY,controlCorner)}catch{}}
function orientationForCorner(c){return{mx:c.includes('left')?-1:1,my:c.includes('top')?-1:1}}
function safeInsets(){const cs=getComputedStyle(safeProbe);return{top:parseFloat(cs.paddingTop)||0,right:parseFloat(cs.paddingRight)||0,bottom:parseFloat(cs.paddingBottom)||0,left:parseFloat(cs.paddingLeft)||0}}
function viewportBox(){const vv=window.visualViewport;return{w:vv?.width||innerWidth,h:vv?.height||innerHeight,ox:vv?.offsetLeft||0,oy:vv?.offsetTop||0}}
function cornerAnchor(c){const v=viewportBox(),si=safeInsets(),small=v.w<=420,gx=small?52:58,gy=small?58:62;return{x:v.ox+(c.includes('left')?si.left+gx:v.w-si.right-gx),y:v.oy+(c.includes('top')?si.top+gy:v.h-si.bottom-gy)}}
function setSelectorAnchor(x,y){selector.style.setProperty('--cx',x.toFixed(2)+'px');selector.style.setProperty('--cy',y.toFixed(2)+'px')}
function mirrorSvgPoint(x,y){return{x:132+(x-132)*OR.mx,y:132+(y-132)*OR.my}}
function mirroredArcD(x1,y1,r,x2,y2,keepTextUpright=false){let a=mirrorSvgPoint(x1,y1),b=mirrorSvgPoint(x2,y2),sweep=OR.mx*OR.my>0?1:0;if(keepTextUpright&&a.x>b.x){const q=a;a=b;b=q;sweep=1-sweep}return`M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 0 ${sweep} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`}
function syncCornerGeometry(){
  const railD=mirroredArcD(18.53,107.88,116,107.88,18.53,false);orbit.querySelectorAll('.rail-shadow,.rail-bed,.rail-edge,.rail-line').forEach(p=>p.setAttribute('d',railD));
  const textD=mirroredArcD(43.22,138.21,89,153.53,45.64,true),guideD=mirroredArcD(51.20,137.65,81,151.60,53.41,false);
  orbit.querySelector('#labelTextArcPath')?.setAttribute('d',textD);orbit.querySelector('#labelGuideArcPath')?.setAttribute('d',guideD);labelRing.querySelectorAll('.label-band-shadow,.label-band,.label-guide').forEach(p=>p.setAttribute('d',guideD));
  const count=mirrorSvgPoint(132,178);labelCount.setAttribute('x',count.x.toFixed(2));labelCount.setAttribute('y',count.y.toFixed(2));
  const tr=`translate(-50%,-50%) scale(${OR.mx},${OR.my})`;intentEnter.style.setProperty('--corner-icon-transform',tr);intentBack.style.setProperty('--corner-icon-transform',tr);layout();
}
function applyControlCorner(c,{animate=false,from=null,vibrate=false}={}){if(!CORNERS.includes(c))c='bottom-right';const old=from||cornerAnchor(controlCorner),o=orientationForCorner(c);controlCorner=c;OR.mx=o.mx;OR.my=o.my;saveControlCorner();const dest=cornerAnchor(c);setSelectorAnchor(dest.x,dest.y);syncCornerGeometry();if(cornerSnapAnimation){try{cornerSnapAnimation.cancel()}catch{}cornerSnapAnimation=null}if(animate&&from){selector.classList.add('corner-snapping');const dx=old.x-dest.x,dy=old.y-dest.y;cornerSnapAnimation=orbit.animate([{transform:`translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px)`},{transform:'translate(0px,0px)'}],{duration:210,easing:'cubic-bezier(.18,.82,.22,1)'});cornerSnapAnimation.onfinish=()=>{selector.classList.remove('corner-snapping');cornerSnapAnimation=null;if(vibrate)navigator.vibrate?.(6)};cornerSnapAnimation.oncancel=()=>selector.classList.remove('corner-snapping')}else if(vibrate)navigator.vibrate?.(6)}
function nearestCorner(x,y){let best='bottom-right',bd=Infinity;for(const c of CORNERS){const a=cornerAnchor(c),d=(x-a.x)**2+(y-a.y)**2;if(d<bd){bd=d;best=c}}return best}
function clampClosedPoint(x,y){const v=viewportBox(),si=safeInsets(),r=34;return{x:clamp(x,v.ox+si.left+r,v.ox+v.w-si.right-r),y:clamp(y,v.oy+si.top+r,v.oy+v.h-si.bottom-r)}}
function localVector(dx,dy){return{x:dx*OR.mx,y:dy*OR.my}}'''
    s = req_replace(s, tangent, machinery, 'tangent + corner machinery')

    s = s.replace('transform:translate(-50%,-50%) scale(.55);', 'transform:var(--corner-icon-transform,translate(-50%,-50%)) scale(.55);', 1)
    armed = '.selector.armed-enter .intent-arrow.enter,.selector.armed-back .intent-arrow.back{opacity:.92;transform:translate(-50%,-50%) scale(1)}'
    s = req_replace(s, armed, '.selector.armed-enter .intent-arrow.enter,.selector.armed-back .intent-arrow.back{opacity:.92;transform:var(--corner-icon-transform,translate(-50%,-50%)) scale(1)}', 'intent arrows')

    s = req_replace(s, "function openSelector(){\n  if(state.open) return;\n  stage.style.pointerEvents='auto';", "function openSelector(){\n  if(state.open) return;\n  applyControlCorner(controlCorner);\n  stage.style.pointerEvents='auto';", 'open anchor')
    s = req_replace(s, "  state.open=false;\n  state.drag=null;", "  state.open=false;\n  state.drag=null;\n  applyControlCorner(controlCorner);", 'close anchor')

    closed = r'''/* Closed-control repositioning. Tap opens; >8px drag owns the pointer and snaps to one semantic corner. */
puck.addEventListener('pointerdown',e=>{if(state.open||e.button!==0)return;const a=cornerAnchor(controlCorner);closedPuckDrag={id:e.pointerId,sx:e.clientX,sy:e.clientY,lastX:a.x,lastY:a.y,dragging:false};try{puck.setPointerCapture(e.pointerId)}catch{}},{capture:true});
puck.addEventListener('pointermove',e=>{const d=closedPuckDrag;if(!d||d.id!==e.pointerId||state.open)return;const dist=Math.hypot(e.clientX-d.sx,e.clientY-d.sy);if(!d.dragging&&dist<8)return;if(!d.dragging){d.dragging=true;selector.classList.add('corner-dragging')}const p=clampClosedPoint(e.clientX,e.clientY);d.lastX=p.x;d.lastY=p.y;setSelectorAnchor(p.x,p.y);e.preventDefault();e.stopImmediatePropagation()},{capture:true,passive:false});
function finishClosedPuckDrag(e,cancel=false){const d=closedPuckDrag;if(!d||d.id!==e.pointerId)return;closedPuckDrag=null;selector.classList.remove('corner-dragging');try{puck.releasePointerCapture(e.pointerId)}catch{}if(!d.dragging||cancel){applyControlCorner(controlCorner);return}suppressClosedClickUntil=performance.now()+360;const c=nearestCorner(d.lastX,d.lastY);applyControlCorner(c,{animate:true,from:{x:d.lastX,y:d.lastY},vibrate:true});e.preventDefault();e.stopImmediatePropagation()}
puck.addEventListener('pointerup',e=>finishClosedPuckDrag(e,false),{capture:true});puck.addEventListener('pointercancel',e=>finishClosedPuckDrag(e,true),{capture:true});
'''
    s = req_replace(s, "prevBtn.addEventListener('click'", closed + "prevBtn.addEventListener('click'", 'closed drag insertion')
    s = req_replace(s, "puck.addEventListener('click',e=>{e.stopPropagation();back()});", "puck.addEventListener('click',e=>{e.stopPropagation();if(performance.now()<suppressClosedClickUntil){e.preventDefault();return}back()});", 'click suppression')

    kb_start = s.find("window.addEventListener('keydown',e=>{", s.find('/* Keyboard mirrors'))
    if kb_start < 0: raise SystemExit('missing keyboard handler')
    kb_end = s.find("},{capture:true});", kb_start)
    if kb_end < 0: raise SystemExit('missing keyboard handler end')
    kb_end += len("},{capture:true});")
    new_kb = r'''window.addEventListener('keydown',e=>{
  if(!state.open)return;const tag=(e.target?.tagName||'').toLowerCase();if(tag==='input'||tag==='textarea'||tag==='select'||e.target?.isContentEditable)return;
  const key=e.key;if(key==='Enter'){e.preventDefault();e.stopPropagation();enter().catch(err=>showToast(err?.message||'No pude abrir'));return}if(key==='Escape'){e.preventDefault();e.stopPropagation();back();return}
  let sx=0,sy=0;if(['ArrowLeft','a','A','h','H'].includes(key))sx=-1;else if(['ArrowRight','d','D','l','L'].includes(key))sx=1;else if(['ArrowUp','w','W','k','K'].includes(key))sy=-1;else if(['ArrowDown','s','S','j','J'].includes(key))sy=1;else return;
  const v=localVector(sx,sy);if(v.x<0)step(-1,'keyboard');else if(v.x>0)step(1,'keyboard');else if(v.y<0)enter().catch(err=>showToast(err?.message||'No pude abrir'));else if(v.y>0)back();e.preventDefault();e.stopPropagation();
},{capture:true});'''
    s = s[:kb_start] + new_kb + s[kb_end:]

    s = req_replace(s, "  let vx=d.x-d.ax,vy=d.y-d.ay,r=Math.hypot(vx,vy);neutralVisual(d,d.det);\n\n  const enterCos=cosTo(vx,vy,-Math.SQRT1_2,-Math.SQRT1_2),backCos=cosTo(vx,vy,Math.SQRT1_2,Math.SQRT1_2);", "  let vx=d.x-d.ax,vy=d.y-d.ay,r=Math.hypot(vx,vy);neutralVisual(d,d.det);\n  const lv=localVector(vx,vy),lvx=lv.x,lvy=lv.y;\n\n  const enterCos=cosTo(lvx,lvy,-Math.SQRT1_2,-Math.SQRT1_2),backCos=cosTo(lvx,lvy,Math.SQRT1_2,Math.SQRT1_2);", 'pointer local vector')
    s = req_replace(s, '  const ax=Math.abs(vx),ay=Math.abs(vy);', '  const ax=Math.abs(lvx),ay=Math.abs(lvy);', 'pointer axis')
    s = req_replace(s, '    const hDisp=d.x-d.visualAnchorX;', '    const hDisp=(d.x-d.visualAnchorX)*OR.mx;', 'horizontal mirror')
    s = req_replace(s, '        d.visualAnchorX+=hDir*H_VISUAL_STEP;', '        d.visualAnchorX+=hDir*OR.mx*H_VISUAL_STEP;', 'horizontal anchor')
    s = req_replace(s, '        const residual=(d.x-d.visualAnchorX)/H_VISUAL_STEP;', '        const residual=(d.x-d.visualAnchorX)*OR.mx/H_VISUAL_STEP;', 'horizontal residual')
    s = req_replace(s, '        d.visualAnchorX=d.x-hDir*DEAD;', '        d.visualAnchorX=d.x-hDir*OR.mx*DEAD;', 'horizontal edge')
    s = req_replace(s, '  const dir=vy<0?1:-1;', '  const dir=lvy<0?1:-1;', 'vertical mirror')

    init = 'render();closeSelector(true);requestAnimationFrame(frame);'
    new_init = "applyControlCorner(controlCorner);\nconst realignCorner=()=>{if(!closedPuckDrag?.dragging)applyControlCorner(controlCorner)};\nwindow.addEventListener('resize',realignCorner,{passive:true});\nwindow.addEventListener('orientationchange',()=>setTimeout(realignCorner,60),{passive:true});\nwindow.visualViewport?.addEventListener('resize',realignCorner,{passive:true});\nwindow.visualViewport?.addEventListener('scroll',realignCorner,{passive:true});\nrender();closeSelector(true);requestAnimationFrame(frame);"
    s = req_replace(s, init, new_init, 'initial corner')
    s = s.replace('<title>Prometeo · Universal Shell V5 Integrated Control</title>', '<title>Prometeo · Universal Shell V5 Integrated Control · Corner Anchor</title>', 1)
    return s


def update_bootstrap(sha, length):
    s = INDEX.read_text()
    s = re.sub(r"const EXPECTED='[0-9a-f]{64}';", f"const EXPECTED='{sha}';", s, count=1)
    s = re.sub(r'const EXPECTED_LENGTH=\d+;', f'const EXPECTED_LENGTH={length};', s, count=1)
    INDEX.write_text(s)


def update_publish_workflow(sha, length, sizes):
    s = PUBLISH.read_text()
    s = re.sub(r'expected=\([^\n]*\)', 'expected=(' + ' '.join(map(str, sizes)) + ')', s, count=1)
    s = re.sub(r'test "\$\(wc -c < /tmp/prometeo-v5\.b64 \| tr -d \' \'\)" = \'\d+\'', f'test "$(wc -c < /tmp/prometeo-v5.b64 | tr -d \' \')" = \'{length}\'', s, count=1)
    s = re.sub(r"echo '[0-9a-f]{64}  /tmp/prometeo-v5\.html' \| sha256sum -c -", f"echo '{sha}  /tmp/prometeo-v5.html' | sha256sum -c -", s, count=1)
    if MARKER not in s:
        s = s.replace("          grep -q 'Universal Shell V5 Integrated Control' /tmp/prometeo-v5.html\n", "          grep -q 'Universal Shell V5 Integrated Control' /tmp/prometeo-v5.html\n          grep -q 'prometeo.universal-control.corner.v1' /tmp/prometeo-v5.html\n          grep -q 'nearestCorner' /tmp/prometeo-v5.html\n          grep -q 'localVector' /tmp/prometeo-v5.html\n")
    PUBLISH.write_text(s)


def write_readme(sha, length, sizes):
    lines = '\n'.join(f'- `chunk-{i}.b64` — {size} bytes' for i, size in enumerate(sizes, 1))
    README.write_text(f'''# Prometeo Universal Shell V5\n\nRuntime assets for the single global Prometeo control.\n\n## Current capabilities\n\nV5 keeps the approved tactile selector as the single global control, persistent page favorites, and Corner Anchor v1.\n\n- a closed puck can be dragged freely and snaps to the nearest of four corners on release;\n- only the semantic corner is persisted under `prometeo.universal-control.corner.v1`; screen pixels are never persisted;\n- left/right and top/bottom placements mirror spatial pointer and keyboard input while `Enter` always commits and `Escape` always goes back;\n- the rail, arrow tails, current disc, title arc and directional intent mirror toward the screen interior without mirroring readable text or semantic icons;\n- safe-area insets, resize, rotation and VisualViewport changes recompute the chosen anchor;\n- drag uses pointer capture, an 8px threshold, one snap event and one snap animation;\n- moving the closed control does not stop recording or background transcription;\n- favorites and `Organizar páginas` remain part of the same universal control.\n\n## Deployment invariant\n\nThe public runtime requires all five payload chunks:\n\n{lines}\n\nCombined Base64 length: `{length}`.\n\nDecompressed HTML SHA-256: `{sha}`.\n\nThe legacy per-page global shell remains retired.\n''')


def main():
    source = load_html()
    source_sha = hashlib.sha256(source.encode()).hexdigest()
    out = patch_html(source)
    # Syntax-level gates before materialization.
    for needle in [MARKER, 'nearestCorner', 'localVector', 'corner-dragging', 'Anclar', 'Organizar páginas']:
        if needle not in out:
            raise SystemExit(f'missing gate: {needle}')
    if 'data-prometeo-shell' in out:
        raise SystemExit('legacy per-page shell marker present')

    raw = out.encode()
    sha = hashlib.sha256(raw).hexdigest()
    gz = gzip.compress(raw, compresslevel=9, mtime=0)
    b64 = base64.b64encode(gz).decode()
    base = (len(b64) // 5) // 4 * 4
    sizes = [base] * 4 + [len(b64) - base * 4]
    pos = 0
    for i, size in enumerate(sizes, 1):
        (CHUNK_DIR / f'chunk-{i}.b64').write_text(b64[pos:pos+size])
        pos += size
    update_bootstrap(sha, len(b64))
    update_publish_workflow(sha, len(b64), sizes)
    write_readme(sha, len(b64), sizes)
    manifest = {
        'schema': 'prometeo.corner-anchor/v1',
        'source_payload_sha256': source_sha,
        'payload_sha256': sha,
        'base64_length': len(b64),
        'chunk_sizes': sizes,
        'corners': ['top-left','top-right','bottom-left','bottom-right'],
        'persisted_key': MARKER,
        'pixel_persistence': False,
        'drag_threshold_px': 8,
        'snap_animation_ms': 210,
        'spatial_input_mirrors': True,
        'enter_escape_invariant': True,
        'legacy_shell_count_expected': 0,
        'universal_control_count_expected': 1
    }
    (CHUNK_DIR / 'CORNER_ANCHOR_v1.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
