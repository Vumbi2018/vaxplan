<#
.SYNOPSIS
  VaxPlan one-command Android build: download -> extract -> install -> APK.

.DESCRIPTION
  Automates the entire Android debug-APK pipeline in a single command:
    1. Acquire the project package (a .zip) from a URL, a local file path,
       or - if neither is given - the newest .zip in your Downloads folder.
    2. Extract it into the destination folder (default C:\vaxplan), flattening
       any single top-level folder the archive may contain.
    3. Install npm dependencies (optionally a clean reinstall).
    4. Run the existing Build-Android.ps1 (Vite build + Capacitor sync +
       Gradle assembleDebug) to produce app-debug.apk.

  Uses ASCII-only output to avoid byte-parsing corruption under classic
  Windows PowerShell 5.1.

.PARAMETER Source
  URL to a .zip/.tar.gz OR a local path to a .zip/.tar.gz. If omitted (and
  -SkipDownload is not set), the newest *.zip in your Downloads folder is used.

.PARAMETER Dest
  Folder to extract into and build from. Default: C:\vaxplan

.PARAMETER Token
  Release download token. When set, it is sent as the "x-release-token" header
  with the download request so the app's /release/ endpoint serves the source
  without a browser login.

.PARAMETER SkipDownload
  Skip the download/extract steps and build the code already in -Dest.

.PARAMETER Clean
  Delete node_modules and clear the npm cache before installing (fixes a
  corrupted/partial previous install).

.PARAMETER Open
  Open Android Studio after sync instead of building the APK.

.EXAMPLE
  # Build from the newest zip in Downloads (after clicking "Download as zip")
  npm run build:android:all

.EXAMPLE
  # Build straight from the running app's release URL using a token
  powershell -ExecutionPolicy Bypass -File scripts\Build-Android-All.ps1 -Source "https://your-app/release/vaxplan-source-1.0.0.tar.gz" -Token "<TOKEN>"

.EXAMPLE
  # Just rebuild the code already sitting in C:\vaxplan
  powershell -ExecutionPolicy Bypass -File scripts\Build-Android-All.ps1 -SkipDownload
#>

param(
  [string]$Source,
  [string]$Dest = "C:\vaxplan",
  [string]$Token,
  [switch]$SkipDownload,
  [switch]$Clean,
  [switch]$Open
)

$ErrorActionPreference = "Stop"

function Write-Step($msg)  { Write-Host ""; Write-Host "> $msg" -ForegroundColor Yellow }
function Write-Ok($msg)    { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Info($msg)  { Write-Host "  $msg" -ForegroundColor Gray }

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  VaxPlan  One-Command Android Build" -ForegroundColor Cyan
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
    # Pick a temp extension that matches the archive type in the URL.
    if ($Source -match '\.(tar\.gz|tgz)(\?|$)') { $dlExt = ".tar.gz" } else { $dlExt = ".zip" }
    $tempDownload = Join-Path $env:TEMP ("vaxplan_pkg_" + [guid]::NewGuid().ToString("N") + $dlExt)
    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) { $headers["x-release-token"] = $Token }
    try {
      Invoke-WebRequest -Uri $Source -OutFile $tempDownload -UseBasicParsing -Headers $headers
    } catch {
      Write-Error "Download failed: $($_.Exception.Message). Check the URL/token, your internet connection, or download the archive manually and pass it with -Source <path>."
      exit 1
    }
    if (-not (Test-Path $tempDownload)) { Write-Error "Download failed (no file written)."; exit 1 }
    $zipPath = $tempDownload
    Write-Ok "Downloaded"
  }
  else {
    if (-not (Test-Path $Source)) { Write-Error "Source not found: $Source"; exit 1 }
    if (Test-Path $Source -PathType Container) {
      Write-Error "-Source is a folder, not an archive file: $Source. Point it at the downloaded .zip/.tar.gz, or use -SkipDownload to build code already in -Dest."
      exit 1
    }
    if ($Source -notmatch '\.(zip|tar\.gz|tgz)$') {
      Write-Error "-Source must be a .zip or .tar.gz file: $Source"
      exit 1
    }
    $zipPath = (Resolve-Path $Source).Path
    Write-Info "Using local package: $zipPath"
  }

  # Extract to a staging folder, then copy the real project root into $Dest.
  Write-Step "Extracting package..."
  $staging = Join-Path $env:TEMP ("vaxplan_extract_" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $staging -Force | Out-Null
  if ($zipPath -match '\.(tar\.gz|tgz)$') {
    if (-not (Get-Command "tar" -ErrorAction SilentlyContinue)) {
      Write-Error "tar is required to extract .tar.gz (built into Windows 10 1803+). Update Windows or use a .zip package."
      exit 1
    }
    tar -xzf $zipPath -C $staging
    if ($LASTEXITCODE -ne 0) { Write-Error "tar extraction failed."; exit 1 }
  } else {
    Expand-Archive -Path $zipPath -DestinationPath $staging -Force
  }

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

# -- 4. Build the Android APK ----------------------------------------------
Write-Step "Building Android APK..."
$buildScript = Join-Path $Dest "scripts\Build-Android.ps1"
if (-not (Test-Path $buildScript)) { Write-Error "Missing $buildScript"; exit 1 }
if ($Open) {
  & $buildScript -Open
} else {
  & $buildScript
}
if ($LASTEXITCODE -ne 0) { Write-Error "Android build failed."; exit 1 }

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  [OK] All done. APK is under android\app\build\outputs\apk\" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
