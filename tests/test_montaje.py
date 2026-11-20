import importlib.util, pathlib, tempfile, unittest, json
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('montaje',ROOT/'scripts/presentacion/montaje/render.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class MontageTests(unittest.TestCase):
    def test_card_geometry_and_palette(self):
        from PIL import Image
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)/'card.png'
            m.draw_card({'paper':True,'text':'IDEA.\nUNA NUEVA','kicker':'PROMETEO'},p)
            im=Image.open(p)
            self.assertEqual(im.size,(1280,720))
            self.assertEqual(im.getpixel((0,0)),(240,235,222))
    def test_missing_input(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(FileNotFoundError):m.source_path(pathlib.Path(d),'a.mp4')
    def test_traversal(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):m.source_path(pathlib.Path(d),'../../etc/passwd')
    def test_invalid_recipe(self):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)/'recipe.json'
            p.write_text(json.dumps({'schema':'bad','timeline':[]}))
            with self.assertRaises(ValueError):m.render(p,d,pathlib.Path(d)/'out.mp4')
    def test_demo_has_short_cards_and_three_clips(self):
        r=json.loads((ROOT/'scripts/presentacion/montaje/demo.recipe.json').read_text())
        cards=[s for s in r['timeline'] if s['kind']=='card']
        clips=[s for s in r['timeline'] if s['kind']=='clip']
        self.assertEqual(len(clips),3)
        self.assertEqual(len(cards),4)
        self.assertTrue(all(x['seconds']<=1.0 for x in cards))
    def test_fullscreen_viewer_passive(self):
        h=(ROOT/'presentacion/montaje/index.html').read_text()
        self.assertNotIn('<iframe',h)
        self.assertNotIn('controls>',h)
        self.assertIn('object-fit:contain',h)
        self.assertIn('pointer-events:none',h)
        self.assertNotIn('touchstart',h)
        self.assertNotIn('touchend',h)
        self.assertIn('id="film"',h)
        self.assertIn('id="start"',h)
if __name__=='__main__':unittest.main()
