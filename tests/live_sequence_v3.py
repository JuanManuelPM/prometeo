#!/usr/bin/env python3
"""Live YouTube IFrame browser probe on PUBLIC GitHub Pages.
This is independent of mock-based interaction tests and is permitted to report NOT_VERIFIED
when the runner's network/IP or YouTube policy prevents genuine playback.
"""
import argparse,json,pathlib,time
from playwright.sync_api import sync_playwright
def probe(url):
  result={"schema":"prometeo.sequence-live-playback-qa/v1",
          "url":url,"status":"NOT_VERIFIED","playerReady":False,"playbackAdvanced":False,
          "sample":None,"reason":""}
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    try:
      page=browser.new_page(viewport={"width":1280,"height":720})
      try:
        resp=page.goto(url,wait_until="domcontentloaded",timeout=25000)
        result["httpStatus"]=resp.status if resp else None
        if not resp or resp.status!=200:raise RuntimeError("Public site did not return HTTP 200")
        page.wait_for_function("window.__sequenceQA && window.__sequenceQA.state().ready.some(Boolean)",timeout=25000)
        result["playerReady"]=True
        page.locator(".episode").first.click(timeout=8000)
        page.locator("#next").click(timeout=4000)
        page.locator("#next").click(timeout=4000)
        page.wait_for_function("""()=>{const a=window.__sequenceQA.runtime?__sequenceQA.runtime():players.map(p=>({state:p?.getPlayerState(),time:p?.getCurrentTime()}));return a.some(s=>s.state===1&&s.time>601)}""",timeout=25000)
        values=page.evaluate("""()=>__sequenceQA.runtime?__sequenceQA.runtime():players.map(p=>({state:p?.getPlayerState(),time:p?.getCurrentTime()}))""")
        t1=max(x.get("time") or 0 for x in values)
        page.wait_for_timeout(1300)
        values=page.evaluate("__sequenceQA.runtime()")
        t2=max(x.get("time") or 0 for x in values)
        result["sample"]={"t1":t1,"t2":t2}
        if t2<t1+.5:raise RuntimeError(f"YouTube playback did not advance: {t1}, {t2}")
        result["playbackAdvanced"]=True;result["status"]="PASS";result["reason"]="Real YouTube IFrame time advanced in a Chrome browser; audio not audibly verified"
      except Exception as e:
        result["reason"]=type(e).__name__+": "+str(e)[:500]
      return result
    finally:browser.close()
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--url",required=True);p.add_argument("--out",required=True);args=p.parse_args()
 result=probe(args.url)
 path=pathlib.Path(args.out);path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
 print(json.dumps(result,ensure_ascii=False))
 if result["status"]!="PASS":raise SystemExit(1)
