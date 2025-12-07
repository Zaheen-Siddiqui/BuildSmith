/**
 * IPC Contract for BuildSmith
 * Defines the communication protocol between Frontend (Electron Renderer) and Backend
 */

// ============================================================================
// FRONTEND → BACKEND (Commands)
// ============================================================================

export type IPCCommand = 
  | StartScanCommand
  | StartSetupCommand
  | AbortCommand
  | ResumeCommand
  | RetryStepCommand
  | CheckForUpdatesCommand
  | DecryptSecretsCommand

export interface StartScanCommand {
  cmd: 'startScan'
  options: {
    includeSecrets: boolean
    vscode: boolean
    docker: boolean
    databases: boolean
    devtools: boolean
    environment: boolean
    packages: boolean
  }
}

export interface StartSetupCommand {
  cmd: 'startSetup'
  bundlePath: string
  selectedItems: string[]
  selectedDockerImages?: string[] // Array of selected Docker image names
  options: {
    preferOffline?: boolean
    skipManual?: boolean
  }
}

export interface AbortCommand {
  cmd: 'abort'
}

export interface ResumeCommand {
  cmd: 'resume'
  stepId: string
}

export interface RetryStepCommand {
  cmd: 'retryStep'
  stepId: string
}

export interface CheckForUpdatesCommand {
  cmd: 'checkForUpdates'
  channel: 'stable' | 'beta' | 'dev'
}

export interface DecryptSecretsCommand {
  cmd: 'decryptSecrets'
  passphrase: string
}

// ============================================================================
// BACKEND → FRONTEND (Events/Responses)
// ============================================================================

export type IPCEvent = 
  | StatusEvent
  | LogEvent
  | ResultEvent
  | CompleteEvent
  | ProgressEvent
  | ManualActionEvent

export type StepState = 
  | 'pending' 
  | 'running' 
  | 'success' 
  | 'failed' 
  | 'requires_manual'
  | 'reboot_required'
  | 'skipped'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

export interface StatusEvent {
  type: 'status'
  stepId: string
  state: StepState
  message: string
  timestamp?: string
}

export interface LogEvent {
  type: 'log'
  stepId: string
  level: LogLevel
  text: string
  timestamp?: string
}

export interface ResultEvent {
  type: 'result'
  stepId: string
  state: 'success' | 'failed'
  duration?: number
  error?: string
}

export interface CompleteEvent {
  type: 'complete'
  outcome: 'success' | 'partial' | 'failed'
  failedSteps?: string[]
  completedSteps: string[]
  duration: number
}

export interface ProgressEvent {
  type: 'progress'
  stepId: string
  current: number
  total: number
  unit?: string // 'bytes', 'items', 'percent'
}

export interface ManualActionEvent {
  type: 'manual_action'
  stepId: string
  title: string
  description: string
  instructions: string[]
  canSkip?: boolean
}

// ============================================================================
// Installation Step Definition
// ============================================================================

export interface InstallStep {
  id: string
  name: string
  description?: string
  status: StepState
  logs: LogEvent[]
  duration?: number
  progress?: {
    current: number
    total: number
    unit?: string
  }
  error?: string
  manualAction?: {
    title: string
    description: string
    instructions: string[]
    canSkip: boolean
  }
}

// ============================================================================
// Update System
// ============================================================================

export interface UpdateInfo {
  version: string
  releaseDate: string
  downloadUrl: string
  size: number
  releaseNotes: string
  channel: 'stable' | 'beta' | 'dev'
}

export interface UpdateCheckResult {
  available: boolean
  current: string
  latest?: UpdateInfo
}
