<#
.SYNOPSIS
  VaxPlan one-command Windows build: download -> extract -> install -> compile.

.DESCRIPTION
  Automates the entire desktop installer pipeline in a single command:
    1. Acquire the project package (a .zip) from a URL, a local file path,
       or — if neither is given — the newest .zip in your Downloads folder.
    2. Extract it into the destination folder (default C:\vaxplan), flattening
       any single top-level folder the archive may contain.
    3. Install npm dependencies (optionally a clean reinstall).
    4. Run the existing Build-Windows.ps1 (Vite build + Electron compile +
       Electron Forge make) to produce VaxPlanSetup.exe.

  Uses ASCII-only output to avoid byte-parsing corruption under classic
  Windows PowerShell 5.1.

.PARAMETER Source
  URL to a .zip OR a local path to a .zip. If omitted (and -SkipDownload is
  not set), the newest *.zip in your Downloads folder is used.

.PARAMETER Dest
  Folder to extract into and build from. Default: C:\vaxplan

.PARAMETER SkipDownload
  Skip the download/extract steps and build the code already in -Dest.

.PARAMETER Clean
  Delete node_modules and clear the npm cache before installing (fixes a
  corrupted/partial previous install).

.EXAMPLE
  # Build from the newest zip in Downloads (after clicking "Download as zip")
  npm run build:windows:all

.EXAMPLE
  # Build from a direct URL
  powershell -ExecutionPolicy Bypass -File scripts\Build-Windows-All.ps1 -Source "https://example.com/vaxplan.zip"

.EXAMPLE
  # Build from a specific local zip with a clean reinstall
  powershell -ExecutionPolicy Bypass -File scripts\Build-Windows-All.ps1 -Source "C:\Users\me\Downloads\vaxplan.zip" -Clean

.EXAMPLE
  # Just rebuild the code already sitting in C:\vaxplan
  powershell -ExecutionPolicy Bypass -File scripts\Build-Windows-All.ps1 -SkipDownload
#>

param(
  [string]$Source,
  [string]$Dest = "C:\vaxplan",
  [switch]$SkipDownload,
  [switch]$Clean
)

$ErrorActionPreference = "Stop"

function Write-Step($msg)  { Write-Host ""; Write-Host "> $msg" -ForegroundColor Yellow }
function Write-Ok($msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info($msg)  { Write-Host "  $msg" -ForegroundColor Gray }

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  VaxPlan  One-Command Windows Build" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Info "Destination: $Dest"

# -- 1. Acquire + extract the package --------------------------------------
if (-not $SkipDownload) {

  # Resolve the package source into a local .zip path ($zipPath).
  $zipPath = $null
  $tempDownload = $null

  if ([string]::IsNullOrWhiteSpace($Source)) {
    Write-Step "No -Source given. Looking for the newest .zip in Downloads..."
    $downloads = Join-Path $env:USERPROFILE "Downloads"
    $newest = Get-ChildItem -Path $downloads -Filter *.zip -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $newest) {
      Write-Error "No .zip found in $downloads. Pass -Source <url-or-path>, or use -SkipDownload."
      exit 1
    }
    $zipPath = $newest.FullName
    Write-Info "Using: $zipPath"
  }
  elseif ($Source -match '^(https?|ftp)://') {
    Write-Step "Downloading package..."
    Write-Info $Source
    # TLS 1.2 for older PowerShell / Windows.
    try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
    $tempDownload = Join-Path $env:TEMP ("vaxplan_pkg_" + [guid]::NewGuid().ToString("N") + ".zip")
    try {
      Invoke-WebRequest -Uri $Source -OutFile $tempDownload -UseBasicParsing
    } catch {
      Write-Error "Download failed: $($_.Exception.Message). Check the URL, your internet connection, or download the .zip manually and pass it with -Source <path>."
      exit 1
    }
    if (-not (Test-Path $tempDownload)) { Write-Error "Download failed (no file written)."; exit 1 }
    $zipPath = $tempDownload
    Write-Ok "Downloaded"
  }
  else {
    if (-not (Test-Path $Source)) { Write-Error "Source not found: $Source"; exit 1 }
    if (Test-Path $Source -PathType Container) {
      Write-Error "-Source is a folder, not a .zip file: $Source. Point it at the downloaded .zip, or use -SkipDownload to build code already in -Dest."
      exit 1
    }
    if ([System.IO.Path]::GetExtension($Source) -ne ".zip") {
      Write-Error "-Source must be a .zip file: $Source"
      exit 1
    }
    $zipPath = (Resolve-Path $Source).Path
    Write-Info "Using local package: $zipPath"
  }

  # Extract to a staging folder, then copy the real project root into $Dest.
  Write-Step "Extracting package..."
  $staging = Join-Path $env:TEMP ("vaxplan_extract_" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  Expand-Archive -Path $zipPath -DestinationPath $staging -Force

  # The project root is wherever package.json lives (handles archives that
  # wrap everything in a single top-level folder, e.g. "workspace-abc/").
  $pkgJson = Get-ChildItem -Path $staging -Filter package.json -Recurse -ErrorAction SilentlyContinue |
             Sort-Object { $_.FullName.Length } | Select-Object -First 1
  if (-not $pkgJson) {
    Write-Error "Could not find package.json inside the archive. Is this the VaxPlan package?"
    exit 1
  }
  $projectRoot = $pkgJson.Directory.FullName
  Write-Info "Project root in archive: $projectRoot"

  Write-Step "Copying into $Dest ..."
  New-Item -ItemType Directory -Path $Dest -Force | Out-Null
  # robocopy is the most reliable bulk copier on Windows. /E = recurse incl.
  # empty dirs. Exit codes 0-7 are success; 8+ are real errors.
  robocopy $projectRoot $Dest /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { Write-Error "robocopy failed (code $LASTEXITCODE)."; exit 1 }
  $global:LASTEXITCODE = 0
  Write-Ok "Files copied"

  # Cleanup temp artifacts.
  Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
  if ($tempDownload) { Remove-Item $tempDownload -Force -ErrorAction SilentlyContinue }
}
else {
  Write-Step "Skipping download/extract (-SkipDownload). Building existing $Dest"
  if (-not (Test-Path (Join-Path $Dest "package.json"))) {
    Write-Error "No package.json in $Dest. Remove -SkipDownload to fetch the package first."
    exit 1
  }
}

# -- 2. Move into the project ----------------------------------------------
Set-Location $Dest

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not installed or not on PATH."
  exit 1
}
Write-Info "Node.js: $(node --version)"
Write-Info "npm:     $(npm --version)"

# -- 3. Install dependencies -----------------------------------------------
if ($Clean) {
  Write-Step "Clean reinstall: removing node_modules + clearing npm cache..."
  if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue }
  npm cache clean --force
}

Write-Step "Installing npm dependencies (this can take several minutes)..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed."; exit 1 }
Write-Ok "Dependencies installed"

# -- 4. Build the Windows installer ----------------------------------------
Write-Step "Building Windows installer..."
$buildScript = Join-Path $Dest "scripts\Build-Windows.ps1"
if (-not (Test-Path $buildScript)) { Write-Error "Missing $buildScript"; exit 1 }
& $buildScript
if ($LASTEXITCODE -ne 0) { Write-Error "Windows build failed."; exit 1 }

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  [OK] All done. Installer is under out\make\" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
