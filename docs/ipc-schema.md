# BuildSmith IPC Protocol Specification

This document defines the complete IPC (Inter-Process Communication) contract between the Electron frontend (renderer process) and the PowerShell backend.

## Communication Model

- **Frontend → Backend**: Commands (JSON over IPC channels)
- **Backend → Frontend**: Events (streamed JSON responses)
- **Transport**: Electron IPC (`ipcMain`/`ipcRenderer`) bridging to PowerShell subprocess
- **Format**: JSON-serialized messages

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Renderer                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React UI (TypeScript)                                │  │
│  │  - Sends commands via window.electronAPI.invoke()     │  │
│  │  - Receives events via window.electronAPI.on()        │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC Channels
┌──────────────────────────▼──────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  IPC Handlers (TypeScript)                            │  │
│  │  - Receives commands from renderer                    │  │
│  │  - Spawns PowerShell subprocess                       │  │
│  │  - Streams JSON to/from PowerShell                    │  │
│  │  - Forwards events to renderer                        │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ stdin/stdout (JSON)
┌──────────────────────────▼──────────────────────────────────┐
│                    PowerShell Backend                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  runner.ps1 (Main Entry Point)                        │  │
│  │  - Reads JSON commands from stdin                     │  │
│  │  - Writes JSON events to stdout                       │  │
│  │  - Orchestrates PowerShell modules                    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  PowerShell Modules                                   │  │
│  │  - scan.ps1: Scan system                              │  │
│  │  - setup.ps1: Install tools                           │  │
│  │  - modules/docker.psm1: Docker operations             │  │
│  │  - modules/vscode.psm1: VS Code operations            │  │
│  │  - modules/db.psm1: Database operations               │  │
│  │  - modules/installers.psm1: Install apps              │  │
│  │  - modules/env.psm1: PATH/environment variables       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## IPC Channels

| Channel Name | Direction | Purpose |
|-------------|-----------|---------|
| `backend:command` | Renderer → Main | Send commands to backend |
| `backend:event` | Main → Renderer | Receive events from backend |
| `backend:abort` | Renderer → Main | Abort current operation |

## Frontend → Backend: Commands

All commands follow this structure:

```typescript
interface IPCCommand {
  cmd: string
  [key: string]: any
}
```

### 1. Start Scan Command

Initiates a scan of the current system to collect tools, configs, and data.

**TypeScript Interface:**
```typescript
interface StartScanCommand {
  cmd: 'startScan'
  options: {
    includeSecrets: boolean      // Encrypt and include sensitive data
    vscode: boolean              // Scan VS Code profiles/extensions
    docker: boolean              // Scan Docker images
    databases: boolean           // Scan database connections
    devtools: boolean            // Scan DevOps tools (kubectl, terraform, etc.)
    environment: boolean         // Scan PATH and environment variables
    packages: boolean            // Scan installed packages (npm, pip, etc.)
  }
}
```

**JSON Example:**
```json
{
  "cmd": "startScan",
  "options": {
    "includeSecrets": true,
    "vscode": true,
    "docker": true,
    "databases": true,
    "devtools": true,
    "environment": true,
    "packages": true
  }
}
```

### 2. Start Setup Command

Initiates installation/restore from a bundle on the target system.

**TypeScript Interface:**
```typescript
interface StartSetupCommand {
  cmd: 'startSetup'
  bundlePath: string               // Absolute path to .zip bundle
  selectedItems: string[]          // IDs of items to install (e.g., ["docker", "vscode"])
  selectedDockerImages?: string[]  // Specific Docker images to restore
  options: {
    preferOffline?: boolean        // Use offline installers when available
    skipManual?: boolean           // Skip items requiring manual intervention
  }
}
```

**JSON Example:**
```json
{
  "cmd": "startSetup",
  "bundlePath": "C:\\Users\\user\\Downloads\\bundle_2025-12-11.zip",
  "selectedItems": ["docker", "vscode", "terraform"],
  "selectedDockerImages": ["nginx:1.25.4", "postgres:15"],
  "options": {
    "preferOffline": true,
    "skipManual": false
  }
}
```

### 3. Abort Command

Cancels the currently running operation.

**TypeScript Interface:**
```typescript
interface AbortCommand {
  cmd: 'abort'
}
```

**JSON Example:**
```json
{
  "cmd": "abort"
}
```

### 4. Resume Command

