#!/usr/bin/env python3
"""Materialize the exact served Universal Control V5 payload on a candidate branch.

This script is intentionally read-only with respect to the served runtime. It decodes the
five current chunks, verifies the Golden Master SHA, and writes a plaintext candidate
snapshot so later backend extraction can patch exact current source rather than reconstruct
it from chat history.
"""

from __future__ import annotations

import base64
import gzip
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V5 = ROOT / "shared" / "universal-shell" / "v5"
OUT = V5 / "candidate" / "baseline-source.html"
META = V5 / "candidate" / "BASELINE_SOURCE_SHA256.txt"
EXPECTED_SHA256 = "67965c4da9161737f06fcf6503d6b73db43eef574796977327c97f165e514d8a"
EXPECTED_B64_LENGTH = 32776
EXPECTED_CHUNK_SIZES = [6552, 6552, 6552, 6552, 6568]


def main() -> None:
    pieces: list[str] = []
    for i, expected_size in enumerate(EXPECTED_CHUNK_SIZES, start=1):
        path = V5 / f"chunk-{i}.b64"
        raw = path.read_bytes()
        if len(raw) != expected_size:
            raise SystemExit(f"{path}: size {len(raw)} != {expected_size}")
        pieces.append("".join(raw.decode("ascii").split()))

    encoded = "".join(pieces)
    if len(encoded) != EXPECTED_B64_LENGTH:
        raise SystemExit(f"combined base64 length {len(encoded)} != {EXPECTED_B64_LENGTH}")

    compressed = base64.b64decode(encoded, validate=True)
    html = gzip.decompress(compressed)
    digest = hashlib.sha256(html).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(f"payload sha256 {digest} != {EXPECTED_SHA256}")

    text = html.decode("utf-8")
    required = [
        "Universal Shell V5 Integrated Control",
        "prometeo.v5.favorites.v1",
        "favorites-organizer",
        "prometeo.universal-control.corner.v1",
        "nearestCorner",
        "localVector",
    ]
    missing = [marker for marker in required if marker not in text]
    if missing:
        raise SystemExit(f"baseline payload missing markers: {missing}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(html)
    META.write_text(
        f"{digest}  baseline-source.html\n"
        f"source=main/shared/universal-shell/v5/chunk-1..5.b64\n"
        f"role=CANDIDATE_SNAPSHOT_ONLY_NOT_SERVED_AUTHORITY\n",
        encoding="utf-8",
    )
    print(f"materialized {OUT.relative_to(ROOT)}")
    print(f"sha256 {digest}")


if __name__ == "__main__":
    main()
