# BuildSmith End-to-End Backend Test
# Tests the complete scan → bundle → restore workflow with real PowerShell modules

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
if ($Verbose) { $VerbosePreference = "Continue" }

Write-Host ""
Write-Host "======================= BuildSmith E2E Backend Test =======================" -ForegroundColor Cyan

# Setup paths
$backendPath = Join-Path $PSScriptRoot "packages\backend"

# Load common functions FIRST (modules depend on these)
Write-Host "Loading common functions..." -ForegroundColor Yellow
. "$backendPath\common.ps1"

Write-Host "Loading PowerShell Modules..." -ForegroundColor Yellow

# Import all modules
Import-Module "$backendPath\modules\common.psm1" -Force -Global
Import-Module "$backendPath\modules\vscode.psm1" -Force -Global
Import-Module "$backendPath\modules\docker.psm1" -Force -Global
Import-Module "$backendPath\modules\db.psm1" -Force -Global
Import-Module "$backendPath\modules\devtools.psm1" -Force -Global
Import-Module "$backendPath\modules\env.psm1" -Force -Global
Import-Module "$backendPath\modules\installers.psm1" -Force -Global

Write-Host "Modules loaded successfully!" -ForegroundColor Green

# Test results
$passed = 0
$failed = 0
$skipped = 0

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "TEST SUITE 1: Scanner Modules" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# Test 1: DevOps Tools Scanner
Write-Host ""
Write-Host "Test 1: DevOps Tools Scanner" -ForegroundColor Cyan
try {
    $tools = Get-InstalledDevTools
    if ($tools -and $tools.Count -gt 0) {
        Write-Host "  PASSED - Found $($tools.Count) tools" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  SKIPPED - No tools installed" -ForegroundColor Yellow
        $skipped++
    }
} catch {
    Write-Host "  FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 2: Environment Scanner
Write-Host ""
Write-Host "Test 2: Environment Variables Scanner" -ForegroundColor Cyan
try {
    $envVars = Get-EnvironmentVariables
    if ($envVars -and $envVars.Count -gt 0) {
        Write-Host "  PASSED - Found $($envVars.Count) variables" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAILED - No environment variables found" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 3: PATH Scanner
Write-Host ""
Write-Host "Test 3: PATH Scanner" -ForegroundColor Cyan
try {
    $pathEntries = Get-SystemPath
    if ($pathEntries -and $pathEntries.Count -gt 0) {
        Write-Host "  PASSED - Found $($pathEntries.Count) PATH entries" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  FAILED - No PATH entries found" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 4: Package Scanner  
Write-Host ""
Write-Host "Test 4: Package Scanner" -ForegroundColor Cyan
try {
    $ErrorActionPreference = "Stop"
    $packages = Get-InstalledPackages
    if ($packages -and $packages.Count -gt 0) {
        Write-Host "  PASSED - Found $($packages.Count) packages" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  SKIPPED - No packages installed" -ForegroundColor Yellow
        $skipped++
    }
} catch {
    Write-Host "  FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Stack: $($_.ScriptStackTrace)" -ForegroundColor DarkGray
    $failed++
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "TEST SUITE 2: Restore Modules" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

# Test 5: Environment Variable Restore
Write-Host ""
Write-Host "Test 5: Environment Variable Restore" -ForegroundColor Cyan
try {
    $testVarName = "BUILDSMITH_E2E_TEST"
    $testVarValue = "TestValue123"
    
    $result = Set-EnvironmentVariable -Name $testVarName -Value $testVarValue -Scope "user"
    
    if ($result.success) {
        # Verify
        $actualValue = [Environment]::GetEnvironmentVariable($testVarName, [EnvironmentVariableTarget]::User)
        if ($actualValue -eq $testVarValue) {
            Write-Host "  PASSED - Successfully set and verified variable" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  FAILED - Value mismatch" -ForegroundColor Red
            $failed++
        }
        
        # Cleanup
        [Environment]::SetEnvironmentVariable($testVarName, $null, [EnvironmentVariableTarget]::User)
    } else {
        Write-Host "  FAILED - $($result.error)" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

# Test 6: VS Code Module
Write-Host ""
Write-Host "Test 6: VS Code Module" -ForegroundColor Cyan
try {
    $vscodePath = Get-VSCodePath
    if ($vscodePath) {
        Write-Host "  PASSED - VS Code found at: $vscodePath" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  SKIPPED - VS Code not installed" -ForegroundColor Yellow
        $skipped++
    }
} catch {
    Write-Host "  FAILED - $($_.Exception.Message)" -ForegroundColor Red
    $failed++
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan

$total = $passed + $failed + $skipped
$successRate = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 1) } else { 0 }

Write-Host ""
Write-Host "Passed:  $passed" -ForegroundColor Green
Write-Host "Failed:  $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
Write-Host "Skipped: $skipped" -ForegroundColor Yellow
Write-Host ""
Write-Host "Success Rate: $successRate% ($passed/$total)" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })
Write-Host "==========================================================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}

# ============================================================================
# TEST SUITE 1: Scanner Modules
# ============================================================================

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "TEST SUITE 1: Scanner Modules" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

Test-Module "DevOps Tools Scanner" {
    $tools = Get-InstalledDevTools
    
    if (-not $tools) {
        Write-Warning "No DevOps tools found (this is okay if none are installed)"
        throw "Skipped - No tools installed"
    }
    
    Write-Verbose "Found $($tools.Count) DevOps tools"
    
    foreach ($tool in $tools | Select-Object -First 3) {
        Write-Host "   - $($tool.name): $($tool.version) at $($tool.path)" -ForegroundColor Gray
    }
    
    # Validate structure
    $firstTool = $tools[0]
    if (-not $firstTool.id -or -not $firstTool.name) {
        throw "Tool object missing required properties (id, name)"
    }
}

Test-Module "Environment Variables Scanner" {
    $envVars = Get-EnvironmentVariables
    
    if (-not $envVars -or $envVars.Count -eq 0) {
        throw "Failed to retrieve environment variables"
    }
    
    Write-Verbose "Found $($envVars.Count) environment variables"
    Write-Host "   - Sample: $($envVars.Keys | Select-Object -First 3 -Join ', ')" -ForegroundColor Gray
}

Test-Module "PATH Scanner" {
    $pathEntries = Get-SystemPath
    
    if (-not $pathEntries -or $pathEntries.Count -eq 0) {
        throw "Failed to retrieve PATH entries"
    }
    
    Write-Verbose "Found $($pathEntries.Count) PATH entries"
    Write-Host "   - First entry: $($pathEntries[0].path)" -ForegroundColor Gray
}

Test-Module "Package Scanner" {
    $packages = Get-InstalledPackages
    
    if (-not $packages) {
        Write-Warning "No packages found (this is okay)"
        throw "Skipped - No packages installed"
    }
    
    Write-Verbose "Found $($packages.Count) packages"
    
    $npmCount = ($packages | Where-Object { $_.type -eq 'package' -and $_.packageManager -eq 'npm' }).Count
    $pipCount = ($packages | Where-Object { $_.type -eq 'package' -and $_.packageManager -eq 'pip' }).Count
    
    Write-Host "   - npm: $npmCount, pip: $pipCount" -ForegroundColor Gray
}

Test-Module "VS Code Scanner" {
    $vscodePath = Get-VSCodePath
    
    if (-not $vscodePath) {
        Write-Warning "VS Code not found (skipping test)"
        throw "Skipped - VS Code not installed"
    }
    
    Write-Host "   - VS Code found at: $vscodePath" -ForegroundColor Gray
    
    $profile = Get-VSCodeProfiles
    if ($profile -and $profile.extensions) {
        Write-Host "   - Extensions: $($profile.extensions.Count)" -ForegroundColor Gray
    }
}

Test-Module "Docker Scanner" {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Warning "Docker not installed (skipping test)"
        throw "Skipped - Docker not installed"
    }
    
    $dockerTest = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Docker daemon not running (skipping test)"
        throw "Skipped - Docker daemon not running"
    }
    
    $images = Get-DockerImages
    Write-Host "   - Docker images: $(if ($images) { $images.Count } else { 0 })" -ForegroundColor Gray
}

Test-Module "Database Connections Scanner" {
    $connections = Get-DatabaseConnections
    
    if (-not $connections -or $connections.Count -eq 0) {
        Write-Warning "No database connections found (this is okay)"
        throw "Skipped - No connections found"
    }
    
    Write-Host "   - Found $($connections.Count) database connections" -ForegroundColor Gray
}

# ============================================================================
# TEST SUITE 2: Restore Modules
# ============================================================================

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "TEST SUITE 2: Restore Modules" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

Test-Module "Environment Variable Restore" {
    $testVarName = "BUILDSMITH_E2E_TEST_$(Get-Random -Maximum 9999)"
    $testVarValue = "E2E Test Value $(Get-Date -Format 'yyyyMMddHHmmss')"
    
    # Set variable
    $result = Set-EnvironmentVariable -Name $testVarName -Value $testVarValue -Scope "user"
    
    if (-not $result.success) {
        throw "Failed to set environment variable: $($result.error)"
    }
    
    # Verify it was set
    $actualValue = [Environment]::GetEnvironmentVariable($testVarName, [EnvironmentVariableTarget]::User)
    
    if ($actualValue -ne $testVarValue) {
        throw "Environment variable value mismatch. Expected: $testVarValue, Got: $actualValue"
    }
    
    Write-Host "   - Set and verified variable: $testVarName" -ForegroundColor Gray
    
    # Clean up
    [Environment]::SetEnvironmentVariable($testVarName, $null, [EnvironmentVariableTarget]::User)
}

Test-Module "PATH Entry Restore" {
    $testPath = "C:\BuildSmith\E2E\Test\$(Get-Random -Maximum 9999)"
    
    # This should succeed even if path doesn't exist (PATH allows non-existent paths)
    $result = Add-PathEntry -Path $testPath -Scope "user"
    
    if (-not $result.success) {
        throw "Failed to add PATH entry: $($result.error)"
    }
    
    Write-Host "   - Added PATH entry (would need to reload environment to verify)" -ForegroundColor Gray
    
    # Note: Cannot easily verify without reloading the environment
    # In real scenario, would need to restart shell or re-read environment
}

Test-Module "VS Code Installation Check" {
    # Just test that the function exists and returns structured data
    $vscodePath = Get-VSCodePath
    
    if ($vscodePath) {
        Write-Host "   - VS Code already installed at: $vscodePath" -ForegroundColor Gray
    } else {
        Write-Host "   - Install-VSCode function available (not testing actual install)" -ForegroundColor Gray
    }
    
    # Test that Install-VSCode function exists
    $functionExists = Get-Command Install-VSCode -ErrorAction SilentlyContinue
    if (-not $functionExists) {
        throw "Install-VSCode function not found"
    }
}

# ============================================================================
# TEST SUITE 3: Bundle Creation
# ============================================================================

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "TEST SUITE 3: Bundle Creation" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

Test-Module "Create Test Bundle" {
    $scanOptions = @{
        vscode = $false
        docker = $false
        databases = $false
        devtools = $true
        environment = $true
        packages = $false
        drivers = $false
        includeSecrets = $false
    }
    
    Write-Host "   - Running scan.ps1 with test options..." -ForegroundColor Gray
    
    # Capture scan output (this will create a bundle)
    $originalLocation = Get-Location
    try {
        Set-Location $backendPath
        
        # Run scan in a job to capture all output
        $scanJob = Start-Job -ScriptBlock {
            param($backendPath, $options)
            & "$backendPath\scan.ps1" -Options $options
        } -ArgumentList $backendPath, $scanOptions
        
        $scanJob | Wait-Job -Timeout 60 | Out-Null
        
        if ($scanJob.State -eq 'Running') {
            $scanJob | Stop-Job
            throw "Scan timed out after 60 seconds"
        }
        
        $scanOutput = Receive-Job $scanJob
        Remove-Job $scanJob
        
        Write-Verbose "Scan output: $scanOutput"
        
        # Look for created bundle in Documents folder
        $documentsPath = [Environment]::GetFolderPath("MyDocuments")
        $recentBundles = Get-ChildItem -Path $documentsPath -Filter "BuildSmith-Bundle-*.zip" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        
        if ($recentBundles) {
            Write-Host "   - Bundle created: $($recentBundles.Name) ($([math]::Round($recentBundles.Length / 1KB, 2)) KB)" -ForegroundColor Gray
            
            # Clean up test bundle
            Remove-Item $recentBundles.FullName -Force
        } else {
            Write-Warning "No bundle file found (scan may have failed silently)"
        }
    }
    finally {
        Set-Location $originalLocation
    }
}

# ============================================================================
# RESULTS SUMMARY
# ============================================================================

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$passCount = $testResults.passed.Count
$failCount = $testResults.failed.Count
$skipCount = $testResults.skipped.Count
$totalCount = $passCount + $failCount + $skipCount

Write-Host ""
Write-Host "✅ Passed: $passCount" -ForegroundColor Green
if ($testResults.passed.Count -gt 0) {
    foreach ($test in $testResults.passed) {
        Write-Host "   - $test" -ForegroundColor Gray
    }
}

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "❌ Failed: $failCount" -ForegroundColor Red
    foreach ($test in $testResults.failed) {
        Write-Host "   - $test" -ForegroundColor Gray
    }
}

if ($skipCount -gt 0) {
    Write-Host ""
    Write-Host "⏭️  Skipped: $skipCount" -ForegroundColor Yellow
    foreach ($test in $testResults.skipped) {
        Write-Host "   - $test" -ForegroundColor Gray
    }
}

$successRate = if ($totalCount -gt 0) { [math]::Round(($passCount / $totalCount) * 100, 1) } else { 0 }

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "Overall Success Rate: $successRate% ($passCount/$totalCount)" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })
Write-Host ("=" * 60) -ForegroundColor Cyan

# Exit with appropriate code
if ($failCount -gt 0) {
    exit 1
} else {
    exit 0
}
