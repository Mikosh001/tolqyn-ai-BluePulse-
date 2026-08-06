#!/usr/bin/env bash
# Frontend пен backend-ті бір терминалда бірге іске қосады (Docker-сіз).
# Қолданылуы:
#   chmod +x dev.sh && ./dev.sh
# Тоқтату: Ctrl+C (екі процесс те тоқтайды)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ Backend тәуелділіктерін тексеру..."
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install --quiet -r requirements.txt

echo "→ Frontend тәуелділіктерін тексеру..."
cd "$ROOT_DIR"
if [ ! -d "node_modules" ]; then
  npm install
fi

cleanup() {
  echo ""
  echo "→ Тоқтатылуда..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "→ Backend іске қосылуда (http://localhost:8000, Swagger: /docs)..."
cd "$ROOT_DIR/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

echo "→ Frontend іске қосылуда (http://localhost:5173)..."
cd "$ROOT_DIR"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Дайын! Frontend: http://localhost:5173  |  Backend: http://localhost:8000/docs"
echo "  Тоқтату үшін Ctrl+C басыңыз."
wait
