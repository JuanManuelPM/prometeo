from __future__ import annotations
import importlib.util,json,pathlib,subprocess,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'scripts/presentacion/montaje';sys.path.insert(0,str(BASE))
import youtube_job as j
import youtube_capture as cap
from render import render

class YouTubeWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.text='''[0:00] Una idea empieza aqui y una explicacion grande\n[0:15] sigue con evidencia concreta. La frase final esta aqui.\n[0:30] Otro ejemplo completo cierra esta parte.\n[0:45] Despedida.\n'''
        self.job={'schema':j.SCHEMA,'source':{'youtubeUrl':'https://youtu.be/aqz-KE-bpKQ'},'timeline':[
        {'kind':'card','text':'MIRÁ ESTO.','seconds':.7},
        {'kind':'clip','startQuote':'una idea empieza aqui','endQuote':'La frase final esta aqui','lead':.3,'tail':.4},
        {'kind':'card','text':'OTRA IDEA.','seconds':.6},
        {'kind':'clip','start':31,'end':39},
        {'kind':'card','text':'FIN.','seconds':.7} ]}
    def test_parse_vidiq_and_srt(self):
        s=j.parse_transcript(self.text)
        self.assertEqual(len(s),4);self.assertEqual(s[1]['start'],15)
        srt='1\n00:00:01,500 --> 00:00:03,000\nUna idea\n\n2\n00:00:04,000 --> 00:00:06,000\nOtra cosa\n'
        z=j.parse_transcript(srt)
        self.assertEqual(z[0]['start'],1.5)
        self.assertEqual(z[1]['end'],6.0)
    def test_quote_provenance_and_block_approximation(self):
        r=j.resolve_job(self.job,self.text)
        self.assertEqual(len(r['cuts']),2)
        self.assertEqual(r['cuts'][0]['precision'],'ESTIMATED_FROM_CAPTION_BLOCK')
        self.assertEqual(r['cuts'][1]['precision'],'USER_TIMES')
        self.assertEqual(r['cuts'][0]['anchor']['endQuote'],'La frase final esta aqui')
        self.assertFalse(r['audioBoundaryVerified'])
        self.assertLess(r['cuts'][0]['start'],r['cuts'][0]['end'])
    def test_numeric_times_with_unverified_anchors_preserve_evidence(self):
        job={'schema':j.SCHEMA,'source':{'youtubeUrl':'https://youtu.be/aqz-KE-bpKQ'},'timeline':[{'kind':'card','text':'MIRA','seconds':.6},{'kind':'clip','start':12,'end':20,'startQuote':'primera frase','endQuote':'ultima frase'},{'kind':'card','text':'FIN','seconds':.6}]}
        r=j.resolve_job(job)
        self.assertFalse(r['cuts'][0]['anchor']['captionVerified'])
        self.assertEqual(r['cuts'][0]['end'],20)

    def test_invalid_source_and_no_fake_timestamps(self):
        for bad in ['https://www.youtube.com.evil.com/watch?v=aqz-KE-bpKQ','http://youtu.be/aqz-KE-bpKQ','https://www.youtube.com/playlist?list=abcdef']:
            with self.assertRaises(ValueError):j.canonical_youtube(bad)
        with self.assertRaises(ValueError):j.resolve_job(self.job,None)
    def test_ambiguous_or_missing_quote_fails(self):
        with self.assertRaises(ValueError):j.locate_quote(j.parse_transcript(self.text),'nunca estuvo aqui')
        with self.assertRaises(ValueError):j.locate_quote(j.parse_transcript('[0:00] una idea y otra\n[0:11] una idea y otra'), 'una idea')
    def test_explicit_times_without_transcript(self):
        job={'schema':j.SCHEMA,'source':{'youtubeUrl':'https://youtu.be/aqz-KE-bpKQ'},'timeline':[{'kind':'card','text':'CINE','seconds':.6},{'kind':'clip','start':'0:01.500','end':'0:03.500'},{'kind':'card','text':'FIN','seconds':.7}]}
        r=j.resolve_job(job)
        self.assertEqual(r['cuts'][0]['start'],1.5)
        self.assertEqual(r['cuts'][0]['end'],3.5)
    def test_local_source_real_mp4_render(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            subprocess.run(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=480x270:rate=30:duration=4.6','-f','lavfi','-i','sine=frequency=330:sample_rate=48000:duration=4.6','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(root/'source.mp4')],check=True,timeout=40)
            job={'schema':j.SCHEMA,'source':{'localFile':'source.mp4'},'timeline':[{'kind':'card','text':'EMPIEZA','seconds':.7},{'kind':'clip','start':.25,'end':1.65},{'kind':'card','text':'CAMBIA','seconds':.7},{'kind':'clip','start':2.05,'end':3.5},{'kind':'card','text':'TERMINA','seconds':.7}]}
            resolved=j.resolve_job(job)
            recipe,logs=cap.prepare(resolved,root,root/'downloaded')
            self.assertEqual(len(logs),2)
            p=root/'compiled.json';p.write_text(json.dumps(recipe))
            receipt=render(p,root,root/'rendered.mp4')
            self.assertTrue((root/'rendered.mp4').is_file())
            self.assertEqual(len(receipt['segments']),5)
            self.assertTrue(4.5<receipt['durationSeconds']<5.2)
            self.assertEqual(receipt['audioCodec'],'aac')
            self.assertEqual(receipt['videoCodec'],'h264')
    def test_vidiq_direct_source_url_validation(self):
        self.assertEqual(cap.valid_direct_url('https://storage.googleapis.com/vidiq-user-videos/ABC/video.mp4?Expires=123'), 'https://storage.googleapis.com/vidiq-user-videos/ABC/video.mp4?Expires=123')
        for url in ['http://storage.googleapis.com/vidiq-user-videos/a.mp4','https://127.0.0.1/a.mp4','https://storage.googleapis.com/random/a.mp4','https://storage.googleapis.com/vidiq-user-videos/a.webm']:
            with self.assertRaises(ValueError):cap.valid_direct_url(url)

    def test_passive_player_invariant(self):
        h=(ROOT/'presentacion/montaje/youtube/index.html').read_text()
        self.assertNotIn('<iframe',h)
        self.assertNotIn(' controls>',h)
        self.assertIn('pointer-events:none',h)
        self.assertIn('object-fit:contain',h)

if __name__=='__main__':unittest.main()
