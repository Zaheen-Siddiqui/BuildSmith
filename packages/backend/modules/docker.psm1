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
        
        # Check if Docker daemon is running
        $dockerTest = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            $errorMsg = if ($dockerTest -match "error during connect") {
                "Docker Desktop is not running. Please start Docker Desktop and try again."
            } else {
                "Cannot connect to Docker daemon: $dockerTest"
            }
            Emit-Log -StepId $stepId -Level "error" -Text $errorMsg
            Emit-Result -StepId $stepId -State "failed" -Error $errorMsg
            return @()
        }
        
        # Get list of images
        $images = docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}" 2>&1 | Where-Object { $_ -is [string] -and $_ -match '\|' } | ForEach-Object {
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

function Pull-DockerImage {
    <#
    .SYNOPSIS
        Pull Docker image from registry with progress tracking
    .PARAMETER ImageName
        The image name (e.g., "nginx:latest", "postgres:14")
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ImageName,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "pull-docker-$ImageName"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Pulling Docker image: $ImageName"
        Emit-Log -StepId $StepId -Level "info" -Text "Downloading from registry..."
        
        # Check if Docker is running
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker is not running. Please start Docker Desktop."
        }
        
        # Start docker pull process
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "docker"
        $processInfo.Arguments = "pull $ImageName"
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        
        # Track progress
        $currentLayer = 0
        $totalLayers = 0
        $lastProgress = 0
        
        $outputHandler = {
            param($sender, $e)
            if ($e.Data) {
                $line = $e.Data
                
                # Parse Docker pull output
                # Format: "Pulling from library/nginx"
                # Format: "a1b2c3d4e5f6: Downloading [==>  ] 1.234MB/5.678MB"
                
                if ($line -match "Downloading.*\[.*\].*(\d+(\.\d+)?[KMG]?B)/(\d+(\.\d+)?[KMG]?B)") {
                    # Extract progress information
                    Emit-Log -StepId $StepId -Level "info" -Text $line
                }
                elseif ($line -match "Pull complete|Already exists|Downloaded newer image") {
                    Emit-Log -StepId $StepId -Level "info" -Text $line
                }
                elseif ($line -match "Digest:|Status:") {
                    Emit-Log -StepId $StepId -Level "info" -Text $line
                }
            }
        }
        
        Register-ObjectEvent -InputObject $process -EventName "OutputDataReceived" -Action $outputHandler | Out-Null
        Register-ObjectEvent -InputObject $process -EventName "ErrorDataReceived" -Action $outputHandler | Out-Null
        
        $process.Start() | Out-Null
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        $process.WaitForExit()
        
        # Cleanup event handlers
        Get-EventSubscriber | Where-Object { $_.SourceObject -eq $process } | Unregister-Event
        
        $exitCode = $process.ExitCode
        
        if ($exitCode -eq 0) {
            Emit-Log -StepId $StepId -Level "success" -Text "Image pulled successfully: $ImageName"
            Emit-Result -StepId $StepId -State "success" -Duration 30
            return $true
        }
        else {
            throw "Docker pull failed with exit code $exitCode"
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error pulling image: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Load-DockerImage {
    <#
    .SYNOPSIS
        Load Docker image from tar file
    .PARAMETER TarPath
        Path to the tar file containing the Docker image
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$TarPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "load-docker-$(Split-Path $TarPath -Leaf)"
    )
    
    try {
        if (!(Test-Path $TarPath)) {
            throw "Tar file not found: $TarPath"
        }
        
        Emit-Status -StepId $StepId -State "running" -Message "Loading Docker image from tar..."
        Emit-Log -StepId $StepId -Level "info" -Text "File: $TarPath"
        
        $sizeMB = [math]::Round((Get-Item $TarPath).Length / 1MB, 2)
        Emit-Log -StepId $StepId -Level "info" -Text "Size: $sizeMB MB"
        
        # Load image with output capture
        $output = docker load -i $TarPath 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            # Parse loaded image name from output
            $imageName = "unknown"
            if ($output -match "Loaded image: (.+)") {
                $imageName = $Matches[1]
            }
            
            Emit-Log -StepId $StepId -Level "success" -Text "Loaded image: $imageName"
            Emit-Result -StepId $StepId -State "success" -Duration 10
            return $true
        }
        else {
            throw "Docker load failed: $output"
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error loading image: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return $false
    }
}

function Save-DockerImage {
    <#
    .SYNOPSIS
        Save Docker image to tar file
    .PARAMETER ImageName
        The image name to save
    .PARAMETER OutputPath
        Path where the tar file will be saved
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ImageName,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "save-docker-$ImageName"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Saving Docker image: $ImageName"
        Emit-Log -StepId $StepId -Level "info" -Text "Output: $OutputPath"
        
        # Ensure output directory exists
        $outputDir = Split-Path -Parent $OutputPath
        if ($outputDir -and !(Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }
        
        # Save image
        $output = docker save -o $OutputPath $ImageName 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $sizeMB = [math]::Round((Get-Item $OutputPath).Length / 1MB, 2)
            Emit-Log -StepId $StepId -Level "success" -Text "Saved successfully: $sizeMB MB"
            Emit-Result -StepId $StepId -State "success" -Duration 15
            return $true
        }
        else {
            throw "Docker save failed: $output"
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error saving image: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        
        # Cleanup partial file
        if (Test-Path $OutputPath) {
            Remove-Item $OutputPath -Force -ErrorAction SilentlyContinue
        }
        
        return $false
    }
}

