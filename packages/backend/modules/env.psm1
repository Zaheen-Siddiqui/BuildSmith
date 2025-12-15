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

function Add-ToPath {
    <#
    .SYNOPSIS
        Get current system PATH entries
    #>
    param()
    
    $stepId = "scan-path"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Scanning PATH entries..."
        
        $pathEntries = [Environment]::GetEnvironmentVariable("Path", "Machine") -split ';' | Where-Object { $_ }
        
        Emit-Log -StepId $stepId -Level "info" -Text "Found $($pathEntries.Count) PATH entries"
        Emit-Result -StepId $stepId -State "success" -Duration 1
        
        return $pathEntries
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error scanning PATH: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return @()
    }
}

function Add-ToPath {
    <#
    .SYNOPSIS
        Add directory to system PATH
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Directory
    )
    
    $stepId = "add-path-$Directory"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Adding to PATH: $Directory"
        
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        
        if ($currentPath -notlike "*$Directory*") {
            $newPath = "$currentPath;$Directory"
            [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
            
            Emit-Log -StepId $stepId -Level "success" -Text "Added to PATH: $Directory"
            Emit-Result -StepId $stepId -State "success" -Duration 1
            return $true
        }
        else {
            Emit-Log -StepId $stepId -Level "info" -Text "Already in PATH: $Directory"
            Emit-Result -StepId $stepId -State "skipped"
            return $true
        }
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error adding to PATH: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Get-EnvironmentVariables {
    <#
    .SYNOPSIS
        Get all environment variables
    #>
    param()
    
    $stepId = "scan-env-vars"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Scanning environment variables..."
        
        $machineVars = [Environment]::GetEnvironmentVariables("Machine")
        
        Emit-Log -StepId $stepId -Level "info" -Text "Found $($machineVars.Count) system environment variables"
        Emit-Result -StepId $stepId -State "success" -Duration 1
        
        return $machineVars
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error scanning environment: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return @{}
    }
}

function Set-EnvironmentVariable {
    <#
    .SYNOPSIS
        Set system environment variable
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$true)]
        [string]$Value
    )
    
    $stepId = "set-env-$Name"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Setting environment variable: $Name"
        
        [Environment]::SetEnvironmentVariable($Name, $Value, "Machine")
        
        Emit-Log -StepId $stepId -Level "success" -Text "Set $Name = $Value"
        Emit-Result -StepId $stepId -State "success" -Duration 1
        
        return $true
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error setting variable: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

Export-ModuleMember -Function Get-SystemPath, Add-ToPath, Get-EnvironmentVariables, Set-EnvironmentVariable