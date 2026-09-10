#!/usr/bin/env python3
"""Build a candidate V5 source that routes Favorites persistence through the phase-P1 facade.

The browser payload remains self-contained: the source facade is bundled inline at build time,
so this extraction adds no network/module boot dependency. Only the legacy Favorites storage
block is replaced; every other Golden Master byte is preserved.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
V5 = ROOT / "shared" / "universal-shell" / "v5"
BASELINE = V5 / "candidate" / "baseline-source.html"
FACADE = V5 / "backend" / "favorites-store-v1.js"
OUT = V5 / "candidate" / "favorites-facade-source.html"
META = V5 / "candidate" / "FAVORITES_FACADE_SOURCE_SHA256.txt"
BASELINE_SHA = "67965c4da9161737f06fcf6503d6b73db43eef574796977327c97f165e514d8a"

LEGACY_BLOCK = """const FAVORITES_KEY='prometeo.v5.favorites.v1';
function readFavoriteIds(){
  try{
    const raw=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');
    return [...new Set((Array.isArray(raw)?raw:[]).filter(x=>typeof x==='string'&&x))];
  }catch{return[]}
}
let favoriteIds=readFavoriteIds();
function saveFavoriteIds(){
  try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(favoriteIds))}catch{}
}
function isFavorite(id){return !!id&&favoriteIds.includes(id)}
"""

BRIDGE_BLOCK = """/* P1 Favorites compatibility facade — bundled, no runtime dependency. */
const FAVORITES_KEY=FAVORITES_LEGACY_KEY;
const favoritesStore=createLegacyFavoritesStore();
function readFavoriteIds(){return favoritesStore.list()}
let favoriteIds=readFavoriteIds();
function saveFavoriteIds(){favoritesStore.replace(favoriteIds)}
function isFavorite(id){return !!id&&favoriteIds.includes(id)}
"""


def bundle_facade(source: str) -> str:
    bundled = source.replace("export const FAVORITES_LEGACY_KEY", "const FAVORITES_LEGACY_KEY", 1)
    bundled = bundled.replace("export function createLegacyFavoritesStore", "function createLegacyFavoritesStore", 1)
    if "export " in bundled:
        raise SystemExit("Unexpected export remains in Favorites facade")
    return bundled.rstrip() + "\n\n"


def main() -> None:
    baseline = BASELINE.read_bytes()
    digest = hashlib.sha256(baseline).hexdigest()
    if digest != BASELINE_SHA:
        raise SystemExit(f"baseline sha256 {digest} != {BASELINE_SHA}")
    text = baseline.decode("utf-8")
    if text.count(LEGACY_BLOCK) != 1:
        raise SystemExit(f"legacy Favorites block count != 1 ({text.count(LEGACY_BLOCK)})")

    facade = bundle_facade(FACADE.read_text(encoding="utf-8"))
    replacement = facade + BRIDGE_BLOCK
    candidate = text.replace(LEGACY_BLOCK, replacement, 1)

    # Structural parity: undo exactly the allowed replacement and recover byte-identical baseline.
    roundtrip = candidate.replace(replacement, LEGACY_BLOCK, 1)
    if roundtrip.encode("utf-8") != baseline:
        raise SystemExit("candidate changed bytes outside the allowed Favorites block")

    required = [
        "P1 Favorites compatibility facade",
        "const favoritesStore=createLegacyFavoritesStore();",
        "prometeo.v5.favorites.v1",
        "favorites-organizer",
        "prometeo.universal-control.corner.v1",
        "nearestCorner",
        "localVector",
    ]
    missing = [marker for marker in required if marker not in candidate]
    if missing:
        raise SystemExit(f"candidate missing required markers: {missing}")

    OUT.write_text(candidate, encoding="utf-8")
    out_sha = hashlib.sha256(candidate.encode("utf-8")).hexdigest()
    META.write_text(
        f"{out_sha}  favorites-facade-source.html\n"
        f"baseline_sha256={BASELINE_SHA}\n"
        "allowed_delta=FAVORITES_STORAGE_BLOCK_ONLY\n"
        "runtime_dependency_added=false\n"
        "served_authority=false\n",
        encoding="utf-8",
    )
    print(f"built {OUT.relative_to(ROOT)}")
    print(f"sha256 {out_sha}")
    print("structural_roundtrip PASS")


if __name__ == "__main__":
    main()
