import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, HardDrive, Play, ChevronDown, ChevronRight } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface InstallStep {
  name: string
  items: string[]
  requiresManual?: boolean
  manualSteps?: string[]
  estimatedTime: string
  diskSpace?: string
}

export default function SetupPreviewPage() {
  const navigate = useNavigate()
  const { importedBundle, manifestItems, setupSelections, selectedSetupDockerImages } = useBundleStore()
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  if (!importedBundle) {
    navigate('/import')
    return null
  }

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  // Build installation plan based on selections
  const installationSteps: InstallStep[] = []

  if (setupSelections.vscode) {
    const vscodeItems = manifestItems.filter(item => item.type === 'extension')
    installationSteps.push({
      name: 'VS Code Extensions & Profiles',
      items: vscodeItems.map(item => item.name),
      estimatedTime: `${Math.ceil(vscodeItems.length / 2)} minutes`,
      diskSpace: '~150 MB'
    })
  }

  if (setupSelections.docker && selectedSetupDockerImages.length > 0) {
    // Filter Docker items based on selected images
    const dockerItems = manifestItems
      .filter(item => item.type === 'image')
      .filter((item, index) => selectedSetupDockerImages.includes(`docker-${index}`))
    
    if (dockerItems.length > 0) {
      installationSteps.push({
        name: 'Docker Images',
        items: dockerItems.map(item => item.name),
        estimatedTime: `${dockerItems.length * 2} minutes`,
        diskSpace: '~2.5 GB',
        requiresManual: true,
        manualSteps: ['Ensure Docker Desktop is installed and running']
      })
    }
  }

  if (setupSelections.databases) {
    const dbItems = manifestItems.filter(item => item.type === 'secret')
    installationSteps.push({
      name: 'Database Connections',
      items: dbItems.map(item => item.name),
      estimatedTime: '2 minutes',
      requiresManual: true,
      manualSteps: [
        'Database credentials will be imported',
        'You may need to verify network access to remote databases'
      ]
    })
  }

  if (setupSelections.devtools) {
    const devtoolItems = manifestItems.filter(item => item.type === 'installer')
    installationSteps.push({
      name: 'DevOps Tools & Installers',
      items: devtoolItems.map(item => `${item.name} ${item.version}`),
      estimatedTime: `${devtoolItems.length * 3} minutes`,
      diskSpace: '~500 MB',
      requiresManual: true,
      manualSteps: [
        'Some installers may require administrator privileges',
        'You may need to accept license agreements'
      ]
    })
  }

  if (setupSelections.packages) {
    const packageItems = manifestItems.filter(item => item.type === 'package')
    installationSteps.push({
      name: 'Package Dependencies',
      items: packageItems.map(item => item.name),
      estimatedTime: `${Math.ceil(packageItems.length / 3)} minutes`,
      diskSpace: '~200 MB'
    })
  }

  const totalTime = installationSteps.reduce((acc, step) => {
    const minutes = Number.parseInt(step.estimatedTime)
    return acc + (Number.isNaN(minutes) ? 5 : minutes)
  }, 0)

  const totalDiskSpace = installationSteps.reduce((acc, step) => {
    if (!step.diskSpace) return acc
    const sizeMatch = step.diskSpace.match(/[\d.]+/)
    if (!sizeMatch) return acc
    const size = Number.parseFloat(sizeMatch[0])
    const isGB = step.diskSpace.includes('GB')
    return acc + (isGB ? size * 1024 : size)
  }, 0)

  const hasManualSteps = installationSteps.some(step => step.requiresManual)

  const handleStartSetup = () => {
    navigate('/setup-progress')
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/setup-config')}
            className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Configuration
          </button>
          <h1 className="text-4xl font-bold mb-2">Installation Preview</h1>
          <p className="text-primary-200">
            Review what will be installed and estimated requirements
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-accent-400" />
              <h3 className="font-semibold">Estimated Time</h3>
            </div>
            <p className="text-2xl font-bold text-accent-400">~{totalTime} min</p>
            <p className="text-sm text-primary-300 mt-1">Depending on network speed</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <HardDrive className="w-5 h-5 text-accent-400" />
              <h3 className="font-semibold">Disk Space</h3>
            </div>
            <p className="text-2xl font-bold text-accent-400">
              ~{totalDiskSpace >= 1024 ? `${(totalDiskSpace / 1024).toFixed(1)} GB` : `${totalDiskSpace.toFixed(0)} MB`}
            </p>
            <p className="text-sm text-primary-300 mt-1">Free space required</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-accent-400" />
              <h3 className="font-semibold">Installation Steps</h3>
            </div>
            <p className="text-2xl font-bold text-accent-400">{installationSteps.length}</p>
            <p className="text-sm text-primary-300 mt-1">Categories to install</p>
          </div>
        </div>

        {/* Manual Steps Warning */}
        {hasManualSteps && (
          <div className="card p-6 mb-6 border-2 border-yellow-600/50 bg-yellow-900/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold mb-2 text-yellow-400">Manual Steps Required</h3>
                <p className="text-primary-200 mb-3">
                  Some installations require manual interaction. You'll be prompted during the setup process for:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-primary-300">
                  <li>Administrator permissions for system-level installations</li>
                  <li>License agreement acceptance</li>
                  <li>OAuth sign-ins for cloud services</li>
                  <li>Network access verification for database connections</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Installation Plan */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Installation Plan</h2>
          <div className="space-y-3">
            {installationSteps.map((step, index) => (
              <div
                key={index}
                className="border border-white/20 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedSections.has(index) ? (
                      <ChevronDown className="w-5 h-5 text-accent-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-accent-400" />
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        {step.name}
                        {step.requiresManual && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded">
                            Manual steps
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-primary-300">
                        {step.items.length} items • {step.estimatedTime}
                        {step.diskSpace && ` • ${step.diskSpace}`}
                      </p>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-accent-500" />
                </button>

                {expandedSections.has(index) && (
                  <div className="p-4 bg-black/20 border-t border-white/20">
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold mb-2 text-primary-300">Items to install:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {step.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-accent-500 flex-shrink-0" />
                            <span className="text-primary-200 truncate">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {step.manualSteps && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-yellow-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Manual steps required:
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-primary-300">
                          {step.manualSteps.map((manualStep, i) => (
                            <li key={i}>{manualStep}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Requirements */}
        <div className="card p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">System Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-primary-300">Required:</h4>
              <ul className="space-y-1 text-primary-200">
                <li>• Administrator privileges for some installations</li>
                <li>• Active internet connection</li>
                <li>• ~{totalDiskSpace >= 1024 ? `${(totalDiskSpace / 1024).toFixed(1)} GB` : `${totalDiskSpace.toFixed(0)} MB`} free disk space</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-primary-300">Recommended:</h4>
              <ul className="space-y-1 text-primary-200">
                <li>• Antivirus temporarily disabled</li>
                <li>• Close other applications during installation</li>
                <li>• Stable network connection</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleStartSetup}
            className="btn-accent flex-1 flex items-center justify-center gap-2 min-w-0"
          >
            <Play className="w-5 h-5 flex-shrink-0" />
            Start Installation
          </button>
          <button
            onClick={() => navigate('/setup-config')}
            className="btn-secondary sm:w-auto"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
