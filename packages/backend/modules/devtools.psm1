# DevOps Tools Scanner Module
# Scans for installed DevOps tools and their versions

. "$PSScriptRoot/../common.ps1"

function Get-InstalledDevTools {
    <#
    .SYNOPSIS
        Scan for installed DevOps tools and CLI utilities
    .DESCRIPTION
        Detects common DevOps tools like terraform, kubectl, helm, docker-compose,
        AWS CLI, Azure CLI, Google Cloud SDK, Jenkins CLI, SonarQube Scanner, etc.
    .OUTPUTS
        Array of hashtables with tool name, version, and path
    #>
    
    try {
        $tools = @()
        
        # Define tools to scan for with their version commands
        $toolDefinitions = @(
            @{ Name = "Terraform"; Command = "terraform"; VersionArg = "--version"; VersionPattern = "Terraform v([\d\.]+)" }
            @{ Name = "kubectl"; Command = "kubectl"; VersionArg = "version --client --short"; VersionPattern = "v([\d\.]+)" }
            @{ Name = "Helm"; Command = "helm"; VersionArg = "version --short"; VersionPattern = "v([\d\.]+)" }
            @{ Name = "Docker Compose"; Command = "docker-compose"; VersionArg = "--version"; VersionPattern = "v?([\d\.]+)" }
            @{ Name = "AWS CLI"; Command = "aws"; VersionArg = "--version"; VersionPattern = "aws-cli/([\d\.]+)" }
            @{ Name = "Azure CLI"; Command = "az"; VersionArg = "version --output tsv"; VersionPattern = "azure-cli\s+([\d\.]+)" }
            @{ Name = "Google Cloud SDK"; Command = "gcloud"; VersionArg = "version"; VersionPattern = "Google Cloud SDK ([\d\.]+)" }
            @{ Name = "Jenkins CLI"; Command = "jenkins-cli"; VersionArg = "--version"; VersionPattern = "([\d\.]+)" }
            @{ Name = "SonarQube Scanner"; Command = "sonar-scanner"; VersionArg = "--version"; VersionPattern = "SonarScanner ([\d\.]+)" }
            @{ Name = "Ansible"; Command = "ansible"; VersionArg = "--version"; VersionPattern = "ansible \[core ([\d\.]+)\]" }
            @{ Name = "Packer"; Command = "packer"; VersionArg = "--version"; VersionPattern = "Packer v([\d\.]+)" }
            @{ Name = "Vagrant"; Command = "vagrant"; VersionArg = "--version"; VersionPattern = "Vagrant ([\d\.]+)" }
            @{ Name = "Pulumi"; Command = "pulumi"; VersionArg = "version"; VersionPattern = "v([\d\.]+)" }
            @{ Name = "ArgoCD CLI"; Command = "argocd"; VersionArg = "version --short --client"; VersionPattern = "v([\d\.]+)" }
            @{ Name = "Flux CLI"; Command = "flux"; VersionArg = "--version"; VersionPattern = "flux version ([\d\.]+)" }
            @{ Name = "Istioctl"; Command = "istioctl"; VersionArg = "version --short"; VersionPattern = "([\d\.]+)" }
            @{ Name = "jq"; Command = "jq"; VersionArg = "--version"; VersionPattern = "jq-([\d\.]+)" }
            @{ Name = "yq"; Command = "yq"; VersionArg = "--version"; VersionPattern = "version ([\d\.]+)" }
            @{ Name = "GitHub CLI"; Command = "gh"; VersionArg = "--version"; VersionPattern = "gh version ([\d\.]+)" }
            @{ Name = "GitLab CLI"; Command = "glab"; VersionArg = "version"; VersionPattern = "glab version ([\d\.]+)" }
        )
        
        Emit-Log -StepId "scan-devtools" -Level "info" -Text "Scanning for DevOps tools..."
        
        foreach ($toolDef in $toolDefinitions) {
            try {
                # Check if command exists in PATH
                $commandPath = Get-Command $toolDef.Command -ErrorAction SilentlyContinue
                
                if ($commandPath) {
                    # Try to get version
                    $versionOutput = ""
                    $version = "unknown"
                    
                    try {
                        # Run version command and capture output
                        $versionOutput = & $toolDef.Command $toolDef.VersionArg.Split(' ') 2>&1 | Out-String
                        
                        # Extract version using regex pattern
                        if ($versionOutput -match $toolDef.VersionPattern) {
                            $version = $matches[1]
                        }
                    }
                    catch {
                        Write-Verbose "Could not get version for $($toolDef.Name): $($_.Exception.Message)"
                    }
                    
                    $tools += @{
                        name = $toolDef.Name
                        command = $toolDef.Command
                        version = $version
                        path = $commandPath.Source
                        type = "devtool"
                    }
                    
                    Emit-Log -StepId "scan-devtools" -Level "info" -Text "Found $($toolDef.Name) v$version"
                }
            }
            catch {
                Write-Verbose "Error checking for $($toolDef.Name): $($_.Exception.Message)"
            }
        }
        
        Emit-Log -StepId "scan-devtools" -Level "success" -Text "Found $($tools.Count) DevOps tools"
        
        return $tools
    }
    catch {
        Emit-Log -StepId "scan-devtools" -Level "error" -Text "Error scanning DevOps tools: $($_.Exception.Message)"
        return @()
    }
}

