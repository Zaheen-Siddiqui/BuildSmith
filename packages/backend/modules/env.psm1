# BuildSmith Backend - Environment Module
# Handles PATH and environment variable operations

. "$PSScriptRoot/../common.ps1"

function Get-EnvironmentVariables {
    <#
    .SYNOPSIS
        Scan system and user environment variables
    .DESCRIPTION
        Retrieves environment variables from system and user scope,
        filtering out sensitive data like passwords, tokens, and keys
    .OUTPUTS
        Array of hashtables with variable name, value, and scope
    #>
    
    try {
        $variables = @()
        
        # Sensitive keywords to filter out
        $sensitiveKeywords = @(
            'PASSWORD', 'PWD', 'SECRET', 'TOKEN', 'KEY', 'API_KEY', 
            'AUTH', 'CREDENTIAL', 'PRIVATE', 'CLERK', 'JWT', 
            'RAZORPAY', 'CLOUDINARY', 'EMAILJS'
        )
        
        Emit-Log -StepId "scan-env" -Level "info" -Text "Scanning environment variables..."
        
        # Get system environment variables
        $systemVars = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::Machine)
        foreach ($key in $systemVars.Keys) {
            $isSensitive = $false
            foreach ($keyword in $sensitiveKeywords) {
                if ($key -like "*$keyword*") {
                    $isSensitive = $true
                    break
                }
            }
            
            # Skip sensitive variables
            if (-not $isSensitive) {
                $variables += @{
                    id = "system-$key"
                    name = $key
                    value = $systemVars[$key]
                    scope = "system"
                    type = "environment"
                }
            }
        }
        
        # Get user environment variables
        $userVars = [Environment]::GetEnvironmentVariables([EnvironmentVariableTarget]::User)
        foreach ($key in $userVars.Keys) {
            $isSensitive = $false
            foreach ($keyword in $sensitiveKeywords) {
                if ($key -like "*$keyword*") {
                    $isSensitive = $true
                    break
                }
            }
            
            # Skip sensitive variables and PATH (handled separately)
            if (-not $isSensitive -and $key -ne "Path") {
                $variables += @{
                    id = "user-$key"
                    name = $key
                    value = $userVars[$key]
                    scope = "user"
                    type = "environment"
                }
            }
        }
        
        Emit-Log -StepId "scan-env" -Level "success" -Text "Found $($variables.Count) environment variables (sensitive data filtered)"
        
        return $variables
    }
    catch {
        Emit-Log -StepId "scan-env" -Level "error" -Text "Error scanning environment variables: $($_.Exception.Message)"
        return @()
    }
}

function Get-SystemPath {
    <#
    .SYNOPSIS
        Scan system and user PATH entries
    .DESCRIPTION
        Retrieves PATH entries from both system and user environment variables
    .OUTPUTS
        Array of hashtables with path entry and scope
    #>
    
    try {
        $pathEntries = @()
        
        Emit-Log -StepId "scan-path" -Level "info" -Text "Scanning PATH entries..."
        
        # Get system PATH
        $systemPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
        if ($systemPath) {
            $systemPath -split ';' | Where-Object { $_ -and (Test-Path $_ -ErrorAction SilentlyContinue) } | ForEach-Object {
                $pathEntries += @{
                    id = "system-path-" + ($_ -replace '[^a-zA-Z0-9]', '-')
                    path = $_
                    scope = "system"
                    type = "path"
                    exists = $true
                }
            }
        }
        
        # Get user PATH
        $userPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)
        if ($userPath) {
            $userPath -split ';' | Where-Object { $_ -and (Test-Path $_ -ErrorAction SilentlyContinue) } | ForEach-Object {
                # Only add if not already in system PATH
                $existsInSystem = $pathEntries | Where-Object { $_.path -eq $_ }
                if (-not $existsInSystem) {
                    $pathEntries += @{
                        id = "user-path-" + ($_ -replace '[^a-zA-Z0-9]', '-')
                        path = $_
                        scope = "user"
                        type = "path"
                        exists = $true
                    }
                }
            }
        }
        
        Emit-Log -StepId "scan-path" -Level "success" -Text "Found $($pathEntries.Count) PATH entries"
        
        return $pathEntries
    }
    catch {
        Emit-Log -StepId "scan-path" -Level "error" -Text "Error scanning PATH: $($_.Exception.Message)"
        return @()
    }
}

