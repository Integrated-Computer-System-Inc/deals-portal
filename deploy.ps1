# ==============================================================================
# Deals Registration Portal - Windows Production Deployment Script
# ==============================================================================
# This script builds and starts/reloads the Deals Portal under PM2 on Windows.
# Run in PowerShell: .\deploy.ps1
# ==============================================================================

[CmdletBinding()]
param (
    [switch]$SkipInstall = $false,
    [switch]$SkipBuild = $false,
    [switch]$RestartNginx = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       ICS Deals Registration Portal - Deployment Script     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Prerequisites
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Node.js Check
try {
    $nodeVersion = node -v
    Write-Host "  [OK] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not installed or not in system PATH. Please install Node.js (>= 18.0.0)."
    exit 1
}

# PM2 Check
$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Installed) {
    Write-Host "  [!] PM2 is not found globally. Installing pm2 globally..." -ForegroundColor Yellow
    npm install -g pm2
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install PM2 globally. Run 'npm install -g pm2' in an elevated terminal."
        exit 1
    }
} else {
    Write-Host "  [OK] PM2 is installed" -ForegroundColor Green
}

# 2. Check Environment Variables
Write-Host "`n[2/6] Checking environment configuration..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "apps\deals\.env"
$envLocalPath = Join-Path $PSScriptRoot "apps\deals\.env.local"

if (-not (Test-Path $envPath) -and -not (Test-Path $envLocalPath)) {
    Write-Host "  [WARNING] Neither apps\deals\.env nor apps\deals\.env.local was found!" -ForegroundColor Red
    Write-Host "  Please ensure your environment variables (NEXTAUTH_URL, DATABASE_URL, etc.) are configured." -ForegroundColor Yellow
    Write-Host "  Refer to apps\deals\.env.production.example for the required variables." -ForegroundColor Yellow
} else {
    Write-Host "  [OK] Environment file found in apps\deals" -ForegroundColor Green
}

# Ensure logs directory exists
$logsDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "  [OK] Created logs directory: $logsDir" -ForegroundColor Green
}

# 3. Monorepo Dependencies Installation
if (-not $SkipInstall) {
    Write-Host "`n[3/6] Installing monorepo dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed. Please check for dependency errors."
        exit 1
    }
    Write-Host "  [OK] Dependencies installed successfully." -ForegroundColor Green
} else {
    Write-Host "`n[3/6] Skipping npm install (-SkipInstall specified)" -ForegroundColor Gray
}

# 4. Generate Database Client (Prisma)
Write-Host "`n[4/6] Generating Prisma Client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Error "Prisma generation failed. Please verify packages/database/prisma/schema.prisma."
    exit 1
}
Write-Host "  [OK] Prisma client generated successfully." -ForegroundColor Green

# 5. Build Monorepo (Next.js & Packages)
if (-not $SkipBuild) {
    Write-Host "`n[5/6] Building production bundle (Turborepo & Next.js)..." -ForegroundColor Yellow
    $env:NODE_ENV = "production"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Production build failed. Please resolve the build errors above."
        exit 1
    }
    Write-Host "  [OK] Production build completed successfully." -ForegroundColor Green
} else {
    Write-Host "`n[5/6] Skipping build step (-SkipBuild specified)" -ForegroundColor Gray
}

# 6. Start / Reload with PM2
Write-Host "`n[6/6] Managing PM2 process..." -ForegroundColor Yellow

$ecosystemFile = Join-Path $PSScriptRoot "ecosystem.config.js"

# Check if deals-portal is already registered in PM2
$pm2Status = pm2 jlist | ConvertFrom-Json 2>$null
$appRunning = $false

if ($pm2Status) {
    foreach ($app in $pm2Status) {
        if ($app.name -eq "deals-portal") {
            $appRunning = $true
            break
        }
    }
}

if ($appRunning) {
    Write-Host "  Reloading running 'deals-portal' process..." -ForegroundColor Cyan
    pm2 reload $ecosystemFile --env production
} else {
    Write-Host "  Starting 'deals-portal' process..." -ForegroundColor Cyan
    pm2 start $ecosystemFile --env production
}

# Save PM2 process list so it persists across restarts
pm2 save
Write-Host "  [OK] PM2 state saved." -ForegroundColor Green

# Optional Nginx reload
if ($RestartNginx) {
    Write-Host "`n[Nginx] Testing and reloading Nginx..." -ForegroundColor Yellow
    $nginxCmd = Get-Command nginx -ErrorAction SilentlyContinue
    if ($nginxCmd) {
        nginx -t
        if ($LASTEXITCODE -eq 0) {
            nginx -s reload
            Write-Host "  [OK] Nginx reloaded successfully." -ForegroundColor Green
        } else {
            Write-Host "  [!] Nginx config test failed. Please verify your nginx.conf." -ForegroundColor Red
        }
    } else {
        Write-Host "  [!] 'nginx' command not found in PATH. Please reload your Windows Nginx manually via 'nginx -s reload'." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host " - Internal Next.js App : http://127.0.0.1:4001" -ForegroundColor White
Write-Host " - Public Nginx Proxy   : http://<server-ip>:4000" -ForegroundColor White
Write-Host " - PM2 Logs             : pm2 logs deals-portal" -ForegroundColor White
Write-Host " - PM2 Status           : pm2 status" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