Resumes execution after a manual action or pause.

**TypeScript Interface:**
```typescript
interface ResumeCommand {
  cmd: 'resume'
  stepId: string  // ID of the step to resume from
}
```

**JSON Example:**
```json
{
  "cmd": "resume",
  "stepId": "install-docker"
}
```

### 5. Retry Step Command

Retries a failed step.

**TypeScript Interface:**
```typescript
interface RetryStepCommand {
  cmd: 'retryStep'
  stepId: string  // ID of the step to retry
}
```

**JSON Example:**
```json
{
  "cmd": "retryStep",
  "stepId": "download-vscode"
}
```

### 6. Check for Updates Command

Checks for app updates.

**TypeScript Interface:**
```typescript
interface CheckForUpdatesCommand {
  cmd: 'checkForUpdates'
  channel: 'stable' | 'beta' | 'dev'
}
```

**JSON Example:**
```json
{
  "cmd": "checkForUpdates",
  "channel": "stable"
}
```

### 7. Decrypt Secrets Command

Decrypts encrypted secrets in a bundle.

**TypeScript Interface:**
```typescript
interface DecryptSecretsCommand {
  cmd: 'decryptSecrets'
  passphrase: string
  filePath: string  // Path to .gpg file
}
```

**JSON Example:**
```json
{
  "cmd": "decryptSecrets",
  "passphrase": "my-secure-passphrase",
  "filePath": "C:\\bundle\\secrets\\db_connections.json.gpg"
}
```

## Backend → Frontend: Events

All events are streamed as separate JSON objects. Each event has a `type` field.

### Event Types

| Type | Description |
|------|-------------|
| `status` | Step status changed |
| `log` | Log message for a step |
| `progress` | Progress update (e.g., download progress) |
| `result` | Step completed with result |
| `complete` | Entire operation completed |
| `manual_action` | User action required |

### 1. Status Event

Indicates a step's status has changed.

**TypeScript Interface:**
```typescript
interface StatusEvent {
  type: 'status'
  stepId: string
  state: 'pending' | 'running' | 'success' | 'failed' | 'requires_manual' | 'reboot_required' | 'skipped'
  message: string
  timestamp?: string  // ISO 8601 timestamp
}
```

**JSON Example:**
```json
{
  "type": "status",
  "stepId": "install-docker",
  "state": "running",
  "message": "Installing Docker Desktop...",
  "timestamp": "2025-12-11T10:30:45Z"
}
```

### 2. Log Event

A log message related to a step.

**TypeScript Interface:**
```typescript
interface LogEvent {
  type: 'log'
  stepId: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'success'
  text: string
  timestamp?: string
}
```

**JSON Example:**
```json
{
  "type": "log",
  "stepId": "download-docker",
  "level": "info",
  "text": "Downloaded 120 MB / 240 MB (50%)",
  "timestamp": "2025-12-11T10:30:50Z"
}
```

### 3. Progress Event

Progress update for long-running operations (downloads, installations).

**TypeScript Interface:**
```typescript
interface ProgressEvent {
  type: 'progress'
  stepId: string
  current: number     // Current value
  total: number       // Total value
  unit?: string       // Unit (e.g., "MB", "files", "extensions")
  percentage?: number // Optional percentage (0-100)
}
```

**JSON Example:**
```json
{
  "type": "progress",
  "stepId": "download-vscode",
  "current": 75,
  "total": 150,
  "unit": "MB",
  "percentage": 50
}
```

### 4. Result Event

Step completed with final result.

**TypeScript Interface:**
```typescript
interface ResultEvent {
  type: 'result'
  stepId: string
  state: 'success' | 'failed' | 'skipped' | 'warning'
  duration?: number    // Duration in seconds
  error?: string       // Error message if failed
  details?: any        // Additional details
}
```

**JSON Example:**
```json
{
  "type": "result",
  "stepId": "install-vscode",
  "state": "success",
  "duration": 34
}
```

### 5. Complete Event

Entire operation completed.

**TypeScript Interface:**
```typescript
interface CompleteEvent {
  type: 'complete'
  outcome: 'success' | 'partial' | 'failed'
  totalDuration?: number     // Total duration in seconds
  failedSteps?: string[]     // IDs of failed steps
  skippedSteps?: string[]    // IDs of skipped steps
  message?: string
}
```

