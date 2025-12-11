# BuildSmith Backend - Docker Module
# Handles Docker image operations

Import-Module "$PSScriptRoot/common.psm1" -Force

function Get-DockerImages {
    <#
    .SYNOPSIS
        Scan and list all Docker images on the system
    #>
    param()
    
    $stepId = "scan-docker"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Scanning Docker images..."
        Emit-Log -StepId $stepId -Level "info" -Text "Checking Docker installation..."
        
        if (-not (Test-CommandExists "docker")) {
            Emit-Log -StepId $stepId -Level "warn" -Text "Docker not installed"
            Emit-Result -StepId $stepId -State "skipped"
            return @()
        }
        
        # Get list of images
        $images = docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}" | ForEach-Object {
            $parts = $_ -split '\|'
            @{
                image = $parts[0]
                id = $parts[1]
                size = $parts[2]
            }
        }
        
        Emit-Log -StepId $stepId -Level "info" -Text "Found $($images.Count) Docker images"
        Emit-Result -StepId $stepId -State "success" -Duration 2
        
        return $images
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error scanning Docker images: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return @()
    }
}

function Save-DockerImage {
    <#
    .SYNOPSIS
        Save Docker image to tar file
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ImageName,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath
    )
    
    $stepId = "save-docker-$ImageName"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Saving Docker image $ImageName..."
        Emit-Log -StepId $stepId -Level "info" -Text "Exporting image to $OutputPath"
        
        # Save image
        $process = Start-Process -FilePath "docker" -ArgumentList "save", "-o", $OutputPath, $ImageName -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            $size = (Get-Item $OutputPath).Length / 1MB
            Emit-Log -StepId $stepId -Level "success" -Text "Saved image (${size:N2} MB)"
            Emit-Result -StepId $stepId -State "success" -Duration 5
            return $true
        }
        else {
            throw "Docker save failed with exit code $($process.ExitCode)"
        }
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error saving image: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Restore-DockerImage {
    <#
    .SYNOPSIS
        Restore Docker image from tar file
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$TarPath
    )
    
    $stepId = "restore-docker-$(Split-Path $TarPath -Leaf)"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Restoring Docker image..."
        Emit-Log -StepId $stepId -Level "info" -Text "Loading image from $TarPath"
        
        # Load image
        $process = Start-Process -FilePath "docker" -ArgumentList "load", "-i", $TarPath -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Emit-Log -StepId $stepId -Level "success" -Text "Image loaded successfully"
            Emit-Result -StepId $stepId -State "success" -Duration 10
            return $true
        }
        else {
            throw "Docker load failed with exit code $($process.ExitCode)"
        }
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error loading image: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Install-DockerImage {
    <#
    .SYNOPSIS
        Pull Docker image from registry
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ImageName
    )
    
    $stepId = "pull-docker-$ImageName"
    
    try {
        Emit-Status -StepId $stepId -State "running" -Message "Pulling Docker image $ImageName..."
        Emit-Log -StepId $stepId -Level "info" -Text "Downloading from Docker Hub..."
        
        # Pull image (this is a stub - real implementation would parse progress)
        $process = Start-Process -FilePath "docker" -ArgumentList "pull", $ImageName -NoNewWindow -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Emit-Log -StepId $stepId -Level "success" -Text "Image pulled successfully"
            Emit-Result -StepId $stepId -State "success" -Duration 30
            return $true
        }
        else {
            throw "Docker pull failed with exit code $($process.ExitCode)"
        }
    }
    catch {
        Emit-Log -StepId $stepId -Level "error" -Text "Error pulling image: $($_.Exception.Message)"
        Emit-Result -StepId $stepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

Export-ModuleMember -Function Get-DockerImages, Save-DockerImage, Restore-DockerImage, Install-DockerImage
