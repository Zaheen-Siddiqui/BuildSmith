# BuildSmith Backend - Installers Module
# Handles application installation operations

# Note: common.ps1 functions are loaded by parent scripts

function Download-File {
    <#
    .SYNOPSIS
        Download a file from URL with real-time progress tracking
    .PARAMETER Url
        The URL to download from
    .PARAMETER OutputPath
        Where to save the downloaded file
    .PARAMETER StepId
        Step identifier for event emission
    .PARAMETER ExpectedChecksum
        Optional SHA256 checksum for verification
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Url,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "download",
        
        [Parameter(Mandatory=$false)]
        [string]$ExpectedChecksum = $null
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Downloading file..."
        Emit-Log -StepId $StepId -Level "info" -Text "URL: $Url"
        Emit-Log -StepId $StepId -Level "info" -Text "Output: $OutputPath"
        
        # Ensure output directory exists
        $outputDir = Split-Path -Parent $OutputPath
        if ($outputDir -and !(Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }
        
        # Use System.Net.WebClient for progress tracking
        $webClient = New-Object System.Net.WebClient
        
        # Register progress event handler
        $lastPercent = -1
        $progressHandler = {
            param($sender, $e)
            if ($e.TotalBytesToReceive -gt 0) {
                $percent = [int](($e.BytesReceived / $e.TotalBytesToReceive) * 100)
                if ($percent -ne $script:lastPercent -and $percent % 5 -eq 0) {
                    $script:lastPercent = $percent
                    $mbReceived = [math]::Round($e.BytesReceived / 1MB, 2)
                    $mbTotal = [math]::Round($e.TotalBytesToReceive / 1MB, 2)
                    
                    Emit-Progress -StepId $StepId -Current $e.BytesReceived -Total $e.TotalBytesToReceive -Unit "bytes"
                    Emit-Log -StepId $StepId -Level "info" -Text "Downloaded: $mbReceived MB / $mbTotal MB ($percent%)"
                }
            }
        }
        
        Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -Action $progressHandler | Out-Null
        
        # Start download (synchronous)
        $webClient.DownloadFile($Url, $OutputPath)
        
        # Cleanup
        $webClient.Dispose()
        Get-EventSubscriber | Where-Object { $_.SourceObject -eq $webClient } | Unregister-Event
        
        $sizeBytes = (Get-Item $OutputPath).Length
        $sizeMB = [math]::Round($sizeBytes / 1MB, 2)
        Emit-Log -StepId $StepId -Level "success" -Text "Download complete: $sizeMB MB"
        
        # Verify checksum if provided
        if ($ExpectedChecksum) {
            Emit-Log -StepId $StepId -Level "info" -Text "Verifying checksum..."
            $actualChecksum = (Get-FileHash -Path $OutputPath -Algorithm SHA256).Hash
            
            if ($actualChecksum -eq $ExpectedChecksum) {
                Emit-Log -StepId $StepId -Level "success" -Text "Checksum verified: $actualChecksum"
            }
            else {
                Emit-Log -StepId $StepId -Level "error" -Text "Checksum mismatch!"
                Emit-Log -StepId $StepId -Level "error" -Text "Expected: $ExpectedChecksum"
                Emit-Log -StepId $StepId -Level "error" -Text "Actual: $actualChecksum"
                Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
                Emit-Result -StepId $StepId -State "failed" -Error "Checksum verification failed"
                return $false
            }
        }
        
        Emit-Result -StepId $StepId -State "success" -Duration 15
        return $true
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Download failed: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        
        # Cleanup partial download
        if (Test-Path $OutputPath) {
            Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
        }
        
        return $false
    }
}

