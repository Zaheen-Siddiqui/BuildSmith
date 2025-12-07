import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Circle, AlertCircle, XCircle, Loader, Terminal, RotateCw, ChevronRight } from 'lucide-react'

type StepState = 'pending' | 'running' | 'success' | 'failed' | 'requires_manual'

interface InstallStep {
  id: string
  name: string
  status: StepState
  logs: string[]
  duration?: number
}

export default function InstallerFlowPage() {
  const navigate = useNavigate()
  const [showLogs, setShowLogs] = useState(true)
  const [steps] = useState<InstallStep[]>([
    {
      id: 'download-docker',
      name: 'Download Docker Desktop',
      status: 'success',
      logs: [
        '[INFO] Starting download from https://desktop.docker.com/...',
        '[INFO] Downloaded 120 MB / 512 MB',
        '[INFO] Downloaded 240 MB / 512 MB',
        '[INFO] Downloaded 360 MB / 512 MB',
        '[INFO] Downloaded 480 MB / 512 MB',
        '[SUCCESS] Download completed',
      ],
      duration: 45
    },
    {
      id: 'install-docker',
      name: 'Install Docker Desktop',
      status: 'running',
      logs: [
        '[INFO] Running installer: DockerDesktop.exe',
        '[INFO] Installing Docker Engine...',
        '[INFO] Configuring WSL2 backend...',
      ]
    },
    {
      id: 'vscode-extensions',
      name: 'Install VS Code Extensions',
      status: 'pending',
      logs: []
    },
    {
      id: 'docker-images',
      name: 'Load Docker Images',
      status: 'pending',
      logs: []
    },
    {
      id: 'db-restore',
      name: 'Restore Database Connections',
      status: 'pending',
      logs: []
    },
    {
      id: 'env-setup',
      name: 'Configure Environment Variables',
      status: 'pending',
      logs: []
    }
  ])

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
      default:
        return 'border-primary-700 bg-white/5'
    }
  }

  const currentStep = steps.find(s => s.status === 'running') || steps[0]
  const completedCount = steps.filter(s => s.status === 'success').length
  const progress = (completedCount / steps.length) * 100

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
              <div className="text-2xl font-bold text-red-400">
                {steps.filter(s => s.status === 'failed').length}
              </div>
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
                {steps.map((step, index) => (
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
                  Live Logs
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
                  {currentStep.logs.map((log, index) => (
                    <div key={index} className="py-1">
                      <span className="text-primary-400">[{new Date().toLocaleTimeString()}]</span>{' '}
                      <span className={
                        log.includes('[ERROR]') ? 'text-red-400' :
                        log.includes('[SUCCESS]') ? 'text-accent-400' :
                        log.includes('[WARN]') ? 'text-yellow-400' :
                        'text-primary-200'
                      }>
                        {log}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 py-1 animate-pulse">
                    <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                    <span className="text-primary-300">Processing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="card p-6 mt-6">
              <h3 className="text-xl font-bold mb-4">Actions</h3>
              <div className="flex gap-3 flex-wrap">
                <button className="btn-secondary flex items-center gap-2">
                  <RotateCw className="w-4 h-4" />
                  Retry Failed
                </button>
                <button className="btn-secondary">
                  Skip Current
                </button>
                <button className="btn-secondary">
                  Pause
                </button>
                <button className="btn-secondary">
                  View Full Logs
                </button>
              </div>
            </div>

            {/* Manual Action Required (conditional) */}
            <div className="card p-6 mt-6 border-2 border-yellow-500/50 bg-yellow-900/10">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">Manual Action Required</h3>
                  <p className="text-primary-200 mb-4">
                    Docker Desktop requires WSL2 to be enabled. Please enable WSL2 and restart your system.
                  </p>
                  <div className="flex gap-3">
                    <button className="btn-accent">
                      I've Completed This Step
                    </button>
                    <button className="btn-secondary">
                      Open Instructions
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
          >
            Complete & Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
