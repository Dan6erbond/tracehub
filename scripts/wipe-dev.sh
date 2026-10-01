#!/usr/bin/env bash
# Clears every table of the dev deployment, app and components.
# `convex import --replace-all` isn't documented to reach component tables, hence the per-table loop.
set -euo pipefail

COMPONENTS=(betterAuth migrations tracesByRun tracesByBranch tracesByPull)

empty=$(mktemp)
trap 'rm -f "$empty"' EXIT

clear_tables() {
  local args=("$@")
  for table in $(npx convex data "${args[@]}"); do
    echo "Clearing ${args[*]:-app} $table"
    npx convex import "${args[@]}" --table "$table" --replace -y --format jsonLines "$empty"
  done
}

clear_tables
for component in "${COMPONENTS[@]}"; do
  clear_tables --component "$component"
done
