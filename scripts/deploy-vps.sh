#!/usr/bin/env bash
# =============================================================================
# Project00 Production VPS Deployment & Matrix Synapse Bootstrap Script
#
# Automates everything that runs inside the repository & host container stack:
#   1. Generates cryptographic secrets (CRON_SECRET, SUPABASE_WEBHOOK_SECRET,
#      MATRIX_USER_HMAC_SECRET, SYNAPSE_POSTGRES_PASSWORD, Synapse keys)
#   2. Renders .env.local / .env, infra/matrix/data/homeserver.yaml, and Nginx
#      reverse-proxy configs for www.<domain>, app.<domain>, matrix.<domain>
#   3. Generates Synapse signing key, boots synapse-postgres + synapse, creates
#      the internal non-human Synapse admin account, and captures
#      SYNAPSE_ADMIN_ACCESS_TOKEN automatically
#   4. Builds Docker images (with NEXT_PUBLIC_* build args) and boots the full
#      stack, then verifies http://127.0.0.1:8000/api/health
# =============================================================================
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "${PROJECT_ROOT}"

DOMAIN=""
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
LIVEKIT_URL=""
LIVEKIT_API_KEY=""
LIVEKIT_API_SECRET=""
ADMIN_USER="sanctuary_admin"
TUNNEL_GATEWAY_PORT=""
FRONTEND_PORT=""
INSTALL_NGINX="false"
RENDER_ONLY="false"
SYNC_FEEDS="false"
TUNNEL_MODE="false"

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-vps.sh [options]

Options:
  --domain <domain>               Root domain (e.g. example.com -> www., app., matrix.)
  --supabase-url <url>            Supabase project URL
  --supabase-anon-key <key>       Supabase anon/publishable key
  --supabase-service-key <key>    Supabase service_role key
  --livekit-url <wss-url>         LiveKit WebSocket URL (wss://...)
  --livekit-key <key>             LiveKit API key
  --livekit-secret <secret>       LiveKit API secret
  --admin-user <username>         Synapse admin provisioning username (default: sanctuary_admin)
  --gateway-port <port>           Tunnel gateway host port (default: 8088 to avoid 8080 collision)
  --frontend-port <port>          Frontend host port (default: 3080 to avoid 3000 collision)
  --tunnel                        Start Compose with Cloudflare Tunnel gateway (default: 127.0.0.1:8088)
  --install-nginx                 Install generated Nginx configs & reload nginx (requires TLS certs + root/sudo)
  --sync-feeds                    Trigger initial GET /api/feeds/sync after startup
  --render-only                   Generate secrets, .env.local, homeserver.yaml, and Nginx configs without running Docker
  -h, --help                      Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --supabase-url) SUPABASE_URL="${2:-}"; shift 2 ;;
    --supabase-anon-key) SUPABASE_ANON_KEY="${2:-}"; shift 2 ;;
    --supabase-service-key) SUPABASE_SERVICE_ROLE_KEY="${2:-}"; shift 2 ;;
    --livekit-url) LIVEKIT_URL="${2:-}"; shift 2 ;;
    --livekit-key) LIVEKIT_API_KEY="${2:-}"; shift 2 ;;
    --livekit-secret) LIVEKIT_API_SECRET="${2:-}"; shift 2 ;;
    --admin-user) ADMIN_USER="${2:-sanctuary_admin}"; shift 2 ;;
    --gateway-port) TUNNEL_GATEWAY_PORT="${2:-}"; shift 2 ;;
    --frontend-port) FRONTEND_PORT="${2:-}"; shift 2 ;;
    --tunnel) TUNNEL_MODE="true"; shift ;;
    --install-nginx) INSTALL_NGINX="true"; shift ;;
    --sync-feeds) SYNC_FEEDS="true"; shift ;;
    --render-only) RENDER_ONLY="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd openssl
require_cmd python3

if [[ "${RENDER_ONLY}" != "true" ]]; then
  require_cmd docker
  require_cmd curl
  if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose v2 plugin is required ('docker compose version' failed)." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Cannot connect to Docker daemon. Run with sudo or add your user to the 'docker' group." >&2
    exit 1
  fi
fi

# Preserve previously generated secrets/values from .env.local when re-running
if [[ -f ".env.local" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# || "$line" != *=* ]] && continue
    key="${line%%=*}"
    key="${key// /}"
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    val="${val%\'}"
    val="${val#\'}"
    if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ && -z "${!key:-}" ]]; then
      printf -v "EXISTING_${key}" '%s' "$val"
    fi
  done < .env.local
fi

