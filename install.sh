#!/usr/bin/env bash
#
# Case Ledger — native install (no Docker)
# Ubuntu / Debian: installs deps, configures PostgreSQL, Redis, MinIO, .env, DB migrate + seed.
#
# Usage:
#   ./install.sh                 # full install (may prompt for sudo)
#   ./install.sh --skip-deps     # only npm, .env, database (deps already installed)
#   ./install.sh --skip-seed     # skip prisma seed
#   INSTALL_DEPS=false ./install.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"

SKIP_DEPS=false
SKIP_SEED=false
SKIP_MINIO=false
USE_SUDO=""

DB_USER="${DB_USER:-rtiwatch}"
DB_PASS="${DB_PASS:-rtiwatch_dev}"
DB_NAME="${DB_NAME:-rti_watch}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

MIN_NODE_MAJOR=20

log() { echo ""; echo "==> $*"; }
warn() { echo "WARNING: $*" >&2; }
die() { echo "ERROR: $*" >&2; exit 1; }

for arg in "$@"; do
  case "$arg" in
    --skip-deps) SKIP_DEPS=true ;;
    --skip-seed) SKIP_SEED=true ;;
    --skip-minio) SKIP_MINIO=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) die "Unknown option: $arg (try --help)" ;;
  esac
done

[[ "${INSTALL_DEPS:-true}" == "false" ]] && SKIP_DEPS=true

have_cmd() { command -v "$1" >/dev/null 2>&1; }

node_major() {
  if ! have_cmd node; then echo 0; return; fi
  node -v | sed 's/^v//' | cut -d. -f1
}

is_debian_like() {
  [[ -f /etc/debian_version ]] || grep -qiE 'ubuntu|debian' /etc/os-release 2>/dev/null
}

need_sudo() {
  [[ "$(id -u)" -ne 0 ]]
}

run_apt() {
  if need_sudo; then
    if ! have_cmd sudo; then die "sudo required to install packages"
    fi
    sudo apt-get "$@"
  else
    apt-get "$@"
  fi
}

install_system_deps() {
  log "Installing system packages (PostgreSQL, Redis, Chromium, Tesseract, build tools)..."
  run_apt update -qq
  run_apt install -y -qq \
    curl \
    ca-certificates \
    gnupg \
    openssl \
    build-essential \
    postgresql \
    postgresql-contrib \
    postgresql-client \
    redis-server \
    chromium-browser \
    chromium \
    tesseract-ocr \
    2>/dev/null || run_apt install -y -qq \
    curl ca-certificates gnupg openssl build-essential \
    postgresql postgresql-contrib postgresql-client \
    redis-server tesseract-ocr

  # Chromium package name varies
  if ! have_cmd chromium && ! have_cmd chromium-browser; then
    run_apt install -y -qq chromium 2>/dev/null || warn "Chromium not installed — PDF export may need PUPPETEER_EXECUTABLE_PATH"
  fi

  if have_cmd systemctl; then
    run_apt install -y -qq systemctl 2>/dev/null || true
    if need_sudo; then
      sudo systemctl enable postgresql redis-server 2>/dev/null || true
      sudo systemctl start postgresql redis-server 2>/dev/null || true
    else
      systemctl enable postgresql redis-server 2>/dev/null || true
      systemctl start postgresql redis-server 2>/dev/null || true
    fi
  fi
}

install_node() {
  local major
  major="$(node_major)"
  if [[ "$major" -ge "$MIN_NODE_MAJOR" ]]; then
    log "Node.js OK: $(node -v) (npm $(npm -v 2>/dev/null || echo '?'))"
    return 0
  fi

  log "Installing Node.js ${MIN_NODE_MAJOR}+ (NodeSource)..."
  if ! is_debian_like; then
    die "Auto Node install only supported on Debian/Ubuntu. Install Node ${MIN_NODE_MAJOR}+ manually."
  fi

  local setup_cmd="curl -fsSL https://deb.nodesource.com/setup_${MIN_NODE_MAJOR}.x"
  if need_sudo; then
    $setup_cmd | sudo -E bash -
    run_apt install -y -qq nodejs
  else
    $setup_cmd | bash -
    apt-get install -y -qq nodejs
  fi

  major="$(node_major)"
  [[ "$major" -ge "$MIN_NODE_MAJOR" ]] || die "Node $(node -v) still below required v${MIN_NODE_MAJOR}"
  log "Node.js installed: $(node -v)"
}

