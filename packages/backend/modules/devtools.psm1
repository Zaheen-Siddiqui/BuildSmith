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

Export-ModuleMember -Function Get-InstalledDevTools
