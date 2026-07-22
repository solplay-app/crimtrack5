#!/bin/sh
set -e

if [ "${RUN_DB_MIGRATIONS:-false}" = "true" ]; then
  echo "[crimtrack] application des migrations Alembic..."
  alembic upgrade head
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