function Set-EnvironmentVariable {
    <#
    .SYNOPSIS
        Set an environment variable on the target machine
    .DESCRIPTION
        Sets environment variables in system or user scope.
        Requires administrator privileges for system scope.
    .PARAMETER Name
        The name of the environment variable
    .PARAMETER Value
        The value to set
    .PARAMETER Scope
        The scope (system or user)
    .OUTPUTS
        Hashtable with success status
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$true)]
        [string]$Value,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("system", "user")]
        [string]$Scope = "user"
    )
    
    try {
        Emit-Log -StepId "setup-env" -Level "info" -Text "Setting environment variable $Name ($Scope scope)..."
        
        # Check if already set with the same value
        $target = if ($Scope -eq "system") { [EnvironmentVariableTarget]::Machine } else { [EnvironmentVariableTarget]::User }
        $existing = [Environment]::GetEnvironmentVariable($Name, $target)
        
        if ($existing -eq $Value) {
            Emit-Log -StepId "setup-env" -Level "info" -Text "$Name is already set to $Value"
            return @{
                success = $true
                alreadySet = $true
            }
        }
        
        # Set the environment variable
        [Environment]::SetEnvironmentVariable($Name, $Value, $target)
        
        Emit-Log -StepId "setup-env" -Level "success" -Text "Successfully set $Name = $Value ($Scope scope)"
        
        return @{
            success = $true
            name = $Name
            value = $Value
            scope = $Scope
        }
    }
    catch {
        Emit-Log -StepId "setup-env" -Level "error" -Text "Failed to set ${Name}: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Add-PathEntry {
    <#
    .SYNOPSIS
        Add an entry to the PATH environment variable
    .DESCRIPTION
        Adds a directory to the PATH without creating duplicates.
        Supports both system and user scope.
    .PARAMETER Path
        The directory path to add
    .PARAMETER Scope
        The scope (system or user)
    .OUTPUTS
        Hashtable with success status
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Path,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("system", "user")]
        [string]$Scope = "user"
    )
    
    try {
        Emit-Log -StepId "setup-path" -Level "info" -Text "Adding PATH entry: $Path ($Scope scope)..."
        
        # Get current PATH
        $target = if ($Scope -eq "system") { [EnvironmentVariableTarget]::Machine } else { [EnvironmentVariableTarget]::User }
        $currentPath = [Environment]::GetEnvironmentVariable("Path", $target)
        
        # Check if already in PATH
        $pathEntries = $currentPath -split ';' | Where-Object { $_ }
        if ($pathEntries -contains $Path) {
            Emit-Log -StepId "setup-path" -Level "info" -Text "$Path is already in PATH"
            return @{
                success = $true
                alreadyExists = $true
            }
        }
        
        # Add to PATH
        $newPath = if ($currentPath) { "$currentPath;$Path" } else { $Path }
        [Environment]::SetEnvironmentVariable("Path", $newPath, $target)
        
        Emit-Log -StepId "setup-path" -Level "success" -Text "Successfully added $Path to PATH ($Scope scope)"
        
        return @{
            success = $true
            path = $Path
            scope = $Scope
        }
    }
    catch {
        Emit-Log -StepId "setup-path" -Level "error" -Text "Failed to add PATH entry: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

Export-ModuleMember -Function Get-EnvironmentVariables, Get-SystemPath, Set-EnvironmentVariable, Add-PathEntry