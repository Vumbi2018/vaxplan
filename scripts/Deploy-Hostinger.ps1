# VaxPlan Hostinger Deployment Script
# This script dumps the local database and restores it to Hostinger, then pushes the code to GitHub.

param (
    [string]$EnvFile = ".env.production",
    [switch]$SkipDb,
    [switch]$SkipGit
)

# Set execution policy helper
$ErrorActionPreference = "Stop"

# 1. Load Hostinger parameters from environment or production env file
if (Test-Path $EnvFile) {
    Write-Host "Loading environment variables from $EnvFile..." -ForegroundColor Cyan
    Get-Content $EnvFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
    }
}

# Check required environment variables
$dbHost = $env:HOSTINGER_DB_HOST
$dbUser = $env:HOSTINGER_DB_USER
$dbName = $env:HOSTINGER_DB_NAME
$dbPass = $env:HOSTINGER_DB_PASSWORD
$dbPort = if ($env:HOSTINGER_DB_PORT) { $env:HOSTINGER_DB_PORT } else { "5432" }
$webhookUrl = $env:HOSTINGER_WEBHOOK_URL

# Local DB Settings (fallback to local .env if present)
$localDbUrl = $env:DATABASE_URL
if (-not $localDbUrl -and (Test-Path ".env")) {
    Get-Content ".env" | Where-Object { $_ -match '^DATABASE_URL=' } | ForEach-Object {
        $localDbUrl = $_.Split('=', 2)[1].Trim()
    }
}

if (-not $SkipDb) {
    if (-not $dbHost -or -not $dbUser -or -not $dbName -or -not $dbPass) {
        Write-Error "Missing Hostinger database environment variables. Please set HOSTINGER_DB_HOST, HOSTINGER_DB_USER, HOSTINGER_DB_NAME, and HOSTINGER_DB_PASSWORD in $EnvFile or your environment."
    }
    if (-not $localDbUrl) {
        Write-Error "Local DATABASE_URL is not configured."
    }
}

# 2. Database migration / push
if (-not $SkipDb) {
    Write-Host "Starting Database Migration..." -ForegroundColor Green

    # Locate postgres bin tools
    $pgPath = "C:\Program Files\PostgreSQL\18\bin"
    if (-not (Test-Path "$pgPath\pg_dump.exe")) {
        # Fallback to PATH search
        $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
        $pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
    } else {
        $pgDump = "$pgPath\pg_dump.exe"
        $pgRestore = "$pgPath\pg_restore.exe"
    }

    if (-not $pgDump) {
        Write-Error "PostgreSQL command-line tools (pg_dump / pg_restore) not found on PATH or standard installation path. Please install PostgreSQL or add it to PATH."
    }

    $tempDump = [System.IO.Path]::GetTempFileName()

    try {
        Write-Host "Extracting local database to temporary file..." -ForegroundColor Cyan
        # Run pg_dump using the local database connection
        $env:PGPASSWORD = 'postgres' # default local password
        
        # Parse local database connection string if needed, or run locally
        # Default local connection is assumed to be localhost postgres
        & $pgDump -U postgres -d vaxplan -F c -b -v -f $tempDump
        Write-Host "Local database dump completed." -ForegroundColor Green

        # Restore to Hostinger database
        Write-Host "Restoring database dump to Hostinger ($dbHost)..." -ForegroundColor Cyan
        $env:PGPASSWORD = $dbPass
        
        # Drop and recreate schema to make sure it is clean
        Write-Host "Cleaning remote schemas (if exists)..." -ForegroundColor Yellow
        $dropCmd = "DROP SCHEMA public CASCADE; CREATE SCHEMA public; AUTHORIZATION $dbUser; GRANT ALL ON SCHEMA public TO $dbUser; GRANT ALL ON SCHEMA public TO public;"
        & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $dropCmd
        
        # Restore schema and data
        & $pgRestore -h $dbHost -p $dbPort -U $dbUser -d $dbName -v --no-owner --no-privileges $tempDump
        
        Write-Host "Database successfully migrated and pushed to Hostinger!" -ForegroundColor Green
    }
    catch {
        Write-Error "Database migration failed: $_"
    }
    finally {
        # Cleanup env password and temp file
        $env:PGPASSWORD = $null
        if (Test-Path $tempDump) {
            Remove-Item $tempDump -Force
        }
    }
}

# 3. Push to GitHub
if (-not $SkipGit) {
    Write-Host "Pushing code to GitHub..." -ForegroundColor Green
    try {
        # Ensure we are tracking the remote origin
        git push origin main
        Write-Host "Code successfully pushed to GitHub!" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to push code to GitHub: $_"
    }
}

# 4. Trigger Hostinger Webhook (optional but recommended)
if ($webhookUrl) {
    Write-Host "Triggering Hostinger auto-deploy webhook..." -ForegroundColor Green
    try {
        $response = Invoke-RestMethod -Uri $webhookUrl -Method Post
        Write-Host "Auto-deploy triggered successfully: $response" -ForegroundColor Green
    }
    catch {
        Write-Warning "Could not trigger Hostinger auto-deploy webhook: $_"
    }
} else {
    Write-Host "No HOSTINGER_WEBHOOK_URL set. Hostinger auto-deploy will run via GitHub webhook integration." -ForegroundColor Yellow
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
