# drivers.psm1 - Driver and firmware installation module (Step 10.6)
# Provides functions to scan, export, and install vendor drivers with silent arguments

. "$PSScriptRoot\..\common.ps1"

<#
.SYNOPSIS
    Scans for installed drivers and device information
.DESCRIPTION
    Collects information about installed drivers and devices that may need reinstallation
.OUTPUTS
    Array of driver objects with Name, Version, Provider, Class
#>
function Get-InstalledDrivers
{
    Emit-Log "Scanning installed drivers..." "info"
    
    try
    {
        # Use Get-WindowsDriver for installed drivers
        $drivers = @()
        
        # Get PnP devices with driver information
        $devices = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object {
            $_.Status -eq "OK" -and 
            $_.Class -and 
            $_.Class -ne "System" -and
            $_.Class -ne "SoftwareDevice"
        }
        
        foreach ($device in $devices)
        {
            # Get driver details
            $driverInfo = Get-PnpDeviceProperty -InstanceId $device.InstanceId -KeyName "DEVPKEY_Device_DriverVersion" -ErrorAction SilentlyContinue
            $providerInfo = Get-PnpDeviceProperty -InstanceId $device.InstanceId -KeyName "DEVPKEY_Device_DriverProvider" -ErrorAction SilentlyContinue
            
            if ($driverInfo -and $providerInfo)
            {
                $drivers += @{
                    Name = $device.FriendlyName
                    Version = $driverInfo.Data
                    Provider = $providerInfo.Data
                    Class = $device.Class
                    InstanceId = $device.InstanceId
                }
            }
        }
        
        Emit-Log "Found $($drivers.Count) device drivers" "info"
        return $drivers
    }
    catch
    {
        Emit-Log "Error scanning drivers: $($_.Exception.Message)" "error"
        return @()
    }
}

<#
.SYNOPSIS
    Exports driver list to JSON file
.DESCRIPTION
    Saves the driver information to a JSON file for reference
.PARAMETER Drivers
    Array of driver objects from Get-InstalledDrivers
.PARAMETER OutputPath
    Path where the drivers JSON will be saved
.OUTPUTS
    Hashtable with success, path, count
