import { 
  IPCCommand, 
  IPCEvent, 
  StartScanCommand,
  StartSetupCommand,
  ResumeCommand,
  RetryStepCommand
} from '../types/ipc'

/**
 * Real IPC Service for communicating with Electron backend
 * This replaces mockIPC.ts with actual Electron IPC calls
 */

type EventCallback = (event: IPCEvent) => void

export class IPCService {
  private eventCallback: EventCallback | null = null
  private unsubscribe: (() => void) | null = null
  private isElectron: boolean

  constructor() {
    // Check if running in Electron environment
    this.isElectron = typeof window !== 'undefined' && !!window.electronAPI
    
    if (!this.isElectron) {
      console.warn('Not running in Electron environment - IPC calls will fail')
    }
  }

  /**
   * Subscribe to IPC events from backend
   */
  onEvent(callback: EventCallback): void {
    this.eventCallback = callback
    
    if (this.isElectron && window.electronAPI) {
      // Unsubscribe from previous listener if any
      if (this.unsubscribe) {
        this.unsubscribe()
      }
      
      // Subscribe to backend events
      this.unsubscribe = window.electronAPI.onBackendEvent((event: IPCEvent) => {
        console.log('[IPC] Received event:', event.type, event)
        if (this.eventCallback) {
          this.eventCallback(event)
        }
      })
    }
  }

  /**
   * Unsubscribe from events
   */
  removeEventListener(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.eventCallback = null
  }

  /**
   * Send a command to the backend
   */
  private async sendCommand(command: IPCCommand): Promise<{ success: boolean; error?: string }> {
    if (!this.isElectron || !window.electronAPI) {
      console.error('[IPC] Cannot send command - not running in Electron')
      return { success: false, error: 'Not running in Electron environment' }
    }

    console.log('[IPC] Sending command:', command.cmd, command)
    
    try {
      const result = await window.electronAPI.sendCommand(command)
      console.log('[IPC] Command result:', result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[IPC] Command error:', error)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Start a scan operation
   */
  async startScan(options: StartScanCommand['options']): Promise<{ success: boolean; error?: string }> {
    const command: StartScanCommand = {
      cmd: 'startScan',
      options
    }
    return this.sendCommand(command)
  }

  /**
   * Start a setup operation (mockIPC-compatible interface)
   */
  async startSetup(command: StartSetupCommand): Promise<void> {
    const result = await this.sendCommand(command)
    if (!result.success && result.error) {
      // Emit error as event
      if (this.eventCallback) {
        this.eventCallback({
          type: 'log',
          stepId: 'setup',
          level: 'error',
          text: `Setup failed: ${result.error}`,
          timestamp: new Date().toISOString()
        })
      }
      throw new Error(result.error)
    }
  }

  /**
   * Abort current operation (mockIPC-compatible interface)
   */
  abort(): void {
    if (!this.isElectron || !window.electronAPI) {
      console.error('[IPC] Cannot abort - not running in Electron')
      return
    }

    console.log('[IPC] Aborting operation')
    
    // Fire and forget - don't wait for result
    window.electronAPI.abort().catch(error => {
      console.error('[IPC] Abort error:', error)
    })
  }

  /**
   * Resume after manual action (mockIPC-compatible interface)
   */
  async resume(stepId: string): Promise<void> {
    const command: ResumeCommand = {
      cmd: 'resume',
      stepId
    }
    const result = await this.sendCommand(command)
    if (!result.success && result.error) {
      throw new Error(result.error)
    }
  }

  /**
   * Retry a failed step (mockIPC-compatible interface)
   */
  async retryStep(stepId: string): Promise<void> {
    const command: RetryStepCommand = {
      cmd: 'retryStep',
      stepId
    }
    const result = await this.sendCommand(command)
    if (!result.success && result.error) {
      throw new Error(result.error)
    }
  }

  /**
   * Scan VS Code profiles and extensions
   */
  async scanVSCode(): Promise<void> {
    const command: IPCCommand = {
      cmd: 'scanVSCode'
    }
    await this.sendCommand(command)
  }

  /**
   * Scan Docker images
   */
  async scanDocker(): Promise<void> {
    const command: IPCCommand = {
      cmd: 'scanDocker'
    }
    await this.sendCommand(command)
  }

  /**
   * Scan database connections
   */
  async scanDatabase(): Promise<void> {
    const command: IPCCommand = {
      cmd: 'scanDatabase'
    }
    await this.sendCommand(command)
  }

  /**
   * Create bundle from selected items
   */
  async createBundle(options: {
    selectedVSCodeProfiles?: string[]
    selectedDockerImages?: string[]
    selectedDatabases?: string[]
    includeDevOps?: boolean
    includeEnvironment?: boolean
    includePackages?: boolean
    includeSecrets?: boolean
    encryptionPassphrase?: string
  }): Promise<void> {
    const command: IPCCommand = {
      cmd: 'createBundle',
      ...options
    }
    await this.sendCommand(command)
  }

  /**
   * Check if running in Electron
   */
  isElectronEnvironment(): boolean {
    return this.isElectron
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.isElectron && window.electronAPI ? window.electronAPI.isDev() : false
  }

  /**
   * Reset service state (for cleanup)
   */
  reset(): void {
    console.log('[IPC] Resetting service')
    this.removeEventListener()
    this.eventCallback = null
  }
}

// Export singleton instance
export const ipcService = new IPCService()
