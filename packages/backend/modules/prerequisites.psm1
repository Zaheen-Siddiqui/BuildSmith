# BuildSmith Backend - Prerequisites Module
# Detects and installs required prerequisite software

. "$PSScriptRoot/../common.ps1"

<#
.SYNOPSIS
Checks if a prerequisite tool is installed

.PARAMETER ToolName
Name of the tool to check (docker, code, node, python, git, wsl, mongodb, postgresql)

.RETURNS
Hashtable with installed status and version
#>
function Test-PrerequisiteInstalled {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('docker', 'code', 'node', 'npm', 'python', 'pip', 'git', 'wsl', 'mongodb', 'postgresql', 'jdk', 'java', 'mingw', 'gcc', 'awscli', 'terraform', 'azurecli')]
        [string]$ToolName
    )
    
    $result = @{
        installed = $false
        version = $null
        path = $null
    }
    
    try {
        switch ($ToolName) {
            'docker' {
                $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
                if ($dockerCmd) {
                    $version = (docker --version) -replace 'Docker version ', '' -replace ',.*', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $dockerCmd.Source
                }
            }
            'code' {
                $codeCmd = Get-Command code -ErrorAction SilentlyContinue
                if ($codeCmd) {
                    $version = (code --version 2>&1 | Select-Object -First 1)
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $codeCmd.Source
                }
            }
            'node' {
                $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
                if ($nodeCmd) {
                    $version = (node --version) -replace 'v', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $nodeCmd.Source
                }
            }
            'npm' {
                $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
                if ($npmCmd) {
                    $version = (npm --version)
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $npmCmd.Source
                }
            }
            'python' {
                $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
                if ($pythonCmd) {
                    $version = (python --version) -replace 'Python ', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $pythonCmd.Source
                }
            }
            'pip' {
                $pipCmd = Get-Command pip -ErrorAction SilentlyContinue
                if ($pipCmd) {
                    $version = (pip --version) -replace 'pip ', '' -replace ' from.*', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $pipCmd.Source
                }
            }
            'git' {
                $gitCmd = Get-Command git -ErrorAction SilentlyContinue
                if ($gitCmd) {
                    $version = (git --version) -replace 'git version ', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $gitCmd.Source
                }
            }
            'wsl' {
                # Check if WSL2 is installed
                try {
                    $wslStatus = wsl --status 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        # WSL is installed, check version
                        $wslVersion = wsl --version 2>&1 | Select-String "WSL version" | ForEach-Object { $_ -replace '.*WSL version:\s*', '' }
                        if (-not $wslVersion) {
                            # Try alternative check
                            $wslList = wsl -l -v 2>&1
                            if ($wslList -match "VERSION 2") {
                                $wslVersion = "2"
                            }
                        }
                        $result.installed = $true
                        $result.version = if ($wslVersion) { $wslVersion.Trim() } else { "installed" }
                    }
                } catch {
                    # WSL not available
                }
            }
            'mongodb' {
                # Check if MongoDB service exists
                $mongoService = Get-Service -Name MongoDB* -ErrorAction SilentlyContinue
                if ($mongoService) {
                    $result.installed = $true, 'wsl', 'mongodb', 'postgresql'
                    $result.version = "installed"
                    $result.path = $mongoService.Name
                }
            }
            'postgresql' {
                # Check if PostgreSQL service exists
                $pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
                if ($pgService) {
                    $result.installed = $true
                    $result.version = "installed"
                    $result.path = $pgService.Name
                }
            }
            'jdk' {
                # Check for Java JDK
                $javaCmd = Get-Command java -ErrorAction SilentlyContinue
                if ($javaCmd) {
                    $version = (java -version 2>&1 | Select-Object -First 1) -replace 'openjdk version ', '' -replace 'java version ', '' -replace '"', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $javaCmd.Source
                }
            }
            'java' {
                # Alias for jdk
                $javaCmd = Get-Command java -ErrorAction SilentlyContinue
                if ($javaCmd) {
                    $version = (java -version 2>&1 | Select-Object -First 1) -replace 'openjdk version ', '' -replace 'java version ', '' -replace '"', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $javaCmd.Source
                }
            }
            'mingw' {
                # Check for MinGW GCC
                $gccCmd = Get-Command gcc -ErrorAction SilentlyContinue
                if ($gccCmd) {
                    $version = (gcc --version | Select-Object -First 1) -replace 'gcc \(.*?\) ', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $gccCmd.Source
                }
            }
            'gcc' {
                # Alias for mingw
                $gccCmd = Get-Command gcc -ErrorAction SilentlyContinue
                if ($gccCmd) {
                    $version = (gcc --version | Select-Object -First 1) -replace 'gcc \(.*?\) ', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $gccCmd.Source
                }
            }
            'awscli' {
                # Check for AWS CLI
                $awsCmd = Get-Command aws -ErrorAction SilentlyContinue
                if ($awsCmd) {
                    $version = (aws --version 2>&1) -replace 'aws-cli/', '' -replace ' .*', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $awsCmd.Source
                }
            }
            'terraform' {
                # Check for Terraform
                $tfCmd = Get-Command terraform -ErrorAction SilentlyContinue
                if ($tfCmd) {
                    $version = (terraform version 2>&1 | Select-Object -First 1) -replace 'Terraform v', ''
                    $result.installed = $true
                    $result.version = $version.Trim()
                    $result.path = $tfCmd.Source
                }
            }
            'azurecli' {
                # Check for Azure CLI
                $azCmd = Get-Command az -ErrorAction SilentlyContinue
                if ($azCmd) {
                    $version = (az version --output json 2>&1 | ConvertFrom-Json).'azure-cli'
                    $result.installed = $true
                    $result.version = $version
                    $result.path = $azCmd.Source
                }
            }
        }
    }
    catch {
        # Tool not found or error checking - keep installed = false
    }
    
    return $result
}

