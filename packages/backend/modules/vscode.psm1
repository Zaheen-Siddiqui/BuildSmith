# BuildSmith Backend - VS Code Module
# Handles VS Code profile and extension operations

Import-Module "$PSScriptRoot/common.psm1" -Force

function Get-VSCodeProfiles {
    <#
    .SYNOPSIS
        Scan VS Code profiles and extensions
    #>
    param()
    
    $stepId = "scan-vscode"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Scanning VS Code profiles..."
        Emit-Log -StepId $stepId -Level "info" -Text "Checking VS Code installation..."
        
        if (-not (Test-CommandExists "code")) {
            Emit-Log -StepId $stepId -Level "warn" -Text "VS Code not installed"
            Emit-Result -StepId $stepId -State "skipped"
            return $null
        }
        
        # Get installed extensions
        Emit-Log -StepId $stepId -Level "info" -Text "Listing installed extensions..."
        $extensions = code --list-extensions
        
        Emit-Log -StepId $stepId -Level "info" -Text "Found $($extensions.Count) extensions"
        
        # Get settings path
        $settingsPath = "$env:APPDATA\Code\User\settings.json"
        $keybindingsPath = "$env:APPDATA\Code\User\keybindings.json"
        
        $profile = @{
            extensions = $extensions
            hasSettings = Test-Path $settingsPath
            hasKeybindings = Test-Path $keybindingsPath
        }
        
        Emit-Result -StepId $stepId -State "success" -Duration 3
        return $profile
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error scanning VS Code: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $null
    }
}

function Export-VSCodeProfile {
    <#
    .SYNOPSIS
        Export VS Code profile to JSON file
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    
    $stepId = "export-vscode"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Exporting VS Code profile..."
        
        $profile = Get-VSCodeProfiles
        
        if ($profile) {
            $profile | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8
            Emit-Log -StepId $stepId -Level "success" -Text "Profile exported to $OutputPath"
            Emit-Result -StepId $stepId -State "success" -Duration 2
            return $true
        }
        else {
            Emit-Result -StepId $stepId -State "skipped"
            return $false
        }
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error exporting profile: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Install-VSCodeExtensions {
    <#
    .SYNOPSIS
        Install VS Code extensions from list
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$Extensions
    )
    
    $stepId = "install-vscode-extensions"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Installing VS Code extensions..."
        Emit-Log -StepId $stepId -Level "info" -Text "Installing $($Extensions.Count) extensions..."
        
        $installed = 0
        $failed = 0
        
        foreach ($ext in $Extensions) {
            if (Test-AbortRequested) {
                Emit-Log -StepId $stepId -Level "warn" -Text "Installation aborted"
                break
            }
            
            Emit-Log -StepId $stepId -Level "info" -Text "Installing $ext..."
            Emit-Progress -StepId $stepId -Current $installed -Total $Extensions.Count -Unit "extensions"
            
            $process = Start-Process -FilePath "code" -ArgumentList "--install-extension", $ext, "--force" -NoNewWindow -Wait -PassThru
            
            if ($process.ExitCode -eq 0) {
                $installed++
                Emit-Log -StepId $stepId -Level "success" -Text "Installed $ext"
            }
            else {
                $failed++
                Emit-Log -StepId $stepId -Level "error" -Text "Failed to install $ext"
            }
        }
        
        Emit-Log -StepId $stepId -Level "info" -Text "Installed: $installed, Failed: $failed"
        
        if ($failed -eq 0) {
            Emit-Result -StepId $stepId -State "success" -Duration 60
        }
        else {
            Emit-Result -StepId $stepId -State "warning" -Duration 60
        }
        
        return $failed -eq 0
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error installing extensions: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

Export-ModuleMember -Function Get-VSCodeProfiles, Export-VSCodeProfile, Install-VSCodeExtensions
