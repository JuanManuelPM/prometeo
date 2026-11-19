import importlib.util,unittest,pathlib
FILE=pathlib.Path(__file__).resolve().parent.parent/"ingest.py"
spec=importlib.util.spec_from_file_location("prometeo_ingest",FILE)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
class TranscriptParsingTests(unittest.TestCase):
 def test_video_id(self):
  self.assertEqual(mod.video_id("https://www.youtube.com/watch?v=q6w1zahnVKI"),"q6w1zahnVKI")
  self.assertEqual(mod.video_id("https://youtu.be/q6w1zahnVKI?t=65"),"q6w1zahnVKI")
 def test_vtt(self):
  rows=mod.from_vtt("WEBVTT\n\n00:01:05.000 --> 00:01:08.000\nJorge, que es ser hombre\n\n00:04:31.000 --> 00:04:36.000\nMachismo no es ser masculino\n")
  self.assertEqual(len(rows),2);self.assertEqual(rows[0]["start"],65);self.assertEqual(rows[1]["end"],276)
 def test_no_fabrication(self):
  self.assertEqual(mod.from_vtt("This video is about masculinity, but contains no timestamps."),[])
if __name__=="__main__":unittest.main()
