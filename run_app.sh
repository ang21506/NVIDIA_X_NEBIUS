#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   Starting LearnLoop AI — Autonomous Personal Learning Agent"
echo "=========================================================="

# 1. Start Backend
echo "[1/2] Launching FastAPI Backend on http://localhost:8000..."
source venv/bin/activate
uvicorn backend.app.main:app --port 8000 --reload &
BACKEND_PID=$!

# Trap signals to cleanup
trap "kill $BACKEND_PID" EXIT

# 2. Start Frontend
echo "[2/2] Launching React Vite Frontend on http://localhost:5173..."
cd frontend
npm run dev
