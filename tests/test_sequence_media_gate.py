"""Regression gate: actual visible pixels + playable sound, not simply play() resolving."""
import base64, copy, io, json, pathlib, subprocess, tempfile, unittest, shutil
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=(ROOT/'presentacion/montaje/elige-tu-camino/index.html').read_text(encoding='utf-8')
STORY=json.loads((ROOT/'presentacion/montaje/elige-tu-camino/story.json').read_text(encoding='utf-8'))

def run(cmd):subprocess.run(cmd,check=True,timeout=45,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

def source_data(path,mime):return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()

class MediaVisibilityGate(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory()
        p=pathlib.Path(cls.tmp.name)
        cls.mp4=p/'colored.mp4'
        run(['ffmpeg','-nostdin','-y','-loglevel','error','-f','lavfi','-i','testsrc2=size=640x360:rate=24',
             '-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','9',
             '-c:v','libx264','-preset','ultrafast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',str(cls.mp4)])
        cls.audio=p/'only_audio.m4a'
        run(['ffmpeg','-nostdin','-y','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','9','-c:a','aac','-b:a','96k',str(cls.audio)])
        cls.video=source_data(cls.mp4,'video/mp4');cls.audioonly=source_data(cls.audio,'audio/mp4')
        cls.p=sync_playwright().start()
        chrome=next((shutil.which(name) for name in ('google-chrome','google-chrome-stable','chromium','chromium-browser') if shutil.which(name)),None)
        print('SECUENCIA_MEDIA_GATE_BROWSER',chrome or 'bundled chromium',flush=True)
        cls.browser=cls.p.chromium.launch(executable_path=chrome,headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    @classmethod
    def tearDownClass(cls):cls.browser.close();cls.p.stop();cls.tmp.cleanup()
    def page(self,w=390,h=844,source='video',timeout=5000,medium=False):
        p=self.browser.new_page(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
        story=copy.deepcopy(STORY)
        for i,n in enumerate(story['nodes']):n.update(start=.1+i*1.55,end=1.45+i*1.55)
        if medium:story['nodes'][0]['end']=5.5
        story['source']['lengthSeconds']=9
        p.goto('about:blank')
        val={'video':self.video,'audio':self.audioonly,'none':None}[source]
        p.evaluate('([story,source,timeout])=>{window.__QA_STORY=story;window.__QA_SRC=source;window.__QA_FRAME_TIMEOUT_MS=timeout}',[story,val,timeout])
        p.set_content(HTML,wait_until='load')
        return p
    def state(self,p,s,timeout=10000):
        p.wait_for_function('(s)=>window.__sequenceQA.phase()===s',arg=s,timeout=timeout)
    def test_mobile_video_pixels_not_just_audio(self):
        p=self.page(medium=True)
        p.locator('#enter').click();p.locator('#paths .path').first.click()
        # Guard ensures the composited video exists even underneath the editorial prelude.
        p.wait_for_function('()=>window.__sequenceQA.videoComposited()',timeout=1500)
        self.state(p,'video')
        proof=p.evaluate('window.__sequenceQA.frameProof()')
        self.assertTrue(proof['confirmed'],proof)
        self.assertEqual(proof['method'],'REQUEST_VIDEO_FRAME_CALLBACK')
        self.assertGreater(proof['width'],0);self.assertGreater(proof['height'],0)
        self.assertTrue(p.evaluate('!document.querySelector("#film").paused'))
        # The old tests never inspected pixels. A colored video may NOT produce an all-black screenshot.
        shot=p.screenshot();photo=Image.open(io.BytesIO(shot)).convert('RGB')
        (ROOT/'tests'/'qa-painted-frame-mobile.png').write_bytes(shot)
        W,H=photo.size
        samples=[photo.getpixel((x,y)) for y in range(int(H*.38),int(H*.61),10) for x in range(int(W*.18),int(W*.85),11)]
        colored=sum(1 for r,g,b in samples if max(r,g,b)>85 and (max(r,g,b)-min(r,g,b))>34)
        self.assertGreater(colored,10,f'Audio-only black-screen regression, colored pixels={colored}')
        # No native UI when tapping film; no pause.
        p.evaluate('document.querySelector("#video-shield").dispatchEvent(new PointerEvent("pointerup",{bubbles:true}))')
        self.assertTrue(p.evaluate('!document.querySelector("#film").paused'))
        self.assertFalse(p.evaluate('document.querySelector("#film").controls'))
        p.close()
    def test_video_is_composited_during_editorial_overlay(self):
        p=self.page(medium=True)
        p.locator('#enter').click();p.locator('#paths .path').first.click()
        # The old implementation had display:none on #video-view at this moment,
        # although play() had already been called; this invariant forbids that regression.
        self.state(p,'interlude')
        self.assertEqual(p.evaluate('getComputedStyle(document.querySelector("#video-view")).display'),'block')
        self.assertTrue(p.evaluate('window.__sequenceQA.videoComposited()'))
        self.state(p,'video')
        self.assertTrue(p.evaluate('window.__sequenceQA.frameReady()'))
        p.close()
    def test_landscape_video_composited(self):
        p=self.page(844,390,medium=True)
        p.locator('#enter').click();p.locator('#paths .path').nth(1).click()
        self.state(p,'video')
        self.assertTrue(p.evaluate('window.__sequenceQA.frameReady()'))
        props=p.evaluate('''() => {const v=document.getElementById('film');const p=v.parentElement;
          return {display:getComputedStyle(p).display,w:v.getBoundingClientRect().width,h:v.getBoundingClientRect().height,
          opacity:getComputedStyle(p).opacity,composited:window.__sequenceQA.videoComposited()}}''')
        self.assertEqual(props['display'],'block');self.assertTrue(props['composited']);self.assertGreater(props['w'],600)
        p.close()
    def test_audio_only_is_blocked_not_marked_watched(self):
        p=self.page(source='audio',timeout=1600)
        p.locator('#enter').click();p.locator('#paths .path').first.click()
        self.state(p,'interlude')
        p.wait_for_selector('#source-error.visible',timeout=7000)
        self.assertFalse(p.evaluate('window.__sequenceQA.frameReady()'))
        self.assertFalse(p.evaluate('window.__sequenceQA.video.videoWidth>0'))
        self.assertEqual(p.evaluate('window.__sequenceQA.watched()'),[])
        self.assertEqual(p.evaluate('window.__sequenceQA.completed()'),[])
        self.assertTrue(p.evaluate('window.__sequenceQA.video.paused'))
        p.close()
    def test_path_unlock_not_replaced_by_player_fix(self):
        p=self.page()
        p.locator('#enter').click();p.locator('#paths .path').first.click();self.state(p,'decision')
        self.assertEqual(p.evaluate('window.__sequenceQA.current()'),'a1')
        p.get_by_text('¿ES LO MISMO QUE DEPRESIÓN?').click();self.state(p,'decision')
        self.assertEqual(p.evaluate('window.__sequenceQA.completed()'),['sentir'])
        p.locator('#decision-hub').click();p.locator('#paths .path').nth(1).click();self.state(p,'decision')
        self.assertTrue(p.evaluate('window.__sequenceQA.unlocked()'))
        p.locator('#decision-hub').click();p.locator('#reward').click();self.state(p,'synthesis')
        p.close()
    def test_no_source_and_no_iframe(self):
        p=self.page(source='none')
        self.assertNotIn('<iframe',HTML.lower())
        p.locator('#enter').click();p.locator('#paths .path').first.click()
        p.wait_for_selector('#source-error.visible')
        self.assertEqual(p.evaluate('window.__sequenceQA.watched()'),[])
        p.close()
    def test_engine_is_reusable_not_hardcoded_to_this_story(self):
        self.assertIn('PrometeoVideoFrameGuard.create(film)',HTML)
        self.assertIn('PRESENTED_VIDEO_FRAME',HTML)
        self.assertIn('display:block!important',HTML)
        self.assertIn('"schema":"prometeo.secuencia/branching-v1"',HTML)

if __name__=='__main__':unittest.main(verbosity=2)
