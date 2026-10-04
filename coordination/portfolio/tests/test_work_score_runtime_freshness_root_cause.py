#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PAGE = ROOT / "current-tree/control-v11/work-score/index.html"
text = PAGE.read_text(encoding="utf-8")

# B016 is diagnosis, not the B033 implementation fix.  Pin the current failure
# mechanism so the consumer can repair it without rediscovering the bug.
required = {
    "mixed_clock": "const times=[tl?.generated_at,fr?.generated_at,al?.generated_at,score?.generated_at]",
    "max_masks_stale_sources": "gt=times.length?Math.max(...times):NaN",
    "single_global_live_gate": "age!=null&&age<30?'AUTO · LIVE':'AUTO · esperando proyección'",
    "worker_counts_depend_on_score": "for(const x of score?.launch_measurements||[])"
}
missing = [name for name, snippet in required.items() if snippet not in text]
assert not missing, f"B016 root-cause signature drifted: {missing}"

# Reproduce the semantic defect independently of wall clock: a fresh allocator
# timestamp can make the aggregate look LIVE while the worker scoreboard that
# feeds worker counts is stale.
now = 1_000_000
allocator_generated_at = now - 5_000
score_generated_at = now - 180_000
aggregate_age_ms = now - max(allocator_generated_at, score_generated_at)
score_age_ms = now - score_generated_at
assert aggregate_age_ms < 30_000
assert score_age_ms > 30_000

print("B016 ROOT_CAUSE_ISOLATED: aggregate max(generated_at) can mask stale worker-scoreboard data")
print("consumer_fix: track per-source freshness; gate score-derived worker stats on SCORE freshness")
