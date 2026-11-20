#!/usr/bin/env python3
"""Video metadata/captions -> evidence-backed candidate deck. No media download."""
import argparse,json,re,subprocess,tempfile,pathlib,urllib.parse,html,datetime
def resolve(query):
    q=query.strip()
    if not q:raise ValueError('Empty source')
    if q.startswith(('https://','http://')):
        if (urllib.parse.urlparse(q).hostname or '') not in ('youtube.com','www.youtube.com','m.youtube.com','youtu.be'):raise ValueError('Unsupported URL')
        return q
    return 'ytsearch1:'+q
def run(args):
    p=subprocess.run(args,text=True,capture_output=True,timeout=180)
    if p.returncode:raise RuntimeError((p.stderr or p.stdout)[-1400:])
    return p.stdout
def metadata(q):
    m=json.loads(run(['yt-dlp','--no-playlist','--skip-download','--dump-single-json',resolve(q)]))
    if 'entries' in m:m=next((e for e in m['entries'] if e),{})
    if not re.fullmatch(r'[\w-]{11}',m.get('id','')):raise ValueError('Invalid video ID')
    return {'id':m['id'],'title':m.get('title',''),'uploader':m.get('uploader',''),'duration':m.get('duration'),'chapters':m.get('chapters') or [],'url':'https://www.youtube.com/watch?v='+m['id']}
def transcript(m,tmp):
    for mode,flags in [('human',['--write-subs']),('automatic',['--write-auto-subs'])]:
        try:run(['yt-dlp','--no-playlist','--skip-download',*flags,'--sub-langs','es.*,en.*','--sub-format','json3','-o',str(tmp/'sub.%(ext)s'),m['url']])
        except Exception:continue
        for f in sorted(tmp.glob('sub.*.json3')):
            segments=[]
            for e in json.loads(f.read_text()).get('events',[]):
                s=''.join(x.get('utf8','') for x in e.get('segs',[])).replace('\n',' ').strip()
                a=e.get('tStartMs',0)/1000;b=a+e.get('dDurationMs',0)/1000
                if s and b>a:segments.append({'start':round(a,3),'end':round(b,3),'text':s})
            if segments:return segments,mode,f.name
    return [],'unavailable',None
def choose(m,segments):
    duration=float(m.get('duration') or 0)
    if duration<=0:raise ValueError('Duration unavailable')
    found=[]
    if segments:
        ranked=[]
        for i,s in enumerate(segments):
            a=s['start']
            if a<min(35,duration*.04) or a>duration-15:continue
            b=min(a+15,duration)
            text=' '.join(x['text'] for x in segments[i:] if x['start']<b)
            words=re.findall(r'\w+',text.lower())
            score=min(len(words),52)*.5+len(set(w for w in words if len(w)>4))*.7+(4 if '?' in text else 0)
            ranked.append((score,a,b,text[:300]))
        for score,a,b,t in sorted(ranked,reverse=True):
            if all(abs(a-p['start'])>max(45,duration*.06) for p in found):
                found.append({'start':round(a,2),'end':round(b,2),'evidence':t,'basis':'transcript','score':round(score,2)})
            if len(found)==3:break
    else:
        for c in m['chapters']:
            a=c.get('start_time')
            if isinstance(a,(int,float)) and 15<=a<duration-10:
                found.append({'start':a,'end':min(a+15,duration),'evidence':c.get('title',''),'basis':'chapter_only','score':None})
            if len(found)==3:break
    return sorted(found,key=lambda p:p['start'])
def build(m,clips,out):
    if not clips:raise ValueError('No grounded timestamps: abort')
    source=pathlib.Path(__file__).resolve().parents[2]/'presentacion/ejemplos/psicologia-masculina/index.html'
    page=source.read_text()
    def textslide(title,label,paper=False):
        return '<section class="slide '+('paper' if paper else 'dark')+'" data-kind="text" data-duration="8500"><div class="eyebrow">'+html.escape(label)+'</div><h2 class="headline">'+html.escape(title)+'</h2><div class="rule"></div></section>'
    slides=[textslide(m['title'][:90],'PROMETEO / PRESENTACIÓN AUTOMÁTICA',True)]
    for i,c in enumerate(clips,1):
        title='ESCUCHEMOS ESTA IDEA.' if c['basis']=='transcript' else c['evidence'][:120]
        slides.append(textslide(title,'MOMENTO '+str(i)+' / '+c['basis'],i%2==0))
        slides.append('<section class="slide" data-kind="video" data-start="'+str(c['start'])+'" data-end="'+str(c['end'])+'" aria-label="Fragmento '+str(i)+'"></section>')
    slides.append(textslide('UNA IDEA ABRE OTRA PREGUNTA.','PROMETEO / FIN',True))
    page=re.sub(r'(<main id="stage"[^>]*>).*?(<div class="video-screen")',lambda x:x[1]+''.join(slides)+x[2],page,flags=re.S)
    page=page.replace("const VIDEO_ID='z9t147FrV4Y'","const VIDEO_ID="+json.dumps(m['id']))
    out.write_text(page)
def main():
    p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--out',default='dist/presentacion-auto');a=p.parse_args()
    target=pathlib.Path(a.out);target.mkdir(parents=True,exist_ok=True)
    m=metadata(a.source)
    with tempfile.TemporaryDirectory() as tmp:segments,mode,track=transcript(m,pathlib.Path(tmp))
    clips=choose(m,segments)
    if not clips:raise SystemExit('FAIL: no grounded timed segments')
    recipe={'schema':'prometeo.video-to-deck/v1','created_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':m,'transcript':{'status':mode,'track':track,'segments':len(segments)},'clips':clips,'rights':{'mode':'YOUTUBE_EMBED','downloaded_video':False,'license_verified':False},'review':{'status':'CANDIDATE','reason':'Heuristic selection, semantic review required; chapter fallback provisional'}}
    (target/'recipe.json').write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n')
    if segments:(target/'transcript.json').write_text(json.dumps(segments,ensure_ascii=False,indent=2)+'\n')
    build(m,clips,target/'index.html')
    print(json.dumps({'video':m['id'],'mode':mode,'segments':len(segments),'clips':len(clips)},ensure_ascii=False))
if __name__=='__main__':main()
