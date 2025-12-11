# Test Drivers Module - Step 10.6

Write-Host "`n=== Testing Drivers Module (Step 10.6) ===" -ForegroundColor Cyan

$backendPath = "C:\Users\siddi\OneDrive\Desktop\BuildSmith\packages\backend"
Set-Location $backendPath

# Load common and drivers modules
. .\common.ps1
Import-Module .\modules\drivers.psm1 -Force

Write-Host "`nTest 1: Get Installed Drivers" -ForegroundColor Yellow
$drivers = Get-InstalledDrivers

if ($drivers -and $drivers.Count -gt 0)
{
    Write-Host "Success - Found $($drivers.Count) device drivers" -ForegroundColor Green
    
    # Show a sample of drivers
    $sampleCount = [Math]::Min(5, $drivers.Count)
    Write-Host "`nSample drivers (showing $sampleCount of $($drivers.Count)):" -ForegroundColor Gray
    
    for ($i = 0; $i -lt $sampleCount; $i++)
    {
        $driver = $drivers[$i]
        Write-Host "  - $($driver.Name)" -ForegroundColor Gray
        Write-Host "    Provider: $($driver.Provider), Version: $($driver.Version), Class: $($driver.Class)" -ForegroundColor DarkGray
    }
}
else
{
    Write-Host "Warning - No drivers found" -ForegroundColor Yellow
}

Write-Host "`nTest 2: Export Driver List" -ForegroundColor Yellow
if ($drivers -and $drivers.Count -gt 0)
{
    $exportPath = "$env:TEMP\test-drivers.json"
    $result = Export-DriverList -Drivers $drivers -OutputPath $exportPath
    
    if ($result.success)
    {
        Write-Host "Success - Exported $($result.count) drivers to $exportPath" -ForegroundColor Green
        
        # Show file size
        $fileSize = (Get-Item $exportPath).Length
        Write-Host "  File size: $([Math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Gray
    }
    else
    {
        Write-Host "Failed - Export failed: $($result.error)" -ForegroundColor Red
    }
}
else
{
    Write-Host "Skipped - No drivers to export" -ForegroundColor Gray
}

Write-Host "`nTest 3: Detect Installer Types" -ForegroundColor Yellow

# Test various installer filenames
$testFiles = @(
    "nvidia-driver-551.23.exe",
    "AMD-Radeon-Driver.exe",
    "Intel-Chipset-Driver.exe",
    "Realtek-Audio.exe",
    "some-driver.msi",
    "setup.exe",
    "unknown.dat"
)

Write-Host "Testing installer type detection:" -ForegroundColor Gray

foreach ($testFile in $testFiles)
{
    # Create temporary test file
    $tempFile = Join-Path $env:TEMP $testFile
    "test" | Out-File $tempFile -Force
    
    $info = Get-DriverInstallerType -InstallerPath $tempFile
    
    $supportedText = if ($info.supported) { "Supported" } else { "Unsupported" }
    $color = if ($info.supported) { "Green" } else { "Yellow" }
    
    Write-Host "  $testFile" -ForegroundColor Gray
    Write-Host "    Vendor: $($info.vendor), Type: $($info.type), $supportedText" -ForegroundColor $color
    
    if ($info.silentArgs)
    {
        Write-Host "    Silent args: $($info.silentArgs)" -ForegroundColor DarkGray
    }
    
    # Cleanup
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
}

Write-Host "`nTest 4: Check Driver Installation Function" -ForegroundColor Yellow
Write-Host "Install-Driver function available: " -NoNewline
$hasFunction = Get-Command Install-Driver -ErrorAction SilentlyContinue

if ($hasFunction)
{
    Write-Host "Yes" -ForegroundColor Green
    Write-Host "  Note: Actual driver installation requires administrator rights and real installer files" -ForegroundColor Gray
}
else
{
    Write-Host "No" -ForegroundColor Red
}

Write-Host "`nTest 5: Check Bulk Install Function" -ForegroundColor Yellow
Write-Host "Install-DriversFromFolder function available: " -NoNewline
$hasBulkFunction = Get-Command Install-DriversFromFolder -ErrorAction SilentlyContinue

if ($hasBulkFunction)
{
    Write-Host "Yes" -ForegroundColor Green
    Write-Host "  Note: This function processes all .exe and .msi files in a folder" -ForegroundColor Gray
}
else
{
    Write-Host "No" -ForegroundColor Red
}

Write-Host "`n=== Drivers Module Tests Complete ===" -ForegroundColor Cyan
Write-Host "`nStep 10.6 implementation includes:" -ForegroundColor White
Write-Host "  - Get-InstalledDrivers - Scan installed device drivers" -ForegroundColor Gray
Write-Host "  - Export-DriverList - Export drivers to JSON" -ForegroundColor Gray
Write-Host "  - Get-DriverInstallerType - Detect vendor and silent args" -ForegroundColor Gray
Write-Host "  - Install-Driver - Run driver installer silently" -ForegroundColor Gray
Write-Host "  - Install-DriversFromFolder - Batch install from folder" -ForegroundColor Gray
Write-Host "`nSupported vendors: NVIDIA, AMD, Intel, Realtek, Generic MSI/NSIS" -ForegroundColor White
Write-Host "Features: Silent installation, reboot detection, exit code handling" -ForegroundColor White
