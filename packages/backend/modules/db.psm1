# BuildSmith Backend - Database Module
# Handles database connection and backup operations

# Note: common.ps1 functions are loaded by parent scripts

function Get-DatabaseConnections {
    <#
    .SYNOPSIS
        Scan for database connections (MongoDB Compass, MySQL Workbench, etc.)
    .DESCRIPTION
        Scans common database GUI tools for saved connections
    #>
    param()
    
    try {
        $connections = @()
        
        # Check for MongoDB Compass connections (try both paths)
        $compassPaths = @(
            "$env:APPDATA\MongoDB Compass\Connections",
            "$env:APPDATA\MongoDB Compass Community\Connections"
        )
        
        $compassFound = $false
        foreach ($compassConfigPath in $compassPaths) {
            if (Test-Path $compassConfigPath) {
                try {
                    # Read file with retry if locked
                    $retryCount = 0
                    $maxRetries = 3
                    $compassData = $null
                    
                    while ($retryCount -lt $maxRetries -and $null -eq $compassData) {
                        try {
                            $compassData = Get-Content $compassConfigPath -Raw -ErrorAction Stop
                            break
                        } catch {
                            $retryCount++
                            if ($retryCount -lt $maxRetries) {
                                Start-Sleep -Milliseconds 200
                            }
                        }
                    }
                    
                    if ($null -ne $compassData) {
                        $compassConnections = $compassData | ConvertFrom-Json
                        foreach ($conn in $compassConnections.connections) {
                            $connections += @{
                                type = "mongodb"
                                source = "compass"
                                name = if ($conn.name) { $conn.name } else { "$($conn.hostname):$($conn.port)" }
                                host = if ($conn.hostname) { $conn.hostname } else { "localhost" }
                                port = if ($conn.port) { $conn.port } else { 27017 }
                                database = if ($conn.database) { $conn.database } else { "" }
                            }
                        }
                        $compassFound = $true
                        break
                    } else {
                        Write-Warning "Could not read MongoDB Compass connections file (may be locked by Compass). Try closing MongoDB Compass and running the scan again."
                    }
                } catch {
                    Write-Warning "Failed to parse MongoDB Compass connections: $($_.Exception.Message)"
                }
            }
        }
        
        if (-not $compassFound) {
            Write-Verbose "MongoDB Compass connections not found at any expected location"
        }
        
        # Check for MySQL Workbench connections
        $mysqlConfigPath = "$env:APPDATA\MySQL\Workbench\connections.xml"
        if (Test-Path $mysqlConfigPath) {
            try {
                [xml]$mysqlConfig = Get-Content $mysqlConfigPath
                foreach ($conn in $mysqlConfig.data.value) {
                    $connName = $conn.SelectSingleNode("//value[@key='name']").'#text'
                    $connHost = $conn.SelectSingleNode("//value[@key='hostName']").'#text'
                    $connPort = $conn.SelectSingleNode("//value[@key='port']").'#text'
                    
                    $connections += @{
                        type = "mysql"
                        source = "workbench"
                        name = $connName
                        host = $connHost
                        port = $connPort
                    }
                }
            } catch {
                Write-Warning "Failed to parse MySQL Workbench connections: $($_.Exception.Message)"
            }
        }
        
        return $connections
    }
    catch {
        Write-Warning "Error scanning databases: $($_.Exception.Message)"
        return @()
    }
}

