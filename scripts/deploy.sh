#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo "1) Pull latest images"
docker compose -f "$COMPOSE_FILE" pull

echo "2) Rebuild and start app stack"
docker compose -f "$COMPOSE_FILE" up -d --build app nginx redis

echo "3) Run migrations"
docker compose -f "$COMPOSE_FILE" exec -T app npm run db:migrate

echo "4) Health check"
curl -fsS http://localhost:800/api/health/live >/dev/null
curl -fsS http://localhost:800/api/health/ready >/dev/null

echo "Deployment completed"
