import contextlib
import http.server
import pathlib
import socketserver
import threading
import time

import pytest
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
MOCK_API = r'''
window.YT = {
  PlayerState: {ENDED:0,PLAYING:1,PAUSED:2},
  Player: function(id,config){
    const p = this;
    this.loaded=[];
    this.now=0;
    this.paused=false;
    this.muted=false;
    this.cfg=config;
    this.loadVideoById=function(x){p.loaded.push(x);p.now=x.startSeconds;};
    this.playVideo=function(){p.paused=false;config.events.onStateChange({data:1,target:p});};
    this.pauseVideo=function(){p.paused=true;};
    this.getCurrentTime=function(){return p.now;};
    this.mute=function(){p.muted=true;};
    this.unMute=function(){p.muted=false;};
    this.finish=function(){config.events.onStateChange({data:0,target:p});};
    this.setTime=function(t){p.now=t;};
    window.__mockPlayer = this;
    setTimeout(function(){config.events.onReady({target:p});},0);
  }
};
window.onYouTubeIframeAPIReady();
'''

@pytest.fixture(scope='module')
def setup():
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        yield browser
        browser.close()

def page_for(setup, viewport):
    browser=setup
    page=browser.new_page(viewport=viewport,device_scale_factor=1)
    html=(ROOT/'index.html').read_text().replace('<link rel="stylesheet" href="./styles.css?v=1">','').replace('<script src="./presentation.js?v=1" defer></script>','')
    page.set_content(html,wait_until='domcontentloaded')
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.add_script_tag(content=(ROOT/'presentation.js').read_text())
    page.evaluate(MOCK_API)
    page.wait_for_function('window.__presentationQA && window.__presentationQA.isPlayerReady()')
    return page

def test_segment_auto_advance_and_arrows(setup):
    page=page_for(setup, {'width':1280,'height':720})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    assert page.locator('button').count()==2
    assert page.evaluate('window.__presentationQA.getIndex()')==0
    assert page.locator('h1').inner_text().startswith('UNA HISTORIA.')
    page.locator('#next').click()
    assert page.evaluate('window.__presentationQA.getIndex()')==1
    assert page.locator('#film').evaluate('(el)=>el.classList.contains("is-on")')
    loaded=page.evaluate('window.__mockPlayer.loaded.at(-1)')
    assert loaded=={'videoId':'aqz-KE-bpKQ','startSeconds':65,'endSeconds':77}
    page.evaluate('window.__mockPlayer.setTime(76.98)')
    page.wait_for_function('window.__presentationQA.getIndex()===2')
    assert not page.locator('#film').evaluate('(el)=>el.classList.contains("is-on")')
    assert page.locator('.concept').get_attribute('aria-hidden')=='false'
    page.locator('#previous').click()
    assert page.evaluate('window.__presentationQA.getIndex()')==1
    page.locator('#next').click()
    page.locator('#next').click()
    assert page.evaluate('window.__presentationQA.getIndex()')==3
    loaded=page.evaluate('window.__mockPlayer.loaded.at(-1)')
    assert loaded['startSeconds']==142 and loaded['endSeconds']==153
    page.evaluate('window.__mockPlayer.finish()')
    assert page.evaluate('window.__presentationQA.getIndex()')==4
    page.screenshot(path='/mnt/data/prometeo_deck_build/tests/statement.png')
    page.locator('#next').click()
    assert page.evaluate('window.__presentationQA.getIndex()')==5
    page.evaluate('window.__mockPlayer.finish()')
    assert page.evaluate('window.__presentationQA.getIndex()')==6
    assert page.locator('#next').is_disabled()
    page.screenshot(path='/mnt/data/prometeo_deck_build/tests/ending.png')
    assert not errors, errors
    page.close()

def test_layout_landscape_and_portrait(setup):
    for viewport,shot in [({'width':1280,'height':720},'cover-landscape.png'),({'width':390,'height':844},'cover-portrait.png')]:
        page=page_for(setup,viewport)
        assert page.locator('html').evaluate('(el)=>el.scrollWidth <= window.innerWidth+1')
        assert page.locator('html').evaluate('(el)=>el.scrollHeight <= window.innerHeight+1')
        r=page.locator('#stage').bounding_box()
        assert abs(r['width']-viewport['width'])<2,(viewport,r)
        assert abs(r['height']-viewport['height'])<2,(viewport,r)
        page.screenshot(path='/mnt/data/prometeo_deck_build/tests/'+shot)
        page.close()

def test_auto_timed_concept(setup):
    page=page_for(setup,{'width':1280,'height':720})
    page.locator('#next').click()
    page.locator('#next').click()
    assert page.evaluate('window.__presentationQA.getIndex()')==2
    page.wait_for_function('window.__presentationQA.getIndex()===3',timeout=10000)
    assert page.evaluate('window.__mockPlayer.loaded.at(-1).startSeconds')==142
    page.close()