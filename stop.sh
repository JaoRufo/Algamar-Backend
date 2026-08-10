#!/bin/bash

set -e

echo ""
echo "========================================"
echo "         PARANDO ALGAMAR"
echo "========================================"
echo ""

echo "[DATABASE] Encerrando PostgreSQL..."

./scripts/db-stop.sh

echo ""
echo "[ALGAMAR] PostgreSQL encerrado."
echo ""