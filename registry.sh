#!/usr/bin/env bash
set -euo pipefail

# AuthzKit Local Registry Helper
# Spins up Verdaccio with anonymous publish access and publishes workspace packages.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TMP_DIR="$ROOT_DIR/.tmp/verdaccio"
PID_FILE="$TMP_DIR/verdaccio.pid"
LOG_FILE="$TMP_DIR/verdaccio.log"
CONFIG_FILE="$TMP_DIR/config.yaml"
AUTH_FILE="$TMP_DIR/npmrc"
REGISTRY_URL="${REGISTRY_URL:-http://127.0.0.1:4873}"
PNPM_CMD="pnpm"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_usage() {
  cat <<USAGE
Usage: $0 <command>

Commands:
  start         Start Verdaccio using the project config
  stop          Stop the Verdaccio process started by this script
  status        Report whether Verdaccio is running
  restart       Stop then start the registry
  publish       Build + publish the root package (./package)
  publish-root  Build + publish the root package (./package)
  clean         Remove Verdaccio temp files (storage/logs/pid)

Environment:
  REGISTRY_URL   Target registry URL (default: $REGISTRY_URL)

Examples:
  REGISTRY_URL=http://localhost:4873 $0 start
  REGISTRY_URL=http://localhost:4873 $0 publish
USAGE
}

ensure_tmp() {
  mkdir -p "$TMP_DIR/storage"
  touch "$TMP_DIR/htpasswd"
}

ensure_config() {
  ensure_tmp
  if [ -f "$CONFIG_FILE" ]; then
    return
  fi

  local listen_addr
  listen_addr=$(node -e "const url=new URL(process.argv[1]); console.log(url.hostname + ':' + (url.port || 4873));" "$REGISTRY_URL")

  cat > "$CONFIG_FILE" <<CFG
storage: $TMP_DIR/storage
listen: $listen_addr
auth:
  htpasswd:
    file: $TMP_DIR/htpasswd
    max_users: 1000
packages:
  '@*/*':
    access: \$all
    publish: \$all
    proxy: npmjs
  '**':
    access: \$all
    publish: \$all
    proxy: npmjs
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
log:
  type: stdout
  format: pretty
  level: warn
CFG
}

check_status() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} Verdaccio running (PID $pid) @ $REGISTRY_URL"
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  echo -e "${RED}✗${NC} Verdaccio not running"
  return 1
}

start_registry() {
  if check_status >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Verdaccio already running"
    return 0
  fi

  ensure_config

  if ! command -v verdaccio >/dev/null 2>&1; then
    if command -v npx >/dev/null 2>&1; then
      VERDACCIO_BIN=(npx --yes verdaccio)
    else
      echo -e "${RED}✗${NC} verdaccio not found and npx unavailable"
      exit 1
    fi
  else
    VERDACCIO_BIN=(verdaccio)
  fi

  echo -e "${BLUE}Starting Verdaccio...${NC}"
  nohup "${VERDACCIO_BIN[@]}" --config "$CONFIG_FILE" > "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"
  sleep 3

  if kill -0 "$pid" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Verdaccio listening on $REGISTRY_URL"
    echo -e "  log file: $LOG_FILE"
  else
    echo -e "${RED}✗${NC} Verdaccio failed to start (see $LOG_FILE)"
    rm -f "$PID_FILE"
    exit 1
  fi
}

stop_registry() {
  if ! check_status >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Nothing to stop"
    return 0
  fi
  local pid
  pid=$(cat "$PID_FILE")
  echo -e "${BLUE}Stopping Verdaccio (PID $pid)...${NC}"
  kill "$pid" 2>/dev/null || true
  for _ in {1..10}; do
    if kill -0 "$pid" 2>/dev/null; then
      sleep 0.5
    else
      break
    fi
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} Force killing Verdaccio"
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
  echo -e "${GREEN}✓${NC} Verdaccio stopped"
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    PNPM_CMD="pnpm"
    return
  fi
  if command -v npx >/dev/null 2>&1; then
    local version
    version=$(node -p "require('./package.json').packageManager.split('@')[1]")
    PNPM_CMD="npx --yes pnpm@${version}"
    return
  fi
  echo -e "${RED}✗${NC} pnpm is required"
  exit 1
}

ensure_auth() {
  ensure_tmp
  if [ -f "$AUTH_FILE" ] && grep -q "_authToken" "$AUTH_FILE"; then
    return
  fi

  local username="authzkit-bot"
  local password="authzkit-pass-123"
  local email="authzkit-bot@example.com"

  local create_payload
  create_payload=$(printf '{"name":"%s","password":"%s","email":"%s"}' "$username" "$password" "$email")
  local response
  response=$(curl -s -X PUT "$REGISTRY_URL/-/user/org.couchdb.user:$username" \
    -H "content-type: application/json" \
    -d "$create_payload")

  local token
  token=$(printf '%s' "$response" | node -e "const fs=require('fs'); const data=fs.readFileSync(0,'utf8'); try { const res=JSON.parse(data); if(res.token){ console.log(res.token); process.exit(0);} } catch (err) {} process.exit(1);") || true

  if [ -z "${token:-}" ]; then
    local login_payload
    login_payload=$(printf '{"name":"%s","password":"%s","type":"login"}' "$username" "$password")
    response=$(curl -s -X PUT "$REGISTRY_URL/-/user/org.couchdb.user:$username" \
      -H "content-type: application/json" \
      -d "$login_payload")
    token=$(printf '%s' "$response" | node -e "const fs=require('fs'); const data=fs.readFileSync(0,'utf8'); const res=JSON.parse(data); if(!res.token){process.exit(1);} console.log(res.token);") || {
      echo -e "${RED}✗${NC} Failed to obtain auth token from Verdaccio"
      exit 1
    }
  fi

  local host
  host=$(node -e "const u=new URL(process.argv[1]); console.log(u.host);" "$REGISTRY_URL")

  cat > "$AUTH_FILE" <<EOF
registry=$REGISTRY_URL
//$host/:_authToken=$token
//$host/:always-auth=true
EOF
}


