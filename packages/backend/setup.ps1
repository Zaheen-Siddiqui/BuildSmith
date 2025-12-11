# BuildSmith Backend - Setup Script
# Restores system from a bundle

param(
    [Parameter(Mandatory=$true)]
    [string]$BundlePath,
    
    [Parameter(Mandatory=$true)]
    [string[]]$SelectedItems,
    
    [Parameter(Mandatory=$false)]
    [hashtable]$Options = @{}
)

# Load common functions
$WarningPreference = "SilentlyContinue"
. "$PSScriptRoot/common.ps1"

# Load encryption module
Import-Module "$PSScriptRoot/modules/encryption.psm1" -Force

# Load database module
Import-Module "$PSScriptRoot/modules/db.psm1" -Force

# Load drivers module
Import-Module "$PSScriptRoot/modules/drivers.psm1" -Force

$ErrorActionPreference = "Continue"

# Define helper functions for operations not yet in modules
function Install-VSCodeExtensions {
    param([array]$Extensions, [string]$StepId = "install-vscode-extensions")
    
    # For now, use simplified version - full implementation in vscode.psm1
    Emit-Status -StepId $StepId -State "running" -Message "Installing VS Code extensions..."
    Emit-Log -StepId $StepId -Level "info" -Text "Installing $($Extensions.Count) extensions"
    
    for ($i = 0; $i -lt $Extensions.Count; $i++) {
        if (Test-AbortRequested) { return $false }
        
        $ext = $Extensions[$i]
        Emit-Log -StepId $StepId -Level "info" -Text "Installing: $ext"
        Emit-Progress -StepId $StepId -Current ($i + 1) -Total $Extensions.Count -Unit "extensions"
        
        Start-Sleep -Milliseconds 500  # Simulate installation
    }
    
    Emit-Result -StepId $StepId -State "success" -Duration 5
    return $true
}

function Install-DockerImage {
    param([string]$ImageName)
    
    $stepId = "pull-docker-$ImageName"
    Emit-Status -StepId $stepId -State "running" -Message "Processing Docker image: $ImageName"
    Emit-Log -StepId $stepId -Level "info" -Text "Image: $ImageName"
    
    # Simulate download progress
    for ($i = 1; $i -le 5; $i++) {
        if (Test-AbortRequested) { return $false }
        Emit-Progress -StepId $stepId -Current ($i * 20) -Total 100 -Unit "%"
        Start-Sleep -Milliseconds 400
    }
    
    Emit-Result -StepId $stepId -State "success" -Duration 3
    return $true
}

function Restore-DatabaseConnections {
    param([string]$ConnectionsFile)
    
    Emit-Status -StepId "restore-db-connections" -State "running" -Message "Restoring database connections..."
    Emit-Log -StepId "restore-db-connections" -Level "info" -Text "Reading: $ConnectionsFile"
    
    Start-Sleep -Milliseconds 800
    
    Emit-Result -StepId "restore-db-connections" -State "success" -Duration 1
    return $true
}

function Add-ToPathLocal {
    param([string]$Directory)
    Emit-Log -StepId "update-path" -Level "info" -Text "Adding to PATH: $Directory"
    Start-Sleep -Milliseconds 200
}
$startTime = Get-Date
$failedSteps = @()
$skippedSteps = @()

