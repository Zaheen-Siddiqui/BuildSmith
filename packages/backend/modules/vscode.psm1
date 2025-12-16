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

function Get-VSCodeProfiles {
    <#
    .SYNOPSIS
        Get current VS Code profile data for bundle creation
    .DESCRIPTION
        Scans the current VS Code installation and returns profile data including
        installed extensions, settings, and keybindings. Detects multiple profiles if available.
    #>
    
    try {
        $paths = Get-VSCodePath
        
        if (-not $paths.exe) {
            Write-Warning "VS Code not found"
            return $null
        }
        
        $profiles = @()
        
        # First, always get the default/current profile extensions
        $defaultExtensions = @()
        
        # For default profile, code --list-extensions returns the correct count
        $extensionsOutput = & code --list-extensions --show-versions 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $extensionsOutput) {
            foreach ($line in $extensionsOutput) {
                if ($line -and $line -match '^(.+)@(.+)$') {
                    $defaultExtensions += @{
                        id = $matches[1]
                        version = $matches[2]
                    }
                }
            }
        }
        
        # Read default settings and keybindings
        $defaultSettings = $null
        $defaultKeybindings = $null
        
        if (Test-Path $paths.settingsPath) {
            try {
                $defaultSettings = Get-Content $paths.settingsPath -Raw | ConvertFrom-Json
            } catch {
                # Ignore parse errors
            }
        }
        
        if (Test-Path $paths.keybindingsPath) {
            try {
                $defaultKeybindings = Get-Content $paths.keybindingsPath -Raw | ConvertFrom-Json
            } catch {
                # Ignore parse errors
            }
        }
        
        # Create default profile with actual extensions
        $profiles += @{
            id = "default"
            name = "Default Profile"
            extensions = $defaultExtensions
            settings = $defaultSettings
            keybindings = $defaultKeybindings
        }
        
        # Get profile names from VS Code storage
        $profileNames = @{}
        $storageFile = "$env:APPDATA\Code\User\globalStorage\storage.json"
        if (Test-Path $storageFile) {
            try {
                $storage = Get-Content $storageFile -Raw | ConvertFrom-Json
                if ($storage.userDataProfiles) {
                    foreach ($profile in $storage.userDataProfiles) {
                        if ($profile.location -and $profile.name) {
                            $profileNames[$profile.location] = $profile.name
                        }
                    }
                }
            } catch {
                # Ignore storage parsing errors
            }
        }
        
        # Check for additional profiles (VS Code 1.75+)
        $profilesDir = "$env:APPDATA\Code\User\profiles"
        
        if (Test-Path $profilesDir) {
            $profileFolders = Get-ChildItem -Path $profilesDir -Directory -ErrorAction SilentlyContinue
            
            foreach ($profileFolder in $profileFolders) {
                $profileId = $profileFolder.Name
                
                # Get friendly name from storage, fallback to folder name
                $profileName = if ($profileNames.ContainsKey($profileId)) {
                    $profileNames[$profileId]
                } else {
                    $profileId
                }
                
                # Get extensions for this profile using --profile flag with the friendly name
                $profileExtensions = @()
                
                # Try using code CLI with profile name
                $profileExtOutput = & code --list-extensions --show-versions --profile $profileName 2>&1
                
                if ($LASTEXITCODE -eq 0 -and $profileExtOutput) {
                    foreach ($line in $profileExtOutput) {
                        if ($line -and $line -match '^(.+)@(.+)$') {
                            $profileExtensions += @{
                                id = $matches[1]
                                version = $matches[2]
                            }
                        }
                    }
                }
                
                # If CLI didn't work, try reading from extensions.json
                if ($profileExtensions.Count -eq 0) {
                    $profileExtensionsPath = Join-Path $profileFolder.FullName "extensions.json"
                    
                    if (Test-Path $profileExtensionsPath) {
                        try {
                            $extData = Get-Content $profileExtensionsPath -Raw | ConvertFrom-Json
                            foreach ($ext in $extData) {
                                if ($ext.identifier -and $ext.identifier.id -and $ext.version) {
                                    $profileExtensions += @{
                                        id = $ext.identifier.id
                                        version = $ext.version
                                    }
                                }
                            }
                        } catch {
                            # Ignore parse errors
                        }
                    }
                }
                
                # Read profile settings
                $profileSettingsPath = Join-Path $profileFolder.FullName "settings.json"
                $profileSettings = $null
                if (Test-Path $profileSettingsPath) {
                    try {
                        $profileSettings = Get-Content $profileSettingsPath -Raw | ConvertFrom-Json
                    } catch {
                        # Ignore
                    }
                }
                
                $profiles += @{
                    id = $profileId
                    name = $profileName
                    extensions = $profileExtensions
                    settings = $profileSettings
                    keybindings = $null
                }
            }
        }
        
        return $profiles
    }
    catch {
        Write-Warning "Failed to get VS Code profiles: $($_.Exception.Message)"
        return $null
    }
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
        
        $totalCount = $Extensions.Count
        for ($i = 0; $i -lt $totalCount; $i++) {
            if (Test-AbortRequested) {
                Emit-Log -StepId $StepId -Level "warn" -Text "Installation aborted by user"
                break
            }
            
            $ext = $Extensions[$i]
            Emit-Log -StepId $StepId -Level "info" -Text "Installing: $ext"
            Emit-Progress -StepId $StepId -Current ($i + 1) -Total $totalCount -Unit "extensions"
            
            try {
                # Run code --install-extension
                $process = Start-Process -FilePath "code" `
                    -ArgumentList "--install-extension", $ext, "--force" `
                    -NoNewWindow -Wait -PassThru `
                    -RedirectStandardOutput "$env:TEMP\vscode-install-$i.log" `
                    -RedirectStandardError "$env:TEMP\vscode-install-$i-err.log"
                
                if ($process.ExitCode -eq 0) {
                    $installed++
                    Emit-Log -StepId $StepId -Level "success" -Text "Installed $ext"
                }
                else {
                    $failed++
                    $failedExtensions += $ext
                    Emit-Log -StepId $StepId -Level "error" -Text "Failed $ext (exit code: $($process.ExitCode))"
                }
                
                # Cleanup temp logs
                Remove-Item "$env:TEMP\vscode-install-$i*.log" -Force -ErrorAction SilentlyContinue
            }
            catch {
                $failed++
                $failedExtensions += $ext
                Emit-Log -StepId $StepId -Level "error" -Text "Failed $ext - $($_.Exception.Message)"
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
        Emit-Result -StepId $StepId -State "failed" -Error "Installation failed"
        return $false
    }
}

