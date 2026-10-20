#!/usr/bin/env bash
set -e

# Default mode is production (single server on port 8000)
MODE=${1:-"prod"}

if [ "$MODE" = "dev" ]; then
    echo "Starting in Development Mode (FastAPI on :8000 + Vite on :5173)..."
    ./venv/bin/uvicorn backend.main:app --reload --port 8000 &
    BACKEND_PID=$!
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
    wait
else
    echo "Starting Predictr AI SaaS on http://localhost:8000..."
    # Ensure frontend is built
    if [ ! -d "frontend/dist" ]; then
        echo "Building frontend bundle..."
        (cd frontend && npm run build)
    fi
    ./venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
fi
