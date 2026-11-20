#!/usr/bin/env python3
"""PROMETEO SECUENCIA: validate YouTube montage jobs and map quote anchors to caption blocks.

Caption timestamps are *block* times, not word alignment. Quote-derived times are estimates,
never claim exact cuts without an auditory review. No network calls and no vidIQ credits.
"""
from __future__ import annotations
import argparse, json, math, re, unicodedata
from pathlib import Path
from urllib.parse import urlparse, parse_qs

SCHEMA = 'prometeo.secuencia/youtube-job-v1'
TIME = re.compile(r'(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?')
LINE = re.compile(r'^\s*\[((?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]\s*(.+)$')
SRT = re.compile(r'^\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})')


def seconds(stamp):
    if isinstance(stamp,(int,float)) and math.isfinite(stamp) and stamp >= 0:
        return float(stamp)
    m=TIME.fullmatch(str(stamp).strip())
    if not m: raise ValueError('Invalid timestamp: '+str(stamp))
    h=int(m.group(1) or 0);mi=int(m.group(2));s=int(m.group(3));ms=int((m.group(4) or '0').ljust(3,'0'))
    if mi>59 or s>59:raise ValueError('Bad clock timestamp')
    return h*3600+mi*60+s+ms/1000


def parse_transcript(text):
    """Accept [m:ss]/[h:mm:ss] lines, SRT or WebVTT; not a speech-to-text engine."""
    rows=text.replace('\r','').split('\n');out=[];i=0
    while i<len(rows):
        s=rows[i].strip();i+=1
        m=LINE.match(s)
        if m:
            out.append({'start':seconds(m.group(1)),'text':m.group(2).strip()});continue
        m=SRT.match(s)
        if m:
            buf=[]
            while i<len(rows) and rows[i].strip():
                s=rows[i].strip();i+=1
                if s and not s.startswith('<'):buf.append(re.sub(r'<[^>]+>','',s))
            if buf:out.append({'start':seconds(m.group(1)),'end':seconds(m.group(2)),'text':' '.join(buf)})
    if not out:raise ValueError('No timed caption blocks detected')
    out.sort(key=lambda r:r['start'])
    out=[r for r in out if r['text'].strip()]
    for i,r in enumerate(out):
        if i and r['start']<out[i-1]['start']:raise ValueError('Unsorted timestamps')
        r.setdefault('end',out[i+1]['start'] if i+1<len(out) else r['start']+15.0)
        if r['end']<=r['start']:r['end']=r['start']+.5
    return out


def words(s):
    s=unicodedata.normalize('NFKD',s.lower())
    s=''.join(ch for ch in s if not unicodedata.combining(ch))
    return re.findall(r'[a-z0-9]+',s)


def locate_quote(segments,phrase):
    q=words(phrase)
    if len(q)<2:raise ValueError('Quote anchors must have at least two words')
    all_words=[];markers=[]
    for row in segments:
        segwords=words(row['text'])
        for i,w in enumerate(segwords):
            all_words.append(w)
            markers.append((row,i,len(segwords)))
    matches=[]
    for i in range(len(all_words)-len(q)+1):
        if all_words[i:i+len(q)]==q:matches.append(i)
    if len(matches)!=1:raise ValueError(f'Quote must appear exactly once, found {len(matches)}: {phrase[:90]}')
    a=matches[0];b=a+len(q)-1
    row_a,ix_a,n_a=markers[a];row_b,ix_b,n_b=markers[b]
    first=row_a['start']+(row_a['end']-row_a['start'])*ix_a/max(1,n_a)
    last=row_b['start']+(row_b['end']-row_b['start'])*(ix_b+1)/max(1,n_b)
    return {'startEstimate':first,'endEstimate':last,'blockStart':row_a['start'],'blockEnd':row_b['end'],'tokenCount':len(q)}


def canonical_youtube(url):
    u=urlparse(url.strip())
    if u.scheme!='https':raise ValueError('Expected HTTPS YouTube URL')
    host=(u.hostname or '').lower();path=u.path.strip('/')
    if host in ('youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'):
        if path=='watch':video_id=parse_qs(u.query).get('v',[''])[0]
        elif path.startswith(('shorts/','live/','embed/')):video_id=path.split('/')[1]
        else:raise ValueError('Not a single-video YouTube URL')
    elif host in ('youtu.be','www.youtu.be'):video_id=path.split('/')[0]
    else:raise ValueError('Unsupported video host')
    if not re.fullmatch(r'[a-zA-Z0-9_-]{11}',video_id):raise ValueError('Invalid YouTube video ID')
    return 'https://www.youtube.com/watch?v='+video_id


