#!/usr/bin/env python3
"""PROMETEO SECUENCIA v3: actual YouTube captions -> phrase-boundary edit decision.
No chapter fallback, no synthetic timestamps and no silent 'success' without evidence.
"""
import argparse, datetime, difflib, hashlib, json, pathlib, re, subprocess, sys, tempfile, unicodedata

VIDEO_ID="z9t147FrV4Y"
SOURCE_URL="https://www.youtube.com/watch?v="+VIDEO_ID
# Start/end text is derived from the episode transcript, NOT from chapter names.
# YouTube captions must independently contain both markers or the build fails.
MOMENTS=[
  {"id":"terapia","idea":"¿PARA QUIÉN ESTÁ PENSADA LA TERAPIA?",
   "label":"01 / UNA PREGUNTA INCÓMODA",
   "start_anchor":"Then beta bias is the opposite",
   "end_anchor":"whether it might not work for men",
   "why":"Explica cómo asumir que un tratamiento sirve igual para todas las personas puede impedir comprobar su eficacia."},
  {"id":"valores","idea":"¿QUÉ VALORAN REALMENTE LOS HOMBRES?",
   "label":"02 / CUANDO HABLAN LOS DATOS",
   "start_anchor":"another thing we did in that survey was ask men",
   "end_anchor":"being honest reliable dependable",
   "why":"Cambia los estereotipos por los valores que los participantes dijeron considerar más importantes."},
  {"id":"generalizacion","idea":"¿Y SI GENERALIZAMOS DESDE LOS PEORES CASOS?",
   "label":"03 / EL ERROR DE LA GENERALIZACIÓN",
   "start_anchor":"we take the examples of the worst possible men",
   "end_anchor":"these sorts of campaigns are very easily backfired",
   "why":"Describe el salto desde casos extremos hacia una valoración de todos los hombres."}
]
def tokens(s):
    plain=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode().lower()
    return re.findall(r"[a-z0-9]+",plain)
def clean(items):
    out=[]
    for x in items:
        a=float(x["start"]);d=float(x.get("duration",float(x.get("end",a))-a))
        b=a+d;text=re.sub(r"\s+"," ",x["text"]).strip()
        if not text or b<=a or a<0 or b>30000:continue
        if text in ("[Music]","[Applause]"):continue
        out.append({"start":round(a,3),"end":round(b,3),"text":text})
    out.sort(key=lambda z:z["start"])
    return out
def from_api(video_id):
    from youtube_transcript_api import YouTubeTranscriptApi
    api=YouTubeTranscriptApi()
    t=api.fetch(video_id,languages=["en","en-US","en-GB"])
    rows=[{"start":c.start,"duration":c.duration,"text":c.text} for c in t]
    return clean(rows),"youtube-transcript-api"
def from_ytdlp(video_id):
    with tempfile.TemporaryDirectory() as td:
        cmd=["yt-dlp","--no-playlist","--skip-download","--write-auto-subs",
            "--sub-langs","en.*","--sub-format","json3","--js-runtimes","node","--remote-components","ejs:github",
            "-o",td+"/captions.%(ext)s",SOURCE_URL]
        p=subprocess.run(cmd,capture_output=True,text=True,timeout=150)
        if p.returncode:raise RuntimeError((p.stderr or p.stdout)[-1000:])
        candidates=list(pathlib.Path(td).glob("*.json3"))
        if not candidates:raise RuntimeError("yt-dlp returned no JSON3 English captions")
        rows=[]
        for e in json.loads(candidates[0].read_text()).get("events",[]):
            txt="".join(v.get("utf8","") for v in e.get("segs",[])).strip()
            rows.append({"start":e.get("tStartMs",0)/1000,"duration":e.get("dDurationMs",0)/1000,"text":txt})
        return clean(rows),"yt-dlp-json3"

