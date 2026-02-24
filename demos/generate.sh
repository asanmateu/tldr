#!/usr/bin/env bash
# Generate all demo GIFs using VHS
# Usage: ./demos/generate.sh [tape_name]
#
# Run all:    ./demos/generate.sh
# Run one:    ./demos/generate.sh hero

set -euo pipefail

DEMOS_DIR="$(cd "$(dirname "$0")" && pwd)"

tapes=(hero audio config providers install)

if [[ $# -gt 0 ]]; then
  tapes=("$1")
fi

for tape in "${tapes[@]}"; do
  file="$DEMOS_DIR/${tape}.tape"
  if [[ ! -f "$file" ]]; then
    echo "Tape not found: $file"
    exit 1
  fi
  echo "Recording ${tape}..."
  vhs "$file"
  echo "Done → demos/${tape}.gif"
  echo ""
done

echo "All GIFs generated."
