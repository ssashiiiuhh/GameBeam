#!/usr/bin/env bash
set -e

./Scripts/package_app.sh "${1:-debug}"

echo "==> Quitting any running GameBeam instances..."
pkill -x GameBeam 2>/dev/null || true
pkill -x gamebeam 2>/dev/null || true
sleep 0.5

echo "==> Launching build/GameBeam.app..."
open build/GameBeam.app
echo "==> GameBeam running."
