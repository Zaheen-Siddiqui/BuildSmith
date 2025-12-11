# Test MongoDB Connection Export/Import - Step 10.5

Write-Host "`n=== Testing MongoDB Module (Step 10.5) ===" -ForegroundColor Cyan

$backendPath = "C:\Users\siddi\OneDrive\Desktop\BuildSmith\packages\backend"
Set-Location $backendPath

# Load common and db modules
. .\common.ps1
Import-Module .\modules\db.psm1 -Force

Write-Host "`nTest 1: Get Database Connections" -ForegroundColor Yellow
$connections = Get-DatabaseConnections
if ($connections)
{
    Write-Host "Found $($connections.Count) connections:" -ForegroundColor Green
    $connections | ForEach-Object { Write-Host "  - $($_.type) from $($_.source): $($_.name)" -ForegroundColor Gray }
}
else
{
    Write-Host "No database connections found" -ForegroundColor Gray
}

Write-Host "`nTest 2: Export MongoDB Compass Connections" -ForegroundColor Yellow
$exportPath = "$env:TEMP\test-mongo-connections.json"
$result = Export-MongoConnections -OutputPath $exportPath

if ($result -and $result.success)
{
    Write-Host "Success - Exported $($result.count) MongoDB connections to $exportPath" -ForegroundColor Green
    
    Write-Host "`nTest 3: Import MongoDB Compass Connections" -ForegroundColor Yellow
    $importResult = Import-CompassConnections -ConnectionsFile $exportPath
    
    if ($importResult -and $importResult.success)
    {
        Write-Host "Success - Imported $($importResult.count) MongoDB connections" -ForegroundColor Green
    }
    else
    {
        Write-Host "Failed - Import failed" -ForegroundColor Red
        if ($importResult) { Write-Host "  Error: $($importResult.error)" -ForegroundColor Red }
    }
}
else
{
    if ($result)
    {
        Write-Host "Failed - Export failed: $($result.error)" -ForegroundColor Yellow
    }
    else
    {
        Write-Host "Failed - Export returned null" -ForegroundColor Yellow
    }
    Write-Host "This is expected if MongoDB Compass is not installed or has no connections" -ForegroundColor Gray
}

Write-Host "`nTest 4: Check for MongoDB Tools" -ForegroundColor Yellow
$mongoDump = Get-Command "mongodump" -ErrorAction SilentlyContinue
$mongoRestore = Get-Command "mongorestore" -ErrorAction SilentlyContinue

if ($mongoDump)
{
    Write-Host "Success - mongodump found: $($mongoDump.Source)" -ForegroundColor Green
}
else
{
    Write-Host "Not Found - mongodump (install MongoDB Database Tools for dump/restore)" -ForegroundColor Yellow
}

if ($mongoRestore)
{
    Write-Host "Success - mongorestore found: $($mongoRestore.Source)" -ForegroundColor Green
}
else
{
    Write-Host "Not Found - mongorestore (install MongoDB Database Tools for dump/restore)" -ForegroundColor Yellow
}

Write-Host "`n=== MongoDB Module Tests Complete ===" -ForegroundColor Cyan
Write-Host "`nStep 10.5 implementation includes:" -ForegroundColor White
Write-Host "  - Get-DatabaseConnections - Scan Compass and MySQL Workbench" -ForegroundColor Gray
Write-Host "  - Export-MongoConnections - Export Compass connections" -ForegroundColor Gray
Write-Host "  - Import-CompassConnections - Import and merge connections" -ForegroundColor Gray
Write-Host "  - Export-MongoDump - Create database dump" -ForegroundColor Gray
Write-Host "  - Restore-MongoDump - Restore database from dump" -ForegroundColor Gray

