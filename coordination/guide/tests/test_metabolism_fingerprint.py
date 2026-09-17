#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import pathlib
import unittest

HERE = pathlib.Path(__file__).resolve()
HELPER = HERE.parents[1] / "tools" / "metabolism_fingerprint.py"
SPEC = importlib.util.spec_from_file_location("metabolism_fingerprint", HELPER)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)

CANARY_EVIDENCE = [
    "coordination/guide/GUIDE_SWARM_PROTOCOL_V1.md",
    "coordination/guide/METABOLISM_POLICY_V1.json",
    "coordination/portfolio/derived/prometeo-autonomous-growth/portfolio-metabolism-self-replenish-canary-v1.json",
    "gh-pages:wc/index.html",
    "wc",
]


class MetabolismFingerprintTests(unittest.TestCase):
    def test_canary_vector(self):
        result = MODULE.derive_fingerprint(
            "GUIDE_CRITIC", "GUIDE_DEPENDENCY", CANARY_EVIDENCE
        )
        self.assertEqual(result.fingerprint, "f66b423cb689")
        self.assertEqual(result.job_id, "guide-critic-f66b423cb689")
        self.assertEqual(result.dedupe_key, "guide:critic:f66b423cb689:v1")
        self.assertTrue(result.path.endswith("guide-critic-f66b423cb689.json"))

    def test_evidence_order_and_exact_duplicates_do_not_change_output(self):
        a = MODULE.derive_fingerprint(
            "GUIDE_CRITIC", "GUIDE_DEPENDENCY", CANARY_EVIDENCE
        )
        b = MODULE.derive_fingerprint(
            "GUIDE_CRITIC",
            ["GUIDE_DEPENDENCY", "GUIDE_DEPENDENCY"],
            list(reversed(CANARY_EVIDENCE)) + [CANARY_EVIDENCE[0]],
        )
        self.assertEqual(a, b)

    def test_composite_trigger_order_does_not_change_output(self):
        a = MODULE.derive_fingerprint(
            "GUIDE_RESCATE",
            ["HUMAN_FRICTION", "GUIDE_DEPENDENCY"],
            CANARY_EVIDENCE,
        )
        b = MODULE.derive_fingerprint(
            "GUIDE_RESCATE",
            ["GUIDE_DEPENDENCY", "HUMAN_FRICTION", "HUMAN_FRICTION"],
            CANARY_EVIDENCE,
        )
        self.assertEqual(a, b)
        self.assertIn(
            '"trigger":"GUIDE_DEPENDENCY+HUMAN_FRICTION"', a.preimage
        )

    def test_material_evidence_change_changes_fingerprint(self):
        a = MODULE.derive_fingerprint(
            "GUIDE_CRITIC", "GUIDE_DEPENDENCY", CANARY_EVIDENCE
        )
        b = MODULE.derive_fingerprint(
            "GUIDE_CRITIC",
            "GUIDE_DEPENDENCY",
            CANARY_EVIDENCE + ["coordination/guide/NEW_MATERIAL_EVIDENCE.json"],
        )
        self.assertNotEqual(a.fingerprint, b.fingerprint)
        self.assertNotEqual(a.path, b.path)

    def test_invalid_role_and_trigger_fail_closed(self):
        with self.assertRaises(ValueError):
            MODULE.derive_fingerprint("GUIDE_RANDOM", "GUIDE_DEPENDENCY", CANARY_EVIDENCE)
        with self.assertRaises(ValueError):
            MODULE.derive_fingerprint("GUIDE_CRITIC", "NOT_A_TRIGGER", CANARY_EVIDENCE)

    def test_empty_evidence_fails_closed(self):
        with self.assertRaises(ValueError):
            MODULE.derive_fingerprint("GUIDE_CRITIC", "GUIDE_DEPENDENCY", [])


if __name__ == "__main__":
    unittest.main()
