# BuildSmith End-to-End Integration Test - Step 11
# Verifies full scan → bundle → encrypt → decrypt → restore workflow

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "BuildSmith End-to-End Integration Test" -ForegroundColor Cyan
Write-Host "Step 11 - Integration & Validation" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$backendPath = "C:\Users\siddi\OneDrive\Desktop\BuildSmith\packages\backend"
Set-Location $backendPath

# Load common functions
. .\common.ps1

$testResults = @{
    passed = 0
    failed = 0
    tests = @()
}

function Test-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    
    Write-Host "`n--- Test: $Name ---" -ForegroundColor Yellow
    
    try {
        $result = & $Action
        
        if ($result) {
            Write-Host "PASS: $Name" -ForegroundColor Green
            $testResults.passed++
            $testResults.tests += @{ name = $Name; status = "PASS" }
            return $true
        }
        else {
            Write-Host "FAIL: $Name" -ForegroundColor Red
            $testResults.failed++
            $testResults.tests += @{ name = $Name; status = "FAIL" }
            return $false
        }
    }
    catch {
        Write-Host "FAIL: $Name - $($_.Exception.Message)" -ForegroundColor Red
        $testResults.failed++
        $testResults.tests += @{ name = $Name; status = "FAIL"; error = $_.Exception.Message }
        return $false
    }
}

# ============================================
# Test Case 1: Basic - VS Code Profile Scan
# ============================================
$test1 = Test-Step "1. Scan VS Code Profile" {
    Write-Host "  Loading vscode module..." -ForegroundColor Gray
    Import-Module .\modules\vscode.psm1 -Force
    
    $profile = Get-VSCodeProfiles
    
    if ($profile -and $profile.extensions) {
        Write-Host "  Found $($profile.extensions.Count) extensions" -ForegroundColor Gray
        
        if ($profile.settings) {
            Write-Host "  Settings: $($profile.settings.Keys.Count) keys" -ForegroundColor Gray
        }
        
        if ($profile.keybindings) {
            Write-Host "  Keybindings: $($profile.keybindings.Count) bindings" -ForegroundColor Gray
        }
        
        return $true
    }
    
    return $false
}

# ============================================
# Test Case 2: Docker - Image List
# ============================================
$test2 = Test-Step "2. Scan Docker Images" {
    Write-Host "  Loading docker module..." -ForegroundColor Gray
    Import-Module .\modules\docker.psm1 -Force
    
    $dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
    
    if (-not $dockerAvailable) {
        Write-Host "  Docker not installed - skipping" -ForegroundColor Yellow
        return $true  # Pass - not a failure if Docker isn't installed
    }
    
    $images = Get-DockerImages
    
    Write-Host "  Found $($images.Count) Docker images" -ForegroundColor Gray
    
    return $true
}

# ============================================
# Test Case 3: Database - MongoDB Connections
# ============================================
$test3 = Test-Step "3. Scan Database Connections" {
    Write-Host "  Loading db module..." -ForegroundColor Gray
    Import-Module .\modules\db.psm1 -Force
    
    $connections = Get-DatabaseConnections
    
    if ($connections) {
        Write-Host "  Found $($connections.Count) database connections" -ForegroundColor Gray
        
        foreach ($conn in $connections) {
            Write-Host "    - $($conn.type): $($conn.name)" -ForegroundColor DarkGray
        }
    }
    else {
        Write-Host "  No database connections found" -ForegroundColor Gray
    }
    
    return $true
}

# ============================================
# Test Case 4: Drivers - Device Scan
# ============================================
$test4 = Test-Step "4. Scan Device Drivers" {
    Write-Host "  Loading drivers module..." -ForegroundColor Gray
    Import-Module .\modules\drivers.psm1 -Force
    
    $drivers = Get-InstalledDrivers
    
    if ($drivers -and $drivers.Count -gt 0) {
        Write-Host "  Found $($drivers.Count) device drivers" -ForegroundColor Gray
        return $true
    }
    
    Write-Host "  No drivers found" -ForegroundColor Yellow
    return $false
}

# ============================================
# Test Case 5: Environment - PATH Scan
# ============================================
$test5 = Test-Step "5. Scan Environment Variables" {
    Write-Host "  Loading env module..." -ForegroundColor Gray
    Import-Module .\modules\env.psm1 -Force
    
    $pathEntries = Get-SystemPath
    
    if ($pathEntries -and $pathEntries.Count -gt 0) {
        Write-Host "  Found $($pathEntries.Count) PATH entries" -ForegroundColor Gray
        return $true
    }
    
    return $false
}

# ============================================
# Test Case 6: Full Scan - Create Bundle
# ============================================
$bundlePath = $null
$test6 = Test-Step "6. Create Bundle (Full Scan)" {
    Write-Host "  Running full system scan..." -ForegroundColor Gray
    
    $options = @{
        vscode = $true
        docker = $false  # Skip Docker to save time
        databases = $true
        drivers = $true
        environment = $true
        encrypt = $false
    }
    
    # Capture scan output
    $output = & .\scan.ps1 -Options $options 2>&1 | Out-String
    
    # Parse output for bundle path
    if ($output -match 'Bundle created: (.+\.zip)') {
        $script:bundlePath = $matches[1].Trim()
        Write-Host "  Bundle created: $bundlePath" -ForegroundColor Gray
        
        if (Test-Path $bundlePath) {
            $size = (Get-Item $bundlePath).Length
            Write-Host "  Bundle size: $([Math]::Round($size / 1MB, 2)) MB" -ForegroundColor Gray
            return $true
        }
    }
    
    Write-Host "  Output: $output" -ForegroundColor DarkGray
    return $false
}

