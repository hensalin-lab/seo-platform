@echo off
echo Starting Backend on port 8001...
start "Backend" cmd /k "cd /d %~dp0backend & C:\Users\hemal\AppData\Local\Python\bin\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 3
echo Starting Frontend on port 5173...
start "Frontend" cmd /k "cd /d %~dp0frontend & npm run dev"
echo.
echo ============================================
echo  Backend:  http://localhost:8001
echo  Frontend: http://localhost:5173
echo ============================================
echo Open http://localhost:5173 in your browser
pause
