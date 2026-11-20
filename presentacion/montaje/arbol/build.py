#!/usr/bin/env python3
"""Build source-independent vertical branching map with shared painted-frame guard."""
import pathlib, json, hashlib
base=pathlib.Path(__file__).resolve().parent
root=base.parents[2]
source=json.loads((base/'story.json').read_text(encoding='utf-8'))
if source.get('schema')!='prometeo.secuencia/branching-v1':raise ValueError('Unknown graph schema')
paths=source['paths'];nodes=source['nodes']
ids={n['id'] for n in nodes};pids={p['id'] for p in paths}
if not ids or not pids or len(ids)!=len(nodes) or len(pids)!=len(paths):raise ValueError('Duplicate/missing IDs')
for p in paths:
 if p['entry'] not in ids or p['completionNode'] not in ids:raise ValueError('Broken path')
for n in nodes:
 if n['path'] not in pids or not (0<=n['start']<n['end']<=source['source']['lengthSeconds']):raise ValueError('Invalid node')
 if any(c['to'] not in ids for c in n['choices']):raise ValueError('Broken choice')
if not 1<=source['unlock']['requiredCompletedPaths']<=len(paths):raise ValueError('Impossible unlock')
html=(base/'index.template.html').read_text(encoding='utf-8')
modules={'/*__FRAME_GUARD_INLINE__*/':(root/'scripts/presentacion/shared/video-frame-guard.js').read_text(encoding='utf-8'),'/*__TREE_ENGINE_INLINE__*/':(root/'scripts/presentacion/shared/sequence-tree-v1.js').read_text(encoding='utf-8'),'__STORY_JSON__':json.dumps(source,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')}
for mark,content in modules.items():
 if html.count(mark)!=1:raise ValueError('Missing builder anchor '+mark)
 if mark!='__STORY_JSON__' and '</script' in content.lower():raise ValueError('Unsafe inline script')
 html=html.replace(mark,content)
if '<iframe' in html.lower() or ' controls>' in html.lower():raise ValueError('Player UI regression')
if '#cinema{position:absolute;inset:0;z-index:1;display:block!important' not in html:raise ValueError('Compositor must remain mounted')
(base/'index.html').write_text(html,encoding='utf-8')
print(json.dumps({'status':'BUILT','schema':'prometeo.secuencia/branch-tree-v1','paths':len(paths),'nodes':len(nodes),'sha256':hashlib.sha256(html.encode('utf-8')).hexdigest(),'characters':len(html)}))
