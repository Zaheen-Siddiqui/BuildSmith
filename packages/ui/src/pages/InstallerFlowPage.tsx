import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Circle, AlertCircle, XCircle, Loader, Terminal, RotateCw, ChevronRight, Square, Play } from 'lucide-react'
import { InstallStep, IPCEvent, StepState } from '../types/ipc'
import { mockIPC } from '../services/mockIPC'

export default function InstallerFlowPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogs, setShowLogs] = useState(true)
  const [steps, setSteps] = useState<InstallStep[]>([])
  const [currentStepId, setCurrentStepId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [allLogs, setAllLogs] = useState<{ stepId: string; level: string; text: string; timestamp: string }[]>([])
  
  // Get setup parameters from navigation state
  const { bundlePath, selectedItems } = location.state || { 
    bundlePath: 'C:\\\\BuildSmith\\\\bundles\\\\test.zip',
    selectedItems: ['docker', 'vscode', 'devtools']
  }
  
  console.log('InstallerFlow received:', { bundlePath, selectedItems })

  useEffect(() => {
    // Subscribe to IPC events
    mockIPC.onEvent(handleIPCEvent)
    
    // Auto-start installation when page loads
    startInstallation()
    
    // Only abort when component unmounts (navigating away)
    return () => {
      console.log('InstallerFlowPage unmounting, aborting installation')
      mockIPC.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleIPCEvent = (event: IPCEvent) => {
    console.log('IPC Event:', event)
    
    switch (event.type) {
      case 'status':
        updateStepStatus(event.stepId, event.state)
        if (event.state === 'running') {
          setCurrentStepId(event.stepId)
        }
        break
        
      case 'log':
        addLog(event.stepId, event.level, event.text, event.timestamp || new Date().toISOString())
        break
        
      case 'result':
        updateStepResult(event.stepId, event.state, event.duration, event.error)
        break
        
      case 'complete':
        handleInstallationComplete(event)
        break
        
      case 'progress':
        updateStepProgress(event.stepId, event.current, event.total, event.unit)
        break
        
      case 'manual_action':
        handleManualAction(event.stepId, {
          title: event.title,
          description: event.description,
          instructions: event.instructions,
          canSkip: event.canSkip || false
        })
        setIsPaused(true)
        break
    }
  }

  const startInstallation = async () => {
    console.log('Starting installation...')
    
    // Clear previous state
    setAllLogs([])
    setCurrentStepId(null)
    setIsRunning(true)
    setIsPaused(false)
    
    // Initialize steps
    const initialSteps = generateInitialSteps(selectedItems)
    setSteps(initialSteps)
    
    // Start the mock setup process
    try {
      await mockIPC.startSetup({
        cmd: 'startSetup',
        bundlePath,
        selectedItems,
        options: {
          preferOffline: false
        }
      })
    } catch (error) {
      console.error('Installation failed:', error)
      setIsRunning(false)
    }
  }

  const generateInitialSteps = (items: string[]): InstallStep[] => {
    const stepsList: InstallStep[] = []

    if (items.includes('docker')) {
      stepsList.push(
        { id: 'download-docker', name: 'Download Docker Desktop', status: 'pending', logs: [] },
        { id: 'install-docker', name: 'Install Docker Desktop', status: 'pending', logs: [] },
        { id: 'load-docker-images', name: 'Load Docker Images', status: 'pending', logs: [] }
      )
    }

    if (items.includes('vscode')) {
      stepsList.push(
        { id: 'install-vscode-extensions', name: 'Install VS Code Extensions', status: 'pending', logs: [] }
      )
    }

    if (items.includes('databases')) {
      stepsList.push(
        { id: 'restore-databases', name: 'Restore Database Connections', status: 'pending', logs: [] }
      )
    }

    if (items.includes('devtools')) {
      stepsList.push(
        { id: 'install-devtools', name: 'Install Development Tools', status: 'pending', logs: [] }
      )
    }

    if (items.includes('environment')) {
      stepsList.push(
        { id: 'configure-environment', name: 'Configure Environment Variables', status: 'pending', logs: [] }
      )
    }

    return stepsList
  }

  const updateStepStatus = (stepId: string, state: StepState) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status: state }
        : step
    ))
  }

  const updateStepResult = (stepId: string, state: 'success' | 'failed', duration?: number, error?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status: state, duration, error }
        : step
    ))
  }

  const updateStepProgress = (stepId: string, current: number, total: number, unit?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, progress: { current, total, unit } }
        : step
    ))
  }

  const handleManualAction = (stepId: string, action: NonNullable<InstallStep['manualAction']>) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, manualAction: action }
        : step
    ))
  }

  const addLog = (stepId: string, level: string, text: string, timestamp: string) => {
    setAllLogs(prev => [...prev, { stepId, level, text, timestamp }])
  }

  const handleInstallationComplete = (event: IPCEvent & { type: 'complete' }) => {
    setIsRunning(false)
    setIsPaused(false)
    console.log('Installation complete:', event)
  }

  const handleAbort = () => {
    console.log('User clicked abort')
    mockIPC.abort()
    setIsRunning(false)
    setIsPaused(false)
    setCurrentStepId(null)
  }

  const handleResume = async (stepId: string) => {
    await mockIPC.resume(stepId)
    setIsPaused(false)
  }

  const handleRetry = async (stepId: string) => {
    await mockIPC.retryStep(stepId)
  }

  const getStepIcon = (status: StepState) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-accent-500" />
      case 'running':
        return <Loader className="w-6 h-6 text-primary-400 animate-spin" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />
      case 'requires_manual':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />
      case 'reboot_required':
        return <AlertCircle className="w-6 h-6 text-orange-500" />
      default:
        return <Circle className="w-6 h-6 text-primary-600" />
    }
  }

  const getStepColor = (status: StepState) => {
    switch (status) {
      case 'success':
        return 'border-accent-500 bg-accent-900/20'
      case 'running':
        return 'border-primary-500 bg-primary-900/20'
      case 'failed':
        return 'border-red-500 bg-red-900/20'
      case 'requires_manual':
        return 'border-yellow-500 bg-yellow-900/20'
      case 'reboot_required':
        return 'border-orange-500 bg-orange-900/20'
      default:
        return 'border-primary-700 bg-white/5'
    }
  }

  const currentStep = steps.find(s => s.id === currentStepId) || steps.find(s => s.status === 'running') || steps[0]
  const currentStepLogs = currentStep ? allLogs.filter(log => log.stepId === currentStep.id) : []
  const completedCount = steps.filter(s => s.status === 'success').length
  const failedCount = steps.filter(s => s.status === 'failed').length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  // Find step requiring manual action
  const manualStep = steps.find(s => s.status === 'requires_manual' && s.manualAction)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Installation Progress</h1>
          <p className="text-primary-200">
            Setting up your development environment
          </p>
        </div>

        {/* Progress Overview */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Overall Progress</h2>
            <span className="text-sm text-primary-300">{completedCount} of {steps.length} completed</span>
          </div>
          <div className="w-full bg-primary-950 rounded-full h-3 mb-4">
            <div 
              className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-400">{completedCount}</div>
              <div className="text-xs text-primary-300">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-400">
                {steps.filter(s => s.status === 'running').length}
              </div>
              <div className="text-xs text-primary-300">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{failedCount}</div>
              <div className="text-xs text-primary-300">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {steps.filter(s => s.status === 'pending').length}
              </div>
              <div className="text-xs text-primary-300">Pending</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Steps List */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h3 className="text-xl font-bold mb-4">Installation Steps</h3>
              <div className="space-y-2">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg border-2 transition-all ${getStepColor(step.status)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getStepIcon(step.status)}
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{step.name}</div>
                        {step.duration && (
                          <div className="text-xs text-primary-400">{step.duration}s</div>
                        )}
                        {step.progress && (
                          <div className="text-xs text-primary-400">
                            {Math.round((step.progress.current / step.progress.total) * 100)}%
                          </div>
                        )}
                      </div>
                      {step.status === 'running' && (
                        <ChevronRight className="w-4 h-4 text-primary-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Logs Panel */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Live Logs {currentStep && `- ${currentStep.name}`}
                </h3>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="text-sm text-accent-400 hover:text-accent-300"
                >
                  {showLogs ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showLogs && (
                <div className="bg-black/40 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
                  {currentStepLogs.map((log, index) => (
                    <div key={index} className="py-1">
                      <span className="text-primary-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                      <span className={
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'success' ? 'text-accent-400' :
                        log.level === 'warn' ? 'text-yellow-400' :
                        'text-primary-200'
                      }>
                        {log.text}
                      </span>
                    </div>
                  ))}
                  {isRunning && !isPaused && (
                    <div className="flex items-center gap-2 py-1 animate-pulse">
                      <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                      <span className="text-primary-300">Processing...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="card p-6 mt-6">
              <h3 className="text-xl font-bold mb-4">Actions</h3>
              <div className="flex gap-3 flex-wrap">
                {isRunning && !isPaused && (
                  <button 
                    onClick={handleAbort}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Abort
                  </button>
                )}
                {failedCount > 0 && (
                  <button 
                    onClick={() => {
                      const failedStep = steps.find(s => s.status === 'failed')
                      if (failedStep) handleRetry(failedStep.id)
                    }}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    Retry Failed
                  </button>
                )}
                <button className="btn-secondary">
                  View Full Logs
                </button>
              </div>
            </div>

            {/* Manual Action Required */}
            {manualStep && manualStep.manualAction && (
              <div className="card p-6 mt-6 border-2 border-yellow-500/50 bg-yellow-900/10">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{manualStep.manualAction.title}</h3>
                    <p className="text-primary-200 mb-4">
                      {manualStep.manualAction.description}
                    </p>
                    <div className="bg-black/20 rounded p-4 mb-4">
                      <div className="text-sm font-semibold mb-2">Steps to complete:</div>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {manualStep.manualAction.instructions.map((instruction, i) => (
                          <li key={i} className="text-primary-200">{instruction}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="flex gap-3">
                      {/* Show Install WSL2 button only for Docker step */}
                      {manualStep.id === 'install-docker' && (
                        <button 
                          onClick={() => mockIPC.installWSL2Automatically(manualStep.id)}
                          className="btn-accent flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Install WSL2 Automatically
                        </button>
                      )}
                      <button 
                        onClick={() => handleResume(manualStep.id)}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        I've Completed This Step
                      </button>
                      {manualStep.manualAction.canSkip && (
                        <button className="btn-secondary">
                          Skip for Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => navigate('/setup')}
            className="text-primary-300 hover:text-white transition-colors"
          >
            ← Back to Setup
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-accent"
            disabled={isRunning}
          >
            {isRunning ? 'Installation in Progress...' : 'Complete & Go to Dashboard'}
          </button>
        </div>
      </div>
    </div>
  )
}
