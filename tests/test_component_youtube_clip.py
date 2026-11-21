import pathlib, unittest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'componentes/youtube-clip/v1/player.js').read_text()
DEMO = (ROOT / 'componentes/youtube-clip/v1/index.html').read_text().replace('<script src="./player.js"></script>', '<script>' + SOURCE + '</script>')
MOCK = r'''
window.__players = [];
window.YT = {
 PlayerState: {UNSTARTED:-1, ENDED:0, PLAYING:1, PAUSED:2, BUFFERING:3, CUED:5},
 Player: class MockPlayer {
  constructor(slot, opts) {
   this.opts = opts; this.calls = []; this.time = 0;
   const iframe=document.createElement('iframe');
   iframe.style.cssText='width:100%;height:100%;border:0;background:#1e3829';
   iframe.srcdoc='<!doctype html><body style="margin:0;background:#1c4334;color:white;display:grid;place-items:center;font:30px Arial">VIDEO</body>';
   document.getElementById(slot).replaceWith(iframe);this.iframe=iframe;
   window.__players.push(this);
   setTimeout(()=>opts.events.onReady({target:this}),1);
  }
  cueVideoById(x) {this.calls.push({kind:'cue', ...x});this.time=x.startSeconds;}
  loadVideoById(x) {this.calls.push({kind:'load', ...x});this.time=x.startSeconds;}
  playVideo() {this.calls.push({kind:'play'});this.opts.events.onStateChange({data:1});}
  pauseVideo() {this.calls.push({kind:'pause'});this.opts.events.onStateChange({data:2});}
  getCurrentTime(){return this.time;}
  destroy(){this.calls.push({kind:'destroy'});this.iframe.remove();}
 }
};
'''

class UniversalClipTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.pw=sync_playwright().start()
  cls.browser=cls.pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 @classmethod
 def tearDownClass(cls): cls.browser.close();cls.pw.stop()
 def page(self,w=390,h=844):
  p=self.browser.new_page(viewport={'width':w,'height':h})
  p.add_init_script(MOCK)
  p.goto('about:blank')
  p.set_content(DEMO, wait_until='load')
  p.wait_for_function('window.__players.length===1 && window.__players[0].calls.some(x=>x.kind==="cue")')
  return p
 def test_url_validation(self):
  p=self.page()
  actual=p.evaluate('''() => [
   PrometeoYouTubeClip.videoId('https://youtu.be/CgIGel3zXEI?si=abc'),
   PrometeoYouTubeClip.videoId('https://youtube.com/watch?v=CgIGel3zXEI'),
   PrometeoYouTubeClip.videoId('https://www.youtube.com/shorts/CgIGel3zXEI'),
   PrometeoYouTubeClip.videoId('CgIGel3zXEI')
  ]''')
  self.assertEqual(actual,['CgIGel3zXEI']*4)
  for bad in ['http://youtube.com/watch?v=CgIGel3zXEI','https://www.youtube.com.evil.co/watch?v=CgIGel3zXEI','https://example.org/watch?v=CgIGel3zXEI','https://youtube.com/playlist?list=XX','no']:
   self.assertTrue(p.evaluate('v=>{try{PrometeoYouTubeClip.videoId(v);return false}catch{return true}}',bad),bad)
  p.close()
 def test_timestamps_and_range_validation(self):
  p=self.page()
  self.assertEqual(p.evaluate("PrometeoYouTubeClip.seconds('01:02:03.5')"),3723.5)
  self.assertEqual(p.evaluate("PrometeoYouTubeClip.seconds('02:36')"),156)
  for args in [['https://youtu.be/CgIGel3zXEI','03:16','02:36'], ['https://youtu.be/CgIGel3zXEI','02:36','02:36']]:
   self.assertTrue(p.evaluate('a=>{try{PrometeoYouTubeClip.clipSpec({url:a[0],start:a[1],end:a[2]});return false}catch{return true}}',args))
  p.close()
 def test_single_player_reused_for_multiple_clips(self):
  p=self.page()
  p.locator('#play').click()
  self.assertEqual(p.evaluate('window.__players[0].calls.find(x=>x.kind==="load")'),{'kind':'load','videoId':'CgIGel3zXEI','startSeconds':156,'endSeconds':196})
  p.locator('#start').fill('05:57');p.locator('#end').fill('06:58')
  p.locator('#play').click()
  self.assertEqual(p.evaluate('window.__players[0].calls.filter(x=>x.kind==="load").at(-1)'),{'kind':'load','videoId':'CgIGel3zXEI','startSeconds':357,'endSeconds':418})
  self.assertEqual(p.evaluate('window.__players.length'),1)
  p.close()
 def test_end_callback_and_no_tapping(self):
  p=self.page()
  p.locator('#play').click()
  p.wait_for_function("document.getElementById('status').textContent==='REPRODUCIENDO'")
  self.assertEqual(p.evaluate("document.querySelector('.screen iframe').style.pointerEvents"),'none')
  self.assertEqual(p.evaluate("clip.state") if p.evaluate("typeof clip !== 'undefined'") else p.evaluate("window.__players[0].calls.at(-1).kind"),'playing')
  p.evaluate('window.__players[0].time=196.05')
  p.wait_for_function("document.getElementById('status').textContent==='FIN DEL FRAGMENTO'",timeout=2500)
  self.assertEqual(p.evaluate('window.__players[0].calls.filter(x=>x.kind==="pause").length'),1)
  p.close()
 def test_autoplay_fallback_reenables_touch(self):
  p=self.page()
  p.locator('#play').click()
  p.evaluate('window.__players[0].opts.events.onAutoplayBlocked()')
  self.assertEqual(p.evaluate("document.querySelector('.screen iframe').style.pointerEvents"),'auto')
  self.assertIn('TOCÁ PLAY',p.locator('#status').inner_text())
  p.close()
 def test_3d_surface_geometry_and_mobile(self):
  for w,h in [(390,844),(844,390),(1280,720)]:
   p=self.page(w,h)
   geom=p.evaluate('''() => {
    const v=document.querySelector('.screen'), i=document.querySelector('.screen iframe'), s=document.querySelector('.scene');
    return {width:v.offsetWidth,height:v.offsetHeight,ratio:v.offsetWidth/v.offsetHeight,transform:getComputedStyle(s).transform,iframe:i!==null};}''')
   self.assertTrue(geom['iframe'])
   self.assertGreater(geom['width'],200)
   self.assertAlmostEqual(geom['ratio'],16/9,delta=.06)
   self.assertNotEqual(geom['transform'],'none')
   p.locator('#angle').click()
   self.assertTrue(p.locator('#scene').evaluate('(e)=>e.classList.contains("flat")'))
   p.close()
 def test_no_dependency_on_specific_story_or_signed_mp4(self):
  self.assertNotIn('vidIQ',SOURCE)
  self.assertNotIn('healthygamer',SOURCE.lower())
  self.assertNotIn('<iframe',DEMO.lower()) # iframe constructed at runtime by the YouTube API
  self.assertNotIn('storage.googleapis.com',SOURCE)
 def test_bad_input_does_not_replace_working_player(self):
  p=self.page()
  p.locator('#url').fill('https://example.com/')
  p.locator('#play').click()
  self.assertEqual(p.evaluate('window.__players.length'),1)
  self.assertIn('EXPECTED',p.locator('#status').inner_text())
  p.close()

if __name__=='__main__':unittest.main(verbosity=2)
