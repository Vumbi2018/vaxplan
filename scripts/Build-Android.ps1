<#
.SYNOPSIS
  VaxPlan Android Debug APK Build Script
  
.DESCRIPTION
  Builds a debug APK for VaxPlan using Capacitor + Android Gradle.
  Requires: Node.js, Java 21 (JDK 21), Android SDK (with API 34 build tools).
  Modified to use safe ASCII characters to prevent byte parsing corruption under standard Windows PowerShell.

.EXAMPLE
  .\scripts\Build-Android.ps1
#>

param(
  [switch]$Open,       # Open Android Studio after sync
  [switch]$SkipBuild   # Only sync, don't build APK (useful in CI)
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  VaxPlan  Android APK Builder (Debug)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# -- 1. Prerequisites check -------------------------------------------------
Write-Host "> Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not installed. Install from https://nodejs.org"
  exit 1
}

if (-not (Get-Command "java" -ErrorAction SilentlyContinue)) {
  Write-Error "Java 21 (JDK 21) is required. Install Temurin 21 from https://adoptium.net"
  exit 1
}

$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$javaVersion = (java -version 2>&1 | Select-String "version")
if ($javaVersion) {
  $javaVersion = $javaVersion.ToString()
  Write-Host "  Java: $javaVersion" -ForegroundColor Gray
} else {
  Write-Host "  Java: Found (version check bypassed)" -ForegroundColor Gray
}
$ErrorActionPreference = $oldErrorAction

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
  Write-Warning "ANDROID_HOME/ANDROID_SDK_ROOT not set. Ensure Android SDK is installed."
  Write-Warning "Download Android Studio: https://developer.android.com/studio"
}

# -- 2. Build Vite production bundle ---------------------------------------
Write-Host ""
Write-Host "> Building Vite production bundle..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Vite build failed"; exit 1 }
Write-Host "  [OK] Vite build complete" -ForegroundColor Green

# -- 3. Capacitor sync -----------------------------------------------------
Write-Host ""
Write-Host "> Syncing to Android project..." -ForegroundColor Yellow

# Initialize if android/ doesn't exist yet
if (-not (Test-Path "android")) {
  Write-Host "  First run: initializing Capacitor Android platform..." -ForegroundColor Cyan
  npx cap add android
  if ($LASTEXITCODE -ne 0) { Write-Error "cap add android failed"; exit 1 }
}

npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Error "cap sync failed"; exit 1 }
Write-Host "  [OK] Capacitor sync complete" -ForegroundColor Green

# -- 4. Optionally open Android Studio -------------------------------------
if ($Open) {
  Write-Host ""
  Write-Host "> Opening Android Studio..." -ForegroundColor Yellow
  npx cap open android
  exit 0
}

if ($SkipBuild) {
  Write-Host ""
  Write-Host "  Skipped Gradle build (--SkipBuild flag set)" -ForegroundColor Gray
  exit 0
}

# -- 5. Build debug APK ----------------------------------------------------
Write-Host ""
Write-Host "> Building debug APK with Gradle..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Gradle build failed"; exit 1 }
Pop-Location

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
  $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
  Write-Host ""
  Write-Host "======================================================" -ForegroundColor Green
  Write-Host "  [OK] APK built successfully!" -ForegroundColor Green
  Write-Host "  [APK] Location: $apkPath" -ForegroundColor Green
  Write-Host "  [SIZE] Size: ${apkSize} MB" -ForegroundColor Green
  Write-Host ""
  Write-Host "  To install on a connected device:" -ForegroundColor Cyan
  Write-Host "  adb install $apkPath" -ForegroundColor White
  Write-Host "======================================================" -ForegroundColor Green
} else {
  Write-Error "APK not found at expected path: $apkPath"
  exit 1
}
