import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Download, Loader, Terminal, X, Maximize2, Minimize2 } from 'lucide-react'
import { useBundleStore } from '../store/bundleStore'
import { mockIPC } from '../services/mockIPC'
import { IPCEvent, InstallStep, StepState } from '../types/ipc'

interface LogEntry {
  stepId: string
  level: string
  text: string
  timestamp: string
  isCommand?: boolean
}

export default function SetupProgressPage() {
  const navigate = useNavigate()
  const { importedBundle, setupSelections } = useBundleStore()
  const [steps, setSteps] = useState<InstallStep[]>([])
  const [allLogs, setAllLogs] = useState<LogEntry[]>([])
  const [currentStepId, setCurrentStepId] = useState<string | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)

  const handleIPCEvent = (event: IPCEvent) => {
    console.log('IPC Event:', event)

    switch (event.type) {
      case 'status':
        updateStepStatus(event.stepId, event.state, event.message)
        if (event.state === 'running') {
          setCurrentStepId(event.stepId)
        }
        break

      case 'log':
        addLog({
          stepId: event.stepId,
          level: event.level,
          text: event.text,
          timestamp: event.timestamp || new Date().toISOString(),
          isCommand: event.text.includes('Running') || event.text.includes('Installing') || 
                     event.text.includes('Loading') || event.text.includes('Downloading')
        })
        break

      case 'progress':
        updateStepProgress(event.stepId, event.current, event.total)
        break

      case 'complete':
        console.log('Installation complete:', event.outcome)
        setTimeout(() => {
          navigate('/setup-complete')
        }, 2000)
        break
    }
  }

  const updateStepStatus = (stepId: string, state: StepState, message: string) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId
          ? { ...step, status: state, logs: [...step.logs, message] }
          : step
      )
    )
  }

  const updateStepProgress = (stepId: string, current: number, total: number) => {
    const progress = Math.round((current / total) * 100)
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId
          ? { ...step, logs: [...step.logs, `Progress: ${progress}%`] }
          : step
      )
    )
  }

  const addLog = (log: LogEntry) => {
    setAllLogs(prev => [...prev, log])
  }

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Subscribe to IPC events
    mockIPC.onEvent(handleIPCEvent)

    // Start installation
    startInstallation()

    // Cleanup on unmount
    return () => {
      mockIPC.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedBundle, navigate])

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current && showTerminal) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [allLogs, showTerminal])

  const startInstallation = async () => {
    // Build selected items list
    const selectedItems: string[] = []
    if (setupSelections.vscode) selectedItems.push('vscode')
    if (setupSelections.docker) selectedItems.push('docker')
    if (setupSelections.databases) selectedItems.push('databases')
    if (setupSelections.devtools) selectedItems.push('devtools')
    if (setupSelections.packages) selectedItems.push('packages')

    try {
      await mockIPC.startSetup({
        cmd: 'startSetup',
        bundlePath: importedBundle?.name || 'bundle.zip',
        selectedItems,
        options: {
          preferOffline: false,
          skipManual: false
        }
      })
    } catch (error) {
      console.error('Failed to start installation:', error)
    }
  }

  const getStatusIcon = (status: StepState) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-400" />
      case 'running':
        return <Loader className="w-6 h-6 text-accent-400 animate-spin" />
      default:
        return <Clock className="w-6 h-6 text-primary-400" />
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400'
      case 'warn':
        return 'text-yellow-400'
      case 'success':
        return 'text-green-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-primary-300'
    }
  }

  const completedSteps = steps.filter(s => s.status === 'success').length
  const totalProgress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0
  const allComplete = steps.length > 0 && steps.every(s => s.status === 'success' || s.status === 'failed')

  // Calculate category-specific progress
  const getCategoryProgress = (categoryId: string) => {
    const categorySteps = steps.filter(s => s.id === categoryId)
    if (categorySteps.length === 0) return 0
    const completed = categorySteps.filter(s => s.status === 'success').length
    return (completed / categorySteps.length) * 100
  }

  const getCategoryStatus = (categoryId: string) => {
    const step = steps.find(s => s.id === categoryId)
    return step?.status || 'pending'
  }

  const getCategoryStats = (categoryId: string, defaultName: string, defaultCount: number, defaultTime: string, defaultSize?: string) => {
    const step = steps.find(s => s.id === categoryId)
    if (!step) return { name: defaultName, count: defaultCount, time: defaultTime, size: defaultSize }
    
    // Extract count from step name if present
    const countMatch = step.name.match(/\((\d+)\s+\w+\)/)
    const count = countMatch ? parseInt(countMatch[1]) : defaultCount
    
    return {
      name: defaultName,
      count,
      time: defaultTime,
      size: defaultSize
    }
  }

  if (!importedBundle) return null

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Installation in Progress</h1>
          <p className="text-primary-200">
            Setting up your development environment from <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Overall Progress */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">Overall Progress</h3>
              <p className="text-primary-300">
                {completedSteps} of {steps.length} steps completed
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-accent-400">{Math.round(totalProgress)}%</div>
            </div>
          </div>
          <div className="w-full bg-primary-800 rounded-full h-3 mb-6">
            <div
              className="bg-accent-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>

          {/* Category Progress Bars */}
          <div className="space-y-4 mb-6">
            {setupSelections.vscode && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-[200px]">
                  {getStatusIcon(getCategoryStatus('vscode'))}
                  <div>
                    <div className="font-semibold">VS Code Extensions & Profiles</div>
                    <div className="text-xs text-primary-400">
                      {getCategoryStats('vscode', 'VS Code', 2, '1 minutes', '~150 MB').count} items • 
                      {getCategoryStats('vscode', 'VS Code', 2, '1 minutes', '~150 MB').time} • 
                      {getCategoryStats('vscode', 'VS Code', 2, '1 minutes', '~150 MB').size}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-primary-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCategoryProgress('vscode')}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {setupSelections.docker && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-[200px]">
                  {getStatusIcon(getCategoryStatus('docker'))}
                  <div>
                    <div className="font-semibold">Docker Images</div>
                    <div className="text-xs text-primary-400">
                      {getCategoryStats('docker', 'Docker', 2, '4 minutes', '~2.5 GB').count} items • 
                      {getCategoryStats('docker', 'Docker', 2, '4 minutes', '~2.5 GB').time} • 
                      {getCategoryStats('docker', 'Docker', 2, '4 minutes', '~2.5 GB').size}
                    </div>
                    <div className="text-xs text-yellow-400">Manual steps</div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-primary-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCategoryProgress('docker')}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {setupSelections.databases && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-[200px]">
                  {getStatusIcon(getCategoryStatus('databases'))}
                  <div>
                    <div className="font-semibold">Database Connections</div>
                    <div className="text-xs text-primary-400">
                      {getCategoryStats('databases', 'Databases', 1, '2 minutes').count} items • 
                      {getCategoryStats('databases', 'Databases', 1, '2 minutes').time}
                    </div>
                    <div className="text-xs text-yellow-400">Manual steps</div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-primary-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCategoryProgress('databases')}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {setupSelections.devtools && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-[200px]">
                  {getStatusIcon(getCategoryStatus('devtools'))}
                  <div>
                    <div className="font-semibold">DevOps Tools & Installers</div>
                    <div className="text-xs text-primary-400">
                      {getCategoryStats('devtools', 'DevTools', 2, '6 minutes', '~500 MB').count} items • 
                      {getCategoryStats('devtools', 'DevTools', 2, '6 minutes', '~500 MB').time} • 
                      {getCategoryStats('devtools', 'DevTools', 2, '6 minutes', '~500 MB').size}
                    </div>
                    <div className="text-xs text-yellow-400">Manual steps</div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-primary-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCategoryProgress('devtools')}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {setupSelections.packages && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-[200px]">
                  {getStatusIcon(getCategoryStatus('packages'))}
                  <div>
                    <div className="font-semibold">Package Dependencies</div>
                    <div className="text-xs text-primary-400">
                      {getCategoryStats('packages', 'Packages', 5, '3 minutes').count} items • 
                      {getCategoryStats('packages', 'Packages', 5, '3 minutes').time}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-primary-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCategoryProgress('packages')}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View Logs Button */}
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            {showTerminal ? 'Hide Terminal Logs' : 'View Terminal Logs'}
          </button>
        </div>

        {/* Installation Steps */}
        <div className="space-y-4 mb-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`card p-6 transition-all ${
                step.status === 'running' ? 'border-2 border-accent-600' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{step.name}</h3>
                  <p className="text-sm text-primary-300">
                    {(() => {
                      if (step.logs.length === 0) return 'Waiting...';
                      const lastLog = step.logs.at(-1);
                      return typeof lastLog === 'string' ? lastLog : 'Processing...';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Terminal Output Modal */}
        {showTerminal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div
              className={`bg-primary-900 rounded-lg shadow-2xl flex flex-col ${
                isTerminalMaximized ? 'w-full h-full' : 'w-full max-w-5xl h-[80vh]'
              } transition-all duration-200`}
            >
              {/* Terminal Header */}
              <div className="bg-primary-800 px-6 py-4 flex items-center justify-between border-b border-white/10 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <Terminal className="w-6 h-6 text-accent-400" />
                  <h2 className="text-xl font-bold">Live Terminal Output</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTerminalMaximized(!isTerminalMaximized)}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    title={isTerminalMaximized ? 'Restore' : 'Maximize'}
                  >
                    {isTerminalMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="p-2 hover:bg-white/10 rounded transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Terminal Content */}
              <div
                ref={terminalRef}
                className="flex-1 bg-black p-6 overflow-y-auto font-mono text-sm"
              >
                {allLogs.length === 0 ? (
                  <div className="text-primary-400">Waiting for installation to start...</div>
                ) : (
                  <div className="space-y-0.5">
                    {allLogs.map((log, i) => (
                      <div key={`${log.stepId}-${log.timestamp}-${i}`} className="flex gap-3 items-start">
                        <span className="text-primary-500 text-xs flex-shrink-0 w-20">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`${getLogLevelColor(log.level)} ${log.isCommand ? 'font-semibold' : ''}`}>
                          {log.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Terminal Footer */}
              <div className="bg-primary-800 px-6 py-3 text-sm text-primary-400 border-t border-white/10 rounded-b-lg flex items-center justify-between">
                <span>{allLogs.length} log entries</span>
                <span>Current Step: {currentStepId || 'Initializing...'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        {!allComplete && (
          <div className="card p-6 border-2 border-accent-600/50">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-accent-400 animate-pulse" />
              <p className="text-primary-200">
                Installation is in progress. Please do not close this window or turn off your computer.
              </p>
            </div>
          </div>
        )}

        {allComplete && (
          <div className="card p-6 border-2 border-green-600/50 bg-green-900/10">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-xl font-bold text-green-400 mb-1">Installation Complete!</h3>
                <p className="text-primary-200">
                  Redirecting to summary...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
