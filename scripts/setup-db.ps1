$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

if (-not $env:DATABASE_URL -and -not $env:SUPABASE_DB_URL) {
  throw 'Set DATABASE_URL or SUPABASE_DB_URL before running this script.'
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'node is required to run the migration script.'
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw 'psql is required to apply the SQL migrations.'
}

Set-Location $rootDir
node scripts/run-db-migrations.mjs