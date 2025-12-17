# BuildSmith Backend - Environment Module  
# Handles environment variables and PATH modifications

. "$PSScriptRoot/../common.ps1"

<#
.SYNOPSIS
Adds a directory to system PATH permanently

.PARAMETER Directory
Directory to add to PATH

.PARAMETER Scope
Scope for PATH modification (User or Machine). Default: User

.RETURNS
Boolean indicating success
#>
function Add-ToSystemPath {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Directory,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet('User', 'Machine')]
        [string]$Scope = 'User'
    )
    
    try {
        # Normalize path
        $Directory = [System.IO.Path]::GetFullPath($Directory)
        
        if (-not (Test-Path $Directory)) {
            Emit-Log -StepId "update-path" -Level "warning" -Text "Directory does not exist: $Directory"
            return $false
        }
        
        # Get current PATH
        $currentPath = [Environment]::GetEnvironmentVariable('Path', $Scope)
        
        # Check if already in PATH
        $pathEntries = $currentPath -split ';' | Where-Object { $_ -ne '' }
        $normalizedEntries = $pathEntries | ForEach-Object { [System.IO.Path]::GetFullPath($_) }
        
        if ($normalizedEntries -contains $Directory) {
            Emit-Log -StepId "update-path" -Level "info" -Text "Already in PATH: $Directory"
            return $true
        }
        
        # Add to PATH
        $newPath = $currentPath.TrimEnd(';') + ';' + $Directory
        [Environment]::SetEnvironmentVariable('Path', $newPath, $Scope)
        
        # Also update current session
        $env:Path = $env:Path.TrimEnd(';') + ';' + $Directory
        
        Emit-Log -StepId "update-path" -Level "success" -Text "Added to PATH ($Scope): $Directory"
        return $true
    }
    catch {
        Emit-Log -StepId "update-path" -Level "error" -Text "Failed to update PATH: $($_.Exception.Message)"
        return $false
    }
}

<#
.SYNOPSIS
Sets an environment variable permanently

.PARAMETER Name
Variable name

.PARAMETER Value
Variable value

.PARAMETER Scope
Scope for variable (User or Machine). Default: User

.RETURNS
Boolean indicating success
#>
function Set-EnvironmentVariable {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$true)]
        [string]$Value,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet('User', 'Machine')]
        [string]$Scope = 'User'
    )
    
    try {
        # Set environment variable
        [Environment]::SetEnvironmentVariable($Name, $Value, $Scope)
        
        # Also update current session
        Set-Item -Path "env:$Name" -Value $Value
        
        Emit-Log -StepId "set-env" -Level "success" -Text "Set $Name=$Value ($Scope)"
        return $true
    }
    catch {
        Emit-Log -StepId "set-env" -Level "error" -Text "Failed to set $Name : $($_.Exception.Message)"
        return $false
    }
}

<#
.SYNOPSIS
Applies environment variables from environment.json

.PARAMETER EnvironmentData
Hashtable or PSObject containing environment variables

.PARAMETER Scope
Scope for variables (User or Machine). Default: User

.RETURNS
Hashtable with results
#>
function Set-EnvironmentFromData {
    param(
        [Parameter(Mandatory=$true)]
        $EnvironmentData,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet('User', 'Machine')]
        [string]$Scope = 'User'
    )
    
    Emit-Status -StepId "set-env" -State "running" -Message "Applying environment variables..."
    
    $results = @{
        success = $true
        variablesSet = 0
        pathEntriesAdded = 0
        failed = @()
    }
    
    try {
        # Process regular environment variables (not PATH)
        foreach ($prop in $EnvironmentData.PSObject.Properties) {
            if ($prop.Name -eq 'PATH') {
                continue # Handle PATH separately
            }
            
            $success = Set-EnvironmentVariable -Name $prop.Name -Value $prop.Value -Scope $Scope
            
            if ($success) {
                $results.variablesSet++
            } else {
                $results.failed += $prop.Name
                $results.success = $false
            }
        }
        
        # Process PATH entries
        if ($EnvironmentData.PATH) {
            $pathEntries = $EnvironmentData.PATH -split ';' | Where-Object { $_ -ne '' }
            
            Emit-Log -StepId "set-env" -Level "info" -Text "Processing $($pathEntries.Count) PATH entries..."
            
            foreach ($entry in $pathEntries) {
                # Expand environment variables in path (e.g., %USERPROFILE%)
                $expandedEntry = [Environment]::ExpandEnvironmentVariables($entry)
                
                $success = Add-ToSystemPath -Directory $expandedEntry -Scope $Scope
                
                if ($success) {
                    $results.pathEntriesAdded++
                } else {
                    $results.failed += "PATH:$entry"
                    # Don't fail entire operation for missing PATH entries
                }
            }
        }
        
        Emit-Log -StepId "set-env" -Level "success" -Text "Applied $($results.variablesSet) variables and $($results.pathEntriesAdded) PATH entries"
        Emit-Result -StepId "set-env" -State "success" -Duration 2
        
        return $results
    }
    catch {
        Emit-Log -StepId "set-env" -Level "error" -Text "Environment setup failed: $($_.Exception.Message)"
        Emit-Result -StepId "set-env" -State "failed" -Duration 2
        
        $results.success = $false
        return $results
    }
}

Export-ModuleMember -Function @(
    'Add-ToSystemPath',
    'Set-EnvironmentVariable',
    'Set-EnvironmentFromData'
)
