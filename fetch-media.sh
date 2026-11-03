#!/bin/sh
# macOS / Linux version of fetch-media.bat
cd "$(dirname "$0")" && { [ -d node_modules ] || npm install; } && node scripts/fetch-history.js "$@" && echo "Now run: npm run media"
