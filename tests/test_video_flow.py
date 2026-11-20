import importlib.util,pathlib,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('from_video',ROOT/'scripts/presentacion/from_video.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class FlowTests(unittest.TestCase):
    def test_reject_unknown_host(self):
        with self.assertRaises(ValueError):mod.resolve('https://example.com/watch?v=123')
    def test_title_search(self):self.assertEqual(mod.resolve('John Barry psychology'),'ytsearch1:John Barry psychology')
    def test_no_fabricated_cuts(self):self.assertEqual(mod.choose({'duration':120,'chapters':[]},[]),[])
    def test_chapters_are_provisional(self):
        m={'duration':400,'chapters':[{'start_time':18,'title':'A'},{'start_time':80,'title':'B'},{'start_time':120,'title':'C'}]}
        self.assertTrue(all(x['basis']=='chapter_only' for x in mod.choose(m,[])))
    def test_transcript_cuts(self):
        s=[{'start':i*4+40,'end':i*4+43,'text':f'Porque una conversación importante cambia el sentido de nuestra experiencia {i}'} for i in range(90)]
        x=mod.choose({'duration':500},s)
        self.assertEqual(len(x),3)
        self.assertTrue(all(p['basis']=='transcript' for p in x))
    def test_two_arrows_and_revisit(self):
        m={'id':'z9t147FrV4Y','title':'Psicología','duration':300}
        with tempfile.TemporaryDirectory() as t:
            out=pathlib.Path(t)/'index.html'
            mod.build(m,[{'start':20,'end':32,'evidence':'Capítulo','basis':'chapter_only'}],out)
            s=out.read_text()
            self.assertEqual(s.count('<button '),2)
            self.assertIn('data-start="20"',s)
            self.assertIn('player.seekTo(start,true)',s)
if __name__=='__main__':unittest.main()
