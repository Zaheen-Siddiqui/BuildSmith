/**
 * IPC Contract for BuildSmith
 * Defines the communication protocol between Frontend (Electron Renderer) and Backend
 */

// ============================================================================
// FRONTEND → BACKEND (Commands)
// ============================================================================

export type IPCCommand = 
  | StartScanCommand
  | ScanVSCodeCommand
  | ScanDockerCommand
  | ScanDatabaseCommand
  | ScanDevToolsCommand
  | ScanEnvironmentCommand
  | ScanPackagesCommand
  | CreateBundleCommand
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

export interface ScanVSCodeCommand {
  cmd: 'scanVSCode'
}

export interface ScanDockerCommand {
  cmd: 'scanDocker'
}

export interface ScanDatabaseCommand {
  cmd: 'scanDatabase'
}

export interface ScanDevToolsCommand {
  cmd: 'scanDevTools'
}

export interface ScanEnvironmentCommand {
  cmd: 'scanEnvironment'
}

export interface ScanPackagesCommand {
  cmd: 'scanPackages'
}

export interface CreateBundleCommand {
  cmd: 'createBundle'
  options: {
    includeSecrets: boolean
    encryptionPassphrase?: string
    devtools: boolean
    environment: boolean
    packages: boolean
    selectedVSCodeProfiles: string[] // IDs of selected profiles
    selectedDockerImages: string[] // IDs of selected images
    selectedDatabases: string[] // IDs of selected databases
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
  data?: unknown // Generic data payload for scan results
}

export interface VSCodeScanResult {
  type: 'vscode-scan-result'
  profiles: Array<{
    id: string
    name: string
    extensions: Array<{
      id: string
      name: string
      version: string
    }>
    settingsCount: number
    keybindingsCount: number
  }>
}

export interface DockerScanResult {
  type: 'docker-scan-result'
  images: Array<{
    id: string
    repository: string
    tag: string
    size: string
    created: string
  }>
}

export interface DatabaseScanResult {
  type: 'database-scan-result'
  connections: Array<{
    id: string
    name: string
    type: 'mongodb' | 'mysql' | 'postgresql' | 'redis' | 'sqlserver'
    host: string
    port: number
    database?: string
    username?: string  // MongoDB username if extracted from connection string
    source: 'compass' | 'workbench' | 'pgadmin' | 'other'
  }>
}

export interface DevToolsScanResult {
  type: 'devtools-scan-result'
  tools: Array<{
    id: string
    name: string
    command: string
    version: string
    path: string
  }>
}

export interface EnvironmentScanResult {
  type: 'environment-scan-result'
  variables: Array<{
    id: string
    name: string
    value: string
    scope: 'system' | 'user'
  }>
  pathEntries: Array<{
    id: string
    path: string
    scope: 'system' | 'user'
    exists: boolean
  }>
}

export interface PackagesScanResult {
  type: 'packages-scan-result'
  packages: Array<{
    id: string
    name: string
    version: string
    manager: 'npm' | 'pip' | 'winget' | 'chocolatey'
  }>
}

export interface BundleCreatedResult {
  type: 'bundle-created'
  bundlePath: string
  bundleName: string
  size: number
  encrypted: boolean
  itemCount: number
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
