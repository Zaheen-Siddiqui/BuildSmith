# BuildSmith Backend - Installers Module
# Handles application installation operations

Import-Module "$PSScriptRoot/common.psm1" -Force

function Install-Application {
    <#
    .SYNOPSIS
        Install an application from installer file
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$InstallerPath,
        
        [Parameter(Mandatory=$false)]
        [string]$AppName,
        
        [Parameter(Mandatory=$false)]
        [string[]]$SilentArgs = @()
    )
    
    $stepId = "install-$AppName"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Installing $AppName..."
        Emit-Log -StepId $stepId -Level "info" -Text "Installer: $InstallerPath"
        
        # Detect installer type
        $extension = [System.IO.Path]::GetExtension($InstallerPath).ToLower()
        
        switch ($extension) {
            ".msi" {
                $args = @("/i", "`"$InstallerPath`"", "/qn", "/norestart") + $SilentArgs
                $process = Start-Process -FilePath "msiexec.exe" -ArgumentList $args -Wait -PassThru
            }
            ".exe" {
                $args = @("/S", "/SILENT", "/VERYSILENT") + $SilentArgs
                $process = Start-Process -FilePath $InstallerPath -ArgumentList $args -Wait -PassThru
            }
            default {
                throw "Unsupported installer type: $extension"
            }
        }
        
        if ($process.ExitCode -eq 0) {
            Emit-Log -StepId $stepId -Level "success" -Text "$AppName installed successfully"
            Emit-Result -StepId $stepId -State "success" -Duration 30
            return $true
        }
        elseif ($process.ExitCode -eq 3010) {
            Emit-Log -StepId $stepId -Level "warn" -Text "$AppName installed but requires reboot"
            Emit-ManualAction -StepId $stepId -Action "reboot" -Message "Installation complete but reboot required" -Instructions @("Save your work", "Restart your computer", "Resume installation")
            Emit-Result -StepId $stepId -State "success" -Duration 30
            return $true
        }
        else {
            throw "Installation failed with exit code $($process.ExitCode)"
        }
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error installing $AppName`: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Download-File {
    <#
    .SYNOPSIS
        Download a file from URL with progress
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Url,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "download"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Downloading file..."
        Emit-Log -StepId $StepId -Level "info" -Text "URL: $Url"
        
        # Simple download (real implementation would show progress)
        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
        
        $size = (Get-Item $OutputPath).Length / 1MB
        Emit-Log -StepId $StepId -Level "success" -Text "Downloaded ${size:N2} MB"
        Emit-Result -StepId $StepId -State "success" -Duration 15
        
        return $true
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Download failed: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Test-Checksum {
    <#
    .SYNOPSIS
        Verify file checksum
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

Export-ModuleMember -Function Install-Application, Download-File, Test-Checksum