clean_tmp() {
  rm -rf "$TMP_DIR"
  echo -e "${GREEN}✓${NC} Cleaned Verdaccio tmp data"
}

build_root_package() {
  # Builds ./package using the existing packaging script, ensuring private: false
  if [ ! -x "$ROOT_DIR/package.sh" ]; then
    echo -e "${RED}✗${NC} packaging script package.sh not found or not executable"
    exit 1
  fi
  echo -e "${BLUE}Building root package via package.sh...${NC}"
  (cd "$ROOT_DIR" && bash ./package.sh)
  if [ ! -f "$ROOT_DIR/package/package.json" ]; then
    echo -e "${RED}✗${NC} Failed to generate ./package/package.json"
    exit 1
  fi
}

publish_root() {
  ensure_pnpm
  if ! check_status >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} Registry not running; starting now"
    start_registry
    sleep 2
  fi

  ensure_auth

  # Build the distributable folder (./package) and ensure it's public
  build_root_package

  local pkg_dir="$ROOT_DIR/package"
  local pkg_json="$pkg_dir/package.json"

  # Auto-bump and publish with retry on conflicts
  auto_bump_version "$pkg_dir"
  echo -e "${BLUE}Publishing root package to $REGISTRY_URL...${NC}"
  publish_with_retry "$pkg_dir"
  echo -e "${GREEN}✓${NC} Root package published"
}

auto_bump_version() {
  local pkg_dir="$1"
  local pkg_path="$pkg_dir/package.json"
  if [ ! -f "$pkg_path" ]; then
    return
  fi

  local current_version
  current_version=$(node -e 'const path=require("path"); const pkg=require(path.resolve(process.argv[1])); process.stdout.write(pkg.version ? String(pkg.version) : "");' "$pkg_path")

  if [ "${SKIP_VERSION_BUMP:-}" = "1" ]; then
    echo -e "${BLUE}→ Using existing version $(basename "$pkg_dir") v${current_version}${NC}"
    return
  fi

  local new_version
  new_version=$(node -e '
function bump(version) {
  if (!version) {
    return "0.0.1";
  }

  const split = version.split("-");
  const core = split[0];
  const pre = split.length > 1 ? split.slice(1).join("-") : "";

  if (pre) {
    const segments = pre.split(".");
    for (let i = segments.length - 1; i >= 0; i -= 1) {
      const numeric = Number(segments[i]);
      if (Number.isFinite(numeric)) {
        segments[i] = String(numeric + 1);
        return core + "-" + segments.join(".");
      }
    }
    segments.push("1");
    return core + "-" + segments.join(".");
  }

  const parts = core.split(".").map((segment) => Number(segment));
  while (parts.length < 3) {
    parts.push(0);
  }
  if (!Number.isFinite(parts[parts.length - 1])) {
    parts[parts.length - 1] = 0;
  }
  parts[parts.length - 1] += 1;
  return parts.join(".");
}

process.stdout.write(bump(process.argv[1] || ""));
' "$current_version")

  node -e 'const fs=require("fs"); const path=process.argv[1]; const version=process.argv[2]; const raw=fs.readFileSync(path, "utf8"); const updated=raw.replace(/("version"\s*:\s*")([^"\n]+)(")/, "$1" + version + "$3"); if (updated === raw) { throw new Error("Failed to update version in " + path); } fs.writeFileSync(path, updated);' "$pkg_path" "$new_version"

  echo -e "${BLUE}→ Bumped $(basename "$pkg_dir") to v${new_version}${NC}"
}

publish_with_retry() {
  local pkg_dir="$1"
  local attempts=0
  local max_attempts=5

  while true; do
    echo -e "${BLUE}→ Publishing $(basename "$pkg_dir") (attempt $((attempts + 1)))${NC}"
    local output
    if output=$(cd "$pkg_dir" && NPM_CONFIG_IGNORE_SCRIPTS=true NPM_CONFIG_USERCONFIG="$AUTH_FILE" $PNPM_CMD publish --registry "$REGISTRY_URL" --no-git-checks --tag local --access public 2>&1); then
      printf '%s\n' "$output"
      break
    fi
    local status=$?
    printf '%s\n' "$output"

    if echo "$output" | grep -q 'E409'; then
      attempts=$((attempts + 1))
      if [ "$attempts" -ge "$max_attempts" ]; then
        echo -e "${RED}✗${NC} Failed to publish $(basename "$pkg_dir") after $attempts attempts"
        return $status
      fi
      echo -e "${YELLOW}⚠${NC} Version conflict detected; bumping and retrying"
      auto_bump_version "$pkg_dir"
      continue
    fi

    return $status
  done
}

command="${1:-}"
case "$command" in
  start) start_registry ;;
  stop) stop_registry ;;
  status) check_status ;;
  restart) stop_registry; start_registry ;;
  publish) publish_root ;;
  publish-root) publish_root ;;
  clean) clean_tmp ;;
  ""|-h|--help) print_usage ;;
  *)
    print_usage
    exit 1
    ;;
esac