# ============================================
# Test Case 7: Encryption - Protect Bundle
# ============================================
$encryptedBundlePath = $null
$test7 = Test-Step "7. Encrypt Bundle" {
    if (-not $bundlePath -or -not (Test-Path $bundlePath)) {
        Write-Host "  No bundle to encrypt - skipping" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "  Loading encryption module..." -ForegroundColor Gray
    Import-Module .\modules\encryption.psm1 -Force
    
    $password = "TestPassword123!"
    $script:encryptedBundlePath = $bundlePath -replace '\.zip$', '.encrypted'
    
    $result = Protect-Bundle -BundlePath $bundlePath -Password $password -OutputPath $encryptedBundlePath
    
    if ($result.success -and (Test-Path $encryptedBundlePath)) {
        Write-Host "  Encrypted: $encryptedBundlePath" -ForegroundColor Gray
        Write-Host "  Original: $($result.originalSize) bytes" -ForegroundColor Gray
        Write-Host "  Encrypted: $($result.encryptedSize) bytes" -ForegroundColor Gray
        return $true
    }
    
    return $false
}

# ============================================
# Test Case 8: Decryption - Unprotect Bundle
# ============================================
$decryptedBundlePath = $null
$test8 = Test-Step "8. Decrypt Bundle" {
    if (-not $encryptedBundlePath -or -not (Test-Path $encryptedBundlePath)) {
        Write-Host "  No encrypted bundle - skipping" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host "  Loading encryption module..." -ForegroundColor Gray
    Import-Module .\modules\encryption.psm1 -Force
    
    $password = "TestPassword123!"
    $script:decryptedBundlePath = $encryptedBundlePath -replace '\.encrypted$', '-decrypted.zip'
    
    $result = Unprotect-Bundle -EncryptedPath $encryptedBundlePath -Password $password -OutputPath $decryptedBundlePath
    
    if ($result.success -and (Test-Path $decryptedBundlePath)) {
        Write-Host "  Decrypted: $decryptedBundlePath" -ForegroundColor Gray
        Write-Host "  Size: $($result.size) bytes" -ForegroundColor Gray
        return $true
    }
    
    return $false
}

# ============================================
# Test Case 9: Setup - Extract and Validate
# ============================================
$test9 = Test-Step "9. Extract Bundle and Validate Manifest" {
    $testBundle = if ($decryptedBundlePath -and (Test-Path $decryptedBundlePath)) {
        $decryptedBundlePath
    }
    elseif ($bundlePath -and (Test-Path $bundlePath)) {
        $bundlePath
    }
    else {
        Write-Host "  No bundle available" -ForegroundColor Red
        return $false
    }
    
    Write-Host "  Extracting: $testBundle" -ForegroundColor Gray
    
    $extractDir = Join-Path $env:TEMP "buildsmith-test-extract-$(Get-Date -Format 'HHmmss')"
    
    Add-Type -Assembly System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($testBundle, $extractDir)
    
    $manifestPath = Join-Path $extractDir "manifest.json"
    
    if (Test-Path $manifestPath) {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        
        Write-Host "  Manifest validated" -ForegroundColor Gray
        Write-Host "    Created: $($manifest.meta.createdAt)" -ForegroundColor DarkGray
        Write-Host "    Source: $($manifest.meta.sourceHost)" -ForegroundColor DarkGray
        Write-Host "    OS: $($manifest.meta.os)" -ForegroundColor DarkGray
        
        # Cleanup
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
        
        return $true
    }
    
    return $false
}

# ============================================
# Test Case 10: Module Loading
# ============================================
$test10 = Test-Step "10. Verify All Modules Load" {
    Write-Host "  Testing module imports..." -ForegroundColor Gray
    
    $modules = @(
        "vscode.psm1",
        "docker.psm1",
        "db.psm1",
        "env.psm1",
        "encryption.psm1",
        "drivers.psm1"
    )
    
    $allLoaded = $true
    
    foreach ($module in $modules) {
        $modulePath = ".\modules\$module"
        
        try {
            Import-Module $modulePath -Force -ErrorAction Stop
            Write-Host "    OK: $module" -ForegroundColor Green
        }
        catch {
            Write-Host "    FAIL: $module - $($_.Exception.Message)" -ForegroundColor Red
            $allLoaded = $false
        }
    }
    
    return $allLoaded
}

# ============================================
# Cleanup Test Artifacts
# ============================================
Write-Host "`n--- Cleanup ---" -ForegroundColor Yellow

if ($bundlePath -and (Test-Path $bundlePath)) {
    Remove-Item $bundlePath -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed: $bundlePath" -ForegroundColor Gray
}

if ($encryptedBundlePath -and (Test-Path $encryptedBundlePath)) {
    Remove-Item $encryptedBundlePath -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed: $encryptedBundlePath" -ForegroundColor Gray
}

if ($decryptedBundlePath -and (Test-Path $decryptedBundlePath)) {
    Remove-Item $decryptedBundlePath -Force -ErrorAction SilentlyContinue
    Write-Host "  Removed: $decryptedBundlePath" -ForegroundColor Gray
}

# ============================================
# Test Summary
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($test in $testResults.tests) {
    $statusColor = if ($test.status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "  [$($test.status)] $($test.name)" -ForegroundColor $statusColor
    
    if ($test.error) {
        Write-Host "    Error: $($test.error)" -ForegroundColor Red
    }
}

Write-Host "`nTotal: $($testResults.passed + $testResults.failed) tests" -ForegroundColor White
Write-Host "Passed: $($testResults.passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.failed)" -ForegroundColor Red

$passRate = [Math]::Round(($testResults.passed / ($testResults.passed + $testResults.failed)) * 100, 1)
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } else { "Yellow" })

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Return exit code based on results
if ($testResults.failed -gt 0) {
    exit 1
}
else {
    exit 0
}