function Get-DockerImages {
    <#
    .SYNOPSIS
        List all Docker images on the system
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$false)]
        [string]$StepId = "scan-docker"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Scanning Docker images..."
        Emit-Log -StepId $StepId -Level "info" -Text "Checking Docker installation..."
        
        # Check if Docker command exists
        $dockerCmd = Get-Command "docker" -ErrorAction SilentlyContinue
        if (-not $dockerCmd) {
            Emit-Log -StepId $StepId -Level "warn" -Text "Docker not found in PATH"
            Emit-Result -StepId $StepId -State "skipped"
            return @()
        }
        
        # Check if Docker is running
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Emit-Log -StepId $StepId -Level "warn" -Text "Docker is not running"
            Emit-Result -StepId $StepId -State "skipped"
            return @()
        }
        
        # Get list of images
        $imagesOutput = docker images --format "{{.Repository}}:{{.Tag}}|{{.ID}}|{{.Size}}" 2>&1
        
        $images = @($imagesOutput | Where-Object { $_ -and $_ -match '\|' } | ForEach-Object {
            $parts = $_ -split '\|'
            @{
                image = $parts[0]
                id = $parts[1]
                size = $parts[2]
            }
        })
        
        Emit-Log -StepId $StepId -Level "info" -Text "Found $($images.Count) Docker images"
        Emit-Result -StepId $StepId -State "success" -Duration 2
        
        return $images
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error scanning Docker images: $($_.Exception.Message)"
        Emit-Result -StepId $StepId -State "failed" -Error $_.Exception.Message
        return @()
    }
}

function Restore-DockerImages {
    <#
    .SYNOPSIS
        Restore Docker images from bundle or pull from registry
    .PARAMETER Images
        Array of image objects with name, tag, and optional tarPath
    .OUTPUTS
        Hashtable with success status and results
    #>
    param(
        [Parameter(Mandatory=$true)]
        [array]$Images
    )
    
    try {
        Emit-Log -StepId "setup-docker" -Level "info" -Text "Restoring $($Images.Count) Docker images..."
        
        # Check if Docker is installed
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Emit-Log -StepId "setup-docker" -Level "error" -Text "Docker is not installed"
            return @{
                success = $false
                error = "Docker not installed"
            }
        }
        
        # Check if Docker daemon is running
        $dockerTest = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Emit-Log -StepId "setup-docker" -Level "error" -Text "Docker daemon is not running"
            return @{
                success = $false
                error = "Docker daemon not running"
            }
        }
        
        $results = @()
        $successCount = 0
        $failedCount = 0
        
        foreach ($img in $Images) {
            $imageName = "$($img.repository):$($img.tag)"
            
            try {
                # If tar file exists in bundle, load from file
                if ($img.tarPath -and (Test-Path $img.tarPath)) {
                    Emit-Log -StepId "setup-docker" -Level "info" -Text "Loading $imageName from bundle..."
                    
                    $loadResult = Load-DockerImage -TarPath $img.tarPath -StepId "setup-docker"
                    
                    if ($loadResult.success) {
                        $successCount++
                        $results += @{
                            image = $imageName
                            success = $true
                            method = "load"
                        }
                    } else {
                        throw "Failed to load image"
                    }
                }
                # Otherwise pull from registry
                else {
                    Emit-Log -StepId "setup-docker" -Level "info" -Text "Pulling $imageName from registry..."
                    
                    $pullResult = Pull-DockerImage -ImageName $img.repository -Tag $img.tag -StepId "setup-docker"
                    
                    if ($pullResult.success) {
                        $successCount++
                        $results += @{
                            image = $imageName
                            success = $true
                            method = "pull"
                        }
                    } else {
                        throw "Failed to pull image"
                    }
                }
            }
            catch {
                $failedCount++
                $results += @{
                    image = $imageName
                    success = $false
                    error = $_.Exception.Message
                }
                Emit-Log -StepId "setup-docker" -Level "error" -Text "Failed to restore ${imageName}: $($_.Exception.Message)"
            }
        }
        
        Emit-Log -StepId "setup-docker" -Level "success" -Text "Restored $successCount images, $failedCount failed"
        
        return @{
            success = ($failedCount -eq 0)
            results = $results
            successCount = $successCount
            failedCount = $failedCount
        }
    }
    catch {
        Emit-Log -StepId "setup-docker" -Level "error" -Text "Error restoring images: $($_.Exception.Message)"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

# Export all public functions
Export-ModuleMember -Function Get-DockerImages, Save-DockerImage, Load-DockerImage, Pull-DockerImage, Restore-DockerImages
