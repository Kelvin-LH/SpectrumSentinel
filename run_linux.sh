#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if [[ ! -d backend/static ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "未检测到 Node.js/npm，首次构建前端需要 Node.js 20 或更高版本。" >&2
    exit 1
  fi
  npm --prefix frontend install
  npm --prefix frontend run build
fi

exec uvicorn spectrum_sentinel.app:app \
  --app-dir backend \
  --host "${HOST:-0.0.0.0}" \
  --port "${PORT:-8000}"
