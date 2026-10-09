from pathlib import Path
from urllib.parse import urlparse
import mimetypes
from playwright.sync_api import sync_playwright
import json
ROOT=Path(__file__).resolve().parent.parent
url='https://pulso.example.test/?test=1'
checks=[]
def check(name,condition):
 checks.append((name,bool(condition)));print(('PASS' if condition else 'FAIL'),name)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,viewport,mobile in [('desktop',{'width':1280,'height':800},False),('mobile-portrait',{'width':390,'height':844},True),('mobile-landscape',{'width':844,'height':390},True)]:
  context=browser.new_context(viewport=viewport,is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  import re
  html=(ROOT/'index.html').read_text()
  html=re.sub(r'<script type="module" src="./game.mjs"></script>','',html)
  page.set_content(html,wait_until='domcontentloaded')
  page.add_style_tag(content=(ROOT/'style.css').read_text())
  engine=(ROOT/'engine.mjs').read_text().replace('export const','const').replace('export function','function')
  engine=re.sub(r'\bclamp\b','clampPhysics',engine)
  engine=re.sub(r'\bcar\b','physicsCar',engine)
  gamejs=(ROOT/'game.mjs').read_text()
  gamejs=re.sub(r"^import .*?;\n",'',gamejs,count=1)
  gamejs=gamejs.replace("if(new URLSearchParams(location.search).has('test'))",'if(true)')
  page.add_script_tag(content=engine+'\n'+gamejs)
  page.wait_for_timeout(70)
  check(f'{name}: canvas rendered',page.locator('#field').is_visible() and page.locator('#field').bounding_box()['width']>150)
  page.screenshot(path=str(ROOT/'validation'/f'{name}-intro.png'),full_page=True)
  page.locator('#play').click();page.wait_for_timeout(1450)
  check(f'{name}: match running',page.locator('#gameframe').get_attribute('data-phase')=='playing')
  check(f'{name}: timer advances',page.evaluate('__PULSO_TEST__.snapshot().remaining') < 89)
  start=page.evaluate('__PULSO_TEST__.snapshot().blue.x')
  if mobile:
   stick=page.locator('#stick').bounding_box();sx=stick['x']+stick['width']/2;sy=stick['y']+stick['height']/2
   page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx+40,sy,steps=5);page.wait_for_timeout(500);page.mouse.up()
  else:
   page.keyboard.down('d');page.wait_for_timeout(550);page.keyboard.up('d')
  end=page.evaluate('__PULSO_TEST__.snapshot().blue.x');check(f'{name}: player moves',end>start+10)
  if name=='desktop':
   bx=page.evaluate('__PULSO_TEST__.snapshot().blue.x')
   by=page.evaluate('__PULSO_TEST__.snapshot().blue.y')
   page.evaluate('([x,y])=>__PULSO_TEST__.moveBall(x+95,y)',[bx,by])
   page.keyboard.down('d');page.wait_for_timeout(470);page.keyboard.up('d')
   check('physical hit from keyboard changes ball motion',abs(page.evaluate('__PULSO_TEST__.snapshot().ball.vx'))>50)
   page.evaluate("__PULSO_TEST__.forceGoal('blue')");check('blue goal counts',page.locator('#blueScore').inner_text()=='1')
   page.evaluate("__PULSO_TEST__.forceGoal('orange')");check('orange goal counts',page.locator('#orangeScore').inner_text()=='1')
   page.evaluate('__PULSO_TEST__.forceEnd()');check('finished screen visible',page.locator('#veil').is_visible() and page.locator('#result').inner_text().startswith('FINAL'))
   page.locator('#play').click();check('restart resets score',page.locator('#blueScore').inner_text()=='0' and page.locator('#timer').inner_text()=='01:30')
   page.locator('#sound').click();check('mute button toggles',page.locator('#sound').get_attribute('aria-pressed')=='false')
  page.screenshot(path=str(ROOT/'validation'/f'{name}-playing.png'),full_page=True)
  check(f'{name}: JS no exceptions',not errors)
  if errors:print('ERRORS',errors)
  context.close()
 browser.close()
print(json.dumps({'tests':len(checks),'passed':sum(x[1] for x in checks),'failed':[x[0] for x in checks if not x[1]],'screenshots':6},indent=2))
if not all(x[1] for x in checks):raise SystemExit(1)
