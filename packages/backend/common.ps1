# BuildSmith Backend - Common Helper Functions
# This file can be dot-sourced by any PowerShell script

# ============================================================================
# Event Emission Functions
# ============================================================================

function Emit-Status {
    param([string]$StepId, [string]$State, [string]$Message)
    @{ type = "status"; stepId = $StepId; state = $State; message = $Message; timestamp = (Get-Date -Format "o") } | ConvertTo-Json -Compress | Write-Output
}

function Emit-Log {
    param([string]$StepId, [string]$Level, [string]$Text)
    @{ type = "log"; stepId = $StepId; level = $Level; text = $Text; timestamp = (Get-Date -Format "o") } | ConvertTo-Json -Compress | Write-Output
}

function Emit-Progress {
    param([string]$StepId, [int]$Current, [int]$Total, [string]$Unit = "")
    $evt = @{ type = "progress"; stepId = $StepId; current = $Current; total = $Total }
    if ($Unit) { $evt.unit = $Unit }
    $evt | ConvertTo-Json -Compress | Write-Output
}

function Emit-Result {
    param([string]$StepId, [string]$State, [int]$Duration = 0, [string]$Error = $null)
    $evt = @{ type = "result"; stepId = $StepId; state = $State; duration = $Duration }
    if ($Error) { $evt.error = $Error }
    $evt | ConvertTo-Json -Compress | Write-Output
}

function Emit-Complete {
    param([string]$Outcome, [int]$Duration = 0, [string[]]$FailedSteps = @(), [string[]]$SkippedSteps = @())
    @{ type = "complete"; outcome = $Outcome; totalDuration = $Duration; failedSteps = $FailedSteps; skippedSteps = $SkippedSteps } | ConvertTo-Json -Compress | Write-Output
}

function Emit-ManualAction {
    param([string]$StepId, [string]$Action, [string]$Message, [string[]]$Instructions = @(), [string]$Url = $null)
    $evt = @{ type = "manual_action"; stepId = $StepId; action = $Action; message = $Message }
    if ($Instructions.Count -gt 0) { $evt.instructions = $Instructions }
    if ($Url) { $evt.url = $Url }
    $evt | ConvertTo-Json -Compress | Write-Output
}

function Test-AbortRequested {
    return $global:ABORT_REQUESTED -eq $true
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}
