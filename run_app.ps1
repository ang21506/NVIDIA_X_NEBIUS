Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Starting LearnLoop AI - Autonomous Personal Learning Agent" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend in background process
Write-Host "[1/2] Launching FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "-m uvicorn backend.app.main:app --port 8000 --reload" -PassThru

# 2. Start Frontend
Write-Host "[2/2] Launching React Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Set-Location frontend
npm run dev

# Cleanup
if ($backendProcess) {
    Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
}
