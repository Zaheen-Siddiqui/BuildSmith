# BuildSmith Backend - Common Helper Functions
# This module provides shared utilities for all backend modules

# ============================================================================
# Event Emission Functions
# ============================================================================

function Emit-Status {
    <#
    .SYNOPSIS
        Emit a status event to the frontend
    .PARAMETER StepId
        Unique identifier for the step
    .PARAMETER State
        State: pending, running, success, failed, requires_manual, reboot_required, skipped
    .PARAMETER Message
        Human-readable status message
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$StepId,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet('pending', 'running', 'success', 'failed', 'requires_manual', 'reboot_required', 'skipped')]
        [string]$State,
        
        [Parameter(Mandatory=$true)]
        [string]$Message
    )
    
    $event = @{
        type = "status"
        stepId = $StepId
        state = $State
        message = $Message
        timestamp = (Get-Date -Format "o")
    }
    
    $event | ConvertTo-Json -Compress | Write-Output
}

function Emit-Log {
    <#
    .SYNOPSIS
        Emit a log event to the frontend
    .PARAMETER StepId
        Unique identifier for the step
    .PARAMETER Level
        Log level: debug, info, warn, error, success
    .PARAMETER Text
        Log message text
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$StepId,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet('debug', 'info', 'warn', 'error', 'success')]
        [string]$Level,
        
        [Parameter(Mandatory=$true)]
        [string]$Text
    )
    
    $event = @{
        type = "log"
        stepId = $StepId
        level = $Level
        text = $Text
        timestamp = (Get-Date -Format "o")
    }
    
    $event | ConvertTo-Json -Compress | Write-Output
}

function Emit-Progress {
    <#
    .SYNOPSIS
        Emit a progress event to the frontend
    .PARAMETER StepId
        Unique identifier for the step
    .PARAMETER Current
        Current progress value
    .PARAMETER Total
        Total progress value
    .PARAMETER Unit
        Unit of measurement (MB, files, etc.)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$StepId,
        
        [Parameter(Mandatory=$true)]
        [int]$Current,
        
        [Parameter(Mandatory=$true)]
        [int]$Total,
        
        [Parameter(Mandatory=$false)]
        [string]$Unit = ""
    )
    
    $event = @{
        type = "progress"
        stepId = $StepId
        current = $Current
        total = $Total
    }
    
    if ($Unit) {
        $event.unit = $Unit
    }
    
    $event | ConvertTo-Json -Compress | Write-Output
}

function Emit-Result {
    <#
    .SYNOPSIS
        Emit a result event for a completed step
    .PARAMETER StepId
        Unique identifier for the step
    .PARAMETER State
        Result state: success, failed, skipped, warning
    .PARAMETER Duration
        Duration in seconds
    .PARAMETER Error
        Error message if failed
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$StepId,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet('success', 'failed', 'skipped', 'warning')]
        [string]$State,
        
        [Parameter(Mandatory=$false)]
        [int]$Duration = 0,
        
        [Parameter(Mandatory=$false)]
        [string]$Error = $null
    )
    
    $event = @{
        type = "result"
        stepId = $StepId
        state = $State
        duration = $Duration
    }
    
    if ($Error) {
        $event.error = $Error
    }
    
    $event | ConvertTo-Json -Compress | Write-Output
}

function Emit-Complete {
    <#
    .SYNOPSIS
        Emit a complete event for the entire operation
    .PARAMETER Outcome
        Overall outcome: success, partial, failed
    .PARAMETER Duration
        Total duration in seconds
    .PARAMETER FailedSteps
        Array of failed step IDs
    .PARAMETER SkippedSteps
        Array of skipped step IDs
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ValidateSet('success', 'partial', 'failed')]
        [string]$Outcome,
        
        [Parameter(Mandatory=$false)]
        [int]$Duration = 0,
        
        [Parameter(Mandatory=$false)]
        [string[]]$FailedSteps = @(),
        
        [Parameter(Mandatory=$false)]
        [string[]]$SkippedSteps = @()
    )
    
    $event = @{
        type = "complete"
        outcome = $Outcome
        totalDuration = $Duration
        failedSteps = $FailedSteps
        skippedSteps = $SkippedSteps
    }
    
    $event | ConvertTo-Json -Compress | Write-Output
}

function Emit-ManualAction {
    <#
    .SYNOPSIS
        Emit a manual action event requiring user intervention
    .PARAMETER StepId
        Unique identifier for the step
    .PARAMETER Action
        Action type: confirm, input, oauth, reboot
    .PARAMETER Message
        Main message
    .PARAMETER Instructions
        Array of instruction steps
    .PARAMETER Url
        URL to open (for OAuth)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$StepId,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet('confirm', 'input', 'oauth', 'reboot')]
        [string]$Action,
        
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string[]]$Instructions = @(),
        
        [Parameter(Mandatory=$false)]
        [string]$Url = $null
    )
    
    $event = @{
        type = "manual_action"
        stepId = $StepId
        action = $Action
        message = $Message
    }
    
    if ($Instructions.Count -gt 0) {
        $event.instructions = $Instructions
    }
    
    if ($Url) {
        $event.url = $Url
    }
    
    $event | ConvertTo-Json -Compress | Write-Output
}

# ============================================================================
# Utility Functions
# ============================================================================

function Test-AbortRequested {
    <#
    .SYNOPSIS
        Check if abort was requested
    #>
    return $global:ABORT_REQUESTED -eq $true
}

function Test-CommandExists {
    <#
    .SYNOPSIS
        Check if a command exists in PATH
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command
    )
    
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Export functions
Export-ModuleMember -Function Emit-Status, Emit-Log, Emit-Progress, Emit-Result, Emit-Complete, Emit-ManualAction, Test-AbortRequested, Test-CommandExists
