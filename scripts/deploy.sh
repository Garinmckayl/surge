#!/usr/bin/env bash
# Build and restart back-to-back: rebuilding .next under a running server breaks its asset hashes.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run lint
npx tsc --noEmit
npm run build
sudo -n systemctl restart surge
sleep 4
css=$(curl -fsS https://surge.arcumet.com | grep -o '/_next/static/[^"]*\.css' | sort -u | head -1)
curl -fsS -o /dev/null -w "live page %{http_code}\n" https://surge.arcumet.com
curl -fsS -o /dev/null -w "css %{http_code}\n" "https://surge.arcumet.com$css"
