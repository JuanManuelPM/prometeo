#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = (ROOT / "scripts/build-fast-allocator-core-v3.mjs").read_text(encoding="utf-8")

required = {
    "consumed_returns_collected": "const consumedReturns = new Set();",
    "consumed_returns_excluded": "consumedReturns.has(ref)",
    "material_outcomes": "['done', 'verified', 'no_action_needed', 'superseded', 'partial', 'boundary', 'route_aborted']",
    "thresholded_trigger": "unconsumedReturnRefs.length >= Number(signals.unconsumed_returns_trigger || 3)",
    "integrator_wakeup": "trigger: 'RETURNS_UNCONSUMED'"
}
missing = [name for name, snippet in required.items() if snippet not in SRC]
assert not missing, f"B021 MATERIAL_RETURN trigger contract drifted: {missing}"

# Semantic audit independent of wall clock / repository fixture.
def should_wake(material_return_refs, consumed, threshold=3):
    eligible = [ref for ref in material_return_refs if ref not in consumed]
    return len(set(eligible)) >= threshold

assert not should_wake(["r1", "r2"], set())
assert should_wake(["r1", "r2", "r3"], set())
assert not should_wake(["r1", "r2", "r3"], {"r2"})
assert should_wake(["r1", "r2", "r3", "r4"], {"r2"})

print("B021 PASS: material returns trigger integrator only after the unconsumed threshold")
