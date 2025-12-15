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

    this.currentSteps = this.generateSteps(command)
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
      case 'docker':
        await this.simulateDockerImageLoad(step, command)
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
  private async simulateDockerImageLoad(step: InstallStep, command: StartSetupCommand): Promise<void> {
    const images = command.selectedDockerImages || []

    if (images.length === 0) {
      this.log(step.id, 'warn', 'No Docker images selected to load')
      this.status(step.id, 'success', 'Skipped - no images selected')
      step.status = 'success'
      return
    }

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
  private generateSteps(command: StartSetupCommand): InstallStep[] {
    const steps: InstallStep[] = []
    const { selectedItems, selectedDockerImages } = command

    if (selectedItems.includes('docker') && selectedDockerImages && selectedDockerImages.length > 0) {
      steps.push(
        { id: 'download-docker', name: 'Download Docker Desktop', status: 'pending', logs: [] },
        { id: 'install-docker', name: 'Install Docker Desktop', status: 'pending', logs: [] },
        { id: 'docker', name: `Load Docker Images (${selectedDockerImages.length} images)`, status: 'pending', logs: [] }
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

  /**
   * Scan VS Code profiles and extensions
   */
  async scanVSCode(): Promise<void> {
    console.log('MockIPC scanVSCode called')
    const stepId = 'scan-vscode'
    
    this.status(stepId, 'running', 'Scanning VS Code profiles...')
    this.log(stepId, 'info', 'Detecting VS Code installation...')
    await this.delay(500)
    
    this.log(stepId, 'info', 'Found VS Code at C:\\Users\\...\\AppData\\Local\\Programs\\Microsoft VS Code')
    this.log(stepId, 'info', 'Scanning installed extensions...')
    await this.delay(1000)
    
    // Simulate scanning extensions
    const mockExtensions = [
      { id: 'esbenp.prettier-vscode', name: 'Prettier', version: '10.1.0' },
      { id: 'dbaeumer.vscode-eslint', name: 'ESLint', version: '2.4.2' },
      { id: 'eamodio.gitlens', name: 'GitLens', version: '14.3.0' },
      { id: 'ms-python.python', name: 'Python', version: '2023.18.0' },
      { id: 'ms-azuretools.vscode-docker', name: 'Docker', version: '1.28.0' },
      { id: 'vscode.typescript-language-features', name: 'TypeScript', version: '1.0.0' },
    ]
    
    for (let i = 0; i < mockExtensions.length; i++) {
      this.progress(stepId, i + 1, mockExtensions.length, 'extensions')
      await this.delay(100)
    }
    
    this.log(stepId, 'success', `Found ${mockExtensions.length} installed extensions`)
    this.log(stepId, 'info', 'Reading settings and keybindings...')
    await this.delay(500)
    
    const result = {
      type: 'vscode-scan-result' as const,
      profiles: [{
        id: 'default',
        name: 'Default Profile',
        extensions: mockExtensions,
        settingsCount: 24,
        keybindingsCount: 8
      }]
    }
    
    this.status(stepId, 'success', 'VS Code scan complete')
    this.emit({
      type: 'result',
      stepId,
      state: 'success',
      data: result
    })
  }

  /**
   * Scan Docker images
   */
  async scanDocker(): Promise<void> {
    console.log('MockIPC scanDocker called')
    const stepId = 'scan-docker'
    
    this.status(stepId, 'running', 'Scanning Docker images...')
    this.log(stepId, 'info', 'Connecting to Docker daemon...')
    await this.delay(500)
    
    this.log(stepId, 'info', 'Fetching image list...')
    await this.delay(1000)
    
    const mockImages = [
      { id: 'sha256:abc123', repository: 'node', tag: '18-alpine', size: '174 MB', created: '2 days ago' },
      { id: 'sha256:def456', repository: 'postgres', tag: '15', size: '376 MB', created: '1 week ago' },
      { id: 'sha256:ghi789', repository: 'redis', tag: 'latest', size: '117 MB', created: '3 days ago' },
      { id: 'sha256:jkl012', repository: 'nginx', tag: '1.25', size: '187 MB', created: '1 day ago' },
    ]
    
    for (let i = 0; i < mockImages.length; i++) {
      this.progress(stepId, i + 1, mockImages.length, 'images')
      await this.delay(200)
    }
    
    this.log(stepId, 'success', `Found ${mockImages.length} Docker images`)
    
    const result = {
      type: 'docker-scan-result' as const,
      images: mockImages
    }
    
    this.status(stepId, 'success', 'Docker scan complete')
    this.emit({
      type: 'result',
      stepId,
      state: 'success',
      data: result
    })
  }

  /**
   * Scan database connections
   */
  async scanDatabase(): Promise<void> {
    console.log('MockIPC scanDatabase called')
    const stepId = 'scan-database'
    
    this.status(stepId, 'running', 'Scanning database connections...')
    this.log(stepId, 'info', 'Checking MongoDB Compass connections...')
    await this.delay(500)
    
    this.log(stepId, 'info', 'Found MongoDB Compass installation')
    await this.delay(500)
    
    this.log(stepId, 'info', 'Checking MySQL Workbench connections...')
    await this.delay(500)
    
    const mockConnections = [
      { 
        id: 'mongo-local', 
        name: 'Local MongoDB', 
        type: 'mongodb' as const,
        host: 'localhost',
        port: 27017,
        database: 'test_db',
        source: 'compass' as const
      },
      { 
        id: 'mysql-dev', 
        name: 'Local MySQL', 
        type: 'mysql' as const,
        host: 'localhost',
        port: 3306,
        database: 'dev_db',
        source: 'workbench' as const
      },
      { 
        id: 'postgres-prod', 
        name: 'Production PostgreSQL', 
        type: 'postgresql' as const,
        host: 'db.example.com',
        port: 5432,
        database: 'prod_db',
        source: 'pgadmin' as const
      },
    ]
    
    for (let i = 0; i < mockConnections.length; i++) {
      this.progress(stepId, i + 1, mockConnections.length, 'connections')
      await this.delay(200)
    }
    
    this.log(stepId, 'success', `Found ${mockConnections.length} database connections`)
    
    const result = {
      type: 'database-scan-result' as const,
      connections: mockConnections
    }
    
    this.status(stepId, 'success', 'Database scan complete')
    this.emit({
      type: 'result',
      stepId,
      state: 'success',
      data: result
    })
  }

  /**
   * Scan DevOps CLI tools
   */
  async scanDevTools(): Promise<void> {
    console.log('MockIPC scanDevTools called')
    const stepId = 'scan-devtools'
    
    this.status(stepId, 'running', 'Scanning DevOps tools...')
    await this.delay(500)
    
    const mockTools = [
      { id: 'git', name: 'Git', command: 'git', version: '2.42.0', path: 'C:\\Program Files\\Git\\cmd\\git.exe' },
      { id: 'docker', name: 'Docker', command: 'docker', version: '24.0.6', path: 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' },
      { id: 'kubectl', name: 'Kubectl', command: 'kubectl', version: '1.28.2', path: 'C:\\Users\\user\\.kube\\kubectl.exe' },
      { id: 'terraform', name: 'Terraform', command: 'terraform', version: '1.6.0', path: 'C:\\Program Files\\Terraform\\terraform.exe' },
    ]
    
    this.log(stepId, 'success', `Found ${mockTools.length} DevOps tools`)
    
    const result = {
      type: 'devtools-scan-result' as const,
      tools: mockTools
    }
    
    this.status(stepId, 'success', 'DevOps tools scan complete')
    this.emit({
      type: 'result',
      stepId,
      state: 'success',
      data: result
    })
  }

  /**
   * Scan environment variables and PATH
   */
  async scanEnvironment(): Promise<void> {
    console.log('MockIPC scanEnvironment called')
    const stepId = 'scan-environment'
    
    this.status(stepId, 'running', 'Scanning environment...')
    await this.delay(500)
    
    const mockVariables = [
      { id: 'path-var', name: 'PATH', value: 'C:\\Windows\\System32;C:\\Program Files\\Git\\cmd', scope: 'system' as const },
      { id: 'java-home', name: 'JAVA_HOME', value: 'C:\\Program Files\\Java\\jdk-17', scope: 'system' as const },
      { id: 'node-path', name: 'NODE_PATH', value: 'C:\\Program Files\\nodejs', scope: 'user' as const },
    ]
    
    const mockPaths = [
      { id: 'path-1', path: 'C:\\Windows\\System32', scope: 'system' as const, exists: true },
      { id: 'path-2', path: 'C:\\Program Files\\Git\\cmd', scope: 'system' as const, exists: true },
      { id: 'path-3', path: 'C:\\Users\\user\\AppData\\Local\\Programs\\Python\\Python311', scope: 'user' as const, exists: true },
    ]
    
    this.log(stepId, 'success', `Found ${mockVariables.length} environment variables and ${mockPaths.length} PATH entries`)
    
    const result = {
      type: 'environment-scan-result' as const,
      variables: mockVariables,
      pathEntries: mockPaths
    }
    
    this.status(stepId, 'success', 'Environment scan complete')
    this.emit({
      type: 'result',
      stepId,
      state: 'success',
      data: result
    })
  }

  /**
   * Scan installed packages
   */
  async scanPackages(): Promise<void> {
    console.log('MockIPC scanPackages called')
    const stepId = 'scan-packages'
    
    this.status(stepId, 'running', 'Scanning packages...')
    await this.delay(500)
    
    const mockPackages = [
      { id: 'npm-react', name: 'react', version: '18.2.0', manager: 'npm' as const },
      { id: 'npm-typescript', name: 'typescript', version: '5.2.2', manager: 'npm' as const },
      { id: 'pip-requests', name: 'requests', version: '2.31.0', manager: 'pip' as const },
      { id: 'pip-django', name: 'django', version: '4.2.5', manager: 'pip' as const },
      { id: 'winget-vscode', name: 'Microsoft.VisualStudioCode', version: '1.84.0', manager: 'winget' as const },
    ]
    
    this.log(stepId, 'success', `Found ${mockPackages.length} packages`)
    
    const result = {
      type: 'packages-scan-result' as const,
      packages: mockPackages
    }
    
    this.status(stepId, 'success', 'Packages scan complete')
    this.emit({
      type: 'result',
      stepId,
      state: 'success',
      data: result
    })
  }

  /**
   * Create bundle with selected items
   */
  async createBundle(options: {
    includeSecrets: boolean
    encryptionPassphrase?: string
    devtools: boolean
    environment: boolean
    packages: boolean
    selectedVSCodeProfiles: string[]
    selectedDockerImages: string[]
    selectedDatabases: string[]
  }): Promise<void> {
    console.log('MockIPC createBundle called with options:', options)
    const stepId = 'create-bundle'
    
    this.status(stepId, 'running', 'Creating bundle...')
    this.log(stepId, 'info', 'Initializing bundle creation...')
    await this.delay(500)
    
    // Scan DevOps tools if requested
    if (options.devtools) {
      this.log(stepId, 'info', 'Scanning DevOps tools...')
      this.progress(stepId, 1, 5, 'scans')
      await this.delay(800)
      this.log(stepId, 'info', 'Found: Git 2.42.0, Node.js 18.17.0')
    }
    
    // Scan environment if requested
    if (options.environment) {
      this.log(stepId, 'info', 'Scanning environment variables...')
      this.progress(stepId, 2, 5, 'scans')
      await this.delay(800)
      this.log(stepId, 'info', 'Found 28 PATH entries')
    }
    
    // Scan packages if requested
    if (options.packages) {
      this.log(stepId, 'info', 'Scanning package dependencies...')
      this.progress(stepId, 3, 5, 'scans')
      await this.delay(800)
      this.log(stepId, 'info', 'Found npm, pip, and cargo packages')
    }
    
    // Create manifest
    this.log(stepId, 'info', 'Creating bundle manifest...')
    this.progress(stepId, 4, 5, 'scans')
    await this.delay(1000)
    
    const itemCount = 
      options.selectedVSCodeProfiles.length +
      options.selectedDockerImages.length +
      options.selectedDatabases.length +
      (options.devtools ? 2 : 0) +
      (options.packages ? 3 : 0)
    
    this.log(stepId, 'info', `Bundling ${itemCount} items...`)
    
    // Compress and create ZIP
    this.log(stepId, 'info', 'Compressing bundle...')
    this.progress(stepId, 5, 5, 'scans')
    await this.delay(1500)
    
    const bundleName = `BuildSmith-Bundle-${new Date().toISOString().split('T')[0]}.zip`
    const bundlePath = `C:\\Users\\Documents\\${bundleName}`
    
    // Encrypt if requested
    if (options.includeSecrets && options.encryptionPassphrase) {
      this.log(stepId, 'info', 'Encrypting bundle with AES-256...')
      await this.delay(1000)
      this.log(stepId, 'success', 'Bundle encrypted successfully')
    }
    
    this.log(stepId, 'success', `Bundle created: ${bundlePath}`)
    this.log(stepId, 'info', `Bundle size: ${(Math.random() * 50 + 10).toFixed(2)} MB`)
    
    const result = {
      type: 'bundle-created' as const,
      bundlePath,
      bundleName,
      size: Math.floor(Math.random() * 50000000 + 10000000),
      encrypted: options.includeSecrets,
      itemCount
    }
    
    this.status(stepId, 'success', 'Bundle created successfully')
    this.emit({
      type: 'result',
      stepId,
      state: 'success',
      data: result
    })
  }
}

// Singleton instance
export const mockIPC = new MockIPCService()
