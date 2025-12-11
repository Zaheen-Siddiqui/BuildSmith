# BuildSmith Backend - Scan Script
# Scans the current system and creates a bundle

param(
    [Parameter(Mandatory=$true)]
    [hashtable]$Options
)

# Load common functions
$WarningPreference = "SilentlyContinue"
$ErrorActionPreference = "Continue"
. "$PSScriptRoot/common.ps1"

# Load modules
Import-Module "$PSScriptRoot/modules/vscode.psm1" -Force
Import-Module "$PSScriptRoot/modules/docker.psm1" -Force
Import-Module "$PSScriptRoot/modules/db.psm1" -Force
Import-Module "$PSScriptRoot/modules/env.psm1" -Force
Import-Module "$PSScriptRoot/modules/encryption.psm1" -Force

$startTime = Get-Date

try {
    Emit-Status -StepId "scan" -State "running" -Message "Starting system scan..."
    Emit-Log -StepId "scan" -Level "info" -Text "Starting system scan..."
    
    # Create temporary bundle directory
    $bundleDir = Join-Path $env:TEMP "buildsmith-bundle-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Emit-Log -StepId "scan" -Level "debug" -Text "Creating temporary directory: $bundleDir"
    New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null
    
    # Initialize manifest
    Emit-Log -StepId "scan" -Level "info" -Text "Initializing bundle manifest..."
    $manifest = @{
        meta = @{
            createdAt = (Get-Date -Format "o")
            sourceHost = $env:COMPUTERNAME
            os = "Windows $([Environment]::OSVersion.Version)"
        }
        apps = @()
        dockerImages = @()
        vscodeProfile = $null
        dbConnections = @()
        pathEntries = @()
        envVars = @{}
    }
    
    # Scan VS Code
    if ($Options.vscode) {
        Emit-Status -StepId "scan-vscode" -State "running" -Message "Scanning VS Code profile..."
        Emit-Log -StepId "scan-vscode" -Level "info" -Text "Scanning VS Code installation..."
        
        $vscodeProfile = Get-VSCodeProfiles
        if ($vscodeProfile -and $vscodeProfile.extensions.Count -gt 0) {
            $vscodeFile = Join-Path $bundleDir "vscode-profile.json"
            $vscodeProfile | ConvertTo-Json -Depth 10 | Out-File $vscodeFile -Encoding UTF8
            $manifest.vscodeProfile = "vscode-profile.json"
            
            Emit-Log -StepId "scan-vscode" -Level "success" -Text "Found $($vscodeProfile.extensions.Count) extensions"
            Emit-Status -StepId "scan-vscode" -State "complete" -Message "VS Code scan complete"
        } else {
            Emit-Log -StepId "scan-vscode" -Level "warn" -Text "No VS Code profile found or no extensions installed"
            Emit-Status -StepId "scan-vscode" -State "complete" -Message "No VS Code data found"
        }
    }
    
    # Scan Docker
    if ($Options.docker) {
        Emit-Status -StepId "scan-docker" -State "running" -Message "Scanning Docker images..."
        Emit-Log -StepId "scan-docker" -Level "info" -Text "Scanning Docker images..."
        
        $dockerImages = Get-DockerImages
        if ($dockerImages -and $dockerImages.Count -gt 0) {
            foreach ($img in $dockerImages) {
                $manifest.dockerImages += @{
                    image = $img.image
                    id = $img.id
                    size = $img.size
                }
            }
            
            Emit-Log -StepId "scan-docker" -Level "success" -Text "Found $($dockerImages.Count) Docker images"
            Emit-Status -StepId "scan-docker" -State "complete" -Message "Docker scan complete"
        } else {
            Emit-Log -StepId "scan-docker" -Level "warn" -Text "No Docker images found"
            Emit-Status -StepId "scan-docker" -State "complete" -Message "No Docker images found"
        }
    }
    
    # Scan Databases
    if ($Options.databases) {
        Emit-Status -StepId "scan-databases" -State "running" -Message "Scanning database connections..."
        Emit-Log -StepId "scan-databases" -Level "info" -Text "Scanning database connections..."
        
        $dbConnections = Get-DatabaseConnections
        if ($dbConnections -and $dbConnections.Count -gt 0) {
            $dbFile = Join-Path $bundleDir "db-connections.json"
            $dbConnections | ConvertTo-Json -Depth 10 | Out-File $dbFile -Encoding UTF8
            $manifest.dbConnections = "db-connections.json"
            
            Emit-Log -StepId "scan-databases" -Level "success" -Text "Found $($dbConnections.Count) database connections"
            Emit-Status -StepId "scan-databases" -State "complete" -Message "Database scan complete"
        } else {
            Emit-Log -StepId "scan-databases" -Level "info" -Text "No database connections found"
            Emit-Status -StepId "scan-databases" -State "complete" -Message "No database connections found"
        }
    }
    
    # Scan Environment
    if ($Options.environment) {
        Emit-Status -StepId "scan-environment" -State "running" -Message "Scanning environment settings..."
        Emit-Log -StepId "scan-environment" -Level "info" -Text "Scanning PATH and environment variables..."
        
        $pathEntries = Get-SystemPath
        $manifest.pathEntries = $pathEntries
        
        $envVars = Get-EnvironmentVariables
        $manifest.envVars = $envVars
        
        Emit-Log -StepId "scan-environment" -Level "success" -Text "Found $($pathEntries.Count) PATH entries and $($envVars.Count) environment variables"
        Emit-Status -StepId "scan-environment" -State "complete" -Message "Environment scan complete"
    }
    
    # Save manifest
    Emit-Log -StepId "scan" -Level "info" -Text "Saving bundle manifest..."
    $manifestFile = Join-Path $bundleDir "manifest.json"
    $manifest | ConvertTo-Json -Depth 10 | Out-File $manifestFile -Encoding UTF8
    
    # Create ZIP bundle
    Emit-Status -StepId "create-bundle" -State "running" -Message "Creating bundle archive..."
    Emit-Log -StepId "create-bundle" -Level "info" -Text "Creating ZIP archive..."
    
    $outputPath = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "BuildSmith-Bundle-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    
    # Use .NET to create ZIP
    Add-Type -Assembly System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($bundleDir, $outputPath)
    
    $bundleSize = (Get-Item $outputPath).Length
    $bundleSizeMB = [math]::Round($bundleSize / 1MB, 2)
    
    # Clean up temp directory
    Emit-Log -StepId "create-bundle" -Level "debug" -Text "Cleaning up temporary directory..."
    Remove-Item $bundleDir -Recurse -Force
    
    # Optional encryption
    $finalPath = $outputPath
    if ($Options.encrypt -and $Options.password) {
        Emit-Status -StepId "encrypt-bundle" -State "running" -Message "Encrypting bundle..."
        Emit-Log -StepId "encrypt-bundle" -Level "info" -Text "Encrypting bundle with password..."
        
        $encryptResult = Protect-Bundle -BundlePath $outputPath -Password $Options.password
        
        if ($encryptResult.success) {
            # Remove unencrypted bundle
            Remove-Item $outputPath -Force
            $finalPath = $encryptResult.path
            $encryptedSizeMB = [math]::Round($encryptResult.encryptedSize / 1MB, 2)
            
            Emit-Log -StepId "encrypt-bundle" -Level "success" -Text "Bundle encrypted: $encryptedSizeMB MB"
            Emit-Status -StepId "encrypt-bundle" -State "complete" -Message "Encryption complete"
        } else {
            Emit-Log -StepId "encrypt-bundle" -Level "error" -Text "Encryption failed: $($encryptResult.error)"
            Emit-Status -StepId "encrypt-bundle" -State "failed" -Message "Encryption failed"
        }
    }
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Emit-Log -StepId "create-bundle" -Level "success" -Text "Bundle created: $finalPath ($bundleSizeMB MB)"
    Emit-Status -StepId "create-bundle" -State "complete" -Message "Bundle created successfully"
    Emit-Result -StepId "create-bundle" -Data @{ path = $finalPath; size = $bundleSize }
    
    Emit-Complete -Outcome "success" -Duration $duration
}
catch {
    $duration = ((Get-Date) - $startTime).TotalSeconds
    Emit-Log -StepId "scan" -Level "error" -Text "Scan failed: $($_.Exception.Message)"
    Emit-Complete -Outcome "failed" -Duration $duration
}
