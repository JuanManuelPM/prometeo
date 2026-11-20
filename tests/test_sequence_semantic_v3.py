import importlib.util,json,pathlib,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts/presentacion"))
import sequence_semantic_v3 as s
def cue(start,words):
 return {"start":start,"duration":2.7,"text":words}
def fixture():
 rows=[cue(i*2.9,"ordinary conversation surrounding the narrative of mental health and therapy")
       for i in range(110)]
 seq=[
 ("then beta bias is the opposite", "when we have a therapy and it works well for women",
  "we don't really question whether it might not work for men"),
 ("men who think that masculinity", "may have a bad effect on their behavior and their emotions",
  "in a nutshell"),
 ("not realizing that these sorts of", "campaigns can easily backfire and psychology is full of these unintended",
  "consequences")
 ]
 for x,(a,b,c) in zip([10,40,72],seq):
  rows[x]["text"]=a;rows[x+1]["text"]=b;rows[x+2]["text"]="this is important to ask and to understand";rows[x+3]["text"]="and we have more details to explain";rows[x+4]["text"]=c
 return s.clean(rows)
class TestEvidence(unittest.TestCase):
 def test_independent_youtube_caption_anchors(self):
  clips=s.choose(fixture())
  self.assertEqual(len(clips),3)
  self.assertEqual([c["id"] for c in clips],["terapia","valores","generalizacion"])
  self.assertTrue(all(c["evidence"]["start_confidence"]>=.76 for c in clips))
 def test_no_chapter_fallback(self):
  with self.assertRaises(ValueError):s.choose(s.clean([cue(0,"chapter titles and teaser blocks")]))
 def test_one_missing_end_rejected(self):
  rows=fixture();rows[14]["text"]="the supposed ending is simply missing"
  with self.assertRaisesRegex(ValueError,"ANCHOR_NOT_FOUND"):s.choose(rows)
 def test_build_is_self_contained(self):
  with tempfile.TemporaryDirectory() as td:
   out=pathlib.Path(td);s.build(fixture(),"fixture",[],out,ROOT/"presentacion/secuencia-v3/template.html")
   html=(out/"index.html").read_text()
   self.assertIn("const SPEC={",html)
   self.assertIn("pointerup",html)
   self.assertIn("cueVideoById",html)
   self.assertIn("ms:1000",html)
   self.assertEqual(html.count('class="arrow'),2)
   self.assertEqual(len(json.loads((out/"recipe.json").read_text())["library"][0]["clips"]),3)
 def test_no_invented_timestamps(self):
  rows=fixture();x=s.choose(rows)
  self.assertAlmostEqual(x[0]["start"],rows[10]["start"]-.35,places=2)
  self.assertAlmostEqual(x[0]["end"],rows[14]["end"]+.4,places=2)
if __name__=="__main__":unittest.main()
