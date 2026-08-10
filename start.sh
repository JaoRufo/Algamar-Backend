#!/bin/bash

set -e

echo ""
echo "========================================"
echo "        INICIANDO ALGAMAR"
echo "========================================"
echo ""

cleanup() {
    echo ""
    echo "[ALGAMAR] Encerrando serviços..."

    ./scripts/db-stop.sh

    echo ""
    echo "[ALGAMAR] Todos os serviços foram encerrados."
    echo ""
}

trap cleanup SIGINT SIGTERM

./scripts/db-start.sh

echo ""
echo "[SERVER] Iniciando backend..."
echo ""

npm run dev