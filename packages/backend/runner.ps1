# BuildSmith Backend Runner
# Main entry point for all backend operations
# Reads JSON commands from stdin, executes them, writes JSON events to stdout

param()

$ErrorActionPreference = "Continue"
$WarningPreference = "SilentlyContinue"
$global:ABORT_REQUESTED = $false

# Load common functions
. "$PSScriptRoot/common.ps1"

# Log startup
Emit-Log -StepId "runner" -Level "info" -Text "BuildSmith backend runner started"
Emit-Log -StepId "runner" -Level "info" -Text "PowerShell version: $($PSVersionTable.PSVersion)"
Emit-Log -StepId "runner" -Level "info" -Text "OS: $([Environment]::OSVersion.VersionString)"

# Main command loop - read from stdin
while ($true) {
    try {
        # Read line from stdin
        $line = [Console]::In.ReadLine()
        
        # Exit if stdin closed
        if ($null -eq $line) {
            Emit-Log -StepId "runner" -Level "info" -Text "Stdin closed, exiting"
            break
        }
        
        # Skip empty lines
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        
        # Parse JSON command
        try {
            $command = $line | ConvertFrom-Json
        }
        catch {
            Emit-Log -StepId "runner" -Level "error" -Text "Invalid JSON: $line"
            continue
        }
        
        # Process command
        Emit-Log -StepId "runner" -Level "debug" -Text "Processing command: $($command.cmd)"
        
        switch ($command.cmd) {
            "startScan" {
                Emit-Log -StepId "runner" -Level "info" -Text "Starting scan operation"
                
                # Convert options from PSCustomObject to hashtable
                $options = @{}
                $command.options.PSObject.Properties | ForEach-Object {
                    $options[$_.Name] = $_.Value
                }
                
                # Run scan script
                & "$PSScriptRoot/scan.ps1" -Options $options
            }
            
            "startSetup" {
                Emit-Log -StepId "runner" -Level "info" -Text "Starting setup operation"
                
                # Clear any previous abort flag
                $global:ABORT_REQUESTED = $false
                
                # Convert options from PSCustomObject to hashtable
                $options = @{}
                if ($command.options) {
                    $command.options.PSObject.Properties | ForEach-Object {
                        $options[$_.Name] = $_.Value
                    }
                }
                
                # Run setup script
                & "$PSScriptRoot/setup.ps1" `
                    -BundlePath $command.bundlePath `
                    -SelectedItems $command.selectedItems `
                    -Options $options
            }
            
            "abort" {
                Emit-Log -StepId "runner" -Level "warn" -Text "Abort requested"
                $global:ABORT_REQUESTED = $true
            }
            
            "resume" {
                Emit-Log -StepId "runner" -Level "info" -Text "Resume requested for step: $($command.stepId)"
                $global:ABORT_REQUESTED = $false
                # In real implementation, resume logic would go here
                Emit-Log -StepId $command.stepId -Level "info" -Text "Resuming..."
            }
            
            "retryStep" {
                Emit-Log -StepId "runner" -Level "info" -Text "Retry requested for step: $($command.stepId)"
                # In real implementation, retry logic would go here
                Emit-Log -StepId $command.stepId -Level "info" -Text "Retrying..."
            }
            
            "scanVSCode" {
                Emit-Log -StepId "scan-vscode" -Level "info" -Text "Scanning VS Code profiles and extensions"
                
                # Load VS Code scanner module
                Import-Module "$PSScriptRoot\modules\vscode.psm1" -Force
                
                # Run VS Code scan
                $result = Get-VSCodeProfiles
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-vscode" -State "success" -Data $result
            }
            
            "scanDocker" {
                Emit-Log -StepId "scan-docker" -Level "info" -Text "Scanning Docker images"
                
                # Load Docker scanner module
                Import-Module "$PSScriptRoot\modules\docker.psm1" -Force
                
                # Run Docker scan
                $result = Get-DockerImages
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-docker" -State "success" -Data $result
            }
            
            "scanDatabase" {
                Emit-Log -StepId "scan-database" -Level "info" -Text "Scanning database connections"
                
                # Load Database scanner module  
                Import-Module "$PSScriptRoot\modules\db.psm1" -Force
                
                # Run database scan
                $result = Get-DatabaseConnections
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-database" -State "success" -Data $result
            }
            
            "createBundle" {
                Emit-Log -StepId "create-bundle" -Level "info" -Text "Creating bundle from selected items"
                
                # Load bundle creation module
                Import-Module "$PSScriptRoot\modules\Bundle-Creator.psm1" -Force
                
                # Convert command properties to hashtable
                $options = @{
                    selectedVSCodeProfiles = $command.selectedVSCodeProfiles
                    selectedDockerImages = $command.selectedDockerImages
                    selectedDatabases = $command.selectedDatabases
                    includeDevOps = $command.includeDevOps
                    includeEnvironment = $command.includeEnvironment
                    includePackages = $command.includePackages
                    includeSecrets = $command.includeSecrets
                    encryptionPassphrase = $command.encryptionPassphrase
                }
                
                # Create bundle
                $result = New-Bundle @options
                
                # Emit result event
                Emit-Event -Type "result" -StepId "create-bundle" -State "success" -Data $result
            }
            
            "checkForUpdates" {
                Emit-Log -StepId "runner" -Level "info" -Text "Checking for updates (channel: $($command.channel))"
                # Stub - real implementation would check GitHub releases
                Emit-Log -StepId "check-updates" -Level "info" -Text "No updates available"
            }
            
            "decryptSecrets" {
                Emit-Log -StepId "runner" -Level "info" -Text "Decrypting secrets from: $($command.filePath)"
                # Stub - real implementation would use GPG
                Emit-Log -StepId "decrypt-secrets" -Level "success" -Text "Secrets decrypted"
            }
            
            default {
                Emit-Log -StepId "runner" -Level "error" -Text "Unknown command: $($command.cmd)"
            }
        }
        
        # Reset abort flag after each command completes
        if ($command.cmd -ne "abort") {
            $global:ABORT_REQUESTED = $false
        }
    }
    catch {
        # Log any unexpected errors
        Emit-Log -StepId "runner" -Level "error" -Text "Unexpected error: $($_.Exception.Message)"
        Emit-Log -StepId "runner" -Level "error" -Text "Stack trace: $($_.ScriptStackTrace)"
    }
}

# Cleanup on exit
Emit-Log -StepId "runner" -Level "info" -Text "BuildSmith backend runner stopped"