#>
function Export-DriverList
{
    param(
        [Parameter(Mandatory=$true)]
        [array]$Drivers,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    
    try
    {
        $Drivers | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputPath -Encoding UTF8
        
        Emit-Log "Exported $($Drivers.Count) drivers to $OutputPath" "info"
        
        return @{
            success = $true
            path = $OutputPath
            count = $Drivers.Count
        }
    }
    catch
    {
        Emit-Log "Error exporting drivers: $($_.Exception.Message)" "error"
        
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
    Detects known vendor driver installer types
.DESCRIPTION
    Identifies common driver installer formats and their silent installation arguments
.PARAMETER InstallerPath
    Path to the driver installer executable
.OUTPUTS
    Hashtable with vendor, type, silentArgs
#>
function Get-DriverInstallerType
{
    param(
        [Parameter(Mandatory=$true)]
        [string]$InstallerPath
    )
    
    if (-not (Test-Path $InstallerPath))
    {
        return @{
            vendor = "unknown"
            type = "unknown"
            silentArgs = $null
            supported = $false
        }
    }
    
    $fileName = [System.IO.Path]::GetFileName($InstallerPath).ToLower()
    $extension = [System.IO.Path]::GetExtension($InstallerPath).ToLower()
    
    # NVIDIA GeForce/Quadro drivers
    if ($fileName -match "nvidia|geforce|quadro")
    {
        return @{
            vendor = "NVIDIA"
            type = "GPU Driver"
            silentArgs = "-s -noreboot -noeula"
            supported = $true
            requiresReboot = $true
        }
    }
    
    # AMD/ATI Radeon drivers
    if ($fileName -match "amd|radeon|ati")
    {
        return @{
            vendor = "AMD"
            type = "GPU Driver"
            silentArgs = "-install -norestart"
            supported = $true
            requiresReboot = $true
        }
    }
    
    # Intel drivers (graphics, chipset, network)
    if ($fileName -match "intel")
    {
        return @{
            vendor = "Intel"
            type = "Driver"
            silentArgs = "-s -norestart"
            supported = $true
            requiresReboot = $true
        }
    }
    
    # Realtek audio/network drivers
    if ($fileName -match "realtek")
    {
        return @{
            vendor = "Realtek"
            type = "Driver"
            silentArgs = "/S /v/qn"
            supported = $true
            requiresReboot = $true
        }
    }
    
    # Generic MSI installer
    if ($extension -eq ".msi")
    {
        return @{
            vendor = "Generic"
            type = "MSI"
            silentArgs = "/qn /norestart"
            supported = $true
            requiresReboot = $false
        }
    }
    
    # Generic NSIS installer
    if ($fileName -match "setup|install")
    {
        return @{
            vendor = "Generic"
            type = "NSIS"
            silentArgs = "/S"
            supported = $true
            requiresReboot = $false
        }
    }
    
    # Unknown/unsupported
    return @{
        vendor = "unknown"
        type = "unknown"
        silentArgs = $null
        supported = $false
        requiresReboot = $false
    }
}

<#
.SYNOPSIS
    Runs a driver installer with silent arguments
.DESCRIPTION
    Executes a driver installer with vendor-specific silent installation arguments
    Reports progress and warns about potential reboots
.PARAMETER InstallerPath
    Path to the driver installer executable
.PARAMETER SilentArgs
    Silent installation arguments (optional - will auto-detect if not provided)
.OUTPUTS
    Hashtable with success, exitCode, output, requiresReboot
#>
function Install-Driver
{
    param(
        [Parameter(Mandatory=$true)]
        [string]$InstallerPath,
        
        [Parameter(Mandatory=$false)]
        [string]$SilentArgs = $null
    )
    
    if (-not (Test-Path $InstallerPath))
    {
        Emit-Log "Driver installer not found: $InstallerPath" "error"
        return @{
            success = $false
            error = "Installer file not found"
        }
    }
    
    # Auto-detect installer type if silent args not provided
    if (-not $SilentArgs)
    {
        $installerInfo = Get-DriverInstallerType -InstallerPath $InstallerPath
        
        if (-not $installerInfo.supported)
        {
            Emit-Log "Unsupported driver installer type: $InstallerPath" "warning"
            return @{
                success = $false
                error = "Unsupported installer type - requires manual installation"
                vendor = $installerInfo.vendor
            }
        }
        
        $SilentArgs = $installerInfo.silentArgs
        $requiresReboot = $installerInfo.requiresReboot
        
        Emit-Log "Detected $($installerInfo.vendor) $($installerInfo.type) installer" "info"
        
        if ($requiresReboot)
        {
            Emit-Log "Warning: This driver may require a system reboot after installation" "warning"
        }
    }
    
    try
    {
        $fileName = [System.IO.Path]::GetFileName($InstallerPath)
        Emit-Progress "Installing driver: $fileName" 0
        
        # Run installer with silent args
        $process = Start-Process -FilePath $InstallerPath -ArgumentList $SilentArgs -Wait -PassThru -NoNewWindow
        
        $exitCode = $process.ExitCode
        
        # Common exit codes
        $success = $exitCode -eq 0 -or $exitCode -eq 3010  # 3010 = success but reboot required
        
        if ($success)
        {
            Emit-Progress "Driver installed successfully" 100
            
            if ($exitCode -eq 3010)
            {
                Emit-Log "Driver installed - system reboot required (exit code 3010)" "warning"
            }
            else
            {
                Emit-Log "Driver installed successfully" "info"
            }
            
            return @{
                success = $true
                exitCode = $exitCode
                requiresReboot = ($exitCode -eq 3010)
            }
        }
        else
        {
            Emit-Log "Driver installation failed with exit code: $exitCode" "error"
            
            return @{
                success = $false
                exitCode = $exitCode
                error = "Installation failed with exit code $exitCode"
            }
        }
    }
    catch
    {
        Emit-Log "Error installing driver: $($_.Exception.Message)" "error"
        
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
    Processes all driver installers in a directory
.DESCRIPTION
    Scans a directory for driver installers and installs them with appropriate silent arguments
.PARAMETER DriverFolder
    Path to folder containing driver installers
.OUTPUTS
    Hashtable with installed count, failed count, results array
#>
function Install-DriversFromFolder
{
    param(
        [Parameter(Mandatory=$true)]
        [string]$DriverFolder
    )
    
    if (-not (Test-Path $DriverFolder))
    {
        Emit-Log "Driver folder not found: $DriverFolder" "error"
        return @{
            success = $false
            error = "Driver folder not found"
        }
    }
    
    # Find all potential installer files
    $installers = Get-ChildItem -Path $DriverFolder -Recurse -File | Where-Object {
        $_.Extension -match '\.(exe|msi)$'
    }
    
    if ($installers.Count -eq 0)
    {
        Emit-Log "No driver installers found in $DriverFolder" "warning"
        return @{
            success = $true
            installed = 0
            failed = 0
            results = @()
        }
    }
    
    Emit-Log "Found $($installers.Count) potential driver installers" "info"
    
    $results = @()
    $installed = 0
    $failed = 0
    
    foreach ($installer in $installers)
    {
        Emit-Log "Processing: $($installer.Name)" "info"
        
        $result = Install-Driver -InstallerPath $installer.FullName
        
        $results += @{
            file = $installer.Name
            path = $installer.FullName
            success = $result.success
            exitCode = $result.exitCode
            error = $result.error
            requiresReboot = $result.requiresReboot
        }
        
        if ($result.success)
        {
            $installed++
        }
        else
        {
            $failed++
        }
    }
    
    Emit-Log "Driver installation complete: $installed installed, $failed failed" "info"
    
    return @{
        success = $true
        installed = $installed
        failed = $failed
        total = $installers.Count
        results = $results
    }
}

# Export functions
Export-ModuleMember -Function Get-InstalledDrivers, Export-DriverList, Get-DriverInstallerType, Install-Driver, Install-DriversFromFolder
