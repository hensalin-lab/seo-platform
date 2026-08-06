# ============================================================
#  server-on.ps1  —  Laptop-as-server: start backend + tunnel
#  Starts: uvicorn backend (port 8001) -> cloudflared quick
#  tunnel -> updates frontend/vercel.json rewrite -> deploys.
#  Usage:  powershell -ExecutionPolicy Bypass -File server-on.ps1
#  (optional: -NoDeploy to skip the Vercel redeploy)
# ============================================================
param([switch]$NoDeploy)

$ErrorActionPreference = 'Continue'
$root = $PSScriptRoot
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'
$logDir = Join-Path $backendDir 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$CLOUDFLARED = @(
    'C:\Program Files (x86)\cloudflared\cloudflared.exe',
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe",
    (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $CLOUDFLARED) {
    Write-Host '[FAIL] cloudflared.exe not found. Install: winget install Cloudflare.cloudflared' -ForegroundColor Red
    exit 1
}

function Wait-ForHealth {
    param([int]$Port, [int]$TimeoutSec = 40)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
        Start-Sleep -Seconds 2
    }
    return $false
}

# ---------- 1. Backend on port 8001 ----------
$backendUp = $false
try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8001/api/health' -UseBasicParsing -TimeoutSec 3
    $backendUp = $r.StatusCode -eq 200
} catch { }

if (-not $backendUp) {
    Write-Host '[1/4] Starting backend on port 8001...' -ForegroundColor Cyan
    $proc = Start-Process -FilePath 'py' -ArgumentList '-m uvicorn app.main:app --host 0.0.0.0 --port 8001' `
        -WorkingDirectory $backendDir -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logDir 'backend.out.log') `
        -RedirectStandardError (Join-Path $logDir 'backend.err.log') -PassThru
    if (Wait-ForHealth -Port 8001) {
        Write-Host '      Backend healthy (127.0.0.1:8001).' -ForegroundColor Green
    } else {
        Write-Host '[FAIL] Backend did not become healthy. Check backend\logs\backend.err.log' -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host '[1/4] Backend already running on 8001.' -ForegroundColor Green
}

# ---------- 2. LM Studio local AI (Qwen 3 8B) ----------
$env:PATH = "$env:USERPROFILE\.lmstudio\bin;$env:PATH"
Write-Host '[2/5] Starting LM Studio (Qwen 3 8B) local AI...' -ForegroundColor Cyan
$lmUp = $false
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:1234/v1/models' -UseBasicParsing -TimeoutSec 3
    $lmUp = $r.StatusCode -eq 200 -and $r.Content -match 'qwen3-8b'
} catch { }
if (-not $lmUp) {
    try { & lms daemon up 2>&1 | Out-Null } catch { }
    Start-Sleep -Seconds 4
    try { & lms server start 2>&1 | Out-Null } catch { }
    Start-Sleep -Seconds 2
    $loaded = $false
    try { $loaded = (& lms ps 2>&1) -match 'qwen3-8b' } catch { }
    if (-not $loaded) {
        Write-Host '      Loading qwen3-8b (first load takes ~90s)...' -ForegroundColor Yellow
        try { & lms load qwen3-8b 2>&1 | Out-Null } catch { }
    }
}
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:1234/v1/models' -UseBasicParsing -TimeoutSec 5
    if ($r.Content -match 'qwen3-8b') {
        Write-Host '      LM Studio ready (Qwen 3 8B on :1234).' -ForegroundColor Green
    } else {
        Write-Host '[WARN] LM Studio API up but qwen3-8b not listed — check: lms ls' -ForegroundColor Yellow
    }
} catch {
    Write-Host '[WARN] LM Studio not ready — other AI providers (Ollama/Groq/Gemini) will cover.' -ForegroundColor Yellow
}

# ---------- 3. Cloudflare tunnel ----------
Get-Process -Name 'cloudflared*' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
$tunnelOut = Join-Path $logDir 'tunnel.out.log'
$tunnelErr = Join-Path $logDir 'tunnel.err.log'
Remove-Item $tunnelOut, $tunnelErr -ErrorAction SilentlyContinue

Write-Host '[3/5] Starting Cloudflare tunnel...' -ForegroundColor Cyan
Start-Process -FilePath $CLOUDFLARED -ArgumentList 'tunnel --url http://127.0.0.1:8001' `
    -WindowStyle Hidden -RedirectStandardOutput $tunnelOut -RedirectStandardError $tunnelErr

$url = $null
$deadline = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $deadline -and -not $url) {
    Start-Sleep -Seconds 2
    $line = Get-Content $tunnelOut, $tunnelErr -ErrorAction SilentlyContinue |
        Select-String -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -Last 1
    if ($line) {
        $m = [regex]::Match($line, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($m.Success) { $url = $m.Value }
    }
}
if (-not $url) {
    Write-Host '[FAIL] Could not obtain tunnel URL. Check backend\logs\tunnel.err.log' -ForegroundColor Red
    exit 1
}
Write-Host "      Tunnel URL: $url" -ForegroundColor Green

# ---------- 4. Point Vercel rewrite at the tunnel ----------
$vercelJson = Join-Path $frontendDir 'vercel.json'
Write-Host '[4/5] Updating frontend/vercel.json rewrite...' -ForegroundColor Cyan
$json = Get-Content $vercelJson -Raw | ConvertFrom-Json
$json.rewrites[0].destination = "$url/api/:path*"
$outJson = $json | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($vercelJson, $outJson, (New-Object System.Text.UTF8Encoding $false))
Write-Host '      Rewrite updated.' -ForegroundColor Green

# ---------- 5. Deploy ----------
if (-not $NoDeploy) {
    Write-Host '[5/5] Deploying frontend to Vercel (production)...' -ForegroundColor Cyan
    Push-Location $frontendDir
    try { vercel --prod } finally { Pop-Location }
} else {
    Write-Host '[5/5] Skipped deploy (-NoDeploy). Run:  vercel --prod  inside frontend/' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  Live:  https://seo-platform-xi.vercel.app  (frontend)' -ForegroundColor White
Write-Host "  API:   $url  (laptop backend -> Ollama + LM Studio)" -ForegroundColor White
Write-Host '  NOTE:  Site is live ONLY while this laptop is on and the' -ForegroundColor Yellow
Write-Host '         tunnel stays up. Stop it with: server-off.ps1' -ForegroundColor Yellow
Write-Host '============================================================' -ForegroundColor Cyan