def resolve_job(job, transcript_text=None):
    if job.get('schema')!=SCHEMA:raise ValueError('Wrong job schema')
    source=job.get('source')
    if not isinstance(source,dict):raise ValueError('source must be an object')
    url=canonical_youtube(source['youtubeUrl']) if source.get('youtubeUrl') else None
    if not url and not source.get('localFile'):raise ValueError('Need source.youtubeUrl or source.localFile')
    timeline=job.get('timeline')
    if not isinstance(timeline,list) or not 3<=len(timeline)<=35:raise ValueError('Timeline must contain 3-35 items')
    captions=parse_transcript(transcript_text) if transcript_text else None
    result=[];cuts=[];duration=0.0
    for i,item in enumerate(timeline):
        if item.get('kind')=='card':
            value=item.get('seconds',.7)
            sec=seconds(value)
            if not .25<=sec<=3:raise ValueError('Card duration outside 0.25-3s')
            if not str(item.get('text','')).strip():raise ValueError('Empty card')
            result.append({'kind':'card','text':str(item['text']),'seconds':sec,'kicker':str(item.get('kicker','PROMETEO / SECUENCIA')),'paper':bool(item.get('paper',False))})
            duration+=sec
            continue
        if item.get('kind')!='clip':raise ValueError(f'Invalid item #{i}')
        if ('startQuote' in item)!=( 'endQuote' in item):raise ValueError('Quote anchors must be paired')
        anchor=None
        explicit='start' in item and 'end' in item
        if 'startQuote' in item:
            if captions is None:
                if not explicit:raise ValueError('Quote-only cuts require caption text or numeric timestamps')
                anchor={'startQuote':item['startQuote'],'endQuote':item['endQuote'],'captionVerified':False}
            else:
                first=locate_quote(captions,item['startQuote']);last=locate_quote(captions,item['endQuote'])
                if first['startEstimate']>=last['endEstimate']:raise ValueError('End quote precedes start quote')
                anchor={'start':first,'end':last,'startQuote':item['startQuote'],'endQuote':item['endQuote'],'captionVerified':True}
        if explicit:
            a=seconds(item['start']);b=seconds(item['end']);precision='USER_TIMES'
            if anchor and anchor.get('captionVerified') and not(a<=first['blockEnd']+3 and b>=last['blockStart']-3):raise ValueError('User times do not overlap quoted caption blocks')
        elif anchor:
            a=max(0,first['startEstimate']-float(item.get('lead',1.4)))
            b=last['endEstimate']+float(item.get('tail',1.2));precision='ESTIMATED_FROM_CAPTION_BLOCK'
        else:raise ValueError('Clip requires numeric start/end or quoted anchors with transcript')
        if not 0<=a<b or b-a>180:raise ValueError('Clip duration must be 0-180s')
        result.append({'kind':'clip','start':round(a,3),'end':round(b,3),'sourceIndex':i})
        cuts.append({'index':i,'start':round(a,3),'end':round(b,3),'duration':round(b-a,3),'precision':precision,'anchor':anchor,'audioBoundaryVerified':False})
        duration+=b-a
    if not cuts:raise ValueError('At least one actual clip required')
    if duration>660:raise ValueError('Montage longer than 11 minutes; break into sections')
    return {'schema':'prometeo.secuencia/youtube-resolved-v1','source':{'youtubeUrl':url,'localFile':source.get('localFile')},'timeline':result,'cuts':cuts,'estimatedTotalSeconds':round(duration,3),'audioBoundaryVerified':False,'requiresHumanAudioQA':True,'publishRequested':bool(job.get('publish',False))}


def main():
    p=argparse.ArgumentParser();p.add_argument('--job',required=True);p.add_argument('--transcript');p.add_argument('--out',required=True)
    args=p.parse_args();job=json.loads(Path(args.job).read_text(encoding='utf8'))
    transcript=Path(args.transcript).read_text(encoding='utf8') if args.transcript else None
    resolved=resolve_job(job,transcript)
    dest=Path(args.out);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(resolved,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'cuts':len(resolved['cuts']),'estimateSeconds':resolved['estimatedTotalSeconds'],'qa':'audio QA pending'}))
if __name__=='__main__':main()
