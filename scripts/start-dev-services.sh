#!/usr/bin/env bash
# Start PostgreSQL, Redis, and MinIO for local dev (no Docker).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { echo "[services] $*"; }

start_postgres() {
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start postgresql 2>/dev/null || systemctl start postgresql 2>/dev/null || true
  elif command -v service >/dev/null 2>&1; then
    sudo service postgresql start 2>/dev/null || true
  fi
  if command -v pg_isready >/dev/null 2>&1 && pg_isready -q 2>/dev/null; then
    log "PostgreSQL: running"
  else
    log "PostgreSQL: not detected (install with install.sh)"
  fi
}

start_redis() {
  if command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start redis-server 2>/dev/null || systemctl start redis-server 2>/dev/null || true
  fi
  if command -v redis-cli >/dev/null 2>&1 && redis-cli ping 2>/dev/null | grep -q PONG; then
    log "Redis: running"
  else
    log "Redis: not running (forensic worker queue disabled until Redis is up)"
  fi
}

start_minio() {
  export ROOT_DIR
  if curl -sf http://127.0.0.1:9000/minio/health/live >/dev/null 2>&1; then
    log "MinIO: already running"
    return 0
  fi
  bash "$ROOT_DIR/scripts/setup-minio-native.sh" || log "MinIO: failed to start (see data/minio/minio.log)"
}

start_postgres
start_redis
start_minio

log "Done. API: cd server && npm run dev | Worker: npm run dev:worker | UI: cd client && npm run dev"
