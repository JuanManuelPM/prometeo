#!/usr/bin/env python3
"""Build any PROMETEO branching recipe using the shared, visually gated video runtime.
The published HTML is self-contained: no fetches for JS or story JSON at playback.
"""
import hashlib,json,pathlib
base=pathlib.Path(__file__).resolve().parent
root=base.parents[2]
story=json.loads((base/'story.json').read_text(encoding='utf-8'))
if story.get('schema')!='prometeo.secuencia/branching-v1':raise ValueError('Unknown story schema')
paths=story.get('paths',[]);nodes=story.get('nodes',[])
if len(paths)<2 or not nodes:raise ValueError('Need at least two paths and a node')
ids=[p['id'] for p in paths];nids=[n['id'] for n in nodes]
if len(set(ids))!=len(ids) or len(set(nids))!=len(nids):raise ValueError('Duplicate path/node ID')
byid={n['id']:n for n in nodes}
if not isinstance(story.get('source',{}).get('lengthSeconds'),(int,float)):raise ValueError('Missing source duration')
length=story['source']['lengthSeconds']
for p in paths:
    if p['entry'] not in byid or p['completionNode'] not in byid:raise ValueError('Broken path endpoint')
    if byid[p['entry']]['path']!=p['id'] or byid[p['completionNode']]['path']!=p['id']:raise ValueError('Endpoint outside its path')
    seen=set();front=[p['entry']]
    while front:
        node=front.pop()
        if node in seen:continue
        seen.add(node)
        front.extend(c['to'] for c in byid[node]['choices'] if c['to'] in byid and byid[c['to']]['path']==p['id'])
    if p['completionNode'] not in seen:raise ValueError('Completion node unreachable for '+p['id'])
for n in nodes:
    if n['path'] not in ids or not 0<=n['start']<n['end']<=length:raise ValueError('Invalid clip '+n['id'])
    if not all(c['to'] in byid for c in n['choices']):raise ValueError('Broken link for '+n['id'])
if not 1<=story['unlock']['requiredCompletedPaths']<=len(paths):raise ValueError('Impossible unlock')
template=(base/'index.template.html').read_text(encoding='utf-8')
js=(root/'scripts/presentacion/shared/video-frame-guard.js').read_text(encoding='utf-8')
if template.count('/*__FRAME_GUARD_INLINE__*/')!=1:raise ValueError('Missing shared runtime slot')
if '<script' in js.lower() or '</script' in js.lower():raise ValueError('Unsafe JS module for embedding')
raw=json.dumps(story,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
if template.count('__STORY_JSON__')!=1:raise ValueError('Missing story slot')
html=template.replace('/*__FRAME_GUARD_INLINE__*/',js).replace('__STORY_JSON__',raw)
if '<iframe' in html.lower() or ' controls>' in html.lower():raise ValueError('Platform video UI forbidden')
if '#video-view{inset:0;z-index:1;' not in html:raise ValueError('Video compositing invariant absent')
(base/'index.html').write_text(html,encoding='utf-8')
print(json.dumps({'status':'BUILT','characters':len(html),'sharedRuntime':'prometeo.video-frame-guard/v1','sha256':hashlib.sha256(html.encode()).hexdigest(),'paths':len(paths),'nodes':len(nodes)}))
