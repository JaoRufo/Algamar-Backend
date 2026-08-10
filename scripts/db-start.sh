#!/bin/bash

set -e

if sudo service postgresql status > /dev/null 2>&1; then
    echo "[DATABASE] PostgreSQL já está em execução."
else
    echo "[DATABASE] Iniciando PostgreSQL..."

    sudo service postgresql start

    echo "[DATABASE] PostgreSQL iniciado."
fi