def parse_vtt(raw):
    import html as htmlmod
    out=[]
    parts=re.split(r"\r?\n\r?\n",raw.replace("\ufeff",""))
    timecode=re.compile(r"(?:(\d+):)?(\d+):(\d+)\.(\d{3})")
    def sec(s):
        m=timecode.search(s)
        if not m:raise ValueError("bad timestamp")
        return int(m[1] or 0)*3600+int(m[2])*60+int(m[3])+int(m[4])/1000
    for block in parts:
        lines=block.strip().splitlines()
        tt=next((i for i,x in enumerate(lines) if "-->" in x),None)
        if tt is None:continue
        left,right=lines[tt].split("-->",1)
        try:a=sec(left);b=sec(right)
        except ValueError:continue
        body=" ".join(lines[tt+1:])
        body=re.sub(r"<\d\d:\d\d:\d\d\.\d{3}>"," ",body)
        body=re.sub(r"<[^>]+>"," ",body)
        body=htmlmod.unescape(re.sub(r"\s+"," ",body)).strip()
        if body and b>a:out.append({"start":a,"duration":b-a,"text":body})
    return clean(out)
def from_mirrors(video_id):
    """Only public read-only subtitle endpoints; no YouTube downloading."""
    import concurrent.futures,requests
    hosts=["https://inv.nadeko.net","https://invidious.nerdvpn.de",
           "https://yt.chocolatemoo53.com","https://invidious.tiekoetter.com"]
    piped=["https://pipedapi.kavin.rocks","https://pipedapi.syncpundit.io"]
    def worker(base):
        if "piped" in base:
            response=requests.get(base+"/streams/"+video_id,timeout=11)
            response.raise_for_status()
            tracks=response.json().get("subtitles",[])
            english=[t for t in tracks if str(t.get("code","")).startswith("en")]
            if not english:raise RuntimeError("No English subtitle")
            url=english[0].get("url")
            response=requests.get(url,timeout=11)
            response.raise_for_status()
        else:
            response=requests.get(base+"/api/v1/captions/"+video_id+"?lang=en",timeout=11)
            response.raise_for_status()
        if not response.text.lstrip().startswith(("WEBVTT","\ufeffWEBVTT")):
            raise RuntimeError("Not WebVTT: "+response.text[:75])
        rows=parse_vtt(response.text)
        if len(rows)<100:raise RuntimeError("Subtitle response unexpectedly short")
        return rows,"public-vtt:"+base
    failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(worker,h):h for h in hosts+piped}
        for fut in concurrent.futures.as_completed(futures):
            try:
                rows,source=fut.result()
                # Inspect actual caption windows around independently sourced quote timestamps.
                for position in (599,1598,1834,2150,2203):
                    nearby=[x for x in rows if position-7<=x["start"]<=position+55]
                    print("CAPTION_WINDOW",source,position,
                          json.dumps(nearby[:26],ensure_ascii=False)[:4800],flush=True)
                choose(rows)
                return rows,source
            except Exception as e:failures.append(futures[fut]+":"+str(e)[:100])
    raise RuntimeError("all public mirror attempts failed: "+repr(failures))

def load_captions(video_id):
    errors=[]
    for fn in (from_api,from_ytdlp,from_mirrors):
        try:
            rows,via=fn(video_id)
            if len(rows)<100:raise RuntimeError("Transcript is implausibly short")
            return rows,via,errors
        except Exception as e:errors.append(fn.__name__+": "+str(e)[:350])
    raise RuntimeError("NO_YOUTUBE_TIMED_CAPTIONS; attempts="+repr(errors))
def locate(rows,needle,after=-1):
    phrase=tokens(needle)
    if not phrase:raise ValueError("Empty marker")
    stream=[]
    for j,seg in enumerate(rows):
        for w in tokens(seg["text"]):stream.append((w,j))
    best=(-1,None,None)
    for i in range(len(stream)-len(phrase)+1):
        if after>=0 and stream[i][1]<after:continue
        # Captions can vary modestly from the podcast transcript; NEVER allow a weak match.
        proposed=[w for w,_ in stream[i:i+len(phrase)]]
        score=difflib.SequenceMatcher(None,phrase,proposed,autojunk=False).ratio()
        if score>best[0]:best=(score,stream[i][1],stream[i+len(phrase)-1][1])
        if score==1:break
    if best[0]<.76:raise ValueError(f"ANCHOR_NOT_FOUND {needle!r}; closest={best[0]:.3f}")
    return best
