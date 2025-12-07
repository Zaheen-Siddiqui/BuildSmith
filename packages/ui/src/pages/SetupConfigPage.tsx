import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, Code, Database, HardDrive, Wrench, CheckCircle } from 'lucide-react'
import { useBundleStore } from '../store/bundleStore'

export default function SetupConfigPage() {
  const navigate = useNavigate()
  const { importedBundle, manifestItems, setSetupSelections, setupSelections } = useBundleStore()
  const [localSelections, setLocalSelections] = useState(setupSelections)

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
  const packages = manifestItems.filter(item => item.type === 'package')

  const toggleCategory = (category: keyof typeof localSelections) => {
    setLocalSelections(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const handleContinue = () => {
    setSetupSelections(localSelections)
    
    // If docker is selected and has images, go to docker selector first
    if (localSelections.docker && dockerImages.length > 0) {
      navigate('/setup-docker')
    } else {
      navigate('/setup-preview')
    }
  }

  const selectedCount = Object.values(localSelections).filter(Boolean).length
  const totalCategories = Object.keys(localSelections).length

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
            <div className="text-right">
              <p className="text-primary-300 text-sm">Selected Categories</p>
              <p className="text-2xl font-bold text-accent-400">{selectedCount} / {totalCategories}</p>
            </div>
          </div>
        </div>

        {/* Installation Options */}
        <div className="space-y-4 mb-6">
          {/* VS Code */}
          {vscodeExtensions.length > 0 && (
            <div
              className={`card p-6 transition-all ${
                localSelections.vscode ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSelections.vscode}
                  onChange={() => toggleCategory('vscode')}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-6 h-6 text-accent-400" />
                    <h3 className="text-xl font-semibold">VS Code Extensions & Profiles</h3>
                  </div>
                  <p className="text-primary-300 mb-3">
                    {vscodeExtensions.length} extensions will be installed
                  </p>
                  {localSelections.vscode && (
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
          )}

          {/* Docker Images */}
          {dockerImages.length > 0 && (
            <div
              className={`card p-6 transition-all ${
                localSelections.docker ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSelections.docker}
                  onChange={() => toggleCategory('docker')}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-6 h-6 text-accent-400" />
                    <h3 className="text-xl font-semibold">Docker Images</h3>
                  </div>
                  <p className="text-primary-300 mb-3">
                    {dockerImages.length} Docker images will be pulled or restored
                  </p>
                  {localSelections.docker && (
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
          )}

          {/* Database Connections */}
          {databases.length > 0 && (
            <div
              className={`card p-6 transition-all ${
                localSelections.databases ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSelections.databases}
                  onChange={() => toggleCategory('databases')}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-6 h-6 text-accent-400" />
                    <h3 className="text-xl font-semibold">Database Connections</h3>
                  </div>
                  <p className="text-primary-300 mb-3">
                    {databases.length} database connections will be restored
                  </p>
                  {localSelections.databases && (
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
          )}

          {/* DevOps Tools */}
          {devtools.length > 0 && (
            <div
              className={`card p-6 transition-all ${
                localSelections.devtools ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSelections.devtools}
                  onChange={() => toggleCategory('devtools')}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-6 h-6 text-accent-400" />
                    <h3 className="text-xl font-semibold">DevOps Tools & Installers</h3>
                  </div>
                  <p className="text-primary-300 mb-3">
                    {devtools.length} tools will be installed
                  </p>
                  {localSelections.devtools && (
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
          )}

          {/* Packages */}
          {packages.length > 0 && (
            <div
              className={`card p-6 transition-all ${
                localSelections.packages ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSelections.packages}
                  onChange={() => toggleCategory('packages')}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-6 h-6 text-accent-400" />
                    <h3 className="text-xl font-semibold">Package Dependencies</h3>
                  </div>
                  <p className="text-primary-300 mb-3">
                    {packages.length} packages will be installed
                  </p>
                  {localSelections.packages && (
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
          )}
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
