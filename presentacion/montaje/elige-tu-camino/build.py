#!/usr/bin/env python3
"""Embed a validated, pure-data graph in a self-contained HTML player."""
import json, pathlib
base=pathlib.Path(__file__).parent
s=json.loads((base/'story.json').read_text(encoding='utf-8'))
assert s['schema']=='prometeo.secuencia/branching-v1'
paths={x['id']:x for x in s['paths']}
nodes={x['id']:x for x in s['nodes']}
assert len(paths)==3 and len(nodes)==5
assert all(x['entry'] in nodes and x['completionNode'] in nodes for x in paths.values())
assert all(n['path'] in paths and 0<=n['start']<n['end']<=s['source']['lengthSeconds'] for n in nodes.values())
assert all(c['to'] in nodes for n in nodes.values() for c in n['choices'])
assert s['unlock']['requiredCompletedPaths']<=len(paths)
raw=json.dumps(s,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html=(base/'index.template.html').read_text(encoding='utf-8').replace('__STORY_JSON__',raw)
assert '<iframe' not in html.lower() and 'controls>' not in html
(base/'index.html').write_text(html,encoding='utf-8')
print('Built index.html',len(html),'bytes')
