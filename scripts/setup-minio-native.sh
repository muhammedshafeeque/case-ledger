#!/usr/bin/env bash
# Install MinIO binary + mc client, configure data dir, create buckets (no Docker).
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
MINIO_USER="${MINIO_USER:-minioadmin}"
MINIO_PASS="${MINIO_PASS:-minioadmin}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
MINIO_DATA_DIR="${MINIO_DATA_DIR:-$ROOT_DIR/data/minio}"
INSTALL_PREFIX="${INSTALL_PREFIX:-/usr/local/bin}"
USE_SUDO="${USE_SUDO:-}"

log() { echo "[minio] $*"; }

arch_bin() {
  case "$(uname -m)" in
    x86_64|amd64) echo "amd64" ;;
    aarch64|arm64) echo "arm64" ;;
    *) echo "unsupported" ;;
  esac
}

install_binary() {
  local name="$1"
  local url="$2"
  local dest="$INSTALL_PREFIX/$name"

  if command -v "$name" >/dev/null 2>&1; then
    log "$name already installed: $(command -v "$name")"
    return 0
  fi

  local arch
  arch="$(arch_bin)"
  if [[ "$arch" == "unsupported" ]]; then
    log "Unsupported CPU architecture for automatic $name install"
    return 1
  fi

  url="${url/linux-amd64/linux-${arch}}"

  if [[ ! -w "$INSTALL_PREFIX" ]]; then
    if [[ -n "$USE_SUDO" ]] && command -v sudo >/dev/null 2>&1; then
      log "Downloading $name to $dest (sudo)..."
      curl -fsSL "$url" | sudo tee "$dest" >/dev/null
      sudo chmod +x "$dest"
    else
      mkdir -p "$HOME/.local/bin"
      dest="$HOME/.local/bin/$name"
      log "Downloading $name to $dest..."
      curl -fsSL "$url" -o "$dest"
      chmod +x "$dest"
      log "Add to PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
  else
    log "Downloading $name to $dest..."
    curl -fsSL "$url" -o "$dest"
    chmod +x "$dest"
  fi
}

start_minio() {
  mkdir -p "$MINIO_DATA_DIR"
  export MINIO_ROOT_USER="$MINIO_USER"
  export MINIO_ROOT_PASSWORD="$MINIO_PASS"

  if curl -sf "http://127.0.0.1:${MINIO_PORT}/minio/health/live" >/dev/null 2>&1; then
    log "MinIO already running on port $MINIO_PORT"
    return 0
  fi

  local minio_bin
  minio_bin="$(command -v minio || echo "$HOME/.local/bin/minio")"
  if [[ ! -x "$minio_bin" ]]; then
    log "MinIO binary not found; skip start"
    return 1
  fi

  local pid_file="$ROOT_DIR/data/minio/minio.pid"
  mkdir -p "$(dirname "$pid_file")"
  log "Starting MinIO (data: $MINIO_DATA_DIR)..."
  nohup "$minio_bin" server "$MINIO_DATA_DIR" --address ":${MINIO_PORT}" --console-address ":${MINIO_CONSOLE_PORT}" \
    >>"$ROOT_DIR/data/minio/minio.log" 2>&1 &
  echo $! >"$pid_file"
  sleep 2
}

wait_minio() {
  local i=0
  while [[ $i -lt 30 ]]; do
    if curl -sf "http://127.0.0.1:${MINIO_PORT}/minio/health/live" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

init_buckets() {
  local mc_bin
  mc_bin="$(command -v mc || echo "$HOME/.local/bin/mc")"
  if [[ ! -x "$mc_bin" ]]; then
    log "mc not found; create buckets manually after MinIO starts"
    return 0
  fi

  "$mc_bin" alias set caseledger "http://127.0.0.1:${MINIO_PORT}" "$MINIO_USER" "$MINIO_PASS" --api S3v4 2>/dev/null \
    || "$mc_bin" alias set caseledger "http://127.0.0.1:${MINIO_PORT}" "$MINIO_USER" "$MINIO_PASS"
  "$mc_bin" mb "caseledger/${S3_BUCKET_NAME:-rti-watch-evidence-dev}" --ignore-existing 2>/dev/null || true
  "$mc_bin" mb "caseledger/${S3_BACKUP_BUCKET:-rti-watch-backups-dev}" --ignore-existing 2>/dev/null || true
  log "Buckets ready (evidence + backups)"
}

main() {
  install_binary minio "https://dl.min.io/server/minio/release/linux-amd64/minio"
  install_binary mc "https://dl.min.io/client/mc/release/linux-amd64/mc"
  start_minio
  if wait_minio; then
    init_buckets
    log "MinIO API: http://127.0.0.1:${MINIO_PORT}  Console: http://127.0.0.1:${MINIO_CONSOLE_PORT}"
  else
    log "MinIO did not become healthy in time; check $ROOT_DIR/data/minio/minio.log"
    exit 1
  fi
}

main "$@"
