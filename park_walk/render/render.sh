#!/usr/bin/env bash
# Offline render: uses the Chromium unpacked by setup_chromium.mjs instead of the one
# Remotion would download from remotion.media.
#
#   ./render/render.sh                       # videos/park_walk.mp4
#   ./render/render.sh ParkWalk out/x.mp4 --frames=0-30
set -euo pipefail
cd "$(dirname "$0")/.."

EXE=$(node render/setup_chromium.mjs)
export LD_LIBRARY_PATH="$PWD/.cache/chromium/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

COMP="${1:-ParkWalk}"
OUT="${2:-videos/park_walk.mp4}"
shift $(( $# >= 2 ? 2 : $# )) || true

npx remotion render "$COMP" "$OUT" \
  --browser-executable="$EXE" \
  --concurrency=2 \
  "$@"
