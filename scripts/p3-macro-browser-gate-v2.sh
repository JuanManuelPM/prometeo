#!/usr/bin/env bash
set -euo pipefail
ART="${P3_ARTIFACT_DIR:-artifacts/p3-macro}"
mkdir -p "$ART"
set +e
P3_ARTIFACT_DIR="$ART" bash scripts/p3-macro-browser-gate.sh
legacy_rc=$?
set -e
printf '%s\n' "$legacy_rc" > "$ART/legacy-validator-exit.txt"
P3_ARTIFACT_DIR="$ART" node scripts/p3-macro-validate-v2.mjs
