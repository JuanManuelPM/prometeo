#!/usr/bin/env python3
"""Read metadata and timed public captions, NEVER the YouTube video bytes."""
import argparse,json,subprocess,sys,re,pathlib,tempfile,html
from difflib import SequenceMatcher
def run(cmd,timeout=120):
 p=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout)
 if p.returncode:raise RuntimeError((p.stderr or p.stdout)[-300:])
 return p.stdout
def video_id(s):
 m=re.search(r"(?:v=|youtu\.be/|youtube\.com/(?:shorts|embed|live)/)([\w-]{11})",s)
 return m[1] if m else None
def get_meta(source):
 id=video_id(source)
 if id:
  return json.loads(run(["yt-dlp","--dump-single-json","--skip-download","--no-playlist","https://www.youtube.com/watch?v="+id]))
 if source.startswith("@"):raise RuntimeError("AMBIGUOUS_CHANNEL_ONLY: specify a video title or URL")
 data=json.loads(run(["yt-dlp","--dump-single-json","--skip-download","ytsearch5:"+source]))
 opts=[i for i in data.get("entries",[]) if i and i.get("id")]
 rank=sorted([(SequenceMatcher(None,source.lower(),(x.get("title") or "").lower()).ratio(),x) for x in opts],key=lambda i:-i[0])
 if not rank or rank[0][0]<.52 or len(rank)>1 and rank[0][0]-rank[1][0]<.10:
  print(json.dumps({"status":"NEED_SOURCE","candidates":[{"id":x.get("id"),"title":x.get("title"),"channel":x.get("uploader")} for _,x in rank]},ensure_ascii=False),file=sys.stderr)
  raise RuntimeError("SOURCE_AMBIGUOUS")
 return get_meta("https://www.youtube.com/watch?v="+rank[0][1]["id"])
def seconds(s):
 return sum(float(x.replace(",","."))*60**i for i,x in enumerate(reversed(s.split(":"))))
def from_vtt(content):
 arr=[]
 for b in re.split(r"\n\s*\n",content.replace("\r","")):
  lines=b.strip().splitlines();i=next((i for i,x in enumerate(lines) if "-->" in x),-1)
  if i<0:continue
  m=re.search(r"(\d\d:\d\d(?::\d\d)?[.,]\d+)\s+-->\s+(\d\d:\d\d(?::\d\d)?[.,]\d+)",lines[i])
  if not m:continue
  a,z=seconds(m[1]),seconds(m[2]);t=html.unescape(re.sub(r"<[^>]+>","", " ".join(lines[i+1:]))).strip()
  if 0<=a<z and z-a<=120 and t:arr.append({"start":a,"end":z,"text":t})
 return sorted(arr,key=lambda x:x["start"])
def captions(id):
 problems=[]
 try:
  from youtube_transcript_api import YouTubeTranscriptApi
  rows=YouTubeTranscriptApi().fetch(id,languages=["es","es-419","en"]).to_raw_data()
  a=[{"start":float(x["start"]),"end":float(x["start"])+float(x["duration"]),"text":x["text"]} for x in rows if x.get("text")]
  if len(a)>4:return a,"youtube-transcript-api"
 except Exception as e:problems.append(str(e)[:110])
 with tempfile.TemporaryDirectory() as tmp:
  try:
   run(["yt-dlp","--skip-download","--write-subs","--write-auto-subs","--sub-langs","es.*,en.*","--sub-format","vtt","-o",tmp+"/%(id)s.%(ext)s","https://www.youtube.com/watch?v="+id],150)
   for p in sorted(pathlib.Path(tmp).glob("*.vtt")):
    a=from_vtt(p.read_text(encoding="utf8"))
    if len(a)>4:return a,"yt-dlp-vtt"
  except Exception as e:problems.append(str(e)[:110])
 raise RuntimeError("NO_TIMED_TRANSCRIPT: "+" | ".join(problems))
def main():
 p=argparse.ArgumentParser();p.add_argument("--source",required=True);p.add_argument("--out",required=True);p.add_argument("--topic",default="");a=p.parse_args()
 meta=get_meta(a.source);cues,provider=captions(meta["id"])
 out={"schema":"prometeo.av.timed-transcript/v1","videoId":meta["id"],"title":meta.get("title"),"channel":meta.get("uploader"),"duration":meta.get("duration"),"topic":a.topic,"provider":provider,"rights":"embed","cues":cues}
 dest=pathlib.Path(a.out);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps(out,ensure_ascii=False),encoding="utf8")
 print(json.dumps({"status":"TIMED_TRANSCRIPT_VERIFIED","videoId":meta["id"],"cueCount":len(cues),"provider":provider},ensure_ascii=False))
if __name__=="__main__":
 try:main()
 except Exception as e:print("INGEST_FAIL "+str(e),file=sys.stderr);sys.exit(2)
