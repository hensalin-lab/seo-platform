# ============================================================
#  server-off.ps1  —  stop the laptop backend + tunnel
#  Usage:  powershell -ExecutionPolicy Bypass -File server-off.ps1
# ============================================================
$ErrorActionPreference = 'Continue'

Write-Host 'Stopping Cloudflare tunnel(s)...' -ForegroundColor Cyan
Get-Process -Name 'cloudflared*' -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host 'Stopping backend (uvicorn on port 8001)...' -ForegroundColor Cyan
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*uvicorn*app.main:app*8001*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Write-Host 'Done. The site is now offline until you run server-on.ps1 again.' -ForegroundColor Yellow
