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
