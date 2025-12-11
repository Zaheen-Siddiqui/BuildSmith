# Test Bundle Creation - Step 10.4
# Tests the bundle creation and encryption functionality

Write-Host "`n=== Testing Bundle Creation (Step 10.4) ===" -ForegroundColor Cyan

# Test 1: Create a bundle with VS Code and Docker
Write-Host "`n[Test 1] Creating bundle with VS Code and Docker..." -ForegroundColor Yellow

$testOptions = @{
    vscode = $true
    docker = $true
    databases = $false
    environment = $false
    encrypt = $false
    password = $null
}

Write-Host "Running scan.ps1 with options:"
Write-Host "  - VS Code: $($testOptions.vscode)"
Write-Host "  - Docker: $($testOptions.docker)"
Write-Host "  - Databases: $($testOptions.databases)"
Write-Host "  - Environment: $($testOptions.environment)"
Write-Host "  - Encrypt: $($testOptions.encrypt)"

$backendPath = Join-Path $PSScriptRoot "packages\backend"
$scanScript = Join-Path $backendPath "scan.ps1"

if (-not (Test-Path $scanScript)) {
    Write-Host "ERROR: scan.ps1 not found at: $scanScript" -ForegroundColor Red
    exit 1
}

Write-Host "`nExecuting scan script at: $scanScript"
& powershell.exe -File $scanScript -Options $testOptions

Write-Host "`n[Test 1] Complete" -ForegroundColor Green

# Test 2: Create an encrypted bundle
Write-Host "`n[Test 2] Creating encrypted bundle..." -ForegroundColor Yellow

$encryptedOptions = @{
    vscode = $true
    docker = $false
    databases = $false
    environment = $false
    encrypt = $true
    password = "TestPassword123!"
}

Write-Host "Running scan.ps1 with encryption enabled..."
Write-Host "  - Password: $($encryptedOptions.password)"

& powershell.exe -File $scanScript -Options $encryptedOptions

Write-Host "`n[Test 2] Complete" -ForegroundColor Green

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
Write-Host "Check your Documents folder for the created bundles:" -ForegroundColor Yellow
Write-Host "  $(Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'BuildSmith-Bundle-*.zip')" -ForegroundColor Gray
Write-Host "  $(Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'BuildSmith-Bundle-*.zip.encrypted')" -ForegroundColor Gray