<#
.SYNOPSIS
Gets download URL for a prerequisite installer

.PARAMETER ToolName
Name of the tool

.PARAMETER Version
Desired version (optional, defaults to latest)

.RETURNS
Hashtable with download URL and installer file name
#>
function Get-PrerequisiteDownloadInfo {
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('docker', 'vscode', 'nodejs', 'python', 'git', 'wsl', 'mongodb', 'postgresql', 'jdk', 'mingw', 'awscli', 'terraform', 'azurecli')]
        [string]$ToolName,
        
        [Parameter(Mandatory=$false)]
        [string]$Version = 'latest'
    )
    
    $downloadInfo = @{
        url = $null
        fileName = $null
        installArgs = $null
    }
    
    switch ($ToolName) {
        'docker' {
            $downloadInfo.url = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe'
            $downloadInfo.fileName = 'DockerDesktopInstaller.exe'
            $downloadInfo.installArgs = 'install --quiet --accept-license'
        }
        'vscode' {
            $downloadInfo.url = 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user'
            $downloadInfo.fileName = 'VSCodeUserSetup.exe'
            $downloadInfo.installArgs = '/VERYSILENT /NORESTART /MERGETASKS=!runcode'
        }
        'nodejs' {
            if ($Version -eq 'latest') {
                $downloadInfo.url = 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi'
                $downloadInfo.fileName = 'node-v20.11.0-x64.msi'
            } else {
                $downloadInfo.url = "https://nodejs.org/dist/v$Version/node-v$Version-x64.msi"
                $downloadInfo.fileName = "node-v$Version-x64.msi"
            }
            $downloadInfo.installArgs = '/quiet /norestart'
        }
        'python' {
            if ($Version -eq 'latest') {
                $downloadInfo.url = 'https://www.python.org/ftp/python/3.12.1/python-3.12.1-amd64.exe'
                $downloadInfo.fileName = 'python-3.12.1-amd64.exe'
            } else {
                $downloadInfo.url = "https://www.python.org/ftp/python/$Version/python-$Version-amd64.exe"
                $downloadInfo.fileName = "python-$Version-amd64.exe"
            }
            $downloadInfo.installArgs = '/quiet InstallAllUsers=1 PrependPath=1'
        }
        'git' {
            $downloadInfo.url = 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe'
            $downloadInfo.fileName = 'Git-2.43.0-64-bit.exe'
            $downloadInfo.installArgs = '/VERYSILENT /NORESTART'
        }
        'wsl' {
            # WSL2 is installed via Windows feature, not a download
            $downloadInfo.url = $null
            $downloadInfo.fileName = $null
            $downloadInfo.installArgs = $null
        }
        'mongodb' {
            # MongoDB Community Server 7.0 (latest stable)
            $downloadInfo.url = 'https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi'
            $downloadInfo.fileName = 'mongodb-windows-x86_64-7.0.5-signed.msi'
            $downloadInfo.installArgs = '/quiet /norestart ADDLOCAL="ServerNoService" SHOULD_INSTALL_COMPASS="0"'
        }
        'postgresql' {
            # PostgreSQL 16 (latest stable)
            $downloadInfo.url = 'https://get.enterprisedb.com/postgresql/postgresql-16.1-1-windows-x64.exe'
            $downloadInfo.fileName = 'postgresql-16.1-1-windows-x64.exe'
            $downloadInfo.installArgs = '--mode unattended --unattendedmodeui none --superpassword postgres --servicename PostgreSQL'
        }
        'jdk' {
            # Microsoft Build of OpenJDK 21 (latest LTS)
            $downloadInfo.url = 'https://aka.ms/download-jdk/microsoft-jdk-21-windows-x64.msi'
            $downloadInfo.fileName = 'microsoft-jdk-21-windows-x64.msi'
            $downloadInfo.installArgs = '/quiet /norestart ADDLOCAL=FeatureMain,FeatureEnvironment,FeatureJarFileRunWith,FeatureJavaHome'
        }
        'mingw' {
            # MinGW-w64 (GCC for Windows)
            # Using WinLibs standalone build
            $downloadInfo.url = 'https://github.com/brechtsanders/winlibs_mingw/releases/download/13.2.0-16.0.6-11.0.0-msvcrt-r1/winlibs-x86_64-posix-seh-gcc-13.2.0-mingw-w64msvcrt-11.0.0-r1.7z'
            $downloadInfo.fileName = 'mingw-w64.7z'
            $downloadInfo.installArgs = $null # 7z archive, needs extraction
        }
        'awscli' {
            # AWS CLI v2
            $downloadInfo.url = 'https://awscli.amazonaws.com/AWSCLIV2.msi'
            $downloadInfo.fileName = 'AWSCLIV2.msi'
            $downloadInfo.installArgs = '/quiet /norestart'
        }
        'terraform' {
            # Terraform latest
            $downloadInfo.url = 'https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_windows_amd64.zip'
            $downloadInfo.fileName = 'terraform.zip'
            $downloadInfo.installArgs = $null # ZIP file, needs extraction
        }
        'azurecli' {
            # Azure CLI latest
            $downloadInfo.url = 'https://aka.ms/installazurecliwindows'
            $downloadInfo.fileName = 'AzureCLI.msi'
            $downloadInfo.installArgs = '/quiet /norestart'
        }
    }
    
    return $downloadInfo
}

