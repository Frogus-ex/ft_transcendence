#!/bin/bash
# setup.sh — Crée tout ce qu'il faut pour que "podman-compose up -d" fonctionne.
set -e

# --- .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env créé"
fi

# --- secrets/ ---
mkdir -p secrets

[ -f secrets/postgres_password.txt ] || openssl rand -base64 24 > secrets/postgres_password.txt
[ -f secrets/redis_password.txt ]    || openssl rand -base64 24 > secrets/redis_password.txt
[ -f secrets/jwt_secret.txt ]        || openssl rand -hex 32 > secrets/jwt_secret.txt
[ -f secrets/grafana_admin_password.txt ] || openssl rand -base64 24 > secrets/grafana_admin_password.txt

# redis_password.json est dérivé de redis_password.txt (format requis par redis_exporter)
# régénéré à chaque run pour rester synchronisé si redis_password.txt change
python3 -c "
import json
pw = open('secrets/redis_password.txt').read().strip()
json.dump({'redis://redis:6379': pw}, open('secrets/redis_exporter_password.json', 'w'))
"

echo "✅ secrets/ prêt"

echo "✅ Setup terminé — lance : podman-compose up -d"