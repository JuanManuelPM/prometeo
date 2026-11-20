#!/usr/bin/env python3
"""Acquire precise, short media intervals or use a local source; write montage-v1 recipe.
No YouTube iframe, playlist, cookies, stored user credentials, transcript API or paid service.
"""
from __future__ import annotations
import argparse,json,pathlib,re,subprocess,sys,os
from urllib.parse import urlparse
from youtube_job import resolve_job,canonical_youtube

def checked(cmd, timeout=420):
    cp=subprocess.run([str(x) for x in cmd],text=True,capture_output=True,timeout=timeout)
    if cp.returncode:raise RuntimeError('Command failed: '+cmd[0]+' '+(cp.stderr or cp.stdout)[-1800:])
    return cp.stdout

def probe(path):
    return json.loads(checked(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)]))

def duration_and_streams(path):
    p=probe(path)
    v=next((s for s in p['streams'] if s['codec_type']=='video'),None)
    a=next((s for s in p['streams'] if s['codec_type']=='audio'),None)
    if not v:raise RuntimeError('Missing video stream in captured clip')
    if not a:print('WARNING: audio missing; renderer will generate silence',file=sys.stderr)
    return float(p['format']['duration'])

def safe_local_source(root,file):
    r=pathlib.Path(root).resolve();s=(r/file).resolve()
    if not s.is_relative_to(r) or not s.is_file():raise ValueError('Missing or unsafe local video source: '+str(file))
    return s

def valid_direct_url(url):
    """Accept ONLY short-lived vidIQ-issued GCS MP4 URLs, never arbitrary private hosts."""
    u=urlparse(url)
    if u.scheme!='https' or u.hostname!='storage.googleapis.com' or not u.path.startswith('/vidiq-user-videos/') or not u.path.endswith('.mp4'):
        raise ValueError('Unsupported signed media URL: expected vidIQ Google Cloud Storage MP4')
    return url


def direct_trim(url,start,end,outfile):
    """Request a selected time range from a signed MP4; full download is not guaranteed to be avoided."""
    valid_direct_url(url)
    cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y',
         '-ss',f'{start:.3f}','-i',url,'-t',f'{end-start:.3f}',
         '-map','0:v:0','-map','0:a:0?','-c:v','libx264','-preset','veryfast','-crf','21',
         '-c:a','aac','-b:a','128k','-pix_fmt','yuv420p','-movflags','+faststart',str(outfile)]
    cp=subprocess.run(cmd,text=True,capture_output=True,timeout=900)
    if cp.returncode:
        err=(cp.stderr or '')[-1500:].replace(url,'[signed-url-redacted]')
        raise RuntimeError('Direct source download failed: '+err)
    return float(duration_and_streams(outfile))


def prepare(resolved,root,outdir,direct_url=None):
    outdir=pathlib.Path(outdir).resolve();root=pathlib.Path(root).resolve()
    outdir.mkdir(parents=True,exist_ok=True)
    local=resolved['source'].get('localFile');youtube=resolved['source'].get('youtubeUrl')
    if local:safe_local_source(root,local)
    elif direct_url:valid_direct_url(direct_url)
    elif not youtube:raise ValueError('Neither a local source nor YouTube link is available')
    pieces=[];logs=[];clipnum=0
    for item in resolved['timeline']:
        if item['kind']=='card':pieces.append({k:item[k] for k in ('kind','text','seconds','kicker','paper') if k in item});continue
        a=float(item['start']);b=float(item['end']);clipnum+=1
        if local:
            f=pathlib.Path(local);duration=duration_and_streams(safe_local_source(root,local))
            if b>duration+.02:raise ValueError('Selected time exceeds source duration')
            pieces.append({'kind':'clip','file':f.as_posix(),'start':a,'end':b})
            logs.append({'clip':clipnum,'method':'local','sourceStart':a,'sourceEnd':b,'status':'VALIDATED'})
            continue
        prefix=f'part-{clipnum:03d}'
        if direct_url:
            file=outdir/(prefix+'.mp4')
            captured_duration=direct_trim(direct_url,a,b,file)
            if abs(captured_duration-(b-a))>.7:raise RuntimeError('Direct media clip duration mismatch')
            pieces.append({'kind':'clip','file':file.relative_to(root).as_posix(),'start':0.0,'end':round(min(captured_duration,b-a),3)})
            logs.append({'clip':clipnum,'method':'vidIQ-signed-MP4-range','sourceStart':a,'sourceEnd':b,'capturedDuration':round(captured_duration,3),'status':'CAPTURED_NOT_LISTENED'})
            continue
        before={p.name for p in outdir.glob(prefix+'.*')}
        arg=[sys.executable,'-m','yt_dlp','--no-playlist','--no-progress','--restrict-filenames',
             '--download-sections',f'*{a:.3f}-{b:.3f}','--force-keyframes-at-cuts',
             '--merge-output-format','mp4','-f','bv*[height<=1080]+ba/b[height<=1080]/best',
             '-o',str(outdir/(prefix+'.%(ext)s')),canonical_youtube(youtube)]
        checked(arg,timeout=900)
        candidates=[x for x in outdir.glob(prefix+'.*') if x.is_file() and x.name not in before and x.suffix.lower() in ('.mp4','.mkv','.webm','.mov')]
        if len(candidates)!=1:raise RuntimeError(f'Expected exactly one new captured clip for {clipnum}, found {len(candidates)}')
        file=candidates[0];duration=duration_and_streams(file)
        if abs(duration-(b-a))>1.0:raise RuntimeError(f'Clip {clipnum} duration drift: {duration:.3f}s vs target {b-a:.3f}s')
        # A trim with forced keyframes is expected to start at the requested time.
        # The renderer re-encodes the downloaded section from its new local zero.
        pieces.append({'kind':'clip','file':file.relative_to(root).as_posix(),'start':0.0,'end':round(min(duration,b-a),3)})
        logs.append({'clip':clipnum,'method':'yt-dlp/section','sourceStart':a,'sourceEnd':b,'capturedDuration':round(duration,3),'file':file.relative_to(root).as_posix(),'status':'CAPTURED_NOT_LISTENED'})
    if not pieces:raise ValueError('Empty compiled timeline')
    return {'schema':'prometeo.secuencia/montaje-v1','title':'SECUENCIA · MONTAJE YOUTUBE','timeline':pieces},logs

def main():
    p=argparse.ArgumentParser();p.add_argument('--resolved',required=True);p.add_argument('--root',required=True);p.add_argument('--out-dir',required=True);p.add_argument('--out',required=True)
    p.add_argument('--direct-url-env',default='PROMETEO_SIGNED_MEDIA_URL')
    a=p.parse_args();src=json.loads(pathlib.Path(a.resolved).read_text(encoding='utf8'))
    direct=os.environ.get(a.direct_url_env)
    recipe,logs=prepare(src,a.root,a.out_dir,direct_url=direct)
    out=pathlib.Path(a.out);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(recipe,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    out.with_suffix('.capture.json').write_text(json.dumps({'sources':logs,'videoDownloadedFromYouTube':any(x['method'].startswith('yt-dlp') for x in logs),'audioBoundaryVerified':False},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'segments':len(recipe['timeline']),'captured':len(logs),'output':str(out)}))
if __name__=='__main__':main()
