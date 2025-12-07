import { 
  IPCEvent, 
  InstallStep, 
  StepState, 
  LogLevel,
  StartSetupCommand 
} from '../types/ipc'

/**
 * Mock IPC Service for simulating backend responses during development
 * This will be replaced with real Electron IPC in later steps
 */

type EventCallback = (event: IPCEvent) => void

export class MockIPCService {
  private eventCallback: EventCallback | null = null
  private isRunning = false
  private shouldAbort = false
  private isPaused = false
  private currentSteps: InstallStep[] = []
  private currentStepIndex = 0
  private currentCommand: StartSetupCommand | null = null

  /**
   * Subscribe to IPC events
   */
  onEvent(callback: EventCallback) {
    this.eventCallback = callback
  }

  /**
   * Reset all state (for testing/debugging)
   */
  reset(): void {
    console.log('Resetting MockIPC service state')
    this.isRunning = false
    this.shouldAbort = false
    this.isPaused = false
    this.currentSteps = []
    this.currentStepIndex = 0
    this.currentCommand = null
  }

  /**
   * Simulate a delay (for realistic timing)
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Emit an event to the frontend
   */
  private emit(event: IPCEvent) {
    if (this.eventCallback) {
      this.eventCallback(event)
    }
  }

  /**
   * Simulate a log message
   */
  private log(stepId: string, level: LogLevel, text: string) {
    this.emit({
      type: 'log',
      stepId,
      level,
      text,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Simulate status update
   */
  private status(stepId: string, state: StepState, message: string) {
    this.emit({
      type: 'status',
      stepId,
      state,
      message,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Simulate progress update
   */
  private progress(stepId: string, current: number, total: number, unit?: string) {
    this.emit({
      type: 'progress',
      stepId,
      current,
      total,
      unit
    })
  }

  /**
   * Start a simulated setup process
   */
  async startSetup(command: StartSetupCommand): Promise<void> {
    console.log('MockIPC startSetup called with:', command)
    
    // Always reset state before starting to avoid issues from previous runs
    if (this.isRunning) {
      console.warn('Setup already in progress, resetting state first')
      this.reset()
    }

    this.isRunning = true
    this.shouldAbort = false
    this.isPaused = false
    this.currentCommand = command
    this.currentStepIndex = 0

    this.currentSteps = this.generateSteps(command.selectedItems)
    console.log('Generated steps:', this.currentSteps)

    await this.executeAllSteps()
  }

  /**
   * Execute all steps in sequence, handling pauses for manual actions
   */
  private async executeAllSteps(): Promise<void> {
    console.log('executeAllSteps starting, currentStepIndex:', this.currentStepIndex, 'totalSteps:', this.currentSteps.length)
    
    try {
      while (this.currentStepIndex < this.currentSteps.length) {
        if (this.shouldAbort) {
          this.log(this.currentSteps[this.currentStepIndex].id, 'warn', 'Setup aborted by user')
          break
        }

        const step = this.currentSteps[this.currentStepIndex]
        console.log(`Executing step ${this.currentStepIndex}: ${step.id} (${step.name})`)
        
        await this.executeStep(step, this.currentCommand!)
        
        console.log(`Step ${step.id} completed with status: ${step.status}`)
        
        // If step requires manual action, pause execution
        if (step.status === 'requires_manual') {
          this.isPaused = true
          console.log('Paused for manual action at step:', step.id)
          return // Exit and wait for resume()
        }
        
        this.currentStepIndex++
        console.log('Moving to next step, new index:', this.currentStepIndex)
      }

      // All steps completed
      const completedSteps = this.currentSteps.filter(s => s.status === 'success').map(s => s.id)
      const failedSteps = this.currentSteps.filter(s => s.status === 'failed').map(s => s.id)

      this.emit({
        type: 'complete',
        outcome: failedSteps.length === 0 ? 'success' : failedSteps.length < this.currentSteps.length ? 'partial' : 'failed',
        completedSteps,
        failedSteps,
        duration: 120
      })
    } catch (error) {
      console.error('executeAllSteps error:', error)
    } finally {
      // Only reset state if we're not paused (paused means waiting for user action)
      if (!this.isPaused) {
        console.log('Installation finished, resetting state')
        this.isRunning = false
        this.isPaused = false
        this.shouldAbort = false
        this.currentStepIndex = 0
        this.currentSteps = []
        this.currentCommand = null
      } else {
        console.log('Installation paused, keeping state for resume')
      }
    }
  }

  /**
   * Execute a single installation step
   */
  private async executeStep(step: InstallStep, command: StartSetupCommand): Promise<void> {
    // Update status to running
    this.status(step.id, 'running', `Starting ${step.name}...`)
    await this.delay(500)

    // Simulate step execution based on step type
    switch (step.id) {
      case 'download-docker':
        await this.simulateDownload(step)
        break
      case 'install-docker':
        await this.simulateInstall(step, 'Docker Desktop')
        break
      case 'load-docker-images':
        await this.simulateDockerImageLoad(step)
        break
      case 'install-vscode-extensions':
        await this.simulateVSCodeExtensions(step)
        break
      case 'restore-databases':
        await this.simulateDatabaseRestore(step)
        break
      case 'install-devtools':
        await this.simulateDevToolsInstall(step)
        break
      case 'configure-environment':
        await this.simulateEnvironmentSetup(step)
        break
      default:
        await this.simulateGenericStep(step)
    }
  }

  /**
   * Simulate file download with progress
   */
  private async simulateDownload(step: InstallStep): Promise<void> {
    const totalSize = 512 * 1024 * 1024 // 512 MB
    const chunkSize = totalSize / 10

    this.log(step.id, 'info', 'Starting download from https://desktop.docker.com/...')

    for (let i = 0; i <= 10; i++) {
      if (this.shouldAbort) {
        console.log('Download aborted at', i)
        return
      }

      const downloaded = i * chunkSize
      this.progress(step.id, downloaded, totalSize, 'bytes')
      this.log(step.id, 'info', `Downloaded ${Math.round(downloaded / 1024 / 1024)} MB / ${Math.round(totalSize / 1024 / 1024)} MB`)
      await this.delay(800)
    }

    console.log('Download loop completed')
    this.log(step.id, 'success', 'Download completed')
    this.status(step.id, 'success', 'Download completed successfully')
    step.status = 'success'
    console.log('Download step status set to:', step.status)
  }

  /**
   * Simulate installer execution
   */
  private async simulateInstall(step: InstallStep, appName: string): Promise<void> {
    this.log(step.id, 'info', `Running installer: ${appName}...`)
    await this.delay(1000)

    this.log(step.id, 'info', `Installing ${appName}...`)
    await this.delay(2000)

    // Simulate a manual action requirement for Docker WSL2
    if (step.id === 'install-docker') {
      this.emit({
        type: 'manual_action',
        stepId: step.id,
        title: 'WSL2 Installation Required',
        description: 'Docker Desktop requires WSL2 (Windows Subsystem for Linux 2) to be enabled. You can install it automatically or manually.',
        instructions: [
          'Option 1: Click "Install WSL2 Automatically" below (recommended)',
          'Option 2: Manual installation:',
          '  • Open PowerShell as Administrator',
          '  • Run: wsl --install',
          '  • Restart your computer when prompted',
          '  • After restart, click "I\'ve Completed This Step"'
        ],
        canSkip: false
      })
      this.status(step.id, 'requires_manual', 'Waiting for WSL2 installation...')
      step.status = 'requires_manual'
      return
    }

    this.log(step.id, 'info', 'Configuring application...')
    await this.delay(1500)

    this.log(step.id, 'success', `${appName} installed successfully`)
    this.status(step.id, 'success', 'Installation completed')
    step.status = 'success'
  }

  /**
   * Simulate Docker image loading
   */
  private async simulateDockerImageLoad(step: InstallStep): Promise<void> {
    const images = ['nginx:latest', 'node:18-alpine', 'postgres:15']

    for (const image of images) {
      if (this.shouldAbort) return

      this.log(step.id, 'info', `Loading image: ${image}`)
      await this.delay(1000)

      this.log(step.id, 'info', `Extracting layers for ${image}...`)
      await this.delay(800)

      this.log(step.id, 'success', `Image ${image} loaded successfully`)
    }

    this.status(step.id, 'success', `Loaded ${images.length} Docker images`)
    step.status = 'success'
  }

  /**
   * Simulate VS Code extension installation
   */
  private async simulateVSCodeExtensions(step: InstallStep): Promise<void> {
    const extensions = ['ESLint', 'Prettier', 'GitLens', 'Docker', 'Python']

    for (let i = 0; i < extensions.length; i++) {
      if (this.shouldAbort) return

      const ext = extensions[i]
      this.progress(step.id, i + 1, extensions.length, 'items')
      this.log(step.id, 'info', `Installing extension: ${ext}`)
      await this.delay(600)
    }

    this.log(step.id, 'success', `Installed ${extensions.length} VS Code extensions`)
    this.status(step.id, 'success', 'Extensions installed successfully')
    step.status = 'success'
  }

  /**
   * Simulate database restore
   */
  private async simulateDatabaseRestore(step: InstallStep): Promise<void> {
    this.log(step.id, 'info', 'Connecting to MongoDB...')
    await this.delay(800)

    this.log(step.id, 'info', 'Restoring database backup...')
    await this.delay(1500)

    this.log(step.id, 'success', 'Database restored successfully')
    this.status(step.id, 'success', 'Database restore completed')
    step.status = 'success'
  }

  /**
   * Simulate dev tools installation
   */
  private async simulateDevToolsInstall(step: InstallStep): Promise<void> {
    const tools = ['Git', 'Node.js', 'Python']

    for (const tool of tools) {
      if (this.shouldAbort) return

      this.log(step.id, 'info', `Installing ${tool}...`)
      await this.delay(1200)
      this.log(step.id, 'success', `${tool} installed`)
    }

    this.status(step.id, 'success', 'Dev tools installed')
    step.status = 'success'
  }

  /**
   * Simulate environment configuration
   */
  private async simulateEnvironmentSetup(step: InstallStep): Promise<void> {
    this.log(step.id, 'info', 'Configuring PATH variables...')
    await this.delay(500)

    this.log(step.id, 'info', 'Setting environment variables...')
    await this.delay(800)

    this.log(step.id, 'success', 'Environment configured successfully')
    this.status(step.id, 'success', 'Configuration completed')
    step.status = 'success'
  }

  /**
   * Simulate generic step
   */
  private async simulateGenericStep(step: InstallStep): Promise<void> {
    this.log(step.id, 'info', `Executing ${step.name}...`)
    await this.delay(1500)

    this.log(step.id, 'success', `${step.name} completed`)
    this.status(step.id, 'success', 'Step completed successfully')
    step.status = 'success'
  }

  /**
   * Generate installation steps based on selected items
   */
  private generateSteps(selectedItems: string[]): InstallStep[] {
    const steps: InstallStep[] = []

    if (selectedItems.includes('docker')) {
      steps.push(
        { id: 'download-docker', name: 'Download Docker Desktop', status: 'pending', logs: [] },
        { id: 'install-docker', name: 'Install Docker Desktop', status: 'pending', logs: [] },
        { id: 'load-docker-images', name: 'Load Docker Images', status: 'pending', logs: [] }
      )
    }

    if (selectedItems.includes('vscode')) {
      steps.push(
        { id: 'install-vscode-extensions', name: 'Install VS Code Extensions', status: 'pending', logs: [] }
      )
    }

    if (selectedItems.includes('databases')) {
      steps.push(
        { id: 'restore-databases', name: 'Restore Database Connections', status: 'pending', logs: [] }
      )
    }

    if (selectedItems.includes('devtools')) {
      steps.push(
        { id: 'install-devtools', name: 'Install Development Tools', status: 'pending', logs: [] }
      )
    }

    if (selectedItems.includes('environment')) {
      steps.push(
        { id: 'configure-environment', name: 'Configure Environment Variables', status: 'pending', logs: [] }
      )
    }

    return steps
  }

  /**
   * Abort the current setup
   */
  abort(): void {
    console.log('Abort called')
    this.shouldAbort = true
    // Don't auto-reset here - let the executeAllSteps finally block handle cleanup
  }

  /**
   * Resume from a manual action step
   */
  async resume(stepId: string): Promise<void> {
    console.log('Resume called for step:', stepId, 'isPaused:', this.isPaused)
    
    if (!this.isPaused) {
      console.warn('Resume called but installation is not paused, current state:', {
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        currentStepIndex: this.currentStepIndex,
        currentSteps: this.currentSteps.length
      })
      return
    }
    
    // Find the step and mark it as successful
    const step = this.currentSteps.find(s => s.id === stepId)
    if (!step) {
      console.error('Step not found:', stepId)
      return
    }
    
    console.log('Resuming step:', stepId, 'current status:', step.status)
    
    this.log(stepId, 'info', 'User confirmed manual action completed')
    await this.delay(500)
    this.log(stepId, 'success', 'Manual action completed successfully')
    this.status(stepId, 'success', 'Manual action completed')
    step.status = 'success'
    
    // Move to next step (increment before continuing)
    this.currentStepIndex++
    this.isPaused = false
    
    console.log('Resuming from step index:', this.currentStepIndex)
    
    // Continue with remaining steps
    await this.executeAllSteps()
  }

  /**
   * Retry a failed step
   */
  async retryStep(stepId: string): Promise<void> {
    this.log(stepId, 'info', 'Retrying step...')
    this.status(stepId, 'running', 'Retrying...')
    // Would re-execute the step here
  }

  /**
   * Install WSL2 automatically (for Docker requirement)
   */
  async installWSL2Automatically(stepId: string): Promise<void> {
    console.log('installWSL2Automatically called for:', stepId, 'current isPaused:', this.isPaused)
    
    // Don't change the status to running - keep it as requires_manual
    // Just add logs to show progress
    
    try {
      // In real implementation, this would execute:
      // Start-Process powershell -Verb RunAs -ArgumentList "wsl --install"
      // For now, simulate it
      
      this.log(stepId, 'info', 'Starting automatic WSL2 installation...')
      this.log(stepId, 'info', 'Launching elevated PowerShell...')
      await this.delay(1000)
      
      this.log(stepId, 'info', 'Executing: wsl --install')
      await this.delay(3000)
      
      this.log(stepId, 'info', 'WSL2 installation initiated successfully')
      await this.delay(1000)
      
      this.log(stepId, 'warn', 'A system restart is required to complete WSL2 installation')
      this.log(stepId, 'info', 'After restart, Docker Desktop will be ready to use')
      
      console.log('WSL2 auto-install complete, calling resume. isPaused:', this.isPaused)
      
      // Complete the step
      await this.resume(stepId)
    } catch (error) {
      this.log(stepId, 'error', `WSL2 installation failed: ${error}`)
      this.status(stepId, 'failed', 'WSL2 installation failed')
    }
  }
}

// Singleton instance
export const mockIPC = new MockIPCService()
