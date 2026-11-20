#!/usr/bin/env python3
"""Representative Chromium playback/navigation QA, using a deliberately mock YouTube API.
Tests actual UI and interaction; DOES NOT claim to test actual YouTube streaming or sound.
"""
import argparse,json,pathlib,sys,time
from playwright.sync_api import sync_playwright

MOCK_API=r"""
(()=>{
 window.__fakeYT={players:[],calls:[]};
 class FakePlayer{
   constructor(id,opts){
     this.id=id;this.opts=opts;this.current=0;this.state=5;this.start=0;this.end=0;this.timer=null;
     window.__fakeYT.players.push(this);
     queueMicrotask(()=>opts.events.onReady());
   }
   record(type,data){
     window.__fakeYT.calls.push({id:this.id,type,data:data||{},at:performance.now()});
   }
   cueVideoById(p){
     this.pauseVideo();this.current=p.startSeconds;this.start=p.startSeconds;this.end=p.endSeconds;
     this.state=5;this.record('cue',p);
   }
   loadVideoById(p){this.cueVideoById(p);this.playVideo();}
   seekTo(n){this.current=n;this.record('seek',{time:n});}
   playVideo(){
     clearInterval(this.timer);this.state=1;this.record('play',{time:this.current});
     this.timer=setInterval(()=>{this.current+=0.3;if(this.end&&this.current>=this.end){
       this.current=this.end;clearInterval(this.timer);this.state=0;
     }},30);
   }
   pauseVideo(){clearInterval(this.timer);this.state=2;this.record('pause');}
   getPlayerState(){return this.state;}
   getCurrentTime(){return this.current;}
 }
 window.YT={Player:FakePlayer};
 window.onYouTubeIframeAPIReady?.();
})();
"""
def assert_eq(actual,expected,msg):
 if actual!=expected:raise AssertionError(f"{msg}: expected {expected!r}, got {actual!r}")
def run(url):
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=["--autoplay-policy=no-user-gesture-required","--disable-features=MediaSessionService"])
  try:
   ctx=browser.new_context(viewport={"width":1280,"height":720},device_scale_factor=1)
   def intercept(route):route.fulfill(status=200,content_type="application/javascript",body=MOCK_API)
   ctx.route("**/youtube.com/iframe_api",intercept)
   page=ctx.new_page(); errors=[]
   page.on("pageerror",lambda e:errors.append(str(e)))
   page.goto(url,wait_until="domcontentloaded")
   page.wait_for_function("window.__sequenceQA && window.__sequenceQA.state().ready.every(Boolean)",timeout=10000)
   assert_eq(page.locator(".arrow").count(),2,"only two navigation arrows")
   assert_eq(page.locator("#cards .episode").count(),1,"single-video library")
   assert_eq(page.locator("#library").is_visible(),True,"library initial")
   page.locator(".episode").first.click()
   page.wait_for_function("__sequenceQA.state().launched",timeout=4000)
   assert_eq(page.evaluate("__sequenceQA.state().index"),0,"cover")
   page.locator("#next").click()
   assert_eq(page.evaluate("__sequenceQA.state().index"),1,"one-second slide")
   page.locator("#next").click()
   page.wait_for_function("__sequenceQA.state().index===2 && __sequenceQA.state().active>=0",timeout=4000)
   s=page.evaluate("__sequenceQA.state()")
   assert_eq(s["kind"],"video","first video")
   events=page.evaluate("__fakeYT.calls")
   assert any(e["type"]=="play" for e in events),"YT play invoked"
   assert any(e["type"]=="cue" and abs(e["data"]["startSeconds"]-1834.41)<.001 for e in events),"next clip cued before transition"
   page.locator("#prev").click()
   page.locator("#prev").click()
   page.locator("#next").click()
   page.wait_for_function("__sequenceQA.state().index===2",timeout=3000)
   calls=page.evaluate("__fakeYT.calls")
   assert sum(1 for c in calls if c["type"]=="seek" and abs(c["data"]["time"]-601.61)<.001)>=2,"revisit seeks clip from beginning"
   # Swipe to next scene: pointerup delta >44px and mostly horizontal.
   page.evaluate("""()=>{
     const x=document.querySelector('#stage'), p={pointerId:7,clientX:900,clientY:350,bubbles:true};
     x.dispatchEvent(new PointerEvent('pointerdown',p));
     x.dispatchEvent(new PointerEvent('pointerup',{...p,clientX:180}));
   }""")
   assert_eq(page.evaluate("__sequenceQA.state().index"),3,"horizontal swipe advances")
   page.wait_for_function("__sequenceQA.state().index===4",timeout=4000)
   assert_eq(page.evaluate("__sequenceQA.state().kind"),"video","one-second text autoadvance")
   # Auto-advance after playback reaches its actual end.
   page.wait_for_function("__sequenceQA.state().index>=5",timeout=11000)
   # No page overflow in wide, narrow; no unexpected JS errors.
   for w,h in [(1280,720),(390,844)]:
    page.set_viewport_size({"width":w,"height":h})
    metrics=page.evaluate("""()=>({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,w:innerWidth,h:innerHeight})""")
    assert metrics["sw"]<=w+1 and metrics["sh"]<=h+1,(w,h,metrics)
   assert not errors,errors
   print("PASS browser: menu, exactly 2 arrows, YouTube cues, next-video priming, re-seek, swipe, 1s slide, auto end, mobile geometry, JS errors")
   ctx.close()
  finally:browser.close()
if __name__=="__main__":
 p=argparse.ArgumentParser();p.add_argument("--url",required=True);a=p.parse_args()
 run(a.url)
