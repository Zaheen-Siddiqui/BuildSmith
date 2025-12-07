import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Download, Package, AlertCircle, Loader } from 'lucide-react'
import { useBundleStore } from '../store/bundleStore'

interface InstallationStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error' | 'warning'
  progress: number
  message: string
  logs: string[]
}

export default function SetupProgressPage() {
  const navigate = useNavigate()
  const { importedBundle, manifestItems, setupSelections } = useBundleStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<InstallationStep[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [showLogs, setShowLogs] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Initialize installation steps
    const initialSteps: InstallationStep[] = []

    if (setupSelections.vscode) {
      const vscodeItems = manifestItems.filter(item => item.type === 'extension')
      initialSteps.push({
        id: 'vscode',
        name: `Installing VS Code Extensions (${vscodeItems.length} items)`,
        status: 'pending',
        progress: 0,
        message: 'Waiting to start...',
        logs: []
      })
    }

    if (setupSelections.docker) {
      const dockerItems = manifestItems.filter(item => item.type === 'image')
      initialSteps.push({
        id: 'docker',
        name: `Pulling Docker Images (${dockerItems.length} images)`,
        status: 'pending',
        progress: 0,
        message: 'Waiting to start...',
        logs: []
      })
    }

    if (setupSelections.databases) {
      const dbItems = manifestItems.filter(item => item.type === 'secret')
      initialSteps.push({
        id: 'databases',
        name: `Restoring Database Connections (${dbItems.length} connections)`,
        status: 'pending',
        progress: 0,
        message: 'Waiting to start...',
        logs: []
      })
    }

    if (setupSelections.devtools) {
      const devtoolItems = manifestItems.filter(item => item.type === 'installer')
      initialSteps.push({
        id: 'devtools',
        name: `Installing DevOps Tools (${devtoolItems.length} tools)`,
        status: 'pending',
        progress: 0,
        message: 'Waiting to start...',
        logs: []
      })
    }

    if (setupSelections.packages) {
      const packageItems = manifestItems.filter(item => item.type === 'package')
      initialSteps.push({
        id: 'packages',
        name: `Installing Packages (${packageItems.length} packages)`,
        status: 'pending',
        progress: 0,
        message: 'Waiting to start...',
        logs: []
      })
    }

    setSteps(initialSteps)
  }, [importedBundle, manifestItems, setupSelections, navigate])

  // Simulate installation progress
  useEffect(() => {
    if (steps.length === 0 || isPaused) return

    const interval = setInterval(() => {
      setSteps(prevSteps => {
        const newSteps = [...prevSteps]
        const runningStepIndex = newSteps.findIndex(s => s.status === 'running')

        if (runningStepIndex !== -1) {
          const step = newSteps[runningStepIndex]
          step.progress += 5

          // Add simulated log messages
          if (step.progress === 25) {
            step.logs.push(`[${new Date().toLocaleTimeString()}] Downloading dependencies...`)
            step.message = 'Downloading dependencies...'
          } else if (step.progress === 50) {
            step.logs.push(`[${new Date().toLocaleTimeString()}] Installing components...`)
            step.message = 'Installing components...'
          } else if (step.progress === 75) {
            step.logs.push(`[${new Date().toLocaleTimeString()}] Configuring settings...`)
            step.message = 'Configuring settings...'
          }

          if (step.progress >= 100) {
            step.progress = 100
            step.status = 'success'
            step.message = 'Completed successfully'
            step.logs.push(`[${new Date().toLocaleTimeString()}] ✓ Installation completed`)
            setCurrentStep(prev => prev + 1)

            // Start next step
            const nextStepIndex = runningStepIndex + 1
            if (nextStepIndex < newSteps.length) {
              newSteps[nextStepIndex].status = 'running'
              newSteps[nextStepIndex].message = 'Starting...'
              newSteps[nextStepIndex].logs.push(`[${new Date().toLocaleTimeString()}] Starting installation...`)
            }
          }
        } else if (currentStep === 0 && newSteps.length > 0) {
          // Start first step
          newSteps[0].status = 'running'
          newSteps[0].message = 'Starting...'
          newSteps[0].logs.push(`[${new Date().toLocaleTimeString()}] Starting installation...`)
          setCurrentStep(1)
        }

        return newSteps
      })
    }, 200)

    return () => clearInterval(interval)
  }, [steps.length, currentStep, isPaused])

  // Check if all steps are complete
  const allComplete = steps.length > 0 && steps.every(s => s.status === 'success' || s.status === 'error')

  useEffect(() => {
    if (allComplete) {
      setTimeout(() => {
        navigate('/setup-complete')
      }, 1500)
    }
  }, [allComplete, navigate])

  const toggleLogs = (stepId: string) => {
    const newShowLogs = new Set(showLogs)
    if (newShowLogs.has(stepId)) {
      newShowLogs.delete(stepId)
    } else {
      newShowLogs.add(stepId)
    }
    setShowLogs(newShowLogs)
  }

  const getStatusIcon = (status: InstallationStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'error':
        return <XCircle className="w-6 h-6 text-red-400" />
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-400" />
      case 'running':
        return <Loader className="w-6 h-6 text-accent-400 animate-spin" />
      default:
        return <Clock className="w-6 h-6 text-primary-400" />
    }
  }

  const completedSteps = steps.filter(s => s.status === 'success').length
  const totalProgress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0

  if (!importedBundle) return null

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
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
          <div className="w-full bg-primary-800 rounded-full h-3">
            <div
              className="bg-accent-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Installation Steps */}
        <div className="space-y-4 mb-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`card p-6 transition-all ${
                step.status === 'running' ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(step.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{step.name}</h3>
                      <p className="text-sm text-primary-300">{step.message}</p>
                    </div>
                    {step.status === 'running' && (
                      <div className="text-right">
                        <div className="text-accent-400 font-semibold">{step.progress}%</div>
                      </div>
                    )}
                  </div>

                  {step.status === 'running' && (
                    <div className="w-full bg-primary-800 rounded-full h-2 mb-3">
                      <div
                        className="bg-accent-500 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  )}

                  {step.logs.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleLogs(step.id)}
                        className="text-sm text-accent-400 hover:text-accent-300 transition-colors mb-2"
                      >
                        {showLogs.has(step.id) ? 'Hide logs ▲' : 'Show logs ▼'}
                      </button>
                      {showLogs.has(step.id) && (
                        <div className="bg-black/40 rounded p-3 font-mono text-xs max-h-48 overflow-y-auto">
                          {step.logs.map((log, i) => (
                            <div key={i} className="text-primary-300 mb-1">
                              {log}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

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
