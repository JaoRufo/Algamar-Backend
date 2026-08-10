#!/bin/bash

set -e

echo ""
echo "========================================"
echo "       REINICIANDO ALGAMAR"
echo "========================================"
echo ""

./scripts/db-stop.sh
./scripts/db-start.sh

echo ""
echo "[SERVER] Iniciando backend..."
echo ""

npm run dev