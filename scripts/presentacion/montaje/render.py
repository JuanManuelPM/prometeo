#!/usr/bin/env python3
"""PROMETEO SECUENCIA: deterministic text interstitials + actual source MP4 trims -> one seamless MP4.
Media must be locally accessible. No YouTube iframe, transcript, credits or network dependency.
"""
from __future__ import annotations
import argparse, json, pathlib, subprocess, math, hashlib, tempfile
from PIL import Image, ImageDraw, ImageFont

W,H,FPS=1280,720,30
PAPER='#F0EBDE'; INK='#101310'; GREEN='#8A9B73'; ACCENT='#CAE2A2'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf'
SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf'

def run(*args):
    p=subprocess.run([str(x) for x in args],capture_output=True,text=True,timeout=330)
    if p.returncode: raise RuntimeError('ffmpeg/tool failed: '+' '.join(map(str,args[:8]))+'\n'+p.stderr[-2500:])
    return p.stdout

def probe(path):
    return json.loads(run('ffprobe','-v','error','-show_streams','-show_format','-of','json',path))

def f(font,size): return ImageFont.truetype(font,size)

def draw_card(card,out):
    bg=PAPER if card.get('paper') else INK
    fg=INK if card.get('paper') else PAPER
    accent=GREEN if card.get('paper') else ACCENT
    im=Image.new('RGB',(W,H),bg);d=ImageDraw.Draw(im)
    margin=92; title=str(card['text']).upper(); lines=title.split('\n')
    size=106 if len(lines)<3 else 91
    if max(map(len,lines))>19:size=83
    font=f(BOLD,size)
    while any(d.textbbox((0,0),s,font=font)[2]>W-2*margin for s in lines) and size>=38:
        size-=3;font=f(BOLD,size)
    lineh=int(size*1.08); totalh=len(lines)*lineh
    y=max(170,(H-totalh)//2)
    d.text((margin,64),str(card.get('kicker','PROMETEO / SECUENCIA')).upper(),font=f(BOLD,19),fill=accent,spacing=2)
    for n,line in enumerate(lines):
        d.text((margin,y+n*lineh),line,font=font,fill=fg,stroke_width=0)
    d.line(((margin,H-79),(W-margin,H-79)),fill=accent,width=3)
    # Accessible editorial cue, visually tiny, no UI.
    if card.get('foot'):d.text((margin,H-62),str(card['foot']).upper(),font=f(BOLD,13),fill=fg)
    im.save(out)

def source_path(root,rel):
    candidate=(root/rel).resolve();allow=root.resolve()
    if not candidate.is_relative_to(allow):raise ValueError('Path traversal prohibited: '+str(rel))
    if not candidate.is_file():raise FileNotFoundError(candidate)
    return candidate

def normalized_video(src,dest,start,end):
    info=probe(src);duration=float(info['format']['duration'])
    if not (0<=start<end<=duration+.15): raise ValueError(f'Clip outside media duration {duration}: {start}:{end}')
    has_audio=any(st['codec_type']=='audio' for st in info['streams'])
    vf=f'scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps={FPS},format=yuv420p'
    dur=round((end-start)*FPS)/FPS
    common=['-map','0:v:0','-vf',vf,'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-r',str(FPS),'-ar','48000','-ac','2','-c:a','aac','-b:a','128k','-movflags','+faststart']
    if has_audio:
        run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-ss',start,'-i',src,'-t',dur,*common,'-map','0:a:0','-af','aresample=async=1:first_pts=0',dest)
    else:
        run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-ss',start,'-i',src,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',dur,*common,'-map','1:a:0',dest)
    return dur

def normalized_card(png,dest,seconds):
    duration=round(seconds*FPS)/FPS
    run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-loop','1','-framerate',FPS,'-i',png,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',duration,'-map','0:v','-map','1:a','-c:v','libx264','-preset','veryfast','-tune','stillimage','-crf','23','-pix_fmt','yuv420p','-r',FPS,'-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-shortest','-movflags','+faststart',dest)
    return duration

def render(recipe_path,source_root,outfile):
    data=json.loads(pathlib.Path(recipe_path).read_text(encoding='utf-8'))
    if data.get('schema')!='prometeo.secuencia/montaje-v1':raise ValueError('Unknown recipe schema')
    items=data.get('timeline',[])
    if len(items)<3 or not any(x.get('kind')=='clip' for x in items):raise ValueError('Not enough timeline content')
    out=pathlib.Path(outfile);out.parent.mkdir(parents=True,exist_ok=True)
    receipt={'schema':'prometeo.secuencia/render-receipt/v1','recipe':str(recipe_path),'segments':[]}
    with tempfile.TemporaryDirectory(prefix='prometeo-montaje-') as temp:
        temp=pathlib.Path(temp); parts=[];elapsed=0
        for i,item in enumerate(items):
            part=temp/f'{i:03d}.mp4';k=item['kind']
            if k=='card':
                seconds=float(item['seconds'])
                if not .25<=seconds<=3.0:raise ValueError('Card duration must be 0.25 to 3 seconds')
                png=temp/f'{i:03d}.png';draw_card(item,png)
                requested=normalized_card(png,part,seconds)
            elif k=='clip':
                src=source_path(pathlib.Path(source_root),item['file'])
                requested=normalized_video(src,part,float(item['start']),float(item['end']))
            else:raise ValueError('Unknown segment '+str(k))
            p=probe(part);actual=float(p['format']['duration'])
            if abs(actual-requested)>.16:raise ValueError(f'Duration mismatch for {i}: {actual} != {requested}')
            vid=next((s for s in p['streams'] if s['codec_type']=='video'),None)
            aud=next((s for s in p['streams'] if s['codec_type']=='audio'),None)
            if not(vid and aud and vid['codec_name']=='h264' and aud['codec_name']=='aac' and vid['width']==W and vid['height']==H):raise ValueError('Invalid normalized media')
            receipt['segments'].append({'index':i,'kind':k,'timelineStart':round(elapsed,3),'timelineEnd':round(elapsed+actual,3),'duration':round(actual,3),'source':item.get('file'),'sourceStart':item.get('start'),'sourceEnd':item.get('end')})
            elapsed+=actual;parts.append(part)
        concat=temp/'concat.txt';concat.write_text(''.join("file '"+str(p)+"'\n" for p in parts))
        run('ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',concat,'-c','copy','-movflags','+faststart',out)
        fin=probe(out);vid=next(s for s in fin['streams'] if s['codec_type']=='video');aud=next(s for s in fin['streams'] if s['codec_type']=='audio')
        finaldur=float(fin['format']['duration'])
        if abs(finaldur-elapsed)>.3:raise ValueError(f'Final duration drift: {finaldur} vs {elapsed}')
        if vid['codec_name']!='h264' or aud['codec_name']!='aac':raise ValueError('Unexpected final codecs')
        receipt.update({'durationSeconds':round(finaldur,3),'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'videoCodec':'h264','audioCodec':'aac','width':W,'height':H,'fps':FPS,'status':'VIDEO_FILE_ENCODED'})
    (out.with_suffix('.receipt.json')).write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'output':str(out),'seconds':finaldur,'segments':len(items),'bytes':out.stat().st_size,'sha256':receipt['sha256']},ensure_ascii=False))
    return receipt

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--recipe',required=True);p.add_argument('--source-root',required=True);p.add_argument('--out',required=True)
    args=p.parse_args();render(args.recipe,args.source_root,args.out)