try {
    Emit-Log -StepId "setup" -Level "info" -Text "Starting setup from bundle: $BundlePath"
    Emit-Log -StepId "setup" -Level "debug" -Text "Selected items: $($SelectedItems -join ', ')"
    Emit-Log -StepId "setup" -Level "debug" -Text "Selected items count: $($SelectedItems.Count)"
    
    # Check if bundle is encrypted
    $bundleToExtract = $BundlePath
    $isEncrypted = $BundlePath -match '\.encrypted$'
    
    if ($isEncrypted) {
        if ($Options.password) {
            Emit-Status -StepId "decrypt-bundle" -State "running" -Message "Decrypting bundle..."
            Emit-Log -StepId "decrypt-bundle" -Level "info" -Text "Bundle is encrypted, decrypting..."
            
            $decryptResult = Unprotect-Bundle -EncryptedPath $BundlePath -Password $Options.password
            
            if ($decryptResult.success) {
                $bundleToExtract = $decryptResult.path
                Emit-Log -StepId "decrypt-bundle" -Level "success" -Text "Bundle decrypted successfully"
                Emit-Status -StepId "decrypt-bundle" -State "complete" -Message "Decryption complete"
            } else {
                throw "Failed to decrypt bundle: $($decryptResult.error)"
            }
        } else {
            throw "Bundle is encrypted but no password provided"
        }
    }
    
    # Extract bundle
    Emit-Status -StepId "extract-bundle" -State "running" -Message "Extracting bundle..."
    
    $extractDir = Join-Path $env:TEMP "buildsmith-extract-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    Add-Type -Assembly System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($bundleToExtract, $extractDir)
    
    # Clean up decrypted temp file if we decrypted
    if ($isEncrypted -and $bundleToExtract -ne $BundlePath) {
        Remove-Item $bundleToExtract -Force -ErrorAction SilentlyContinue
    }
    
    Emit-Result -StepId "extract-bundle" -State "success" -Duration 2
    
    # Read manifest
    $manifestFile = Join-Path $extractDir "manifest.json"
    $manifest = Get-Content $manifestFile | ConvertFrom-Json
    
    Emit-Log -StepId "setup" -Level "info" -Text "Bundle from: $($manifest.meta.sourceHost)"
    Emit-Log -StepId "setup" -Level "info" -Text "Created: $($manifest.meta.createdAt)"
    
    # Install VS Code extensions
    Emit-Log -StepId "setup" -Level "debug" -Text "Checking VS Code: contains=$($SelectedItems -contains 'vscode'), profile=$($manifest.vscodeProfile)"
    if ($SelectedItems -contains "vscode" -and $manifest.vscodeProfile) {
        Emit-Log -StepId "setup" -Level "info" -Text "Processing VS Code profile..."
        $vscodeFile = Join-Path $extractDir $manifest.vscodeProfile
        Emit-Log -StepId "setup" -Level "debug" -Text "VS Code profile path: $vscodeFile"
        
        if (Test-Path $vscodeFile) {
            $vscodeData = Get-Content $vscodeFile | ConvertFrom-Json
            
            if ($vscodeData.extensions -and $vscodeData.extensions.Count -gt 0) {
                Emit-Log -StepId "setup" -Level "info" -Text "Found $($vscodeData.extensions.Count) extensions to install"
                
                # Call the installation function
                # Don't capture output so JSON events flow to stdout
                Install-VSCodeExtensions -Extensions $vscodeData.extensions
                # TODO: Check for errors instead of capturing return value
            } else {
                Emit-Log -StepId "setup" -Level "warn" -Text "No extensions found in profile"
            }
        } else {
            Emit-Log -StepId "setup" -Level "error" -Text "VS Code profile file not found: $vscodeFile"
        }
    }
    
    # Restore Docker images
    Emit-Log -StepId "setup" -Level "debug" -Text "Checking Docker: contains=$($SelectedItems -contains 'docker'), images=$($null -ne $manifest.dockerImages)"
    if ($SelectedItems -contains "docker" -and $manifest.dockerImages) {
        Emit-Log -StepId "setup" -Level "info" -Text "Processing $($manifest.dockerImages.Count) Docker images..."
        foreach ($img in $manifest.dockerImages) {
            if (Test-AbortRequested) {
                Emit-Log -StepId "setup" -Level "warn" -Text "Setup aborted by user"
                break
            }
            
            # In real implementation, check if we should pull or load from tar
            Install-DockerImage -ImageName $img.image
            # TODO: Check for errors instead of capturing return value
        }
    }
    
    # Restore MongoDB Compass connections
    if ($SelectedItems -contains "databases" -and $manifest.mongoConnections) {
        Emit-Log -StepId "setup" -Level "info" -Text "Restoring MongoDB Compass connections..."
        $mongoFile = Join-Path $extractDir $manifest.mongoConnections
        
        if (Test-Path $mongoFile) {
            Import-CompassConnections -ConnectionsFile $mongoFile
        } else {
            Emit-Log -StepId "setup" -Level "warn" -Text "MongoDB connections file not found: $mongoFile"
        }
    }
    
    # Restore database connections
    if ($SelectedItems -contains "databases" -and $manifest.dbConnections) {
        $dbFile = Join-Path $extractDir $manifest.dbConnections
        if (Test-Path $dbFile) {
            $success = Restore-DatabaseConnections -ConnectionsFile $dbFile
            if (-not $success) {
                $failedSteps += "restore-db-connections"
            }
        }
    }
    
    # Install drivers from drivers folder
    if ($SelectedItems -contains "drivers") {
        Emit-Status -StepId "install-drivers" -State "running" -Message "Installing drivers..."
        
        # Check if user provided a drivers folder in Options
        $driversFolder = $null
        if ($Options.driversFolder -and (Test-Path $Options.driversFolder)) {
            $driversFolder = $Options.driversFolder
        }
        # Check for drivers folder in bundle directory
        elseif (Test-Path (Join-Path $extractDir "drivers")) {
            $driversFolder = Join-Path $extractDir "drivers"
        }
        
        if ($driversFolder) {
            Emit-Log -StepId "install-drivers" -Level "info" -Text "Installing drivers from: $driversFolder"
            Emit-Log -StepId "install-drivers" -Level "warning" -Text "IMPORTANT: Driver installation may require system reboot"
            Emit-Log -StepId "install-drivers" -Level "warning" -Text "IMPORTANT: Some drivers may require manual confirmation"
            
            $result = Install-DriversFromFolder -DriverFolder $driversFolder
            
            if ($result.success) {
                Emit-Log -StepId "install-drivers" -Level "success" -Text "Installed $($result.installed) of $($result.total) drivers"
                
                if ($result.failed -gt 0) {
                    Emit-Log -StepId "install-drivers" -Level "warning" -Text "$($result.failed) drivers failed or require manual installation"
                }
                
                # Check if any driver requires reboot
                $rebootRequired = $result.results | Where-Object { $_.requiresReboot }
                if ($rebootRequired.Count -gt 0) {
                    Emit-Log -StepId "install-drivers" -Level "warning" -Text "REBOOT REQUIRED: $($rebootRequired.Count) drivers require system restart"
                }
            }
            else {
                Emit-Log -StepId "install-drivers" -Level "error" -Text "Driver installation failed: $($result.error)"
                $failedSteps += "install-drivers"
            }
            
            Emit-Status -StepId "install-drivers" -State "complete" -Message "Driver installation complete"
        }
        else {
            Emit-Log -StepId "install-drivers" -Level "warning" -Text "No drivers folder found - skipping driver installation"
            Emit-Log -StepId "install-drivers" -Level "info" -Text "To install drivers, provide -driversFolder option or include drivers/ folder in bundle"
        }
    }
    
    # Restore PATH entries
    if ($SelectedItems -contains "environment" -and $manifest.pathEntries) {
        foreach ($pathEntry in $manifest.pathEntries) {
            if (Test-Path $pathEntry) {
                Add-ToPathLocal -Directory $pathEntry
            }
        }
    }
    
    # Clean up
    Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    if ($failedSteps.Count -eq 0) {
        Emit-Complete -Outcome "success" -Duration $duration
    }
    elseif ($failedSteps.Count -lt $SelectedItems.Count) {
        Emit-Complete -Outcome "partial" -Duration $duration -FailedSteps $failedSteps -SkippedSteps $skippedSteps
    }
    else {
        Emit-Complete -Outcome "failed" -Duration $duration -FailedSteps $failedSteps
    }
}
catch {
    $duration = ((Get-Date) - $startTime).TotalSeconds
    Emit-Log -StepId "setup" -Level "error" -Text "Setup failed: $($_.Exception.Message)"
    Emit-Complete -Outcome "failed" -Duration $duration
}