def choose(rows):
    decisions=[]
    for moment in MOMENTS:
        a,si,sj=locate(rows,moment["start_anchor"])
        b,ei,ej=locate(rows,moment["end_anchor"],after=sj)
        start=max(0,rows[si]["start"]-.35)
        end=rows[ej]["end"]+.40
        length=end-start
        if not 8<=length<=70:raise ValueError(f"IMPLAUSIBLE_DURATION {moment['id']} {length:.1f}")
        excerpt=" ".join(x["text"] for x in rows[si:ej+1])
        evidence=dict(start_anchor=moment["start_anchor"],end_anchor=moment["end_anchor"],
                      start_confidence=round(a,3),end_confidence=round(b,3),
                      caption_start_index=si,caption_end_index=ej,
                      caption_sha256=hashlib.sha256(excerpt.encode()).hexdigest(),
                      caption_excerpt_head=excerpt[:160],caption_excerpt_tail=excerpt[-160:])
        decisions.append({"id":moment["id"],"title":moment["idea"],"label":moment["label"],
                          "why":moment["why"],"start":round(start,3),"end":round(end,3),
                          "duration":round(length,3),"evidence":evidence,"videoId":VIDEO_ID})
    if len(decisions)!=3:raise ValueError("Expected 3 independently anchored clips")
    for item in decisions:
        if not item["evidence"]["start_confidence"]>=.76 or not item["evidence"]["end_confidence"]>=.76:
            raise ValueError("Low confidence clip")
    return decisions
def build(rows,via,errors,out,template):
    clips=choose(rows)
    spec={"schema":"prometeo.sequence-edit/v3","generatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
       "status":"CAPTION_ANCHORED_CANDIDATE","source":{"videoId":VIDEO_ID,"url":SOURCE_URL,
         "title":"Does Psychology Have A Negative View Of Masculinity? – Dr John Barry",
         "channel":"Chris Williamson","transcriptSource":via,
         "captionCount":len(rows),"captionSha256":hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()},
       "policy":{"chapterFallback":False,"inventedTimestamps":False,"textSlideMs":1000,
         "firstFrameAutoplayRequiresBrowserPermission":True,"audioBoundaryListened":False},
       "library":[{"id":"john-barry","title":"¿Qué comprende realmente la psicología sobre los hombres?",
            "subtitle":"Tres ideas de John Barry que merecen escucharse completas.",
            "videoId":VIDEO_ID,"clips":clips}],"retrievalErrors":errors}
    out.mkdir(parents=True,exist_ok=True)
    (out/"recipe.json").write_text(json.dumps(spec,ensure_ascii=False,indent=2)+"\n")
    (out/"index.html").write_text(template.read_text().replace("__INJECT_RECIPE__",json.dumps(spec,ensure_ascii=False).replace("</","<\\/")))
    (out/"QA.json").write_text(json.dumps({"status":"CAPTIONS_ALIGNED_NOT_AUDIO_LISTENED",
               "checks":{"youtubeCaptionSegments":len(rows),"anchors":len(clips),
                 "sourceMetadata":True,"actualAudioBoundaries":False}},indent=2)+"\n")
    (out/"transcript-private.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"status":"CAPTION_ANCHORED_CANDIDATE","via":via,"segments":len(rows),
                      "clips":[{"id":c["id"],"start":c["start"],"end":c["end"],"start_match":c["evidence"]["start_confidence"],"end_match":c["evidence"]["end_confidence"]} for c in clips]}))
def main():
    a=argparse.ArgumentParser();a.add_argument("--out",default="dist/secuencia-v3")
    a.add_argument("--fixture",default=None);a.add_argument("--template",default="presentacion/secuencia-v3/template.html")
    args=a.parse_args();out=pathlib.Path(args.out)
    if args.fixture:
        rows=clean(json.loads(pathlib.Path(args.fixture).read_text()))
        via="fixture-only";errors=[]
    else:rows,via,errors=load_captions(VIDEO_ID)
    build(rows,via,errors,out,pathlib.Path(args.template))
if __name__=="__main__":
    try:main()
    except Exception as e:print("BUILD_FAIL",type(e).__name__,str(e),file=sys.stderr);sys.exit(2)