<#
.SYNOPSIS
Downloads a prerequisite installer

.PARAMETER DownloadUrl
URL to download from

.PARAMETER DestinationPath
Where to save the installer

.RETURNS
Boolean indicating success
#>
function Get-PrerequisiteInstaller {
    param(
        [Parameter(Mandatory=$true)]
        [string]$DownloadUrl,
        
        [Parameter(Mandatory=$true)]
        [string]$DestinationPath
    )
    
    try {
        Emit-Log -StepId "download-prerequisite" -Level "info" -Text "Downloading from: $DownloadUrl"
        
        # Use .NET WebClient for download with progress
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($DownloadUrl, $DestinationPath)
        
        if (Test-Path $DestinationPath) {
            $fileSize = (Get-Item $DestinationPath).Length / 1MB
            Emit-Log -StepId "download-prerequisite" -Level "success" -Text "Downloaded $([math]::Round($fileSize, 2)) MB"
            return $true
        }
        
        return $false
    }
    catch {
        Emit-Log -StepId "download-prerequisite" -Level "error" -Text "Download failed: $($_.Exception.Message)"
        return $false
    }
}

<#
.SYNOPSIS
Installs a portable tool by extracting it to a permanent location

.PARAMETER ArchivePath
Path to the archive file (.zip or .7z)

