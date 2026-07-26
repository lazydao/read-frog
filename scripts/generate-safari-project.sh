#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
extension_dir="$repo_root/.output/safari-mv3"
project_dir="$repo_root/.output/safari-xcode"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Safari project generation requires macOS." >&2
  exit 1
fi

if ! xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  echo "Safari Web Extension Packager was not found. Install the full Xcode application first." >&2
  exit 1
fi

cd "$repo_root"
pnpm build:safari

mkdir -p "$project_dir"
xcrun safari-web-extension-packager "$extension_dir" \
  --project-location "$project_dir" \
  --app-name "TransFrog" \
  --bundle-identifier "com.lazydao.transfrog" \
  --macos-only \
  --swift \
  --copy-resources \
  --no-open \
  --no-prompt \
  --force

project_path="$(find "$project_dir" -name '*.xcodeproj' -print -quit)"
if [[ -z "$project_path" ]]; then
  echo "Safari packager finished, but no Xcode project was found under $project_dir." >&2
  exit 1
fi

echo "Safari Xcode project generated at $project_path."
