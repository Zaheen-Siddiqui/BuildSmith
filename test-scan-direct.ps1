# Direct Test for Bundle Creation - Step 10.4

Write-Host "`n=== Testing Bundle Creation (Step 10.4) ===" -ForegroundColor Cyan

# Navigate to backend directory
$backendPath = "C:\Users\siddi\OneDrive\Desktop\BuildSmith\packages\backend"
Set-Location $backendPath

Write-Host "`nTest 1: Creating unencrypted bundle with VS Code and Docker..." -ForegroundColor Yellow

$testOptions = @{
    vscode = $true
    docker = $true
    databases = $false
    environment = $false
    encrypt = $false
    password = $null
}

# Execute scan.ps1 in same PowerShell session
& ".\scan.ps1" -Options $testOptions

Write-Host "`n[Test 1] Complete" -ForegroundColor Green
Write-Host "`nPress Enter to continue to Test 2..." -ForegroundColor Gray
Read-Host

Write-Host "`nTest 2: Creating encrypted bundle..." -ForegroundColor Yellow

$encryptedOptions = @{
    vscode = $true
    docker = $false
    databases = $false
    environment = $false
    encrypt = $true
    password = "TestPassword123!"
}

& ".\scan.ps1" -Options $encryptedOptions

Write-Host "`n[Test 2] Complete" -ForegroundColor Green

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
Write-Host "`nCreated bundles should be in:" -ForegroundColor Yellow
Write-Host "  $([Environment]::GetFolderPath('MyDocuments'))" -ForegroundColor Gray
Write-Host "`nLook for files matching:" -ForegroundColor Yellow
Write-Host "  BuildSmith-Bundle-*.zip" -ForegroundColor Gray
Write-Host "  BuildSmith-Bundle-*.zip.encrypted" -ForegroundColor Gray

# List created bundles
Write-Host "`nBundles created:" -ForegroundColor Yellow
Get-ChildItem "$([Environment]::GetFolderPath('MyDocuments'))\BuildSmith-Bundle-*" -ErrorAction SilentlyContinue | Format-Table Name, Length, LastWriteTime
