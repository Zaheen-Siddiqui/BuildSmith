# BuildSmith Backend - Environment Module
# Handles PATH and environment variable operations

Import-Module "$PSScriptRoot/common.psm1" -Force

function Get-SystemPath {
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
