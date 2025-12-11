# BuildSmith Backend - VS Code Module
# Handles VS Code profile and extension operations

# Note: common.ps1 functions are loaded by parent scripts

function Get-VSCodePath {
    <#
    .SYNOPSIS
        Get VS Code installation path and user data directory
    #>
    
    $paths = @{
        exe = $null
        userDataDir = "$env:APPDATA\Code"
        settingsPath = "$env:APPDATA\Code\User\settings.json"
        keybindingsPath = "$env:APPDATA\Code\User\keybindings.json"
        extensionsPath = "$env:USERPROFILE\.vscode\extensions"
    }
    
    # Check if 'code' command is available
    $codeCmd = Get-Command "code" -ErrorAction SilentlyContinue
    if ($codeCmd) {
        $paths.exe = $codeCmd.Source
    }
    
    return $paths
}

function Export-VSCodeProfile {
    <#
    .SYNOPSIS
        Export VS Code profile including extensions, settings, and keybindings
    .PARAMETER OutputPath
        Path to save the profile JSON file
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$OutputPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "export-vscode"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Exporting VS Code profile..."
        Emit-Log -StepId $StepId -Level "info" -Text "Checking VS Code installation..."
        
        $paths = Get-VSCodePath
        
        if (-not $paths.exe) {
            Emit-Log -StepId $StepId -Level "warn" -Text "VS Code not found in PATH"
            Emit-Result -StepId $StepId -State "skipped"
            return $false
        }
        
        Emit-Log -StepId $StepId -Level "info" -Text "VS Code found: $($paths.exe)"
        Emit-Log -StepId $StepId -Level "info" -Text "Listing installed extensions..."
        
        # Get installed extensions
        $extensionsOutput = & code --list-extensions 2>&1
        $extensions = @($extensionsOutput | Where-Object { $_ -and $_ -notmatch "WARNING" })
        
        Emit-Log -StepId $StepId -Level "info" -Text "Found $($extensions.Count) extensions"
        
        # Read settings and keybindings if they exist
        $settings = $null
        $keybindings = $null
        
        if (Test-Path $paths.settingsPath) {
            $settings = Get-Content $paths.settingsPath -Raw
            Emit-Log -StepId $StepId -Level "info" -Text "Settings file found"
        }
        
        if (Test-Path $paths.keybindingsPath) {
            $keybindings = Get-Content $paths.keybindingsPath -Raw
            Emit-Log -StepId $StepId -Level "info" -Text "Keybindings file found"
        }
        
        # Create profile object
        $profile = @{
            version = "1.0"
            exportedAt = Get-Date -Format "o"
            extensions = $extensions
            settings = $settings
            keybindings = $keybindings
        }
        
        # Save to file
        $profile | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8
        
        Emit-Log -StepId $StepId -Level "success" -Text "Profile exported to $OutputPath"
        Emit-Result -StepId $StepId -State "success" -Duration 5
        return $true
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error exporting profile: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Import-VSCodeProfile {
    <#
    .SYNOPSIS
        Import VS Code profile including installing extensions and restoring settings
    .PARAMETER ProfilePath
        Path to the profile JSON file
    .PARAMETER StepId
        Step identifier for event emission
    .PARAMETER RestoreSettings
        Whether to restore settings.json and keybindings.json
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ProfilePath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "import-vscode",
        
        [Parameter(Mandatory=$false)]
        [bool]$RestoreSettings = $true
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Importing VS Code profile..."
        
        if (!(Test-Path $ProfilePath)) {
            throw "Profile file not found: $ProfilePath"
        }
        
        # Load profile
        $profile = Get-Content $ProfilePath -Raw | ConvertFrom-Json
        Emit-Log -StepId $StepId -Level "info" -Text "Profile exported at: $($profile.exportedAt)"
        
        $paths = Get-VSCodePath
        
        if (-not $paths.exe) {
            throw "VS Code not found. Please install VS Code first."
        }
        
        # Restore settings if requested
        if ($RestoreSettings) {
            if ($profile.settings) {
                Emit-Log -StepId $StepId -Level "info" -Text "Restoring settings.json..."
                
                # Ensure directory exists
                $userDir = Split-Path $paths.settingsPath -Parent
                if (!(Test-Path $userDir)) {
                    New-Item -ItemType Directory -Path $userDir -Force | Out-Null
                }
                
                $profile.settings | Out-File $paths.settingsPath -Encoding UTF8
                Emit-Log -StepId $StepId -Level "success" -Text "Settings restored"
            }
            
            if ($profile.keybindings) {
                Emit-Log -StepId $StepId -Level "info" -Text "Restoring keybindings.json..."
                $profile.keybindings | Out-File $paths.keybindingsPath -Encoding UTF8
                Emit-Log -StepId $StepId -Level "success" -Text "Keybindings restored"
            }
        }
        
        # Install extensions
        if ($profile.extensions -and $profile.extensions.Count -gt 0) {
            $success = Install-VSCodeExtensions -Extensions $profile.extensions -StepId "install-vscode-extensions"
            
            if ($success) {
                Emit-Result -StepId $StepId -State "success" -Duration 120
            }
            else {
                Emit-Result -StepId $StepId -State "warning" -Duration 120
            }
        }
        else {
            Emit-Log -StepId $StepId -Level "warn" -Text "No extensions to install"
            Emit-Result -StepId $StepId -State "success" -Duration 5
        }
        
        return $true
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error importing profile: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Install-VSCodeExtensions {
    <#
    .SYNOPSIS
        Install VS Code extensions from array
    .PARAMETER Extensions
        Array of extension IDs to install
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$Extensions,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "install-vscode-extensions"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Installing VS Code extensions..."
        Emit-Log -StepId $StepId -Level "info" -Text "Installing $($Extensions.Count) extensions..."
        
        $installed = 0
        $failed = 0
        $failedExtensions = @()
        
        for ($i = 0; $i < $Extensions.Count; $i++) {
            if (Test-AbortRequested) {
                Emit-Log -StepId $StepId -Level "warn" -Text "Installation aborted by user"
                break
            }
            
            $ext = $Extensions[$i]
            Emit-Log -StepId $StepId -Level "info" -Text "Installing: $ext"
            Emit-Progress -StepId $StepId -Current ($i + 1) -Total $Extensions.Count -Unit "extensions"
            
            try {
                # Run code --install-extension
                $process = Start-Process -FilePath "code" `
                    -ArgumentList "--install-extension", $ext, "--force" `
                    -NoNewWindow -Wait -PassThru `
                    -RedirectStandardOutput "$env:TEMP\vscode-install-$i.log" `
                    -RedirectStandardError "$env:TEMP\vscode-install-$i-err.log"
                
                if ($process.ExitCode -eq 0) {
                    $installed++
                    Emit-Log -StepId $StepId -Level "success" -Text "✓ $ext"
                }
                else {
                    $failed++
                    $failedExtensions += $ext
                    Emit-Log -StepId $StepId -Level "error" -Text "✗ $ext (exit code: $($process.ExitCode))"
                }
                
                # Cleanup temp logs
                Remove-Item "$env:TEMP\vscode-install-$i*.log" -Force -ErrorAction SilentlyContinue
            }
            catch {
                $failed++
                $failedExtensions += $ext
                Emit-Log -StepId $StepId -Level "error" -Text "✗ $ext - $($_.Exception.Message)"
            }
        }
        
        Emit-Log -StepId $StepId -Level "info" -Text "Installed: $installed | Failed: $failed"
        
        if ($failed -eq 0) {
            Emit-Result -StepId $StepId -State "success" -Duration 60
            return $true
        }
        elseif ($installed -gt 0) {
            Emit-Log -StepId $StepId -Level "warn" -Text "Failed extensions: $($failedExtensions -join ', ')"
            Emit-Result -StepId $StepId -State "warning" -Duration 60
            return $true
        }
        else {
            Emit-Result -StepId $StepId -State "failed" -Error "All extensions failed to install"
            return $false
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error installing extensions: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

# Export all public functions
Export-ModuleMember -Function Export-VSCodeProfile, Import-VSCodeProfile, Install-VSCodeExtensions, Get-VSCodePath
