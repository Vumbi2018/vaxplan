<#
.SYNOPSIS
  VaxPlan Windows Installer Build Script (Electron Forge / Squirrel)

.DESCRIPTION
  Builds a Windows NSIS/Squirrel installer for VaxPlan desktop.
  Output: out/make/squirrel.windows/x64/VaxPlanSetup.exe
  Modified to use safe ASCII characters to prevent byte parsing corruption under standard Windows PowerShell.

.EXAMPLE
  .\scripts\Build-Windows.ps1
#>

param(
  [switch]$SkipViteBuild,  # Skip Vite build (use existing dist/)
  [switch]$Dev             # Launch dev mode instead of building
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  VaxPlan  Windows Installer Builder" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# -- Dev mode: launch Electron against running Vite dev server --------------
if ($Dev) {
  Write-Host "> Starting in dev mode..." -ForegroundColor Yellow
  Write-Host "  Ensure 'npm run dev' is running in another terminal." -ForegroundColor Gray
  npx concurrently `
    "npm run dev" `
    "npx wait-on http://localhost:5173 && npx electron electron/main.js"
  exit 0
}

# -- 1. Prerequisites ------------------------------------------------------
Write-Host "> Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not installed."
  exit 1
}

Write-Host "  Node.js: $(node --version)" -ForegroundColor Gray
Write-Host "  npm: $(npm --version)" -ForegroundColor Gray

# -- 2. Build Vite production bundle ---------------------------------------
if (-not $SkipViteBuild) {
  Write-Host ""
  Write-Host "> Building Vite production bundle..." -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) { Write-Error "Vite build failed"; exit 1 }
  Write-Host "  [OK] Vite build complete" -ForegroundColor Green
} else {
  Write-Host "  Skipped Vite build (--SkipViteBuild)" -ForegroundColor Gray
}

# -- 3. Compile Electron TypeScript ----------------------------------------
Write-Host ""
Write-Host "> Compiling Electron main/preload scripts..." -ForegroundColor Yellow

# Create a minimal tsconfig for the electron directory
@{
  compilerOptions = @{
    target = "ES2020"
    module = "commonjs"
    moduleResolution = "node"
    strict = $false
    esModuleInterop = $true
    outDir = "../electron-dist"
    rootDir = "."
    skipLibCheck = $true
  }
  include = @("**/*.ts")
} | ConvertTo-Json -Depth 5 | Set-Content "electron\tsconfig.json"

npx tsc --project electron\tsconfig.json
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Electron TypeScript compilation had errors - trying to continue..."
}

# The root package.json has "type": "module", which would make Node/Electron
# treat the compiled electron-dist/*.js (CommonJS) as ES modules and fail with
# "exports is not defined in ES module scope". Drop a scoped package.json that
# marks ONLY the electron-dist folder as CommonJS, leaving the rest untouched.
New-Item "electron-dist" -ItemType Directory -Force | Out-Null
'{ "type": "commonjs" }' | Set-Content "electron-dist\package.json"

# -- 4. Install @electron-forge/cli if not present ------------------------
$forgePath = "node_modules\.bin\electron-forge.cmd"
if (-not (Test-Path $forgePath)) {
  Write-Host ""
  Write-Host "> Installing Electron Forge CLI..." -ForegroundColor Yellow
  npm install --save-dev `
    "@electron-forge/cli" `
    "@electron-forge/maker-squirrel" `
    "@electron-forge/maker-zip"
  if ($LASTEXITCODE -ne 0) { Write-Error "Forge install failed"; exit 1 }
}

# -- 5. Clean up legacy config files (using forge.config.cjs configuration) ------
Remove-Item "forge.config.js" -Force -ErrorAction SilentlyContinue

# -- 6. Ensure package.json has main pointing to electron -----------------
$pkg = Get-Content "package.json" | ConvertFrom-Json
if ($pkg.main -ne "electron-dist/main.js") {
  Write-Host ""
  Write-Host "> Patching package.json main entry for Electron..." -ForegroundColor Yellow
  $pkg | Add-Member -Force -MemberType NoteProperty -Name "main" -Value "electron-dist/main.js"
  $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
  Write-Host "  [OK] package.json updated" -ForegroundColor Green
}

# -- 7. Make installer -----------------------------------------------------
Write-Host ""
Write-Host "> Running Electron Forge make..." -ForegroundColor Yellow

$NodePath = "C:\mfl\node_env\node-v20.12.2-win-x64\node.exe"
if (Test-Path $NodePath) {
  Write-Host "  Using stable local Node.js v20: $NodePath" -ForegroundColor Gray
  & $NodePath node_modules/@electron-forge/cli/dist/electron-forge.js make --config forge.config.cjs --platform win32 --arch x64
} else {
  npx electron-forge make --config forge.config.cjs --platform win32 --arch x64
}

if ($LASTEXITCODE -ne 0) { Write-Error "electron-forge make failed"; exit 1 }

# -- 8. Report output ------------------------------------------------------
$setupExe = Get-ChildItem "out\make" -Recurse -Filter "*.exe" | Select-Object -First 1
$zipFile  = Get-ChildItem "out\make" -Recurse -Filter "*.zip" | Select-Object -First 1

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  [OK] Windows installer built!" -ForegroundColor Green
if ($setupExe) {
  $sizeMB = [math]::Round($setupExe.Length / 1MB, 1)
  Write-Host "  [FILE] Installer: $($setupExe.FullName) ($sizeMB MB)" -ForegroundColor Green
}
if ($zipFile) {
  Write-Host "  [FILE] Portable:  $($zipFile.FullName)" -ForegroundColor Green
}
Write-Host ""
Write-Host "  Distribute VaxPlanSetup.exe to Windows users." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Green
