import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, AlertTriangle, Download, Home, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface InstallationResult {
  category: string
  status: 'success' | 'error' | 'warning'
  itemsInstalled: number
  totalItems: number
  message: string
  manualSteps?: string[]
}

export default function SetupCompletePage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    selectedSetupDockerImages,
    selectedSetupVSCodeProfiles,
    selectedSetupDatabases,
  } = useBundleStore()
  const [showDockerImages, setShowDockerImages] = useState(false)
  const [showVSCodeExtensions, setShowVSCodeExtensions] = useState(false)
  const [showDatabases, setShowDatabases] = useState(false)

  if (!importedBundle) {
    navigate('/import')
    return null
  }

  // Simulate installation results
  const results: InstallationResult[] = []

  if (setupSelections.vscode && selectedSetupVSCodeProfiles.length > 0) {
    const selectedExtensions = manifestItems
      .filter(item => item.type === 'extension')
      .filter(item => selectedSetupVSCodeProfiles.includes(item.name))
    
    results.push({
      category: 'VS Code Extensions',
      status: 'success',
      itemsInstalled: selectedExtensions.length,
      totalItems: selectedExtensions.length,
      message: 'All extensions installed successfully'
    })
  }

  if (setupSelections.docker && selectedSetupDockerImages.length > 0) {
    const selectedImages = manifestItems
      .filter(item => item.type === 'image')
      .filter((_, index) => selectedSetupDockerImages.includes(`docker-${index}`))
    
    results.push({
      category: 'Docker Images',
      status: 'success',
      itemsInstalled: selectedImages.length,
      totalItems: selectedImages.length,
      message: 'All images pulled and ready',
      manualSteps: [
        'Start Docker Desktop to verify images',
        'Run docker images to see all pulled images'
      ]
    })
  }

  if (setupSelections.databases && selectedSetupDatabases.length > 0) {
    const selectedDbs = manifestItems
      .filter(item => item.type === 'secret')
      .filter(item => selectedSetupDatabases.includes(item.name))
    
    results.push({
      category: 'Database Connections',
      status: 'warning',
      itemsInstalled: selectedDbs.length,
      totalItems: selectedDbs.length,
      message: 'Connections imported, network access may be required',
      manualSteps: [
        'Test database connections in MongoDB Compass',
        'Verify network access to remote databases',
        'Update passwords if they have changed'
      ]
    })
  }

  if (setupSelections.devtools) {
    const devtoolItems = manifestItems.filter(item => item.type === 'installer')
    results.push({
      category: 'DevOps Tools',
      status: 'success',
      itemsInstalled: devtoolItems.length,
      totalItems: devtoolItems.length,
      message: 'All tools installed successfully',
      manualSteps: [
        'Sign in to GitHub CLI: gh auth login',
        'Configure cloud provider CLIs (Azure, AWS, GCP)'
      ]
    })
  }

  if (setupSelections.packages) {
    const packageItems = manifestItems.filter(item => item.type === 'package')
    results.push({
      category: 'Package Dependencies',
      status: 'success',
      itemsInstalled: packageItems.length,
      totalItems: packageItems.length,
      message: 'All packages installed successfully'
    })
  }

  const totalInstalled = results.reduce((acc, r) => acc + r.itemsInstalled, 0)
  const totalItems = results.reduce((acc, r) => acc + r.totalItems, 0)
  const hasWarnings = results.some(r => r.status === 'warning')
  const hasErrors = results.some(r => r.status === 'error')
  const allManualSteps = results.flatMap(r => r.manualSteps || [])

  const getStatusIcon = (status: InstallationResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'error':
        return <XCircle className="w-6 h-6 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />
    }
  }

  const getStatusColor = (status: InstallationResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-600/50 bg-green-900/10'
      case 'error':
        return 'border-red-600/50 bg-red-900/10'
      case 'warning':
        return 'border-yellow-600/50 bg-yellow-900/10'
    }
  }

  const handleExportLog = () => {
    // In a real implementation, this would generate and download a log file
    const log = `BuildSmith Installation Log
Bundle: ${importedBundle.name}
Date: ${new Date().toLocaleString()}

Installation Summary:
- Total items: ${totalItems}
- Successfully installed: ${totalInstalled}
- Status: ${hasErrors ? 'Failed' : hasWarnings ? 'Completed with warnings' : 'Success'}

Details:
${results.map(r => `
${r.category}:
  Status: ${r.status}
  Items: ${r.itemsInstalled}/${r.totalItems}
  Message: ${r.message}
${r.manualSteps ? `  Manual steps:\n${r.manualSteps.map(s => `    - ${s}`).join('\n')}` : ''}
`).join('\n')}
`

    const blob = new Blob([log], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `buildsmith-installation-log-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-900/30 border-2 border-green-600/50 mb-4">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Installation Complete!</h1>
          <p className="text-primary-200">
            Your development environment from <span className="text-accent-400">{importedBundle.name}</span> has been restored
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-accent-400 mb-1">{totalInstalled}</div>
            <p className="text-primary-300">Items Installed</p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-1">{results.filter(r => r.status === 'success').length}</div>
            <p className="text-primary-300">Successful</p>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-1">{allManualSteps.length}</div>
            <p className="text-primary-300">Manual Steps</p>
          </div>
        </div>

        {/* Installation Results */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Installation Summary</h2>
          <div className="space-y-3">
            {results.map((result, index) => {
              const isDockerCategory = result.category === 'Docker Images'
              const isVSCodeCategory = result.category === 'VS Code Extensions'
              const isDatabasesCategory = result.category === 'Database Connections'
              
              const selectedDockerImageNames = isDockerCategory ? manifestItems
                .filter(item => item.type === 'image')
                .filter((_, idx) => selectedSetupDockerImages.includes(`docker-${idx}`))
                .map(item => item.name) : []
              
              const selectedVSCodeExtensionNames = isVSCodeCategory ? manifestItems
                .filter(item => item.type === 'extension')
                .filter(item => selectedSetupVSCodeProfiles.includes(item.name))
                .map(item => item.name) : []
              
              return (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{result.category}</h3>
                        <p className="text-sm text-primary-300">{result.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">
                          {result.itemsInstalled}/{result.totalItems}
                        </div>
                        {isVSCodeCategory && (
                          <button
                            onClick={() => setShowVSCodeExtensions(!showVSCodeExtensions)}
                            className="p-1 hover:bg-primary-700 rounded transition-colors"
                            title={showVSCodeExtensions ? 'Hide extensions' : 'Show extensions'}
                          >
                            {showVSCodeExtensions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        {isDockerCategory && (
                          <button
                            onClick={() => setShowDockerImages(!showDockerImages)}
                            className="p-1 hover:bg-primary-700 rounded transition-colors"
                            title={showDockerImages ? 'Hide images' : 'Show images'}
                          >
                            {showDockerImages ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                        {isDatabasesCategory && (
                          <button
                            onClick={() => setShowDatabases(!showDatabases)}
                            className="p-1 hover:bg-primary-700 rounded transition-colors"
                            title={showDatabases ? 'Hide databases' : 'Show databases'}
                          >
                            {showDatabases ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {isVSCodeCategory && showVSCodeExtensions && (
                      <div className="bg-black/20 rounded p-3 mb-3">
                        <h4 className="text-sm font-semibold mb-2 text-primary-300">Installed Extensions:</h4>
                        <div className="space-y-1">
                          {selectedVSCodeExtensionNames.map((extension, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              <span className="text-primary-200">{extension}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isDockerCategory && showDockerImages && (
                      <div className="bg-black/20 rounded p-3 mb-3">
                        <h4 className="text-sm font-semibold mb-2 text-primary-300">Pulled Docker Images:</h4>
                        <div className="space-y-1">
                          {selectedDockerImageNames.map((image, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="w-3 h-3 text-green-400" />
                              <span className="font-mono text-primary-200">{image}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isDatabasesCategory && showDatabases && (() => {
                      const selectedDbNames = manifestItems
                        .filter(item => item.type === 'secret')
                        .filter(item => selectedSetupDatabases.includes(item.name))
                        .map(item => item.name)
                      
                      return (
                        <div className="bg-black/20 rounded p-3 mb-3">
                          <h4 className="text-sm font-semibold mb-2 text-primary-300">Imported Database Connections:</h4>
                          <div className="space-y-1">
                            {selectedDbNames.map((db, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                <span className="text-primary-200">{db}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    {result.manualSteps && result.manualSteps.length > 0 && (
                      <div className="bg-black/20 rounded p-3 mt-3">
                        <h4 className="text-sm font-semibold mb-2 text-primary-300">Next steps:</h4>
                        <ul className="space-y-1">
                          {result.manualSteps.map((step, i) => (
                            <li key={i} className="text-sm text-primary-200 flex items-start gap-2">
                              <span className="text-accent-400 flex-shrink-0">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </div>

        {/* Manual Steps Required */}
        {allManualSteps.length > 0 && (
          <div className="card p-6 mb-6 border-2 border-yellow-600/50 bg-yellow-900/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-3 text-yellow-400">Manual Steps Required</h3>
                <p className="text-primary-200 mb-3">
                  Some components require additional manual configuration:
                </p>
                <ul className="space-y-2">
                  {allManualSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-primary-200">
                      <span className="text-accent-400 flex-shrink-0 font-bold">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="card p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href="https://code.visualstudio.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <FileText className="w-5 h-5 text-accent-400" />
              <span>VS Code Documentation</span>
              <ExternalLink className="w-4 h-4 ml-auto text-primary-400" />
            </a>
            <a
              href="https://docs.docker.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <FileText className="w-5 h-5 text-accent-400" />
              <span>Docker Documentation</span>
              <ExternalLink className="w-4 h-4 ml-auto text-primary-400" />
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn-accent flex-1 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
          </button>
          <button
            onClick={handleExportLog}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Log
          </button>
        </div>
      </div>
    </div>
  )
}