**JSON Example:**
```json
{
  "type": "complete",
  "outcome": "partial",
  "totalDuration": 320,
  "failedSteps": ["install-gpu-driver"],
  "skippedSteps": [],
  "message": "Setup completed with 1 failure"
}
```

### 6. Manual Action Event

User intervention required.

**TypeScript Interface:**
```typescript
interface ManualActionEvent {
  type: 'manual_action'
  stepId: string
  action: 'confirm' | 'input' | 'oauth' | 'reboot'
  message: string
  instructions?: string[]  // Step-by-step instructions
  url?: string            // URL to open (for OAuth)
}
```

**JSON Example:**
```json
{
  "type": "manual_action",
  "stepId": "install-docker",
  "action": "reboot",
  "message": "Docker requires WSL2 enablement. System reboot required.",
  "instructions": [
    "Enable WSL2 in Windows Features",
    "Restart your computer",
    "Click Resume to continue installation"
  ]
}
```

## Step States

| State | Description |
|-------|-------------|
| `pending` | Step not yet started |
| `running` | Step currently executing |
| `success` | Step completed successfully |
| `failed` | Step failed with error |
| `requires_manual` | Step requires user action |
| `reboot_required` | System reboot needed |
| `skipped` | Step skipped by user |

## Log Levels

| Level | Color | Purpose |
|-------|-------|---------|
| `debug` | Gray | Detailed debugging information |
| `info` | Blue | General information |
| `warn` | Yellow | Warnings (non-critical) |
| `error` | Red | Errors |
| `success` | Green | Success messages |

## Complete Workflow Examples

### Example 1: Scan Workflow

**Frontend sends:**
```json
{
  "cmd": "startScan",
  "options": {
    "includeSecrets": true,
    "vscode": true,
    "docker": true,
    "databases": false,
    "devtools": true,
    "environment": true,
    "packages": true
  }
}
```

**Backend streams:**
```json
{"type":"status","stepId":"scan-vscode","state":"running","message":"Scanning VS Code profiles..."}
{"type":"log","stepId":"scan-vscode","level":"info","text":"Found 2 VS Code profiles"}
{"type":"log","stepId":"scan-vscode","level":"info","text":"Found 45 installed extensions"}
{"type":"result","stepId":"scan-vscode","state":"success","duration":2}

{"type":"status","stepId":"scan-docker","state":"running","message":"Scanning Docker images..."}
{"type":"log","stepId":"scan-docker","level":"info","text":"Found 12 Docker images"}
{"type":"progress","stepId":"scan-docker","current":5,"total":12,"unit":"images"}
{"type":"result","stepId":"scan-docker","state":"success","duration":5}

{"type":"status","stepId":"create-bundle","state":"running","message":"Creating bundle..."}
{"type":"log","stepId":"create-bundle","level":"info","text":"Encrypting secrets..."}
{"type":"log","stepId":"create-bundle","level":"success","text":"Bundle created: C:\\Users\\user\\bundle_2025-12-11.zip"}
{"type":"result","stepId":"create-bundle","state":"success","duration":3}

{"type":"complete","outcome":"success","totalDuration":10}
```

### Example 2: Setup Workflow with Manual Action

**Frontend sends:**
```json
{
  "cmd": "startSetup",
  "bundlePath": "C:\\bundle.zip",
  "selectedItems": ["docker", "vscode"],
  "options": {
    "preferOffline": false
  }
}
```

**Backend streams:**
```json
{"type":"status","stepId":"download-docker","state":"running","message":"Downloading Docker Desktop..."}
{"type":"progress","stepId":"download-docker","current":50,"total":240,"unit":"MB"}
{"type":"progress","stepId":"download-docker","current":240,"total":240,"unit":"MB"}
{"type":"result","stepId":"download-docker","state":"success","duration":45}

{"type":"status","stepId":"install-docker","state":"running","message":"Installing Docker..."}
{"type":"log","stepId":"install-docker","level":"warn","text":"WSL2 not enabled"}
{"type":"manual_action","stepId":"install-docker","action":"reboot","message":"Docker requires WSL2","instructions":["Enable WSL2","Restart computer","Click Resume"]}
{"type":"status","stepId":"install-docker","state":"requires_manual","message":"Waiting for user action..."}
```

**Frontend sends (after user action):**
```json
{
  "cmd": "resume",
  "stepId": "install-docker"
}
```

