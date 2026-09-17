#!/usr/bin/env python3
"""Deterministic guide-job fingerprint derivation for Prometeo /wc metabolism.

Standard-library only. The canonicalization contract is defined in
coordination/guide/METABOLISM_POLICY_V1.json.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass, asdict
from typing import Iterable, Sequence

GUIDE_ROLES = {
    "GUIDE_INTEGRATOR",
    "GUIDE_PLANNER",
    "GUIDE_RESCATE",
    "GUIDE_CRITIC",
    "GUIDE_STEWARD",
}

GUIDE_TRIGGERS = {
    "FRONTIER_THIN",
    "RETURNS_UNCONSUMED",
    "REPLACEABLE_PRESSURE",
    "COLLISION_PRESSURE",
    "PARTIAL_LOOP",
    "NO_SUCCESSOR",
    "HUMAN_FRICTION",
    "LOW_YIELD",
    "MISSING_CABLE",
    "GUIDE_DEPENDENCY",
}


@dataclass(frozen=True)
class FingerprintResult:
    preimage: str
    fingerprint: str
    job_id: str
    dedupe_key: str
    path: str


def _bytewise_unique_sorted(values: Iterable[str]) -> list[str]:
    unique = set(values)
    if any(not isinstance(value, str) for value in unique):
        raise TypeError("all canonicalization inputs must be strings")
    return sorted(unique, key=lambda value: value.encode("utf-8"))


def canonical_trigger(triggers: Sequence[str] | str) -> str:
    values = [triggers] if isinstance(triggers, str) else list(triggers)
    if not values:
        raise ValueError("at least one guide trigger is required")
    normalized = _bytewise_unique_sorted(values)
    unknown = [value for value in normalized if value not in GUIDE_TRIGGERS]
    if unknown:
        raise ValueError(f"unknown guide trigger(s): {', '.join(unknown)}")
    return "+".join(normalized)


def derive_fingerprint(
    role: str,
    triggers: Sequence[str] | str,
    evidence: Sequence[str],
) -> FingerprintResult:
    if role not in GUIDE_ROLES:
        raise ValueError(f"unknown guide role: {role}")

    trigger = canonical_trigger(triggers)
    canonical_evidence = _bytewise_unique_sorted(evidence)
    if not canonical_evidence:
        raise ValueError("at least one exact durable evidence ref is required")

    # Fixed insertion order is part of the durable contract: role, trigger, evidence.
    payload = {
        "role": role,
        "trigger": trigger,
        "evidence": canonical_evidence,
    }
    preimage = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    fingerprint = hashlib.sha256(preimage.encode("utf-8")).hexdigest()[:12]
    role_lower = role.removeprefix("GUIDE_").lower()
    job_id = f"guide-{role_lower}-{fingerprint}"
    dedupe_key = f"guide:{role_lower}:{fingerprint}:v1"
    path = (
        "coordination/portfolio/derived/prometeo-autonomous-growth/"
        f"{job_id}.json"
    )
    return FingerprintResult(preimage, fingerprint, job_id, dedupe_key, path)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Derive the canonical Prometeo guide-job fingerprint/path."
    )
    parser.add_argument("--role", required=True, choices=sorted(GUIDE_ROLES))
    parser.add_argument(
        "--trigger",
        required=True,
        action="append",
        choices=sorted(GUIDE_TRIGGERS),
        help="Repeat for a composite trigger; order does not matter.",
    )
    parser.add_argument(
        "--evidence",
        required=True,
        action="append",
        help="Repeat for each exact durable evidence ref; order/duplicates do not matter.",
    )
    args = parser.parse_args()
    result = derive_fingerprint(args.role, args.trigger, args.evidence)
    print(json.dumps(asdict(result), ensure_ascii=False, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
