#!/bin/bash

set -e

if sudo service postgresql status > /dev/null 2>&1; then
    echo "[DATABASE] Parando PostgreSQL..."

    sudo service postgresql stop

    echo "[DATABASE] PostgreSQL parado."
else
    echo "[DATABASE] PostgreSQL já está parado."
fi