function Run-Installer {
    <#
    .SYNOPSIS
        Execute an installer file with appropriate silent arguments
    .PARAMETER InstallerPath
        Path to the installer file (.exe, .msi, .zip, etc.)
    .PARAMETER AppName
        Display name of the application
    .PARAMETER SilentArgs
        Custom silent install arguments (optional)
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$InstallerPath,
        
        [Parameter(Mandatory=$true)]
        [string]$AppName,
        
        [Parameter(Mandatory=$false)]
        [string[]]$SilentArgs = @(),
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "install-$AppName"
    )
    
    try {
        if (!(Test-Path $InstallerPath)) {
            throw "Installer file not found: $InstallerPath"
        }
        
        Emit-Status -StepId $StepId -State "running" -Message "Installing $AppName..."
        Emit-Log -StepId $StepId -Level "info" -Text "Installer: $InstallerPath"
        
        $extension = [System.IO.Path]::GetExtension($InstallerPath).ToLower()
        $process = $null
        
        switch ($extension) {
            ".msi" {
                # MSI installers use msiexec
                if ($SilentArgs.Count -eq 0) {
                    $SilentArgs = @("/qn", "/norestart")
                }
                $args = @("/i", "`"$InstallerPath`"") + $SilentArgs
                
                Emit-Log -StepId $StepId -Level "info" -Text "Running: msiexec.exe $($args -join ' ')"
                $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $args -Wait -PassThru -NoNewWindow
            }
            
            ".exe" {
                # Try common silent arguments if none provided
                if ($SilentArgs.Count -eq 0) {
                    # Common patterns: /S (NSIS), /SILENT (Inno Setup), /VERYSILENT (Inno Setup), --silent
                    $SilentArgs = @("/S", "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART")
                }
                
                Emit-Log -StepId $StepId -Level "info" -Text "Running: $InstallerPath $($SilentArgs -join ' ')"
                $process = Start-Process -FilePath $InstallerPath -ArgumentList $SilentArgs -Wait -PassThru -NoNewWindow
            }
            
            ".zip" {
                # For portable apps in ZIP - extract to a standard location
                $extractPath = Join-Path $env:ProgramFiles $AppName
                
                Emit-Log -StepId $StepId -Level "info" -Text "Extracting to: $extractPath"
                
                if (Test-Path $extractPath) {
                    Remove-Item $extractPath -Recurse -Force
                }
                
                Add-Type -Assembly System.IO.Compression.FileSystem
                [System.IO.Compression.ZipFile]::ExtractToDirectory($InstallerPath, $extractPath)
                
                Emit-Log -StepId $StepId -Level "success" -Text "$AppName extracted successfully"
                Emit-Result -StepId $StepId -State "success" -Duration 5
                return $true
            }
            
            default {
                throw "Unsupported installer type: $extension"
            }
        }
        
        # Check exit code
        if ($process) {
            Emit-Log -StepId $StepId -Level "info" -Text "Exit code: $($process.ExitCode)"
            
            switch ($process.ExitCode) {
                0 {
                    Emit-Log -StepId $StepId -Level "success" -Text "$AppName installed successfully"
                    Emit-Result -StepId $StepId -State "success" -Duration 30
                    return $true
                }
                3010 {
                    # Reboot required
                    Emit-Log -StepId $StepId -Level "warn" -Text "$AppName installed but requires reboot"
                    Emit-ManualAction -StepId $StepId -Action "reboot" -Message "Installation complete but reboot required" `
                        -Instructions @("Save your work and close all applications", "Restart your computer", "Click 'Resume' to continue installation")
                    Emit-Result -StepId $StepId -State "success" -Duration 30
                    return $true
                }
                1641 {
                    # Reboot initiated
                    Emit-Log -StepId $StepId -Level "warn" -Text "$AppName installed and reboot was initiated"
                    Emit-Result -StepId $StepId -State "reboot_required"
                    return $true
                }
                1618 {
                    # Another installation in progress
                    Emit-Log -StepId $StepId -Level "error" -Text "Another installation is in progress. Please wait and try again."
                    Emit-Result -StepId $StepId -State "failed" -Error "Installation conflict (code 1618)"
                    return $false
                }
                1603 {
                    # Fatal error during installation
                    Emit-Log -StepId $StepId -Level "error" -Text "Fatal error during installation (code 1603)"
                    Emit-Result -StepId $StepId -State "failed" -Error "Installation failed with fatal error"
                    return $false
                }
                default {
                    throw "Installation failed with exit code $($process.ExitCode)"
                }
            }
        }
        
        return $false
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error installing $AppName`: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Add-ToPath {
    <#
    .SYNOPSIS
        Add a directory to the system or user PATH environment variable
    .PARAMETER Directory
        The directory path to add
    .PARAMETER Scope
        'User' or 'Machine' - determines which PATH to modify
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Directory,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet('User', 'Machine')]
        [string]$Scope = 'User',
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "update-path"
    )
    
    try {
        if (!(Test-Path $Directory)) {
            Emit-Log -StepId $StepId -Level "warn" -Text "Directory does not exist: $Directory"
            return $false
        }
        
        Emit-Log -StepId $StepId -Level "info" -Text "Adding to PATH ($Scope): $Directory"
        
        # Get current PATH
        $target = if ($Scope -eq 'Machine') { [System.EnvironmentVariableTarget]::Machine } else { [System.EnvironmentVariableTarget]::User }
        $currentPath = [System.Environment]::GetEnvironmentVariable("PATH", $target)
        
        # Check if already in PATH
        $pathArray = $currentPath -split ';' | Where-Object { $_ }
        $normalizedDir = $Directory.TrimEnd('\')
        
        $alreadyExists = $pathArray | Where-Object { 
            ($_.TrimEnd('\') -eq $normalizedDir) 
        }
        
        if ($alreadyExists) {
            Emit-Log -StepId $StepId -Level "info" -Text "Directory already in PATH"
            return $true
        }
        
        # Add to PATH
        $newPath = "$currentPath;$Directory"
        [System.Environment]::SetEnvironmentVariable("PATH", $newPath, $target)
        
        # Also update current process PATH
        $env:PATH = "$env:PATH;$Directory"
        
        Emit-Log -StepId $StepId -Level "success" -Text "Added to PATH successfully"
        return $true
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Failed to add to PATH: $($_.Exception.Message)"
        return $false
    }
}

function Test-Checksum {
    <#
    .SYNOPSIS
        Verify file checksum
    .PARAMETER FilePath
        Path to the file to verify
    .PARAMETER ExpectedChecksum
        The expected checksum value
    .PARAMETER Algorithm
        Hash algorithm to use (default: SHA256)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$FilePath,
        
        [Parameter(Mandatory=$true)]
        [string]$ExpectedChecksum,
        
        [Parameter(Mandatory=$false)]
        [string]$Algorithm = "SHA256"
    )
    
    try {
        $hash = Get-FileHash -Path $FilePath -Algorithm $Algorithm
        return $hash.Hash -eq $ExpectedChecksum
    }
    catch {
        return $false
    }
}

function Get-InstalledPackages {
    <#
    .SYNOPSIS
        Scan for installed packages from npm, pip, winget, and chocolatey
    .DESCRIPTION
        Scans global packages from various package managers
    .OUTPUTS
        Array of hashtables with package name, version, and manager
    #>
    
    try {
        $packages = @()
        $packageIndex = 0
        
        # Scan npm global packages
        try {
            $npmPath = Get-Command npm -ErrorAction SilentlyContinue
            if ($npmPath) {
                Emit-Log -StepId "scan-packages" -Level "info" -Text "Scanning installed packages using npm"
                $npmOutput = npm list -g --depth=0 --json 2>$null | ConvertFrom-Json
                
                if ($npmOutput.dependencies) {
                    $npmCount = 0
                    foreach ($pkg in $npmOutput.dependencies.PSObject.Properties) {
                        $packages += [PSCustomObject]@{
                            id = "package-$packageIndex"
                            name = $pkg.Name
                            version = $pkg.Value.version
                            manager = "npm"
                            type = "package"
                        }
                        $packageIndex++
                        $npmCount++
                    }
                    Emit-Log -StepId "scan-packages" -Level "success" -Text "Found $npmCount packages"
                }
            }
        }
        catch {
            Write-Verbose "Error scanning npm packages: $($_.Exception.Message)"
        }
        
        # Scan pip packages
        try {
            $pipPath = Get-Command pip -ErrorAction SilentlyContinue
            if ($pipPath) {
                Emit-Log -StepId "scan-packages" -Level "info" -Text "Scanning installed packages using pip"
                $pipOutput = pip list --format=json 2>$null | ConvertFrom-Json
                
                $pipCount = 0
                foreach ($pkg in $pipOutput) {
                    $packages += [PSCustomObject]@{
                        id = "package-$packageIndex"
                        name = $pkg.name
                        version = $pkg.version
                        manager = "pip"
                        type = "package"
                    }
                    $packageIndex++
                    $pipCount++
                }
                Emit-Log -StepId "scan-packages" -Level "success" -Text "Found $pipCount packages"
            }
        }
        catch {
            Write-Verbose "Error scanning pip packages: $($_.Exception.Message)"
        }
        
        # Scan winget packages (this may take a moment)
        try {
            $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
            if ($wingetPath) {
                Emit-Log -StepId "scan-packages" -Level "info" -Text "Scanning installed packages using winget"
                # winget list outputs text, need to parse it
                $wingetOutput = winget list --source winget 2>$null
                
                # Developer tool keywords for filtering
                $devKeywords = @(
                    'git', 'python', 'node', 'npm', 'java', 'jdk', 'maven', 'gradle',
                    'docker', 'kubernetes', 'kubectl', 'terraform', 'aws', 'azure', 'gcloud',
                    'vscode', 'visual studio', 'jetbrains', 'android studio',
                    'postman', 'insomnia', 'mongodb', 'postgresql', 'mysql', 'redis',
                    'github', 'gitlab', 'bitbucket', 'compiler', 'sdk', 'dotnet', '.net',
                    'golang', 'rust', 'ruby', 'php', 'powershell', 'bash', 'terminal',
                    'vim', 'emacs', 'sublime', 'atom', 'notepad++',
                    'yarn', 'pnpm', 'composer', 'pip', 'cargo', 'go '
                )
                
                # Parse winget output (skip header lines)
                $lines = $wingetOutput -split "`n" | Select-Object -Skip 2
                foreach ($line in $lines) {
                    if ($line -match '^\s*(.+?)\s+(.+?)\s+(.+?)\s*$') {
                        $packageName = $matches[1].Trim()
                        $packageLower = $packageName.ToLower()
                        
                        # Only include if it matches developer tool keywords
                        $isDeveloperTool = $false
                        foreach ($keyword in $devKeywords) {
                            if ($packageLower -like "*$keyword*") {
                                $isDeveloperTool = $true
                                break
                            }
                        }
                        
                        if ($isDeveloperTool) {
                            $packages += [PSCustomObject]@{
                                id = "package-$packageIndex"
                                name = $packageName
                                version = $matches[2].Trim()
                                manager = "winget"
                                type = "package"
                            }
                            $packageIndex++
                        }
                    }
                }
                $wingetCount = ($packages | Where-Object { $_.manager -eq 'winget' }).Count
                Emit-Log -StepId "scan-packages" -Level "success" -Text "Found $wingetCount packages"
            }
        }
        catch {
            Write-Verbose "Error scanning winget packages: $($_.Exception.Message)"
        }
        
        # Scan chocolatey packages
        try {
            $chocoPath = Get-Command choco -ErrorAction SilentlyContinue
            if ($chocoPath) {
                Emit-Log -StepId "scan-packages" -Level "info" -Text "Scanning installed packages using chocolatey"
                $chocoOutput = choco list --local-only --limit-output 2>$null
                
                # Parse choco output (format: name|version)
                $chocoCount = 0
                foreach ($line in $chocoOutput) {
                    if ($line -match '^(.+?)\|(.+)$') {
                        $packages += [PSCustomObject]@{
                            id = "package-$packageIndex"
                            name = $matches[1]
                            version = $matches[2]
                            manager = "chocolatey"
                            type = "package"
                        }
                        $packageIndex++
                        $chocoCount++
                    }
                }
                Emit-Log -StepId "scan-packages" -Level "success" -Text "Found $chocoCount packages"
            }
        }
        catch {
            Write-Verbose "Error scanning chocolatey packages: $($_.Exception.Message)"
        }
        
        Emit-Log -StepId "scan-packages" -Level "success" -Text "Found total of $($packages.Count) packages across all managers"
        
        return $packages
    }
    catch {
        Emit-Log -StepId "scan-packages" -Level "error" -Text "Error scanning packages: $($_.Exception.Message)"
        return @()
    }
}