.PARAMETER ToolName
Name of the tool being installed

.PARAMETER DestinationRoot
Root directory for portable tools (default: C:\BuildSmith\Tools)

.RETURNS
Hashtable with success status and installation path
#>
function Install-PortableTool {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ArchivePath,
        
        [Parameter(Mandatory=$true)]
        [string]$ToolName,
        
        [Parameter(Mandatory=$false)]
        [string]$DestinationRoot = "C:\BuildSmith\Tools"
    )
    
    try {
        Emit-Log -StepId "install-portable" -Level "info" -Text "Installing portable tool: $ToolName..."
        Emit-Status -StepId "install-$ToolName" -State "running" -Message "Installing $ToolName..."
        
        # Create destination directory
        $toolDir = Join-Path $DestinationRoot $ToolName
        if (-not (Test-Path $toolDir)) {
            New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
        }
        
        # Determine archive type and extract
        if ($ArchivePath -like "*.zip") {
            # Extract ZIP
            Add-Type -Assembly System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::ExtractToDirectory($ArchivePath, $toolDir)
            Emit-Log -StepId "install-portable" -Level "info" -Text "Extracted ZIP archive"
        }
        elseif ($ArchivePath -like "*.7z") {
            # Extract 7z using PowerShell Expand-Archive won't work, need 7zip
            # For now, try using tar (available in Windows 10+)
            # Actually, 7z requires 7-Zip installed. Let's download 7za.exe (standalone)
            Emit-Log -StepId "install-portable" -Level "warning" -Text "7z archive detected, skipping for now (requires 7-Zip)"
            # TODO: Add 7-Zip extraction support
            return @{
                success = $false
                path = $null
                message = "7z extraction not yet supported"
            }
        }
        else {
            throw "Unsupported archive format: $ArchivePath"
        }
        
        Emit-Log -StepId "install-portable" -Level "success" -Text "$ToolName installed to $toolDir"
        Emit-Result -StepId "install-$ToolName" -State "success" -Duration 10
        
        return @{
            success = $true
            path = $toolDir
            message = "Installed successfully"
        }
    }
    catch {
        Emit-Log -StepId "install-portable" -Level "error" -Text "Installation error: $($_.Exception.Message)"
        Emit-Result -StepId "install-$ToolName" -State "failed" -Duration 10
        
        return @{
            success = $false
            path = $null
            message = $_.Exception.Message
        }
    }
}

<#
.SYNOPSIS
Installs a prerequisite from an installer file

.PARAMETER InstallerPath
Path to the installer executable

.PARAMETER InstallArgs
Arguments to pass to the installer

.PARAMETER ToolName
Name of the tool being installed

.RETURNS
Boolean indicating success
#>
function Install-Prerequisite {
    param(
        [Parameter(Mandatory=$true)]
        [string]$InstallerPath,
        
        [Parameter(Mandatory=$true)]
        [string]$InstallArgs,
        
        [Parameter(Mandatory=$true)]
        [string]$ToolName
    )
    
    try {
        Emit-Log -StepId "install-prerequisite" -Level "info" -Text "Installing $ToolName..."
        Emit-Status -StepId "install-$ToolName" -State "running" -Message "Installing $ToolName..."
        
        # Run installer and WAIT for completion
        $process = Start-Process -FilePath $InstallerPath -ArgumentList $InstallArgs -Wait -PassThru -NoNewWindow
        
        if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 3010) {
            # 3010 = success but reboot required
            Emit-Log -StepId "install-prerequisite" -Level "success" -Text "$ToolName installed successfully"
            Emit-Result -StepId "install-$ToolName" -State "success" -Duration 30
            
            if ($process.ExitCode -eq 3010) {
                Emit-Log -StepId "install-prerequisite" -Level "warning" -Text "System reboot required for $ToolName"
            }
            
            return $true
        } else {
            Emit-Log -StepId "install-prerequisite" -Level "error" -Text "$ToolName installation failed with exit code: $($process.ExitCode)"
            Emit-Result -StepId "install-$ToolName" -State "failed" -Duration 30
            return $false
        }
    }
    catch {
        Emit-Log -StepId "install-prerequisite" -Level "error" -Text "Installation error: $($_.Exception.Message)"
        Emit-Result -StepId "install-$ToolName" -State "failed" -Duration 30
        return $false
    }
}

