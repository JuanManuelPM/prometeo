import base64, json, pathlib, subprocess, tempfile, unittest
from playwright.sync_api import sync_playwright
BASE=pathlib.Path(__file__).parent
HTML=(BASE/'index.html').read_text(encoding='utf-8')

def synthetic_media(out):
    cmd=['ffmpeg','-nostdin','-y','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x180:rate=25','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','10','-c:v','libx264','-preset','ultrafast','-crf','32','-pix_fmt','yuv420p','-c:a','aac','-b:a','64k','-movflags','+faststart',str(out)]
    subprocess.run(cmd,check=True,timeout=40)

def tiny_story():
    s=json.loads((BASE/'story.json').read_text(encoding='utf-8'))
    for i,n in enumerate(s['nodes']):n.update(start=.2+i*1.4,end=1.3+i*1.4)
    s['source']['lengthSeconds']=10
    return s

class JourneyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        output=pathlib.Path(cls.temp.name)/'media.mp4'
        synthetic_media(output)
        cls.video='data:video/mp4;base64,'+base64.b64encode(output.read_bytes()).decode('ascii')
        cls.p=sync_playwright().start();cls.browser=cls.p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        cls.graph=tiny_story()
    @classmethod
    def tearDownClass(cls):cls.browser.close();cls.p.stop();cls.temp.cleanup()
    def new(self,w=390,h=844,with_media=True):
        page=self.browser.new_page(viewport={'width':w,'height':h},is_mobile=True,has_touch=True)
        page.goto('about:blank')
        page.evaluate('([graph,source])=>{window.__QA_STORY=graph; window.__QA_SRC=source;}',[self.graph,self.video if with_media else None])
        page.set_content(HTML,wait_until='load')
        return page
    def until(self,page,kind,timeout=12000):
        page.wait_for_function('(state)=>window.__sequenceQA.phase()===state',arg=kind,timeout=timeout)
    def test_unlock_and_decisions_are_not_flat_menu(self):
        page=self.new();e=page.evaluate('window.__sequenceQA.story.nodes.map(x=>x.id)');self.assertEqual(e,['a1','a2','b1','c1','c2'])
        self.assertTrue(page.locator('#cover').is_visible())
        page.locator('#enter').click();self.until(page,'hub');self.assertIn('0/2',page.locator('#reward-progress').inner_text())
        self.assertEqual(page.locator('#paths .path').count(),3)
        self.assertIn('locked',page.locator('#reward').get_attribute('class'))
        page.locator('#paths .path').nth(0).click();self.until(page,'video')
        self.assertFalse(page.locator('#film').evaluate('(v)=>v.controls'))
        self.assertFalse(page.locator('#film').evaluate('(v)=>v.paused'))
        result=page.evaluate("() => { const v=document.querySelector('#film'), s=document.querySelector('#video-shield');const was=v.paused;s.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));return {was,now:v.paused}; }");self.assertEqual(result,{'was':False,'now':False})
        self.until(page,'decision');self.assertEqual(page.evaluate('window.__sequenceQA.current()'),'a1')
        self.assertTrue(page.locator('#decision-options').get_by_text('¿ES LO MISMO QUE DEPRESIÓN?').is_visible())
        page.get_by_text('¿ES LO MISMO QUE DEPRESIÓN?').click();self.until(page,'decision')
        self.assertEqual(page.evaluate('window.__sequenceQA.current()'),'a2')
        self.assertEqual(page.evaluate('window.__sequenceQA.completed()'),['sentir'])
        page.locator('#decision-hub').click();self.until(page,'hub');self.assertIn('1/2',page.locator('#reward-progress').inner_text())
        page.locator('#paths .path').nth(1).click();self.until(page,'decision');self.assertTrue(page.evaluate('window.__sequenceQA.unlocked()'))
        page.locator('#decision-hub').click();self.until(page,'hub');self.assertFalse('locked' in page.locator('#reward').get_attribute('class'))
        page.locator('#reward').click();self.until(page,'synthesis')
        self.assertIn('ENTENDER NO ES',page.locator('#synthesis-title').inner_text())
        page.screenshot(path=str(BASE/'qa-mobile-reward.png'))
        page.close()
    def test_branch_three_subtopic_gate(self):
        page=self.new(844,390);page.locator('#enter').click();page.locator('#paths .path').nth(2).click();self.until(page,'decision');self.assertEqual(page.evaluate('window.__sequenceQA.current()'),'c1');self.assertNotIn('salida',page.evaluate('window.__sequenceQA.completed()'))
        page.get_by_text('¿CUÁNDO PEDIR AYUDA?').click();self.until(page,'decision');self.assertIn('salida',page.evaluate('window.__sequenceQA.completed()'))
        page.locator('#decision-hub').click();page.screenshot(path=str(BASE/'qa-landscape-hub.png'))
        page.close()
    def test_no_source_is_honest(self):
        page=self.new(with_media=False);page.locator('#enter').click();page.locator('#paths .path').nth(0).click()
        self.assertTrue(page.locator('#source-error').is_visible());self.assertTrue(page.locator('#choose-file').is_visible());self.assertFalse(page.locator('#film').evaluate('(v)=>!!v.currentSrc'))
        page.close()
    def test_desktop_visual_overflow(self):
        page=self.new(1280,720);page.locator('#enter').click();page.screenshot(path=str(BASE/'qa-desktop-hub.png'))
        metrics=page.evaluate('({viewport:innerWidth,content:document.documentElement.scrollWidth})');self.assertLessEqual(metrics['content'],metrics['viewport']+2)
        page.close()

if __name__=='__main__':unittest.main(verbosity=2)
