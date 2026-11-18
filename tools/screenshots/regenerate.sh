#!/usr/bin/env bash
# Regenerates the README screenshots (docs/img/*.svg) from the lines the mod really draws.
# Run it from anywhere after any visual change to the mod, then commit the SVGs with the change.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
tmp="$(mktemp -d)"
temp_test="$root/hooks/zz_dump.test.ts"
trap 'rm -f "$temp_test"; rm -rf "$tmp"' EXIT

# The screenshots show the version the mod is at, read from its manifest.
version="$(python3 -I -c 'import json, sys; print(json.load(open(sys.argv[1]))["version"])' "$root/.claude-plugin/plugin.json")"
sed "s/__VERSION__/$version/" "$root/tools/screenshots/dump.test.ts.template" > "$temp_test"
# The dump test fails on purpose: a hooks module cannot write files, so the lines travel in its error.
(cd "$root" && claude plugin test . > "$tmp/test-output.txt" 2>&1) || true
python3 -I "$root/tools/screenshots/mksvg.py" "$tmp/test-output.txt" "$root/docs/img"
