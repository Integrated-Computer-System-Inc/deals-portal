# ==============================================================================
# GitHub Actions Self-Hosted Runner Setup Script for Windows Desktop
# ==============================================================================
# Runner Name : action-runner-dealsreg
# Target Repo : https://github.com/Integrated-Computer-System-Inc/deals-portal
# Runner Path : C:\actions-runner
# Mode        : Windows Background Service (24/7 Auto-Start)
#
# RUN THIS SCRIPT IN AN ELEVATED POWERSHELL (Run as Administrator):
#   .\scripts\setup-runner.ps1
# ==============================================================================

[CmdletBinding()]
param (
    [string]$RunnerDir = "C:\actions-runner",
    [string]$RepoUrl = "https://github.com/Integrated-Computer-System-Inc/deals-portal",
    [string]$Token = "CKVSHBXE7ZFVLY6FQH5AUX3KR2C2W",
    [string]$RunnerName = "action-runner-dealsreg",
    [string]$RunnerLabels = "action-runner-dealsreg,deals-portal,windows,production",
    [string]$RunnerVersion = "2.336.0",
    [string]$ExpectedHash = "D59123A43003E357B0805B5D0F611D0BD2F65AB67D51BD070DD4E7A0F685C162"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " GitHub Actions Self-Hosted Runner Setup (Windows Service)  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Runner Name   : $RunnerName" -ForegroundColor White
Write-Host " Target Repo   : $RepoUrl" -ForegroundColor White
Write-Host " Directory     : $RunnerDir" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] Warning: This script must be run as Administrator to install the Windows Service." -ForegroundColor Red
    Write-Host "    Please right-click PowerShell -> 'Run as Administrator' and re-run." -ForegroundColor Yellow
    exit 1
}

# 2. Create Runner Directory
Write-Host "[1/6] Creating runner directory at $RunnerDir..." -ForegroundColor Yellow
if (-not (Test-Path $RunnerDir)) {
    New-Item -ItemType Directory -Path $RunnerDir -Force | Out-Null
}
Set-Location $RunnerDir

# 3. Download Package if not already downloaded
$zipFileName = "actions-runner-win-x64-$RunnerVersion.zip"
$zipPath = Join-Path $RunnerDir $zipFileName
$downloadUrl = "https://github.com/actions/runner/releases/download/v$RunnerVersion/$zipFileName"

if (-not (Test-Path $zipPath)) {
    Write-Host "`n[2/6] Downloading GitHub Runner v$RunnerVersion package..." -ForegroundColor Yellow
    Write-Host "  URL: $downloadUrl" -ForegroundColor Gray
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "  [OK] Downloaded successfully." -ForegroundColor Green
} else {
    Write-Host "`n[2/6] Runner zip package already exists at $zipPath" -ForegroundColor Green
}

# 4. Validate Hash
Write-Host "`n[3/6] Validating SHA256 checksum..." -ForegroundColor Yellow
$computedHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToUpper()
if ($computedHash -ne $ExpectedHash.ToUpper()) {
    Write-Error "Computed checksum ($computedHash) did NOT match expected ($ExpectedHash). Aborting for security."
    exit 1
}
Write-Host "  [OK] SHA256 Checksum verified ($computedHash)." -ForegroundColor Green

# 5. Extract Package
Write-Host "`n[4/6] Extracting runner binaries..." -ForegroundColor Yellow
$configCmdPath = Join-Path $RunnerDir "config.cmd"
if (-not (Test-Path $configCmdPath)) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $RunnerDir)
    Write-Host "  [OK] Extracted binaries to $RunnerDir." -ForegroundColor Green
} else {
    Write-Host "  [OK] Binaries already extracted." -ForegroundColor Green
}

# 6. Configure Runner Unattended
Write-Host "`n[5/6] Registering runner with GitHub..." -ForegroundColor Yellow
Write-Host "  Repository : $RepoUrl" -ForegroundColor Gray
Write-Host "  Name       : $RunnerName" -ForegroundColor Gray
Write-Host "  Labels     : $RunnerLabels" -ForegroundColor Gray

# If runner was already configured, remove previous config
$runnerConfigFile = Join-Path $RunnerDir ".runner"
if (Test-Path $runnerConfigFile) {
    Write-Host "  Previous runner config detected. Reconfiguring with --replace..." -ForegroundColor Yellow
}

cmd.exe /c "config.cmd --url `"$RepoUrl`" --token `"$Token`" --name `"$RunnerName`" --labels `"$RunnerLabels`" --work `"_work`" --unattended --replace"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Runner configuration failed. If the token expired, please generate a new registration token from GitHub (Settings > Actions > Runners > New runner) and pass it via -Token parameter."
    exit 1
}
Write-Host "  [OK] Runner registered successfully." -ForegroundColor Green

# 7. Install and Start as Windows Service
Write-Host "`n[6/6] Installing and starting Windows Background Service..." -ForegroundColor Yellow

# Check if service is already installed
$existingService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "  Stopping existing runner service: $($existingService.Name)..." -ForegroundColor Yellow
    cmd.exe /c "svc.cmd stop"
    cmd.exe /c "svc.cmd uninstall"
}

cmd.exe /c "svc.cmd install"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install runner as Windows service."
    exit 1
}
Write-Host "  [OK] Service installed." -ForegroundColor Green

cmd.exe /c "svc.cmd start"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start runner Windows service."
    exit 1
}
Write-Host "  [OK] Service started successfully." -ForegroundColor Green

# Service Status Check
$runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Setup Complete! GitHub Runner is Active & Running 24/7     " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
if ($runnerService) {
    Write-Host " Service Name : $($runnerService.Name)" -ForegroundColor White
    Write-Host " Status       : $($runnerService.Status)" -ForegroundColor Green
}
Write-Host " Runner Name  : $RunnerName" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