function Install-Package {
    <#
    .SYNOPSIS
        Install a package using the appropriate package manager
    .DESCRIPTION
        Installs packages via npm, pip, winget, or chocolatey
    .PARAMETER Name
        The package name
    .PARAMETER Manager
        The package manager to use (npm, pip, winget, chocolatey)
    .PARAMETER Version
        The version to install (optional)
    .OUTPUTS
        Hashtable with success status
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("npm", "pip", "winget", "chocolatey")]
        [string]$Manager,
        
        [Parameter(Mandatory=$false)]
        [string]$Version
    )
    
    try {
        Emit-Log -StepId "setup-packages" -Level "info" -Text "Installing $Name via $Manager..."
        
        # Check if package manager is available
        $managerPath = Get-Command $Manager -ErrorAction SilentlyContinue
        if (-not $managerPath -and $Manager -eq "chocolatey") {
            $managerPath = Get-Command choco -ErrorAction SilentlyContinue
        }
        
        if (-not $managerPath) {
            Emit-Log -StepId "setup-packages" -Level "error" -Text "$Manager is not installed on this system"
            return @{
                success = $false
                error = "$Manager not found"
            }
        }
        
        # Install based on manager
        switch ($Manager) {
            "npm" {
                $npmCmd = "npm install -g $Name"
                if ($Version) {
                    $npmCmd += "@$Version"
                }
                
                Emit-Log -StepId "setup-packages" -Level "info" -Text "Running: $npmCmd"
                $output = Invoke-Expression $npmCmd 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "setup-packages" -Level "success" -Text "Successfully installed $Name"
                    return @{
                        success = $true
                        package = $Name
                        manager = "npm"
                    }
                } else {
                    throw "npm install failed with exit code $LASTEXITCODE"
                }
            }
            
            "pip" {
                $pipCmd = "pip install $Name"
                if ($Version) {
                    $pipCmd += "==$Version"
                }
                
                Emit-Log -StepId "setup-packages" -Level "info" -Text "Running: $pipCmd"
                $output = Invoke-Expression $pipCmd 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "setup-packages" -Level "success" -Text "Successfully installed $Name"
                    return @{
                        success = $true
                        package = $Name
                        manager = "pip"
                    }
                } else {
                    throw "pip install failed with exit code $LASTEXITCODE"
                }
            }
            
            "winget" {
                # For winget, Name should be the package ID
                $wingetCmd = "winget install --id $Name --exact --silent --accept-package-agreements --accept-source-agreements"
                if ($Version) {
                    $wingetCmd += " --version $Version"
                }
                
                Emit-Log -StepId "setup-packages" -Level "info" -Text "Running: $wingetCmd"
                $output = Invoke-Expression $wingetCmd 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "setup-packages" -Level "success" -Text "Successfully installed $Name"
                    return @{
                        success = $true
                        package = $Name
                        manager = "winget"
                    }
                } else {
                    throw "winget install failed with exit code $LASTEXITCODE"
                }
            }
            
            "chocolatey" {
                $chocoCmd = "choco install $Name -y"
                if ($Version) {
                    $chocoCmd += " --version=$Version"
                }
                
                Emit-Log -StepId "setup-packages" -Level "info" -Text "Running: $chocoCmd"
                $output = Invoke-Expression $chocoCmd 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "setup-packages" -Level "success" -Text "Successfully installed $Name"
                    return @{
                        success = $true
                        package = $Name
                        manager = "chocolatey"
                    }
                } else {
                    throw "chocolatey install failed with exit code $LASTEXITCODE"
                }
            }
        }
    }
    catch {
        Emit-Log -StepId "setup-packages" -Level "error" -Text "Failed to install ${Name}: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

# Export all public functions
Export-ModuleMember -Function Download-File, Run-Installer, Add-ToPath, Test-Checksum, Get-InstalledPackages, Install-Package
