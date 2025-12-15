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
                $profileData = Get-VSCodeProfiles
                
                # Format result to match frontend expectations
                $result = @{
                    type = "vscode-scan-result"
                    profiles = @(
                        @{
                            id = "default"
                            name = "Default"
                            extensions = @($profileData.extensions | ForEach-Object {
                                @{
                                    name = $_.id
                                    version = $_.version
                                }
                            })
                            settingsCount = if ($profileData.settings) { ($profileData.settings.PSObject.Properties | Measure-Object).Count } else { 0 }
                            keybindingsCount = if ($profileData.keybindings) { ($profileData.keybindings | Measure-Object).Count } else { 0 }
                        }
                    )
                }
                
                Emit-Log -StepId "scan-vscode" -Level "success" -Text "Found $($profileData.extensions.Count) extensions"
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-vscode" -State "success" -Data $result
            }
            
            "scanDocker" {
                Emit-Log -StepId "scan-docker" -Level "info" -Text "Scanning Docker images"
                
                # Load Docker scanner module
                Import-Module "$PSScriptRoot\modules\docker.psm1" -Force
                
                # Run Docker scan
                $dockerData = Get-DockerImages
                
                # Format result to match frontend expectations
                $result = @{
                    type = "docker-scan-result"
                    images = @($dockerData | ForEach-Object {
                        # Parse image name and tag
                        $imageParts = $_.image -split ':'
                        $repository = $imageParts[0]
                        $tag = if ($imageParts.Count -gt 1) { $imageParts[1] } else { "latest" }
                        
                        # Handle <none> repository or tag
                        if ($repository -eq "<none>" -or [string]::IsNullOrWhiteSpace($repository)) {
                            $repository = "<unnamed-image>"
                        }
                        if ($tag -eq "<none>" -or [string]::IsNullOrWhiteSpace($tag)) {
                            $tag = "<no-tag>"
                        }
                        
                        @{
                            id = $_.id  # Docker image ID is always unique
                            repository = $repository
                            tag = $tag
                            size = $_.size
                            created = "Unknown"
                        }
                    })
                }
                
                Emit-Log -StepId "scan-docker" -Level "success" -Text "Found $($dockerData.Count) Docker images"
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-docker" -State "success" -Data $result
            }
            
            "scanDatabase" {
                Emit-Log -StepId "scan-database" -Level "info" -Text "Scanning database connections"
                
                # Load Database scanner module  
                Import-Module "$PSScriptRoot\modules\db.psm1" -Force
                
                # Run database scan
                $dbData = Get-DatabaseConnections
                
                # Format result to match frontend expectations
                $result = @{
                    type = "database-scan-result"
                    connections = @($dbData | ForEach-Object {
                        @{
                            id = "$($_.type)-$($_.host)-$($_.port)"
                            name = if ($_.name) { $_.name } else { "$($_.host):$($_.port)" }
                            type = $_.type
                            host = $_.host
                            port = [int]$_.port
                            database = if ($_.database) { $_.database } else { "" }
                            source = $_.source
                        }
                    })
                }
                
                Emit-Log -StepId "scan-database" -Level "success" -Text "Found $($dbData.Count) database connections"
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-database" -State "success" -Data $result
            }
            
            "scanDevTools" {
                Emit-Log -StepId "scan-devtools" -Level "info" -Text "Scanning for DevOps tools"
                
                # Load DevTools scanner module
                Import-Module "$PSScriptRoot\modules\devtools.psm1" -Force
                
                # Run DevTools scan (filter out log output - only keep actual tool objects)
                $devToolsData = Get-InstalledDevTools | Where-Object { $_.type -eq 'devtool' }
                
                # Format result to match frontend expectations
                $result = @{
                    type = "devtools-scan-result"
                    tools = @($devToolsData | ForEach-Object {
                        @{
                            id = $_.id
                            name = $_.name
                            command = $_.command
                            version = $_.version
                            path = $_.path
                        }
                    })
                }
                
                Emit-Log -StepId "scan-devtools" -Level "success" -Text "After filtering: Found $($devToolsData.Count) DevOps tools"
                
                # Debug: Log first tool data
                if ($devToolsData.Count -gt 0) {
                    $firstTool = $devToolsData[0]
                    Emit-Log -StepId "scan-devtools" -Level "debug" -Text "First tool - id: $($firstTool.id), name: $($firstTool.name), command: $($firstTool.command)"
                }
                
                # Debug: Log all tool IDs
                $allIds = $devToolsData | ForEach-Object { $_.id }
                Emit-Log -StepId "scan-devtools" -Level "debug" -Text "All tool IDs: $($allIds -join ', ')"
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-devtools" -State "success" -Data $result
            }
            
            "scanEnvironment" {
                Emit-Log -StepId "scan-environment" -Level "info" -Text "Scanning environment variables and PATH"
                
                # Load Environment scanner module
                Import-Module "$PSScriptRoot\modules\env.psm1" -Force
                
                # Run environment and PATH scan (filter out log output - only keep actual data objects)
                $envVars = Get-EnvironmentVariables | Where-Object { $_.type -eq 'environment' }
                $pathEntries = Get-SystemPath | Where-Object { $_.type -eq 'path' }
                
                # Format result to match frontend expectations
                $result = @{
                    type = "environment-scan-result"
                    variables = @($envVars | ForEach-Object {
                        @{
                            id = $_.id
                            name = $_.name
                            value = $_.value
                            scope = $_.scope
                        }
                    })
                    pathEntries = @($pathEntries | ForEach-Object {
                        @{
                            id = $_.id
                            path = $_.path
                            scope = $_.scope
                            exists = $_.exists
                        }
                    })
                }
                
                Emit-Log -StepId "scan-environment" -Level "success" -Text "Found $($envVars.Count) environment variables and $($pathEntries.Count) PATH entries"
                
                # Debug: Log first items
                if ($envVars.Count -gt 0) {
                    $firstVar = $envVars[0]
                    Emit-Log -StepId "scan-environment" -Level "debug" -Text "First var - id: $($firstVar.id), name: $($firstVar.name), scope: $($firstVar.scope)"
                }
                if ($pathEntries.Count -gt 0) {
                    $firstPath = $pathEntries[0]
                    Emit-Log -StepId "scan-environment" -Level "debug" -Text "First path - id: $($firstPath.id), path: $($firstPath.path)"
                }
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-environment" -State "success" -Data $result
            }
            
            "scanPackages" {
                Emit-Log -StepId "scan-packages" -Level "info" -Text "Scanning installed packages"
                
                # Load Package scanner module
                Import-Module "$PSScriptRoot\modules\installers.psm1" -Force
                
                # Run packages scan (filter out log output - only keep actual package objects)
                $packagesData = Get-InstalledPackages | Where-Object { $_.type -eq 'package' }
                
                # Format result to match frontend expectations
                $result = @{
                    type = "packages-scan-result"
                    packages = @($packagesData | ForEach-Object {
                        @{
                            id = $_.id
                            name = $_.name
                            version = $_.version
                            manager = $_.manager
                        }
                    })
                }
                
                Emit-Log -StepId "scan-packages" -Level "success" -Text "Found $($packagesData.Count) packages"
                
                # Emit result event
                Emit-Event -Type "result" -StepId "scan-packages" -State "success" -Data $result
            }
            
            "setupDevTools" {
                Emit-Log -StepId "setup-devtools" -Level "info" -Text "Setting up DevOps tools"
                
                # Load devtools module
                Import-Module "$PSScriptRoot\modules\devtools.psm1" -Force
                
                $tools = $command.tools
                $results = @()
                $successCount = 0
                $failedCount = 0
                
                foreach ($tool in $tools) {
                    Emit-Log -StepId "setup-devtools" -Level "info" -Text "Installing $($tool.name)..."
                    
                    $result = Install-DevTool -Name $tool.name -Version $tool.version -Command $tool.command
                    
                    if ($result.success) {
                        $successCount++
                    } else {
                        $failedCount++
                    }
                    
                    $results += $result
                }
                
                $overallSuccess = $failedCount -eq 0
                
                Emit-Log -StepId "setup-devtools" -Level "success" -Text "Installed $successCount tools, $failedCount failed"
                
                # Emit result
                $resultData = @{
                    type = "setup-devtools-result"
                    success = $overallSuccess
                    results = $results
                    successCount = $successCount
                    failedCount = $failedCount
                }
                
                Emit-Event -Type "result" -StepId "setup-devtools" -State $(if ($overallSuccess) { "success" } else { "failed" }) -Data $resultData
            }
            
            "setupEnvironment" {
                Emit-Log -StepId "setup-environment" -Level "info" -Text "Setting up environment variables and PATH"
                
                # Load env module
                Import-Module "$PSScriptRoot\modules\env.psm1" -Force
                
                $variables = $command.variables
                $pathEntries = $command.pathEntries
                $results = @{
                    variables = @()
                    paths = @()
                }
                $successCount = 0
                $failedCount = 0
                
                # Set environment variables
                foreach ($var in $variables) {
                    Emit-Log -StepId "setup-environment" -Level "info" -Text "Setting environment variable $($var.name)..."
                    
                    $result = Set-EnvironmentVariable -Name $var.name -Value $var.value -Scope $var.scope
                    
                    if ($result.success) {
                        $successCount++
                    } else {
                        $failedCount++
                    }
                    
                    $results.variables += $result
                }
                
                # Add PATH entries
                foreach ($pathEntry in $pathEntries) {
                    Emit-Log -StepId "setup-environment" -Level "info" -Text "Adding PATH entry $($pathEntry.path)..."
                    
                    $result = Add-PathEntry -Path $pathEntry.path -Scope $pathEntry.scope
                    
                    if ($result.success) {
                        $successCount++
                    } else {
                        $failedCount++
                    }
                    
                    $results.paths += $result
                }
                
                $overallSuccess = $failedCount -eq 0
                
                Emit-Log -StepId "setup-environment" -Level "success" -Text "Set $successCount items, $failedCount failed"
                
                # Emit result
                $resultData = @{
                    type = "setup-environment-result"
                    success = $overallSuccess
                    results = $results
                    successCount = $successCount
                    failedCount = $failedCount
                }
                
                Emit-Event -Type "result" -StepId "setup-environment" -State $(if ($overallSuccess) { "success" } else { "failed" }) -Data $resultData
            }
            
            "setupPackages" {
                Emit-Log -StepId "setup-packages" -Level "info" -Text "Installing packages"
                
                # Load installers module
                Import-Module "$PSScriptRoot\modules\installers.psm1" -Force
                
                $packages = $command.packages
                $results = @()
                $successCount = 0
                $failedCount = 0
                
                foreach ($pkg in $packages) {
                    Emit-Log -StepId "setup-packages" -Level "info" -Text "Installing $($pkg.name) via $($pkg.manager)..."
                    
                    $result = Install-Package -Name $pkg.name -Manager $pkg.manager -Version $pkg.version
                    
                    if ($result.success) {
                        $successCount++
                    } else {
                        $failedCount++
                    }
                    
                    $results += $result
                }
                
                $overallSuccess = $failedCount -eq 0
                
                Emit-Log -StepId "setup-packages" -Level "success" -Text "Installed $successCount packages, $failedCount failed"
                
                # Emit result
                $resultData = @{
                    type = "setup-packages-result"
                    success = $overallSuccess
                    results = $results
                    successCount = $successCount
                    failedCount = $failedCount
                }
                
                Emit-Event -Type "result" -StepId "setup-packages" -State $(if ($overallSuccess) { "success" } else { "failed" }) -Data $resultData
            }
            
            "createBundle" {
                Emit-Log -StepId "create-bundle" -Level "info" -Text "Creating bundle from selected items"
                
                # Convert command properties to hashtable for scan.ps1
                $options = @{
                    includeSecrets = $command.includeSecrets
                    vscode = ($command.selectedVSCodeProfiles.Count -gt 0)
                    docker = ($command.selectedDockerImages.Count -gt 0)
                    databases = ($command.selectedDatabases.Count -gt 0)
                    devtools = $command.devtools
                    environment = $command.environment
                    packages = $command.packages
                }
                
                # Run scan.ps1 which handles bundle creation
                & "$PSScriptRoot/scan.ps1" -Options $options
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