function Install-DevTool {
    <#
    .SYNOPSIS
        Install a DevOps tool on the target machine
    .DESCRIPTION
        Installs DevOps tools using the appropriate method (winget, chocolatey, or direct download).
        Supports terraform, kubectl, helm, AWS CLI, Azure CLI, and more.
    .PARAMETER Name
        The name of the tool to install
    .PARAMETER Version
        The version to install (optional, installs latest if not specified)
    .PARAMETER Command
        The command name used to invoke the tool
    .OUTPUTS
        Hashtable with success status and installation details
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$false)]
        [string]$Version,
        
        [Parameter(Mandatory=$true)]
        [string]$Command
    )
    
    try {
        Emit-Log -StepId "setup-devtools" -Level "info" -Text "Installing $Name..."
        
        # Check if already installed
        $existing = Get-Command $Command -ErrorAction SilentlyContinue
        if ($existing) {
            Emit-Log -StepId "setup-devtools" -Level "info" -Text "$Name is already installed at $($existing.Source)"
            return @{
                success = $true
                alreadyInstalled = $true
                path = $existing.Source
            }
        }
        
        # Tool installation mappings
        $installMap = @{
            "Terraform" = @{ Method = "winget"; Package = "Hashicorp.Terraform" }
            "kubectl" = @{ Method = "winget"; Package = "Kubernetes.kubectl" }
            "Helm" = @{ Method = "winget"; Package = "Helm.Helm" }
            "Docker Compose" = @{ Method = "winget"; Package = "Docker.DockerCompose" }
            "AWS CLI" = @{ Method = "winget"; Package = "Amazon.AWSCLI" }
            "Azure CLI" = @{ Method = "winget"; Package = "Microsoft.AzureCLI" }
            "Google Cloud SDK" = @{ Method = "custom"; Url = "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe" }
            "Ansible" = @{ Method = "pip"; Package = "ansible" }
            "Packer" = @{ Method = "winget"; Package = "Hashicorp.Packer" }
            "Vagrant" = @{ Method = "winget"; Package = "Hashicorp.Vagrant" }
            "Pulumi" = @{ Method = "winget"; Package = "Pulumi.Pulumi" }
            "ArgoCD CLI" = @{ Method = "chocolatey"; Package = "argocd-cli" }
            "Flux CLI" = @{ Method = "chocolatey"; Package = "flux" }
            "jq" = @{ Method = "winget"; Package = "jqlang.jq" }
            "yq" = @{ Method = "winget"; Package = "MikeFarah.yq" }
            "GitHub CLI" = @{ Method = "winget"; Package = "GitHub.cli" }
            "GitLab CLI" = @{ Method = "winget"; Package = "GitLab.Glab" }
            "SonarQube Scanner" = @{ Method = "chocolatey"; Package = "sonarqube-scanner.portable" }
        }
        
        $installInfo = $installMap[$Name]
        
        if (-not $installInfo) {
            Emit-Log -StepId "setup-devtools" -Level "warning" -Text "No installation method defined for $Name"
            return @{
                success = $false
                error = "No installation method available"
            }
        }
        
        # Install based on method
        switch ($installInfo.Method) {
            "winget" {
                $wingetCmd = "winget install --id $($installInfo.Package) --exact --silent --accept-package-agreements --accept-source-agreements"
                if ($Version) {
                    $wingetCmd += " --version $Version"
                }
                
                Emit-Log -StepId "setup-devtools" -Level "info" -Text "Running: $wingetCmd"
                $result = Invoke-Expression $wingetCmd 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "setup-devtools" -Level "success" -Text "Successfully installed $Name"
                    return @{
                        success = $true
                        method = "winget"
                        package = $installInfo.Package
                    }
                } else {
                    throw "winget install failed with exit code $LASTEXITCODE"
                }
            }
            
            "chocolatey" {
                # Check if chocolatey is installed
                $chocoCmd = Get-Command choco -ErrorAction SilentlyContinue
                if (-not $chocoCmd) {
                    throw "Chocolatey is not installed. Please install Chocolatey first."
                }
                
                $chocoInstallCmd = "choco install $($installInfo.Package) -y"
                if ($Version) {
                    $chocoInstallCmd += " --version=$Version"
                }
                
                Emit-Log -StepId "setup-devtools" -Level "info" -Text "Running: $chocoInstallCmd"
                $result = Invoke-Expression $chocoInstallCmd 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "setup-devtools" -Level "success" -Text "Successfully installed $Name"
                    return @{
                        success = $true
                        method = "chocolatey"
                        package = $installInfo.Package
                    }
                } else {
                    throw "chocolatey install failed with exit code $LASTEXITCODE"
                }
            }
            
            "pip" {
                # Check if pip is installed
                $pipCmd = Get-Command pip -ErrorAction SilentlyContinue
                if (-not $pipCmd) {
                    throw "pip is not installed. Please install Python and pip first."
                }
                
                $pipInstallCmd = "pip install $($installInfo.Package)"
                if ($Version) {
                    $pipInstallCmd += "==$Version"
                }
                
                Emit-Log -StepId "setup-devtools" -Level "info" -Text "Running: $pipInstallCmd"
                $result = Invoke-Expression $pipInstallCmd 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Emit-Log -StepId "setup-devtools" -Level "success" -Text "Successfully installed $Name"
                    return @{
                        success = $true
                        method = "pip"
                        package = $installInfo.Package
                    }
                } else {
                    throw "pip install failed with exit code $LASTEXITCODE"
                }
            }
            
            "custom" {
                Emit-Log -StepId "setup-devtools" -Level "warning" -Text "$Name requires manual installation from $($installInfo.Url)"
                return @{
                    success = $false
                    error = "Manual installation required"
                    url = $installInfo.Url
                }
            }
        }
    }
    catch {
        Emit-Log -StepId "setup-devtools" -Level "error" -Text "Failed to install ${Name}: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

Export-ModuleMember -Function Get-InstalledDevTools, Install-DevTool
