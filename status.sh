#!/bin/bash

echo ""
echo "========================================"
echo "          STATUS DO ALGAMAR"
echo "========================================"
echo ""

echo "[DATABASE]"
./scripts/db-status.sh

echo ""
echo "[NODE]"
node --version

echo ""
echo "[NPM]"
npm --version

echo ""
echo "[PROJECT]"
pwd

echo ""