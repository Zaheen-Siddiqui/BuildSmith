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
$startTime = Get-Date

try {
    Emit-Log -StepId "scan" -Level "info" -Text "Starting system scan..."
    
    # Create temporary bundle directory
    $bundleDir = Join-Path $env:TEMP "buildsmith-bundle-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null
    
    # Initialize manifest
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
        $vscodeProfile = Get-VSCodeProfiles
        if ($vscodeProfile) {
            $vscodeFile = Join-Path $bundleDir "vscode_profile.json"
            $vscodeProfile | ConvertTo-Json -Depth 10 | Out-File $vscodeFile -Encoding UTF8
            $manifest.vscodeProfile = "vscode_profile.json"
        }
    }
    
    # Scan Docker
    if ($Options.docker) {
        $dockerImages = Get-DockerImages
        foreach ($img in $dockerImages) {
            $manifest.dockerImages += @{
                image = $img.image
                id = $img.id
                size = $img.size
            }
        }
    }
    
    # Scan Databases
    if ($Options.databases) {
        $dbConnections = Get-DatabaseConnections
        if ($dbConnections.Count -gt 0) {
            $dbFile = Join-Path $bundleDir "db_connections.json"
            $dbConnections | ConvertTo-Json -Depth 10 | Out-File $dbFile -Encoding UTF8
            $manifest.dbConnections = "db_connections.json"
        }
    }
    
    # Scan Environment
    if ($Options.environment) {
        $pathEntries = Get-SystemPath
        $manifest.pathEntries = $pathEntries
        
        $envVars = Get-EnvironmentVariables
        $manifest.envVars = $envVars
    }
    
    # Save manifest
    $manifestFile = Join-Path $bundleDir "manifest.json"
    $manifest | ConvertTo-Json -Depth 10 | Out-File $manifestFile -Encoding UTF8
    
    # Create ZIP bundle
    Emit-Status -StepId "create-bundle" -State "running" -Message "Creating bundle archive..."
    
    $outputPath = Join-Path ([Environment]::GetFolderPath("MyDocuments")) "BuildSmith-Bundle-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    
    # Use .NET to create ZIP
    Add-Type -Assembly System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($bundleDir, $outputPath)
    
    # Clean up temp directory
    Remove-Item $bundleDir -Recurse -Force
    
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Emit-Log -StepId "create-bundle" -Level "success" -Text "Bundle created: $outputPath"
    Emit-Result -StepId "create-bundle" -State "success" -Duration $duration
    
    Emit-Complete -Outcome "success" -Duration $duration
}
catch {
    $duration = ((Get-Date) - $startTime).TotalSeconds
    Emit-Log -StepId "scan" -Level "error" -Text "Scan failed: $($_.Exception.Message)"
    Emit-Complete -Outcome "failed" -Duration $duration
}