function Export-MongoConnections {
    <#
    .SYNOPSIS
        Export MongoDB Compass connections to JSON file
    .PARAMETER OutputPath
        Path to save the connections JSON file
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$OutputPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "export-mongo-connections"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Exporting MongoDB connections..."
        Emit-Log -StepId $StepId -Level "info" -Text "Scanning MongoDB Compass connections..."
        
        # Try both possible MongoDB Compass paths
        $compassPaths = @(
            "$env:APPDATA\MongoDB Compass\Connections",
            "$env:APPDATA\MongoDB Compass Community\Connections"
        )
        
        $compassConfigPath = $null
        foreach ($path in $compassPaths) {
            if (Test-Path $path) {
                $compassConfigPath = $path
                break
            }
        }
        
        if (-not $compassConfigPath) {
            Emit-Log -StepId $StepId -Level "warn" -Text "MongoDB Compass connections not found"
            Emit-Status -StepId $StepId -State "complete" -Message "No connections found"
            return $null
        }
        
        # Read and parse Compass connections with retry for locked files
        $retryCount = 0
        $maxRetries = 3
        $compassData = $null
        
        while ($retryCount -lt $maxRetries -and $null -eq $compassData) {
            try {
                $rawData = Get-Content $compassConfigPath -Raw -ErrorAction Stop
                $compassData = $rawData | ConvertFrom-Json
                break
            } catch {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Emit-Log -StepId $StepId -Level "debug" -Text "File locked, retrying... ($retryCount/$maxRetries)"
                    Start-Sleep -Milliseconds 200
                } else {
                    throw "Cannot read MongoDB Compass connections (file may be locked). Please close MongoDB Compass and try again."
                }
            }
        }
        
        # Export to output path
        $compassData | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding UTF8
        
        $connCount = $compassData.connections.Count
        Emit-Log -StepId $StepId -Level "success" -Text "Exported $connCount MongoDB connections"
        Emit-Status -StepId $StepId -State "complete" -Message "Export complete"
        
        return @{
            success = $true
            count = $connCount
            path = $OutputPath
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error exporting MongoDB connections: $($_.Exception.Message)"
        Emit-Status -StepId $StepId -State "failed" -Message "Export failed"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Import-CompassConnections {
    <#
    .SYNOPSIS
        Import MongoDB Compass connections from JSON file
    .PARAMETER ConnectionsFile
        Path to the connections JSON file
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ConnectionsFile,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "import-compass-connections"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Importing MongoDB Compass connections..."
        Emit-Log -StepId $StepId -Level "info" -Text "Reading connections from $ConnectionsFile"
        
        if (-not (Test-Path $ConnectionsFile)) {
            throw "Connections file not found: $ConnectionsFile"
        }
        
        # Read connections data
        $connectionsData = Get-Content $ConnectionsFile -Raw | ConvertFrom-Json
        
        # Target path for Compass connections - try to find existing installation
        $compassPaths = @(
            "$env:APPDATA\MongoDB Compass\Connections",
            "$env:APPDATA\MongoDB Compass Community\Connections"
        )
        
        $compassConfigPath = $null
        foreach ($path in $compassPaths) {
            if (Test-Path (Split-Path $path -Parent)) {
                $compassConfigPath = $path
                break
            }
        }
        
        # Default to regular MongoDB Compass if neither exists
        if (-not $compassConfigPath) {
            $compassConfigPath = "$env:APPDATA\MongoDB Compass\Connections"
        }
        
        $compassDir = Split-Path $compassConfigPath -Parent
        
        # Create directory if it doesn't exist
        if (-not (Test-Path $compassDir)) {
            New-Item -ItemType Directory -Path $compassDir -Force | Out-Null
            Emit-Log -StepId $StepId -Level "debug" -Text "Created MongoDB Compass config directory"
        }
        
        # Merge with existing connections if present
        if (Test-Path $compassConfigPath) {
            Emit-Log -StepId $StepId -Level "info" -Text "Merging with existing connections"
            $existingData = Get-Content $compassConfigPath -Raw | ConvertFrom-Json
            
            # Merge connections (avoid duplicates by connection name)
            $existingNames = @($existingData.connections | ForEach-Object { $_.name })
            foreach ($conn in $connectionsData.connections) {
                if ($existingNames -notcontains $conn.name) {
                    $existingData.connections += $conn
                }
            }
            
            $connectionsData = $existingData
        }
        
        # Write connections file
        $connectionsData | ConvertTo-Json -Depth 10 | Out-File $compassConfigPath -Encoding UTF8
        
        $connCount = $connectionsData.connections.Count
        Emit-Log -StepId $StepId -Level "success" -Text "Imported $connCount MongoDB connections"
        Emit-Status -StepId $StepId -State "complete" -Message "Import complete"
        
        return @{
            success = $true
            count = $connCount
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error importing connections: $($_.Exception.Message)"
        Emit-Status -StepId $StepId -State "failed" -Message "Import failed"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Export-MongoDump {
    <#
    .SYNOPSIS
        Create MongoDB dump for specified database
    .PARAMETER ConnectionString
        MongoDB connection string
    .PARAMETER Database
        Database name to dump
    .PARAMETER OutputPath
        Directory to save the dump
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ConnectionString,
        
        [Parameter(Mandatory=$true)]
        [string]$Database,
        
        [Parameter(Mandatory=$true)]
        [string]$OutputPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "export-mongo-dump"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Creating MongoDB dump..."
        Emit-Log -StepId $StepId -Level "info" -Text "Dumping database: $Database"
        
        # Check if mongodump is available
        $mongoDump = Get-Command "mongodump" -ErrorAction SilentlyContinue
        if (-not $mongoDump) {
            throw "mongodump not found. Please install MongoDB Database Tools"
        }
        
        # Create output directory
        if (-not (Test-Path $OutputPath)) {
            New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
        }
        
        # Build mongodump command
        $dumpArgs = @(
            "--uri=`"$ConnectionString`""
            "--db=$Database"
            "--out=`"$OutputPath`""
        )
        
        Emit-Log -StepId $StepId -Level "debug" -Text "Running mongodump..."
        
        # Execute mongodump
        $process = Start-Process -FilePath "mongodump" `
            -ArgumentList $dumpArgs `
            -NoNewWindow -Wait -PassThru `
            -RedirectStandardOutput "$env:TEMP\mongodump-out.log" `
            -RedirectStandardError "$env:TEMP\mongodump-err.log"
        
        if ($process.ExitCode -eq 0) {
            $dumpSize = (Get-ChildItem $OutputPath -Recurse | Measure-Object -Property Length -Sum).Sum
            $dumpSizeMB = [math]::Round($dumpSize / 1MB, 2)
            
            Emit-Log -StepId $StepId -Level "success" -Text "Dump created: $dumpSizeMB MB"
            Emit-Status -StepId $StepId -State "complete" -Message "Dump complete"
            
            return @{
                success = $true
                path = $OutputPath
                size = $dumpSize
            }
        }
        else {
            $errorLog = Get-Content "$env:TEMP\mongodump-err.log" -Raw
            throw "mongodump failed (exit code: $($process.ExitCode)): $errorLog"
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error creating dump: $($_.Exception.Message)"
        Emit-Status -StepId $StepId -State "failed" -Message "Dump failed"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
    finally {
        # Cleanup temp logs
        Remove-Item "$env:TEMP\mongodump-*.log" -Force -ErrorAction SilentlyContinue
    }
}

function Restore-MongoDump {
    <#
    .SYNOPSIS
        Restore MongoDB dump to specified database
    .PARAMETER ConnectionString
        MongoDB connection string
    .PARAMETER Database
        Target database name
    .PARAMETER DumpPath
        Path to the dump directory
    .PARAMETER StepId
        Step identifier for event emission
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ConnectionString,
        
        [Parameter(Mandatory=$true)]
        [string]$Database,
        
        [Parameter(Mandatory=$true)]
        [string]$DumpPath,
        
        [Parameter(Mandatory=$false)]
        [string]$StepId = "restore-mongo-dump"
    )
    
    try {
        Emit-Status -StepId $StepId -State "running" -Message "Restoring MongoDB dump..."
        Emit-Log -StepId $StepId -Level "info" -Text "Restoring to database: $Database"
        
        # Check if mongorestore is available
        $mongoRestore = Get-Command "mongorestore" -ErrorAction SilentlyContinue
        if (-not $mongoRestore) {
            throw "mongorestore not found. Please install MongoDB Database Tools"
        }
        
        # Verify dump path exists
        if (-not (Test-Path $DumpPath)) {
            throw "Dump path not found: $DumpPath"
        }
        
        # Build mongorestore command
        $restoreArgs = @(
            "--uri=`"$ConnectionString`""
            "--db=$Database"
            "--dir=`"$DumpPath\$Database`""
            "--drop"  # Drop existing collections before restore
        )
        
        Emit-Log -StepId $StepId -Level "debug" -Text "Running mongorestore..."
        
        # Execute mongorestore
        $process = Start-Process -FilePath "mongorestore" `
            -ArgumentList $restoreArgs `
            -NoNewWindow -Wait -PassThru `
            -RedirectStandardOutput "$env:TEMP\mongorestore-out.log" `
            -RedirectStandardError "$env:TEMP\mongorestore-err.log"
        
        if ($process.ExitCode -eq 0) {
            $outLog = Get-Content "$env:TEMP\mongorestore-out.log" -Raw
            
            # Parse output for collection count
            $collectionMatches = [regex]::Matches($outLog, "restoring (\w+)\.(\w+)")
            $collectionCount = $collectionMatches.Count
            
            Emit-Log -StepId $StepId -Level "success" -Text "Restored $collectionCount collections"
            Emit-Status -StepId $StepId -State "complete" -Message "Restore complete"
            
            return @{
                success = $true
                collections = $collectionCount
            }
        }
        else {
            $errorLog = Get-Content "$env:TEMP\mongorestore-err.log" -Raw
            throw "mongorestore failed (exit code: $($process.ExitCode)): $errorLog"
        }
    }
    catch {
        Emit-Log -StepId $StepId -Level "error" -Text "Error restoring dump: $($_.Exception.Message)"
        Emit-Status -StepId $StepId -State "failed" -Message "Restore failed"
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
    finally {
        # Cleanup temp logs
        Remove-Item "$env:TEMP\mongorestore-*.log" -Force -ErrorAction SilentlyContinue
    }
}

Export-ModuleMember -Function Get-DatabaseConnections, Export-MongoConnections, Import-CompassConnections, Export-MongoDump, Restore-MongoDump
