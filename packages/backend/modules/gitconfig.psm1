# BuildSmith Backend - Git Configuration Module
# Handles git configuration capture and restore

. "$PSScriptRoot/../common.ps1"

<#
.SYNOPSIS
Gets current git global configuration

.RETURNS
Hashtable with git config settings
#>
function Get-GitConfiguration {
    try {
        # Check if git is available
        $gitCmd = Get-Command git -ErrorAction SilentlyContinue
        if (-not $gitCmd) {
            return @{
                success = $false
                error = "Git not found"
            }
        }
        
        # Get all global config
        $gitConfig = git config --global --list | Out-String
        
        $config = @{
            success = $true
            settings = @{}
        }
        
        # Parse config lines
        $gitConfig -split "`n" | Where-Object { $_ -ne '' } | ForEach-Object {
            if ($_ -match '^(.+?)=(.+)$') {
                $key = $matches[1]
                $value = $matches[2]
                $config.settings[$key] = $value
            }
        }
        
        return $config
    }
    catch {
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
Sets git global configuration from data

.PARAMETER ConfigData
Hashtable containing git config key-value pairs

.RETURNS
Hashtable with results
#>
function Set-GitConfiguration {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$ConfigData
    )
    
    Emit-Status -StepId "set-git-config" -State "running" -Message "Applying git configuration..."
    
    $results = @{
        success = $true
        applied = 0
        failed = @()
    }
    
    try {
        # Check if git is available
        $gitCmd = Get-Command git -ErrorAction SilentlyContinue
        if (-not $gitCmd) {
            Emit-Log -StepId "set-git-config" -Level "error" -Text "Git not found, cannot apply config"
            $results.success = $false
            return $results
        }
        
        Emit-Log -StepId "set-git-config" -Level "info" -Text "Applying $($ConfigData.Count) git config settings..."
        
        foreach ($entry in $ConfigData.GetEnumerator()) {
            $key = $entry.Key
            $value = $entry.Value
            
            try {
                # Set config using git config --global
                $result = git config --global $key "$value" 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "set-git-config" -Level "success" -Text "$key = $value"
                    $results.applied++
                } else {
                    Emit-Log -StepId "set-git-config" -Level "warning" -Text "Failed to set $key : $result"
                    $results.failed += $key
                }
            }
            catch {
                Emit-Log -StepId "set-git-config" -Level "error" -Text "Error setting $key : $($_.Exception.Message)"
                $results.failed += $key
                $results.success = $false
            }
        }
        
        Emit-Log -StepId "set-git-config" -Level "success" -Text "Applied $($results.applied) git config settings"
        Emit-Result -StepId "set-git-config" -State "success" -Duration 1
        
        return $results
    }
    catch {
        Emit-Log -StepId "set-git-config" -Level "error" -Text "Git config setup failed: $($_.Exception.Message)"
        Emit-Result -StepId "set-git-config" -State "failed" -Duration 1
        
        $results.success = $false
        return $results
    }
}

<#
.SYNOPSIS
Exports git configuration to JSON file

.PARAMETER OutputPath
Path to save the git config JSON file

.RETURNS
Boolean indicating success
#>
function Export-GitConfiguration {
    param(
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    
    try {
        $config = Get-GitConfiguration
        
        if (-not $config.success) {
            Write-Warning "Failed to get git configuration: $($config.error)"
            return $false
        }
        
        # Create output directory if needed
        $outputDir = Split-Path $OutputPath -Parent
        if (-not (Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }
        
        # Save to JSON
        $config.settings | ConvertTo-Json -Depth 10 | Set-Content $OutputPath
        
        Write-Host "Git configuration exported to: $OutputPath"
        return $true
    }
    catch {
        Write-Warning "Failed to export git configuration: $($_.Exception.Message)"
        return $false
    }
}

Export-ModuleMember -Function @(
    'Get-GitConfiguration',
    'Set-GitConfiguration',
    'Export-GitConfiguration'
)