<#
.SYNOPSIS
Installs WSL2 via Windows feature

.RETURNS
Hashtable with success status and reboot required flag
#>
function Install-WSL2 {
    try {
        Emit-Log -StepId "install-wsl" -Level "info" -Text "Installing WSL2..."
        Emit-Status -StepId "install-wsl" -State "running" -Message "Installing WSL2..."
        
        # Install WSL2 using wsl --install command
        # This installs WSL2 and Ubuntu by default
        $result = wsl --install --no-distribution 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Emit-Log -StepId "install-wsl" -Level "success" -Text "WSL2 installed successfully"
            Emit-Log -StepId "install-wsl" -Level "warning" -Text "SYSTEM REBOOT REQUIRED for WSL2"
            Emit-Result -StepId "install-wsl" -State "success" -Duration 10
            
            return @{
                success = $true
                rebootRequired = $true
            }
        } else {
            Emit-Log -StepId "install-wsl" -Level "error" -Text "WSL2 installation failed"
            Emit-Result -StepId "install-wsl" -State "failed" -Duration 10
            
            return @{
                success = $false
                rebootRequired = $false
            }
        }
    }
    catch {
        Emit-Log -StepId "install-wsl" -Level "error" -Text "WSL2 installation error: $($_.Exception.Message)"
        Emit-Result -StepId "install-wsl" -State "failed" -Duration 10
        
        return @{
            success = $false
            rebootRequired = $false
        }
    }
}

<#
.SYNOPSIS
Ensures all prerequisites are installed, downloading and installing if needed

.PARAMETER RequiredTools
Array of tool names that are required

.PARAMETER InstallerMetadata
Optional hashtable of installer metadata from bundle