function Install-VSCode {
    <#
    .SYNOPSIS
        Install VS Code if not already installed
    .OUTPUTS
        Hashtable with success status and installation path
    #>
    param()
    
    try {
        Emit-Log -StepId "install-vscode" -Level "info" -Text "Checking for VS Code installation..."
        
        # Check if already installed
        $paths = Get-VSCodePath
        if ($paths.exe) {
            Emit-Log -StepId "install-vscode" -Level "info" -Text "VS Code already installed at $($paths.exe)"
            return @{
                success = $true
                alreadyInstalled = $true
                path = $paths.exe
            }
        }
        
        Emit-Log -StepId "install-vscode" -Level "info" -Text "Installing VS Code via winget..."
        
        # Check if winget is available
        $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
        if (-not $wingetCmd) {
            throw "winget is not available. Please install App Installer from Microsoft Store."
        }
        
        # Install VS Code using winget
        $installCmd = "winget install --id Microsoft.VisualStudioCode --exact --silent --accept-package-agreements --accept-source-agreements"
        Emit-Log -StepId "install-vscode" -Level "info" -Text "Running: $installCmd"
        
        $output = Invoke-Expression $installCmd 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Emit-Log -StepId "install-vscode" -Level "success" -Text "VS Code installed successfully"
            
            # Refresh PATH to find newly installed VS Code
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
            
            $paths = Get-VSCodePath
            return @{
                success = $true
                path = $paths.exe
            }
        } else {
            throw "winget install failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Emit-Log -StepId "install-vscode" -Level "error" -Text "Failed to install VS Code: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

# Export all public functions
Export-ModuleMember -Function Export-VSCodeProfile, Import-VSCodeProfile, Install-VSCodeExtensions, Install-VSCode, Get-VSCodePath, Get-VSCodeProfiles