check_deps() {
  log "Checking dependencies..."
  local missing=()
  have_cmd node || missing+=("node")
  have_cmd npm || missing+=("npm")
  have_cmd psql || missing+=("postgresql-client")
  have_cmd pg_isready || missing+=("postgresql")
  have_cmd redis-cli || missing+=("redis")
  have_cmd curl || missing+=("curl")
  have_cmd openssl || missing+=("openssl")

  if [[ ${#missing[@]} -gt 0 ]]; then
    warn "Missing: ${missing[*]}"
    if [[ "$SKIP_DEPS" == "false" ]] && is_debian_like; then
      install_system_deps
      install_node
    else
      die "Install missing tools or run ./install.sh without --skip-deps on Debian/Ubuntu"
    fi
  else
    install_node
  fi

  if ! pg_isready -q 2>/dev/null; then
    warn "PostgreSQL not accepting connections — starting service..."
    if have_cmd systemctl; then
      (need_sudo && sudo systemctl start postgresql) || systemctl start postgresql 2>/dev/null || true
    fi
  fi

  if ! redis-cli ping 2>/dev/null | grep -q PONG; then
    warn "Redis not running — starting..."
    if have_cmd systemctl; then
      (need_sudo && sudo systemctl start redis-server) || systemctl start redis-server 2>/dev/null || true
    fi
  fi
}

setup_postgres() {
  log "Configuring PostgreSQL database..."
  export DB_USER DB_PASS DB_NAME
  if need_sudo; then
    USE_SUDO=1 sudo -E bash "$SERVER_DIR/scripts/setup-postgres.sh"
  else
    bash "$SERVER_DIR/scripts/setup-postgres.sh"
  fi
}

chromium_path() {
  if have_cmd chromium; then command -v chromium
  elif have_cmd chromium-browser; then command -v chromium-browser
  elif [[ -x /usr/bin/chromium ]]; then echo /usr/bin/chromium
  else echo ""
  fi
}

gen_secret() { openssl rand -hex 32; }
gen_hex16() { openssl rand -hex 16; }

write_server_env() {
  log "Writing server/.env..."
  local env_file="$SERVER_DIR/.env"
  local chromium
  chromium="$(chromium_path)"

  if [[ -f "$env_file" ]] && [[ "${FORCE_ENV:-}" != "1" ]]; then
    log "server/.env exists — keeping file (set FORCE_ENV=1 to regenerate secrets)"
    return 0
  fi

  local jwt enc
  jwt="$(gen_secret)"
  enc="$(gen_hex16)"

  cat >"$env_file" <<EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?connection_limit=10
REFERENCE_DATABASE_URL=file:./prisma/reference/rti-reference.db
REDIS_URL=redis://localhost:6379
JWT_SECRET=${jwt}
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=1h
ENCRYPTION_KEY=${enc}
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
TOTP_ISSUER=Case Ledger

S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_REGION=us-east-1
S3_BUCKET_NAME=rti-watch-evidence-dev
S3_BACKUP_BUCKET=rti-watch-backups-dev

GROQ_API_KEY=
GROQ_API_BASE=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile

LOOKUP_LIVE_FETCH=true
LOOKUP_FETCH_TIMEOUT_MS=15000
LOOKUP_USER_AGENT=CaseLedger/1.0 (investigation tool)

FORENSIC_OCR_ENABLED=false
FORENSIC_MAX_FILE_MB=50
FORENSIC_TESSERACT_LANG=eng
PUPPETEER_EXECUTABLE_PATH=${chromium:-/usr/bin/chromium}
EOF
  chmod 600 "$env_file" 2>/dev/null || true
  log "Created $env_file"
}

write_client_env() {
  log "Writing client/.env..."
  local env_file="$CLIENT_DIR/.env"
  if [[ -f "$env_file" ]] && [[ "${FORCE_ENV:-}" != "1" ]]; then
    log "client/.env exists — keeping file"
    return 0
  fi
  echo 'VITE_API_URL=http://localhost:3001' >"$env_file"
}

setup_minio() {
  if [[ "$SKIP_MINIO" == "true" ]]; then
    warn "Skipping MinIO setup"
    return 0
  fi
  log "Setting up MinIO (native binary)..."
  export ROOT_DIR USE_SUDO
  export S3_BUCKET_NAME=rti-watch-evidence-dev
  export S3_BACKUP_BUCKET=rti-watch-backups-dev
  bash "$ROOT_DIR/scripts/setup-minio-native.sh"
}

npm_install() {
  log "Installing npm dependencies (server)..."
  (cd "$SERVER_DIR" && npm install --legacy-peer-deps)
  log "Installing npm dependencies (client)..."
  (cd "$CLIENT_DIR" && npm install)
}

setup_database() {
  log "Prisma generate + migrate..."
  (cd "$SERVER_DIR" && npm run db:generate)
  (cd "$SERVER_DIR" && npm run db:migrate)

  log "Reference SQLite (law / i18n)..."
  (cd "$SERVER_DIR" && npx prisma db push --schema=prisma/reference/schema.prisma --skip-generate)

  if [[ "$SKIP_SEED" == "false" ]]; then
    log "Seeding database..."
    (cd "$SERVER_DIR" && npm run db:seed)
  else
    warn "Skipped seed (--skip-seed)"
  fi
}

print_done() {
  cat <<EOF

================================================================================
 Case Ledger — installation complete (no Docker)
================================================================================

 Services:
   PostgreSQL  ${DB_HOST}:${DB_PORT}  db=${DB_NAME}  user=${DB_USER}
   Redis       redis://localhost:6379
   MinIO       http://localhost:9000  (console :9001)  minioadmin / minioadmin

 Start infrastructure (if stopped):
   ./scripts/start-dev-services.sh

 Run application (3 terminals):
   1) cd server && npm run dev
   2) cd server && npm run dev:worker    # forensic OCR/PDF jobs
   3) cd client && npm run dev           # http://localhost:5173

 Default login (after seed):
   admin@rti-watch.local / Admin@RTI2026
   investigator@rti-watch.local / Investigate@2026

 Health check:
   curl -s http://localhost:3001/ready

 Docs: README.md  |  PostgreSQL: docs/POSTGRES_LOCAL.md
================================================================================
EOF
}

main() {
  log "Case Ledger installer (root: $ROOT_DIR)"

  if [[ "$SKIP_DEPS" == "false" ]]; then
    if is_debian_like; then
      USE_SUDO=1 check_deps
    else
      warn "Non-Debian OS — only checking commands, not installing packages"
      check_deps
    fi
  else
    log "Skipping system package install (--skip-deps)"
    install_node
  fi

  setup_postgres
  write_server_env
  write_client_env
  setup_minio
  npm_install
  setup_database
  print_done
}

main "$@"
