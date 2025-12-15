import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Code } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface VSCodeExtensionData {
  id: string
  name: string
  publisher?: string
  version?: string
  selected: boolean
}

export default function SetupVSCodePage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    setSetupSelections,
    selectedSetupVSCodeProfiles,
    setSelectedSetupVSCodeProfiles,
  } = useBundleStore()
  const [extensions, setExtensions] = useState<VSCodeExtensionData[]>([])

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Extract VS Code extensions from manifest
    const vscodeExtensions = manifestItems
      .filter(item => item.type === 'extension')
      .map((item, index) => {
        const extensionId = `vscode-${index}`
        return {
          id: extensionId,
          name: item.name,
          publisher: item.source,
          version: item.version,
          selected: selectedSetupVSCodeProfiles.includes(item.name) || setupSelections.vscode,
        }
      })

    setExtensions(vscodeExtensions)
  }, [importedBundle, manifestItems, setupSelections.vscode, selectedSetupVSCodeProfiles, navigate])

  const handleToggleExtension = (id: string) => {
    setExtensions(prev => 
      prev.map(ext => 
        ext.id === id ? { ...ext, selected: !ext.selected } : ext
      )
    )
  }

  const handleSelectAll = () => {
    setExtensions(prev => prev.map(ext => ({ ...ext, selected: true })))
  }

  const handleDeselectAll = () => {
    setExtensions(prev => prev.map(ext => ({ ...ext, selected: false })))
  }

  const handleContinue = () => {
    // Save selected extension names to store
    const selectedExtensionNames = extensions.filter(ext => ext.selected).map(ext => ext.name)
    setSelectedSetupVSCodeProfiles(selectedExtensionNames)
    
    const selectedCount = selectedExtensionNames.length
    
    if (selectedCount === 0) {
      // If no extensions selected, disable vscode in setup selections
      setSetupSelections({ ...setupSelections, vscode: false })
    }

    // Navigate to next page based on setup selections
    // Order: vscode -> docker -> databases -> devtools -> environment -> packages -> preview
    if (setupSelections.docker && manifestItems.some(item => item.type === 'image')) {
      navigate('/setup-docker')
    } else if (setupSelections.databases && manifestItems.some(item => item.type === 'secret')) {
      navigate('/setup-databases')
    } else if (setupSelections.devtools && manifestItems.some(item => item.type === 'installer')) {
      navigate('/setup-devtools')
    } else if (setupSelections.environment && manifestItems.some(item => item.name.startsWith('ENV:') || item.name.startsWith('PATH:'))) {
      navigate('/setup-environment')
    } else if (setupSelections.packages && manifestItems.some(item => item.type === 'package')) {
      navigate('/setup-packages')
    } else {
      navigate('/setup-preview')
    }
  }

  if (!importedBundle) return null

  const selectedCount = extensions.filter(ext => ext.selected).length
  const allSelected = extensions.length > 0 && extensions.every(ext => ext.selected)

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
          <h1 className="text-4xl font-bold mb-2">VS Code Extensions & Profiles</h1>
          <p className="text-primary-200">
            Select which VS Code extensions to install from bundle: <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <div className="card p-6 mb-6 border-2 border-blue-600/50 bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Code className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Extension Installation</h3>
              <ul className="space-y-1 text-sm text-primary-200">
                <li>• Extensions will be installed automatically via VS Code CLI</li>
                <li>• Some extensions may require VS Code restart to activate</li>
                <li>• Extension settings and configurations will be applied</li>
                <li>• VS Code must be installed on this system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Extensions List */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              Available Extensions ({extensions.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="btn-secondary text-sm"
                disabled={allSelected || extensions.length === 0}
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn-secondary text-sm"
                disabled={selectedCount === 0}
              >
                Deselect All
              </button>
            </div>
          </div>

          {extensions.length === 0 ? (
            <div className="text-center py-12 text-primary-300">
              <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No VS Code extensions found in this bundle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {extensions.map((ext) => (
                <div
                  key={ext.id}
                  onClick={() => handleToggleExtension(ext.id)}
                  className={`
                    p-4 rounded-lg border-2 transition-all cursor-pointer
                    ${ext.selected 
                      ? 'bg-accent-900/20 border-accent-600' 
                      : 'bg-white/5 border-transparent hover:border-primary-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={ext.selected}
                        onChange={() => handleToggleExtension(ext.id)}
                        className="w-5 h-5 rounded border-primary-600 bg-primary-800 text-accent-600 focus:ring-2 focus:ring-accent-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Code className="w-5 h-5 text-accent-400" />
                          <span className="font-medium">{ext.name}</span>
                          {ext.version && (
                            <span className="text-sm text-primary-400">v{ext.version}</span>
                          )}
                        </div>
                        {ext.publisher && (
                          <p className="text-sm text-primary-300 mt-1">
                            Publisher: {ext.publisher}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleContinue}
            className="btn-accent flex-1"
            disabled={selectedCount === 0}
          >
            {selectedCount === 0 ? 'No Extensions Selected' : `Continue with ${selectedCount} Extension${selectedCount !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={() => navigate('/setup-config')}
            className="btn-secondary"
          >
            Back
          </button>
        </div>

        {/* Skip Option */}
        {selectedCount === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={handleContinue}
              className="text-primary-400 hover:text-white transition-colors text-sm"
            >
              Skip VS Code setup and continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