**Backend continues:**
```json
{"type":"status","stepId":"install-docker","state":"running","message":"Resuming installation..."}
{"type":"result","stepId":"install-docker","state":"success","duration":25}

{"type":"status","stepId":"install-vscode","state":"running","message":"Installing VS Code..."}
{"type":"result","stepId":"install-vscode","state":"success","duration":15}

{"type":"complete","outcome":"success","totalDuration":85}
```

## PowerShell Backend Implementation

### runner.ps1 Structure

```powershell
# Main entry point for backend operations
# Reads JSON commands from stdin, executes them, writes JSON events to stdout

param()

# Import modules
Import-Module "$PSScriptRoot/modules/docker.psm1"
Import-Module "$PSScriptRoot/modules/vscode.psm1"
Import-Module "$PSScriptRoot/modules/db.psm1"
Import-Module "$PSScriptRoot/modules/installers.psm1"
Import-Module "$PSScriptRoot/modules/env.psm1"

# Read commands from stdin (one JSON per line)
while ($line = [Console]::In.ReadLine()) {
    try {
        $command = $line | ConvertFrom-Json
        
        switch ($command.cmd) {
            "startScan" { 
                & "$PSScriptRoot/scan.ps1" -Options $command.options 
            }
            "startSetup" { 
                & "$PSScriptRoot/setup.ps1" -BundlePath $command.bundlePath -SelectedItems $command.selectedItems -Options $command.options 
            }
            "abort" { 
                # Set abort flag
                $global:ABORT_REQUESTED = $true
            }
            default {
                Write-Output (ConvertTo-Json @{
                    type = "log"
                    stepId = "unknown"
                    level = "error"
                    text = "Unknown command: $($command.cmd)"
                })
            }
        }
    } catch {
        Write-Output (ConvertTo-Json @{
            type = "log"
            stepId = "runner"
            level = "error"
            text = "Error processing command: $($_.Exception.Message)"
        })
    }
}
```

### Helper Functions

All modules should use these helper functions to emit events:

```powershell
function Emit-Status {
    param($StepId, $State, $Message)
    @{
        type = "status"
        stepId = $StepId
        state = $State
        message = $Message
        timestamp = (Get-Date -Format "o")
    } | ConvertTo-Json -Compress | Write-Output
}

function Emit-Log {
    param($StepId, $Level, $Text)
    @{
        type = "log"
        stepId = $StepId
        level = $Level
        text = $Text
        timestamp = (Get-Date -Format "o")
    } | ConvertTo-Json -Compress | Write-Output
}

function Emit-Progress {
    param($StepId, $Current, $Total, $Unit = "")
    @{
        type = "progress"
        stepId = $StepId
        current = $Current
        total = $Total
        unit = $Unit
    } | ConvertTo-Json -Compress | Write-Output
}

function Emit-Result {
    param($StepId, $State, $Duration = 0, $Error = $null)
    $result = @{
        type = "result"
        stepId = $StepId
        state = $State
        duration = $Duration
    }
    if ($Error) { $result.error = $Error }
    $result | ConvertTo-Json -Compress | Write-Output
}

function Emit-Complete {
    param($Outcome, $Duration = 0, $FailedSteps = @(), $SkippedSteps = @())
    @{
        type = "complete"
        outcome = $Outcome
        totalDuration = $Duration
        failedSteps = $FailedSteps
        skippedSteps = $SkippedSteps
    } | ConvertTo-Json -Compress | Write-Output
}
```

## Security Considerations

1. **Input Validation**: All commands from frontend must be validated in the backend
2. **Path Traversal**: Bundle paths must be validated to prevent path traversal attacks
3. **Command Injection**: Never use user input directly in shell commands
4. **Encryption**: Secrets must be encrypted with GPG/age before storage
5. **Subprocess Isolation**: PowerShell processes should have minimal privileges

## Error Handling

- Backend must catch all exceptions and emit error logs
- Failed steps should emit `result` event with `state: "failed"`
- Complete event should have `outcome: "failed"` if critical failures occur
- Always provide actionable error messages to the user

## Testing Strategy

1. **Unit Tests**: Test individual PowerShell functions
2. **Integration Tests**: Test Electron IPC handlers
3. **E2E Tests**: Test complete workflows with mocked PowerShell responses
4. **Manual Testing**: Verify actual installations on clean VMs

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-11 | Initial specification |

---

**Note**: This specification will evolve as new features are added. All changes must maintain backward compatibility or increment the major version.
