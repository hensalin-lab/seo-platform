@echo off
echo ===================================
echo  AI SEO Intelligence Platform v2.0
echo ===================================
echo.

echo [1/2] Starting Backend...
cd backend
pip install -r requirements.txt --quiet 2>nul
start "SEO Backend" cmd /k "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
cd ..

echo [2/2] Starting Frontend...
cd frontend
npm install --silent 2>nul
start "SEO Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ===================================
echo  Platform Starting...
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo  API Docs: http://localhost:8000/docs
echo ===================================
pause
