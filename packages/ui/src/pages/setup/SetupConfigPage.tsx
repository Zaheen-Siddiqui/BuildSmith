import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Code, Database, HardDrive, Wrench, CheckCircle, Settings } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

export default function SetupConfigPage() {
  const navigate = useNavigate()
  const { importedBundle, manifestItems, setSetupSelections } = useBundleStore()
  const [localSelections, setLocalSelections] = useState({
    vscode: false,
    docker: false,
    databases: false,
    devtools: false,
    environment: false,
    packages: false
  })

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
    }
  }, [importedBundle, navigate])

  if (!importedBundle) return null

  // Group items by category
  const vscodeExtensions = manifestItems.filter(item => item.type === 'extension')
  const dockerImages = manifestItems.filter(item => item.type === 'image')
  const databases = manifestItems.filter(item => item.type === 'secret')
  const devtools = manifestItems.filter(item => item.type === 'installer')
  const environmentVars = manifestItems.filter(item => item.type === 'env' || item.type === 'environment')
  const packages = manifestItems.filter(item => item.type === 'package' || item.type === 'dependency')

  // Define all categories with their availability
  const categories = [
    { key: 'vscode' as const, items: vscodeExtensions, name: 'VS Code Extensions & Profiles', icon: Code },
    { key: 'docker' as const, items: dockerImages, name: 'Docker Images', icon: HardDrive },
    { key: 'databases' as const, items: databases, name: 'Database Connections', icon: Database },
    { key: 'devtools' as const, items: devtools, name: 'DevOps Tools & Installers', icon: Wrench },
    { key: 'environment' as const, items: environmentVars, name: 'Environment & PATH Variables', icon: Settings },
    { key: 'packages' as const, items: packages, name: 'Package Dependencies', icon: Package },
  ]

  const availableCategories = categories.filter(cat => cat.items.length > 0)

  const toggleCategory = (category: keyof typeof localSelections) => {
    setLocalSelections(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const handleSelectAll = () => {
    const allSelected: typeof localSelections = {
      vscode: vscodeExtensions.length > 0,
      docker: dockerImages.length > 0,
      databases: databases.length > 0,
      devtools: devtools.length > 0,
      environment: environmentVars.length > 0,
      packages: packages.length > 0,
    }
    setLocalSelections(allSelected)
  }

  const handleDeselectAll = () => {
    setLocalSelections({
      vscode: false,
      docker: false,
      databases: false,
      devtools: false,
      environment: false,
      packages: false,
    })
  }

  const handleContinue = () => {
    setSetupSelections(localSelections)
    
    // Navigate to selectors in order: vscode -> docker -> databases -> preview
    if (localSelections.vscode && vscodeExtensions.length > 0) {
      navigate('/setup-vscode')
    } else if (localSelections.docker && dockerImages.length > 0) {
      navigate('/setup-docker')
    } else if (localSelections.databases && databases.length > 0) {
      navigate('/setup-databases')
    } else {
      navigate('/setup-preview')
    }
  }

  // Calculate counts based on available categories
  const selectedCount = availableCategories.filter(cat => localSelections[cat.key]).length
  const totalCategories = availableCategories.length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/import')}
            className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Import
          </button>
          <h1 className="text-4xl font-bold mb-2">Configure Installation</h1>
          <p className="text-primary-200">
            Select which components you want to install from the bundle
          </p>
        </div>

        {/* Bundle Info */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">{importedBundle.name}</h3>
              <p className="text-primary-300 text-sm">
                Created: {new Date(importedBundle.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="btn-secondary text-sm py-2 px-3"
                  disabled={totalCategories === 0}
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="btn-secondary text-sm py-2 px-3"
                  disabled={selectedCount === 0}
                >
                  Deselect All
                </button>
              </div>
              <div className="text-right">
                <p className="text-primary-300 text-sm">Selected Categories</p>
                <p className="text-2xl font-bold text-accent-400">{selectedCount} / {totalCategories}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Installation Options */}
        <div className="space-y-4 mb-6">
          {/* VS Code */}
          <div
            className={`card p-6 transition-all ${
              localSelections.vscode ? 'border-2 border-accent-600' : 'border-2 border-transparent'
            } ${
              vscodeExtensions.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <label className={`flex items-start gap-4 ${vscodeExtensions.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={localSelections.vscode}
                onChange={() => toggleCategory('vscode')}
                disabled={vscodeExtensions.length === 0}
                className="mt-1 w-5 h-5 accent-accent-600 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-6 h-6 text-accent-400" />
                  <h3 className="text-xl font-semibold">VS Code Extensions & Profiles</h3>
                  {vscodeExtensions.length === 0 && (
                    <span className="text-xs bg-primary-700 px-2 py-1 rounded">Not in bundle</span>
                  )}
                </div>
                <p className="text-primary-300 mb-3">
                  {vscodeExtensions.length > 0 
                    ? `${vscodeExtensions.length} extensions will be installed`
                    : 'No VS Code extensions in this bundle'
                  }
                </p>
                {localSelections.vscode && vscodeExtensions.length > 0 && (
                  <div className="bg-black/20 rounded p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {vscodeExtensions.slice(0, 6).map((ext, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-accent-500" />
                          <span className="text-primary-300">{ext.name}</span>
                        </div>
                      ))}
                    </div>
                    {vscodeExtensions.length > 6 && (
                      <p className="text-xs text-primary-400 mt-2">
                        ... and {vscodeExtensions.length - 6} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Docker Images */}
          <div
            className={`card p-6 transition-all ${
              localSelections.docker ? 'border-2 border-accent-600' : 'border-2 border-transparent'
            } ${
              dockerImages.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <label className={`flex items-start gap-4 ${dockerImages.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={localSelections.docker}
                onChange={() => toggleCategory('docker')}
                disabled={dockerImages.length === 0}
                className="mt-1 w-5 h-5 accent-accent-600 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-6 h-6 text-accent-400" />
                  <h3 className="text-xl font-semibold">Docker Images</h3>
                  {dockerImages.length === 0 && (
                    <span className="text-xs bg-primary-700 px-2 py-1 rounded">Not in bundle</span>
                  )}
                </div>
                <p className="text-primary-300 mb-3">
                  {dockerImages.length > 0
                    ? `${dockerImages.length} Docker images will be pulled or restored`
                    : 'No Docker images in this bundle'
                  }
                </p>
                {localSelections.docker && dockerImages.length > 0 && (
                  <div className="bg-black/20 rounded p-3">
                    <div className="space-y-1">
                      {dockerImages.map((img, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-accent-500" />
                          <span className="text-primary-300 font-mono">{img.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Database Connections */}
          <div
            className={`card p-6 transition-all ${
              localSelections.databases ? 'border-2 border-accent-600' : 'border-2 border-transparent'
            } ${
              databases.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <label className={`flex items-start gap-4 ${databases.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={localSelections.databases}
                onChange={() => toggleCategory('databases')}
                disabled={databases.length === 0}
                className="mt-1 w-5 h-5 accent-accent-600 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-6 h-6 text-accent-400" />
                  <h3 className="text-xl font-semibold">Database Connections</h3>
                  {databases.length === 0 && (
                    <span className="text-xs bg-primary-700 px-2 py-1 rounded">Not in bundle</span>
                  )}
                </div>
                <p className="text-primary-300 mb-3">
                  {databases.length > 0
                    ? `${databases.length} database connections will be restored`
                    : 'No database connections in this bundle'
                  }
                </p>
                {localSelections.databases && databases.length > 0 && (
                  <div className="bg-black/20 rounded p-3">
                    <div className="space-y-1">
                      {databases.map((db, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-accent-500" />
                          <span className="text-primary-300">{db.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* DevOps Tools */}
          <div
            className={`card p-6 transition-all ${
              localSelections.devtools ? 'border-2 border-accent-600' : 'border-2 border-transparent'
            } ${
              devtools.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <label className={`flex items-start gap-4 ${devtools.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={localSelections.devtools}
                onChange={() => toggleCategory('devtools')}
                disabled={devtools.length === 0}
                className="mt-1 w-5 h-5 accent-accent-600 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-6 h-6 text-accent-400" />
                  <h3 className="text-xl font-semibold">DevOps Tools & Installers</h3>
                  {devtools.length === 0 && (
                    <span className="text-xs bg-primary-700 px-2 py-1 rounded">Not in bundle</span>
                  )}
                </div>
                <p className="text-primary-300 mb-3">
                  {devtools.length > 0
                    ? `${devtools.length} tools will be installed`
                    : 'No DevOps tools in this bundle'
                  }
                </p>
                {localSelections.devtools && devtools.length > 0 && (
                  <div className="bg-black/20 rounded p-3">
                    <div className="space-y-1">
                      {devtools.map((tool, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-accent-500" />
                          <span className="text-primary-300">{tool.name} {tool.version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Environment & PATH */}
          <div
            className={`card p-6 transition-all ${
              localSelections.environment ? 'border-2 border-accent-600' : 'border-2 border-transparent'
            } ${
              environmentVars.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <label className={`flex items-start gap-4 ${environmentVars.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={localSelections.environment}
                onChange={() => toggleCategory('environment')}
                disabled={environmentVars.length === 0}
                className="mt-1 w-5 h-5 accent-accent-600 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-6 h-6 text-accent-400" />
                  <h3 className="text-xl font-semibold">Environment & PATH Variables</h3>
                  {environmentVars.length === 0 && (
                    <span className="text-xs bg-primary-700 px-2 py-1 rounded">Not in bundle</span>
                  )}
                </div>
                <p className="text-primary-300 mb-3">
                  {environmentVars.length > 0
                    ? `${environmentVars.length} environment variables will be configured`
                    : 'No environment variables in this bundle'
                  }
                </p>
                {localSelections.environment && environmentVars.length > 0 && (
                  <div className="bg-black/20 rounded p-3">
                    <div className="space-y-1">
                      {environmentVars.slice(0, 6).map((envVar, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-accent-500" />
                          <span className="text-primary-300 font-mono">{envVar.name}</span>
                        </div>
                      ))}
                    </div>
                    {environmentVars.length > 6 && (
                      <p className="text-xs text-primary-400 mt-2">
                        ... and {environmentVars.length - 6} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Packages */}
          <div
            className={`card p-6 transition-all ${
              localSelections.packages ? 'border-2 border-accent-600' : 'border-2 border-transparent'
            } ${
              packages.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <label className={`flex items-start gap-4 ${packages.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={localSelections.packages}
                onChange={() => toggleCategory('packages')}
                disabled={packages.length === 0}
                className="mt-1 w-5 h-5 accent-accent-600 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-6 h-6 text-accent-400" />
                  <h3 className="text-xl font-semibold">Package Dependencies</h3>
                  {packages.length === 0 && (
                    <span className="text-xs bg-primary-700 px-2 py-1 rounded">Not in bundle</span>
                  )}
                </div>
                <p className="text-primary-300 mb-3">
                  {packages.length > 0
                    ? `${packages.length} packages will be installed`
                    : 'No packages in this bundle'
                  }
                </p>
                {localSelections.packages && packages.length > 0 && (
                  <div className="bg-black/20 rounded p-3">
                    <div className="grid grid-cols-2 gap-2">
                      {packages.slice(0, 6).map((pkg, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-accent-500" />
                          <span className="text-primary-300 font-mono">{pkg.name}</span>
                        </div>
                      ))}
                    </div>
                    {packages.length > 6 && (
                      <p className="text-xs text-primary-400 mt-2">
                        ... and {packages.length - 6} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleContinue}
            disabled={selectedCount === 0}
            className="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to Preview
          </button>
          <button
            onClick={() => navigate('/import')}
            className="btn-secondary"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