.RETURNS
Hashtable with results for each tool
#>
function Ensure-Prerequisites {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$RequiredTools,
        
        [Parameter(Mandatory=$false)]
        [hashtable]$InstallerMetadata = @{}
    )
    
    Emit-Status -StepId "check-prerequisites" -State "running" -Message "Checking prerequisites..."
    
    $results = @{}
    $tempDir = Join-Path $env:TEMP "buildsmith-installers"
    $rebootRequired = $false
    
    # Create temp directory for installers
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    }
    
    # SPECIAL CASE: Check WSL2 first if Docker is in required tools
    if ($RequiredTools -contains 'docker') {
        Emit-Log -StepId "check-prerequisites" -Level "info" -Text "Docker requires WSL2, checking WSL2 first..."
        
        $wslStatus = Test-PrerequisiteInstalled -ToolName 'wsl'
        
        if (-not $wslStatus.installed) {
            Emit-Log -StepId "check-prerequisites" -Level "warning" -Text "WSL2 not found, installing..."
            
            $wslResult = Install-WSL2
            
            if ($wslResult.success) {
                $results['wsl'] = @{
                    success = $true
                    installed = $true
                    version = 'newly installed'
                    action = 'installed'
                    rebootRequired = $wslResult.rebootRequired
                }
                
                if ($wslResult.rebootRequired) {
                    $rebootRequired = $true
                    Emit-Log -StepId "check-prerequisites" -Level "warning" -Text "⚠️ REBOOT REQUIRED: WSL2 installation requires system restart"
                    Emit-Log -StepId "check-prerequisites" -Level "warning" -Text "Please restart your computer and run setup again"
                }
            } else {
                $results['wsl'] = @{
                    success = $false
                    installed = $false
                    version = $null
                    action = 'install-failed'
                    error = 'WSL2 installation failed'
                }
                
                # WSL2 failed, Docker installation will also fail
                Emit-Log -StepId "check-prerequisites" -Level "error" -Text "Cannot proceed with Docker installation without WSL2"
            }
        } else {
            Emit-Log -StepId "check-prerequisites" -Level "success" -Text "WSL2 already installed (v$($wslStatus.version))"
            $results['wsl'] = @{
                success = $true
                installed = $true
                version = $wslStatus.version
                action = 'found'
            }
        }
    }
    
    foreach ($tool in $RequiredTools) {
        Emit-Log -StepId "check-prerequisites" -Level "info" -Text "Checking $tool..."
        
        # Map tool names to check command
        $checkName = switch ($tool) {
            'vscode' { 'code' }
            'nodejs' { 'node' }
            default { $tool }
        }
        
        $status = Test-PrerequisiteInstalled -ToolName $checkName
        
        if ($status.installed) {
            Emit-Log -StepId "check-prerequisites" -Level "success" -Text "$tool already installed (v$($status.version))"
            $results[$tool] = @{
                success = $true
                installed = $true
                version = $status.version
                action = 'found'
            }
        }
        else {
            Emit-Log -StepId "check-prerequisites" -Level "warning" -Text "$tool not found, will install..."
            
            # Special handling for WSL (Windows feature, not download)
            if ($tool -eq 'wsl') {
                $wslResult = Install-WSL2
                
                $results[$tool] = @{
                    success = $wslResult.success
                    installed = $wslResult.success
                    version = if ($wslResult.success) { 'newly installed' } else { $null }
                    action = if ($wslResult.success) { 'installed' } else { 'install-failed' }
                    rebootRequired = $wslResult.rebootRequired
                }
                
                if ($wslResult.rebootRequired) {
                    $rebootRequired = $true
                }
                
                continue
            }
            
            # Get download info
            $downloadInfo = Get-PrerequisiteDownloadInfo -ToolName $tool
            
            if ($downloadInfo.url) {
                # Download installer/archive
                $installerPath = Join-Path $tempDir $downloadInfo.fileName
                
                $downloaded = Get-PrerequisiteInstaller -DownloadUrl $downloadInfo.url -DestinationPath $installerPath
                
                if ($downloaded) {
                    # Check if it's a portable tool (archive) or regular installer
                    if ($downloadInfo.installArgs -eq $null -and ($installerPath -like "*.zip" -or $installerPath -like "*.7z")) {
                        # Portable tool - extract to permanent location
                        $portableResult = Install-PortableTool -ArchivePath $installerPath -ToolName $tool
                        
                        if ($portableResult.success) {
                            Emit-Log -StepId "check-prerequisites" -Level "warning" -Text "⚠️ PATH UPDATE REQUIRED: Add $($portableResult.path) to PATH"
                        }
                        
                        $results[$tool] = @{
                            success = $portableResult.success
                            installed = $portableResult.success
                            version = 'portable'
                            action = 'installed-portable'
                            path = $portableResult.path
                        }
                    }
                    else {
                        # Regular installer - run with WAIT
                        $installed = Install-Prerequisite -InstallerPath $installerPath -InstallArgs $downloadInfo.installArgs -ToolName $tool
                        
                        $results[$tool] = @{
                            success = $installed
                            installed = $installed
                            version = 'newly installed'
                            action = 'installed'
                        }
                    }
                }
                else {
                    $results[$tool] = @{
                        success = $false
                        installed = $false
                        version = $null
                        action = 'download-failed'
                        error = 'Failed to download installer'
                    }
                }
            }
            else {
                $results[$tool] = @{
                    success = $false
                    installed = $false
                    version = $null
                    action = 'no-download-url'
                    error = 'No download URL available'
                }
            }
        }
    }
    
    # Cleanup temp directory
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    
    # Add reboot info to results
    $results['_rebootRequired'] = $rebootRequired
    
    if ($rebootRequired) {
        Emit-Status -StepId "check-prerequisites" -State "warning" -Message "Prerequisites installed - REBOOT REQUIRED"
    } else {
        Emit-Result -StepId "check-prerequisites" -State "success" -Duration 5
    }
    
    return $results
}

Export-ModuleMember -Function @(
    'Test-PrerequisiteInstalled',
    'Get-PrerequisiteDownloadInfo',
    'Get-PrerequisiteInstaller',
    'Install-Prerequisite',
    'Install-PortableTool',
    'Install-WSL2',
    'Ensure-Prerequisites'
)
