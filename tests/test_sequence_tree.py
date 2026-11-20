"""Executable tests of the responsive branching tree and visible video frames."""
import base64,copy,io,json,pathlib,subprocess,tempfile,unittest
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
PAGE=(ROOT/'presentacion/montaje/arbol/index.html').read_text(encoding='utf8')
STORY=json.loads((ROOT/'presentacion/montaje/arbol/story.json').read_text(encoding='utf8'))

def run(*args):
 subprocess.run(list(args),check=True,timeout=50,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
class TreeBrowserTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory()
  cls.mp4=pathlib.Path(cls.tmp.name)/'movie.mp4'
  run('ffmpeg','-y','-nostdin','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=24',
      '-f','lavfi','-i','sine=frequency=350:sample_rate=48000','-t','9',
      '-c:v','libx264','-preset','ultrafast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','80k','-movflags','+faststart',str(cls.mp4))
  cls.audio=pathlib.Path(cls.tmp.name)/'audio.m4a'
  run('ffmpeg','-y','-nostdin','-loglevel','error','-f','lavfi','-i','sine=frequency=450:sample_rate=48000','-t','9','-c:a','aac','-b:a','80k',str(cls.audio))
  cls.source='data:video/mp4;base64,'+base64.b64encode(cls.mp4.read_bytes()).decode()
  cls.audioSource='data:audio/mp4;base64,'+base64.b64encode(cls.audio.read_bytes()).decode()
  cls.play=sync_playwright().start()
  cls.browser=cls.play.chromium.launch(executable_path='/usr/bin/chromium' if pathlib.Path('/usr/bin/chromium').exists() else None,headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 @classmethod
 def tearDownClass(cls):cls.browser.close();cls.play.stop();cls.tmp.cleanup()
 def page(self,width=390,height=844,source='video',delay=10000):
  page=self.browser.new_page(viewport={'width':width,'height':height},is_mobile=width<700,has_touch=True)
  s=copy.deepcopy(STORY)
  for i,n in enumerate(s['nodes']):n['start']=.2+i*1.65;n['end']=1.6+i*1.65
  s['source']['lengthSeconds']=9
  src={'video':self.source,'audio':self.audioSource,'none':None}[source]
  page.goto('about:blank')
  page.evaluate('([s,src,delay])=>{window.__QA_STORY=s;window.__QA_SRC=src;window.__QA_FRAME_TIMEOUT_MS=delay}',[s,src,delay])
  page.set_content(PAGE,wait_until='load')
  return page
 def test_tree_vertical_mobile_and_landscape(self):
  for w,h in [(390,844),(844,390),(1280,720)]:
   p=self.page(w,h)
   self.assertEqual(p.locator('#nodes .tree-node').count(),5)
   state=p.evaluate('''() => ({scroll:document.getElementById('scroll').scrollHeight,
       client:document.getElementById('scroll').clientHeight,
       fullWidth:document.getElementById('scroll').scrollWidth,
       viewWidth:document.getElementById('scroll').clientWidth,
       branches:document.querySelectorAll('#lines path').length,
       map:document.getElementById('map').classList.contains('off')})''')
   self.assertGreater(state['scroll'],state['client']*1.25,state)
   self.assertLessEqual(state['fullWidth'],state['viewWidth']+2,state)
   self.assertGreaterEqual(state['branches'],6,state)
   self.assertFalse(state['map'])
   p.locator('#scroll').evaluate('(x)=>x.scrollTop=600')
   self.assertGreater(p.evaluate('document.getElementById("scroll").scrollTop'),250)
   p.close()
 def test_tap_video_visible_and_back_preserves_scroll(self):
  p=self.page()
  p.locator('#scroll').evaluate('(x)=>x.scrollTop=520')
  p.locator('[data-node="a2"]').click()
  p.wait_for_function('()=>window.__sequenceTreeQA.phase()==="video"',timeout=12000)
  ev=p.evaluate('window.__sequenceTreeQA.frameProof()')
  self.assertTrue(ev['confirmed'],ev)
  self.assertEqual(ev['method'],'REQUEST_VIDEO_FRAME_CALLBACK')
  self.assertFalse(p.evaluate('document.getElementById("film").paused'))
  self.assertEqual(p.evaluate('document.getElementById("film").controls'),False)
  self.assertFalse(p.evaluate('document.getElementById("map").classList.contains("off")===false'))
  image=Image.open(io.BytesIO(p.screenshot())).convert('RGB')
  samples=[image.getpixel((x,y)) for y in range(320,540,16) for x in range(40,350,16)]
  colored=sum(1 for r,g,b in samples if max(r,g,b)>85 and max(r,g,b)-min(r,g,b)>35)
  self.assertGreater(colored,15,colored)
  (ROOT/'tests'/'qa-tree-video-frame.png').write_bytes(p.screenshot())
  p.locator('#shield').dispatch_event('pointerup')
  self.assertFalse(p.evaluate('document.getElementById("film").paused'))
  p.locator('#back').click()
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.phase()'),'map')
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.watched()'),[])
  self.assertGreater(p.evaluate('document.getElementById("scroll").scrollTop'),300)
  p.close()
 def test_finish_unlock_after_two_paths_and_visit_any_node(self):
  p=self.page()
  # Enter a child directly, without choosing a parent or following two-option decision menu.
  for node_id in ['a2','b1']:
   p.locator('[data-node="'+node_id+'"]').click()
   p.wait_for_function('()=>window.__sequenceTreeQA.phase()==="map"&&window.__sequenceTreeQA.watched().includes("'+node_id+'")',timeout=14000)
  self.assertEqual(set(p.evaluate('window.__sequenceTreeQA.completed()')),{'sentir','circuito'})
  self.assertTrue(p.evaluate('window.__sequenceTreeQA.unlocked()'))
  self.assertFalse(p.locator('#reward').is_disabled())
  p.locator('#reward').click()
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.phase()'),'ending')
  p.locator('#back').click()
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.phase()'),'map')
  self.assertEqual(p.locator('#nodes .tree-node').count(),5)
  p.close()
 def test_audio_only_never_unlocks(self):
  p=self.page(source='audio',delay=1500)
  p.locator('[data-node="b1"]').click()
  p.wait_for_function('()=>window.__sequenceTreeQA.phase()==="error"',timeout=6500)
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.watched()'),[])
  self.assertFalse(p.evaluate('window.__sequenceTreeQA.unlocked()'))
  p.locator('#warning-return').click()
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.phase()'),'map')
  p.close()
 def test_no_media_does_not_pretend_played(self):
  p=self.page(source='none')
  p.locator('[data-node="a1"]').click()
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.phase()'),'error')
  self.assertEqual(p.evaluate('window.__sequenceTreeQA.watched()'),[])
  p.close()
 def test_media_preservation_and_data_recipe(self):
  self.assertIn('PrometeoVideoFrameGuard.create(film)',PAGE)
  self.assertIn('REQUEST_VIDEO_FRAME_CALLBACK',PAGE)
  self.assertIn('#cinema{position:absolute;inset:0;z-index:1;display:block!important',PAGE)
  self.assertNotIn('<iframe',PAGE.lower())
  self.assertNotIn('<p id="',PAGE)
  self.assertEqual([x['id'] for x in STORY['nodes']],['a1','a2','b1','c1','c2'])
  self.assertEqual({x['id']: (x['start'],x['end']) for x in STORY['nodes']},{'a1':(156,196),'a2':(196,227),'b1':(357,418),'c1':(887,939),'c2':(1030,1072)})
if __name__=='__main__':unittest.main(verbosity=2)