prompt_if_empty() {
  local current="$1"
  local label="$2"
  local secret="${3:-false}"
  if [[ -n "$current" ]]; then
    printf '%s' "$current"
    return
  fi
  if [[ ! -t 0 ]]; then
    echo "Missing required value for ${label} in non-interactive mode." >&2
    exit 1
  fi
  local input=""
  if [[ "$secret" == "true" ]]; then
    read -r -s -p "${label}: " input
    echo >&2
  else
    read -r -p "${label}: " input
  fi
  printf '%s' "$input"
}

EXISTING_DOMAIN="${EXISTING_NEXT_PUBLIC_APP_URL:-}"
EXISTING_DOMAIN="${EXISTING_DOMAIN#https://app.}"
EXISTING_DOMAIN="${EXISTING_DOMAIN%/}"

DOMAIN="${DOMAIN:-${EXISTING_DOMAIN}}"
DOMAIN="$(prompt_if_empty "$DOMAIN" "Root domain (e.g. mydomain.com)")"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#www.}"
DOMAIN="${DOMAIN#app.}"
DOMAIN="${DOMAIN%/}"

SUPABASE_URL="${SUPABASE_URL:-${EXISTING_NEXT_PUBLIC_SUPABASE_URL:-}}"
SUPABASE_URL="$(prompt_if_empty "$SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_URL (https://...supabase.co)")"
SUPABASE_URL="${SUPABASE_URL%/}"

SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${EXISTING_NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"
SUPABASE_ANON_KEY="$(prompt_if_empty "$SUPABASE_ANON_KEY" "NEXT_PUBLIC_SUPABASE_ANON_KEY")"

SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${EXISTING_SUPABASE_SERVICE_ROLE_KEY:-}}"
SUPABASE_SERVICE_ROLE_KEY="$(prompt_if_empty "$SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_SERVICE_ROLE_KEY" true)"

LIVEKIT_URL="${LIVEKIT_URL:-${EXISTING_NEXT_PUBLIC_LIVEKIT_URL:-}}"
LIVEKIT_URL="$(prompt_if_empty "$LIVEKIT_URL" "NEXT_PUBLIC_LIVEKIT_URL (wss://...livekit.cloud)")"

LIVEKIT_API_KEY="${LIVEKIT_API_KEY:-${EXISTING_LIVEKIT_API_KEY:-}}"
LIVEKIT_API_KEY="$(prompt_if_empty "$LIVEKIT_API_KEY" "LIVEKIT_API_KEY")"

LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET:-${EXISTING_LIVEKIT_API_SECRET:-}}"
LIVEKIT_API_SECRET="$(prompt_if_empty "$LIVEKIT_API_SECRET" "LIVEKIT_API_SECRET" true)"

gen_hex() { openssl rand -hex 32; }

SYNAPSE_POSTGRES_PASSWORD="${EXISTING_SYNAPSE_POSTGRES_PASSWORD:-$(gen_hex)}"
CRON_SECRET="${EXISTING_CRON_SECRET:-$(gen_hex)}"
SUPABASE_WEBHOOK_SECRET="${EXISTING_SUPABASE_WEBHOOK_SECRET:-$(gen_hex)}"
MATRIX_USER_HMAC_SECRET="${EXISTING_MATRIX_USER_HMAC_SECRET:-$(gen_hex)}"
SYNAPSE_ADMIN_ACCESS_TOKEN="${EXISTING_SYNAPSE_ADMIN_ACCESS_TOKEN:-}"
SYNAPSE_ADMIN_PASSWORD="${EXISTING_SYNAPSE_ADMIN_PASSWORD:-$(gen_hex)}"
TUNNEL_GATEWAY_PORT="${TUNNEL_GATEWAY_PORT:-${EXISTING_TUNNEL_GATEWAY_PORT:-8088}}"
FRONTEND_PORT="${FRONTEND_PORT:-${EXISTING_FRONTEND_PORT:-3080}}"

APP_URL="https://app.${DOMAIN}"
PUBLIC_URL="https://www.${DOMAIN}"
MATRIX_SERVER_NAME="matrix.${DOMAIN}"
MATRIX_PUBLIC_URL="https://${MATRIX_SERVER_NAME}"

mkdir -p infra/matrix/data infra/nginx/generated infra/matrix/generated

HOMESERVER_YAML="infra/matrix/data/homeserver.yaml"
SIGNING_KEY_FILE="infra/matrix/data/${MATRIX_SERVER_NAME}.signing.key"

if [[ "${RENDER_ONLY}" != "true" && ! -f "${SIGNING_KEY_FILE}" ]]; then
  echo "Generating Synapse signing key for ${MATRIX_SERVER_NAME}..."
  docker run --rm \
    -e "SYNAPSE_SERVER_NAME=${MATRIX_SERVER_NAME}" \
    -e "SYNAPSE_REPORT_STATS=no" \
    -v "${PROJECT_ROOT}/infra/matrix/data:/data" \
    ghcr.io/element-hq/synapse:v1.165.0 generate >/dev/null
  # Replace the stock generated homeserver.yaml with our locked-down template below
  rm -f "${HOMESERVER_YAML}"
fi

if [[ ! -f "${HOMESERVER_YAML}" ]]; then
  echo "Rendering ${HOMESERVER_YAML} from template..."
  REG_SECRET="$(gen_hex)"
  MACAROON_SECRET="$(gen_hex)"
  FORM_SECRET="$(gen_hex)"
  python3 - \
    "infra/matrix/homeserver.yaml.template" \
    "${HOMESERVER_YAML}" \
    "${MATRIX_SERVER_NAME}" \
    "${APP_URL}" \
    "${MATRIX_PUBLIC_URL}/" \
    "${SYNAPSE_POSTGRES_PASSWORD}" \
    "${REG_SECRET}" \
    "${MACAROON_SECRET}" \
    "${FORM_SECRET}" <<'PY'
import pathlib
import sys

src, dst, srv, app_url, matrix_url, pg_pw, reg_sec, mac_sec, form_sec = sys.argv[1:]
text = pathlib.Path(src).read_text(encoding="utf-8")
text = text.replace("<MATRIX_SERVER_NAME>", srv)
text = text.replace("https://app.example.com", app_url)
text = text.replace("https://matrix.example.com/", matrix_url)
text = text.replace("<POSTGRES_PASSWORD>", pg_pw)
for secret in (reg_sec, mac_sec, form_sec):
    text = text.replace("<GENERATE_HEX_32>", secret, 1)
pathlib.Path(dst).write_text(text, encoding="utf-8")
PY
  chmod 640 "${HOMESERVER_YAML}" || true
fi

write_env_files() {
  umask 077
  cat > .env.local <<EOF
# Auto-generated by scripts/deploy-vps.sh
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
NEXT_PUBLIC_LIVEKIT_URL=${LIVEKIT_URL}

NEXT_PUBLIC_APP_URL=${APP_URL}
NEXT_PUBLIC_PUBLIC_URL=${PUBLIC_URL}
NEXT_PUBLIC_DEFAULT_HOST=public

CRON_SECRET=${CRON_SECRET}
SUPABASE_WEBHOOK_SECRET=${SUPABASE_WEBHOOK_SECRET}

NEXT_PUBLIC_MATRIX_HOMESERVER_URL=${MATRIX_PUBLIC_URL}
NEXT_PUBLIC_MATRIX_SERVER_NAME=${MATRIX_SERVER_NAME}
MATRIX_HOMESERVER_INTERNAL_URL=http://synapse:8008
SYNAPSE_ADMIN_ACCESS_TOKEN=${SYNAPSE_ADMIN_ACCESS_TOKEN}
SYNAPSE_ADMIN_PASSWORD=${SYNAPSE_ADMIN_PASSWORD}
SYNAPSE_POSTGRES_PASSWORD=${SYNAPSE_POSTGRES_PASSWORD}
MATRIX_USER_HMAC_SECRET=${MATRIX_USER_HMAC_SECRET}
MATRIX_LOCAL_POC_MODE=false

APP_ENV=production
BACKEND_INTERNAL_URL=http://backend:8000
ENABLE_BACKGROUND_WORKER=true
TUNNEL_GATEWAY_PORT=${TUNNEL_GATEWAY_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
EOF
  cp .env.local .env
  chmod 600 .env.local .env
}

render_nginx_configs() {
  python3 - \
    "infra/nginx/app.example.conf" \
    "infra/nginx/generated/app.conf" \
    "infra/matrix/nginx.example.conf" \
    "infra/matrix/generated/matrix.conf" \
    "infra/nginx/tunnel-gateway.conf.template" \
    "infra/nginx/generated/tunnel-gateway.conf" \
    "${DOMAIN}" <<'PY'
import pathlib
import sys

app_src, app_dst, mat_src, mat_dst, tun_src, tun_dst, domain = sys.argv[1:]
cert_dir = f"/etc/letsencrypt/live/{domain}"

app_txt = pathlib.Path(app_src).read_text(encoding="utf-8")
app_txt = app_txt.replace(
    "# ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;",
    f"ssl_certificate {cert_dir}/fullchain.pem;",
)
app_txt = app_txt.replace(
    "# ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;",
    f"ssl_certificate_key {cert_dir}/privkey.pem;",
)
app_txt = app_txt.replace("app.example.com", f"app.{domain}")
app_txt = app_txt.replace("www.example.com", f"www.{domain}")
app_redirect = (
    f"\nserver {{\n    listen 80;\n    server_name app.{domain} www.{domain};\n"
    f"    return 301 https://$host$request_uri;\n}}\n"
)
pathlib.Path(app_dst).write_text(app_txt + app_redirect, encoding="utf-8")

mat_txt = pathlib.Path(mat_src).read_text(encoding="utf-8")
mat_txt = mat_txt.replace("matrix.example.com", f"matrix.{domain}")
mat_txt = mat_txt.replace("app.example.com", f"app.{domain}")
mat_txt = mat_txt.replace("# ssl_certificate ...;", f"ssl_certificate {cert_dir}/fullchain.pem;")
mat_txt = mat_txt.replace("# ssl_certificate_key ...;", f"ssl_certificate_key {cert_dir}/privkey.pem;")
mat_redirect = (
    f"\nserver {{\n    listen 80;\n    server_name matrix.{domain};\n"
    f"    return 301 https://$host$request_uri;\n}}\n"
)
pathlib.Path(mat_dst).write_text(mat_txt + mat_redirect, encoding="utf-8")

if pathlib.Path(tun_src).exists():
    tun_txt = pathlib.Path(tun_src).read_text(encoding="utf-8")
    tun_txt = tun_txt.replace("<DOMAIN>", domain)
    pathlib.Path(tun_dst).write_text(tun_txt, encoding="utf-8")
PY
}

write_env_files
render_nginx_configs
echo "Generated .env.local, .env, infra/nginx/generated/app.conf, and infra/matrix/generated/matrix.conf."

if [[ "${RENDER_ONLY}" == "true" ]]; then
  echo "Render-only complete. Exiting before Docker operations."
  exit 0
fi

echo "Starting synapse-postgres and synapse..."
docker compose --env-file .env.local up -d synapse-postgres synapse

echo "Waiting for Matrix Synapse on 127.0.0.1:8008..."
for _ in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:8008/_matrix/client/versions >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:8008/_matrix/client/versions >/dev/null

if [[ -z "${SYNAPSE_ADMIN_ACCESS_TOKEN}" ]]; then
  echo "Provisioning Synapse admin user (${ADMIN_USER}) and capturing access token..."
  SYNAPSE_ADMIN_ACCESS_TOKEN="$(
    python3 - "${HOMESERVER_YAML}" "${ADMIN_USER}" "${SYNAPSE_ADMIN_PASSWORD}" <<'PY'
import hashlib
import hmac
import json
import pathlib
import re
import sys
import urllib.error
import urllib.request

hs_path, user, pw = sys.argv[1:]
hs_text = pathlib.Path(hs_path).read_text(encoding="utf-8")
m = re.search(r'^registration_shared_secret:\s*"?([^"\n]+)"?', hs_text, re.MULTILINE)
if not m:
    raise SystemExit("Could not locate registration_shared_secret in homeserver.yaml")
shared_secret = m.group(1).strip()

base = "http://127.0.0.1:8008"
try:
    with urllib.request.urlopen(f"{base}/_synapse/admin/v1/register", timeout=10) as resp:
        nonce = json.loads(resp.read().decode())["nonce"]
    mac = hmac.new(
        shared_secret.encode("utf-8"),
        f"{nonce}\x00{user}\x00{pw}\x00admin".encode("utf-8"),
        hashlib.sha1,
    ).hexdigest()
    req = urllib.request.Request(
        f"{base}/_synapse/admin/v1/register",
        data=json.dumps({
            "nonce": nonce,
            "username": user,
            "password": pw,
            "admin": True,
            "mac": mac,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(json.loads(resp.read().decode())["access_token"])
except urllib.error.HTTPError as exc:
    body = exc.read().decode("utf-8", errors="ignore")
    if "M_USER_IN_USE" not in body:
        raise SystemExit(f"Synapse admin registration failed ({exc.code}): {body}")
    login_req = urllib.request.Request(
        f"{base}/_matrix/client/v3/login",
        data=json.dumps({
            "type": "m.login.password",
            "identifier": {"type": "m.id.user", "user": user},
            "password": pw,
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(login_req, timeout=15) as resp:
        print(json.loads(resp.read().decode())["access_token"])
PY
  )"
  write_env_files
fi

echo "Building and starting backend and frontend containers..."
if [[ "${TUNNEL_MODE}" == "true" ]]; then
  docker compose --profile tunnel --env-file .env.local up -d --build
else
  docker compose --env-file .env.local up -d --build
fi

echo "Waiting for FastAPI backend healthcheck..."
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:8000/api/health
echo

if [[ "${SYNC_FEEDS}" == "true" ]]; then
  echo "Triggering initial editorial RSS feed sync..."
  curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" http://127.0.0.1:8000/api/feeds/sync
  echo
fi

if [[ "${INSTALL_NGINX}" == "true" ]]; then
  if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]] || [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]]; then
    echo "TLS certificates not found at /etc/letsencrypt/live/${DOMAIN}/. Run certbot first, then re-run with --install-nginx." >&2
    exit 1
  fi
  install -m 644 infra/nginx/generated/app.conf /etc/nginx/sites-available/project00-app.conf
  install -m 644 infra/matrix/generated/matrix.conf /etc/nginx/sites-available/project00-matrix.conf
  ln -sf /etc/nginx/sites-available/project00-app.conf /etc/nginx/sites-enabled/project00-app.conf
  ln -sf /etc/nginx/sites-available/project00-matrix.conf /etc/nginx/sites-enabled/project00-matrix.conf
  nginx -t
  systemctl reload nginx
fi

if [[ "${TUNNEL_MODE}" == "true" ]]; then
  cat <<EOF

===============================================================================
Container stack + tunnel gateway (http://127.0.0.1:${TUNNEL_GATEWAY_PORT}) deployed cleanly!
Next steps for Cloudflare Tunnel (once ${DOMAIN} shows Active on Cloudflare):

1. Authenticate cloudflared & create the tunnel:
   cloudflared tunnel login
   cloudflared tunnel create solace

2. Create ~/.cloudflared/config.yml (replace <TUNNEL_UUID> with the ID printed above):
   tunnel: <TUNNEL_UUID>
   credentials-file: $HOME/.cloudflared/<TUNNEL_UUID>.json
   ingress:
     - hostname: www.${DOMAIN}
       service: http://127.0.0.1:${TUNNEL_GATEWAY_PORT}
     - hostname: app.${DOMAIN}
       service: http://127.0.0.1:${TUNNEL_GATEWAY_PORT}
     - hostname: matrix.${DOMAIN}
       service: http://127.0.0.1:${TUNNEL_GATEWAY_PORT}
     - service: http_status:404

3. Route DNS CNAMEs & run the tunnel:
   cloudflared tunnel route dns solace www.${DOMAIN}
   cloudflared tunnel route dns solace app.${DOMAIN}
   cloudflared tunnel route dns solace matrix.${DOMAIN}
   cloudflared tunnel run solace

4. Add Auth Redirect URLs & Webhooks (once tunnel is running):
   - Supabase Redirect URLs:
       https://app.${DOMAIN}/sanctuary/login
       https://app.${DOMAIN}/api/auth/callback
       https://www.${DOMAIN}/api/auth/callback
   - Supabase DB Webhook (DELETE on 'messages'):
       URL:    https://app.${DOMAIN}/api/webhooks/supabase
       Header: x-webhook-secret: ${SUPABASE_WEBHOOK_SECRET}
   - LiveKit Webhook:
       URL:    https://app.${DOMAIN}/api/webhooks/livekit
===============================================================================
EOF
else
  cat <<EOF

===============================================================================
Container stack deployed cleanly! Remaining external steps (only you can do):

1. Supabase Migrations (run 001 -> 004 in order in Supabase SQL Editor or CLI):
   - supabase/migrations/001_initial_schema.sql  (enable pg_cron extension first)
   - supabase/migrations/002_matrix_integration.sql
   - supabase/migrations/003_sanctuary_feature_completion.sql
   - supabase/migrations/004_storage_buckets.sql

2. DNS & TLS Certificates (on this VPS):
   sudo certbot certonly --standalone --cert-name ${DOMAIN} -d www.${DOMAIN} -d app.${DOMAIN} -d matrix.${DOMAIN}
   Then install Nginx configs:
   sudo ./scripts/deploy-vps.sh --domain ${DOMAIN} --install-nginx

3. Supabase Auth Redirect URLs:
   - https://app.${DOMAIN}/sanctuary/login
   - https://app.${DOMAIN}/api/auth/callback
   - https://www.${DOMAIN}/api/auth/callback

4. Webhooks:
   - Supabase DB Webhook (DELETE on 'messages'):
       URL:    https://app.${DOMAIN}/api/webhooks/supabase
       Header: x-webhook-secret: ${SUPABASE_WEBHOOK_SECRET}
   - LiveKit Webhook:
       URL:    https://app.${DOMAIN}/api/webhooks/livekit
===============================================================================
EOF
fi
