import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, FolderTree, CheckCircle } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface EnvironmentVarItem {
  id: string
  name: string
  value: string
  scope: 'system' | 'user'
  selected: boolean
  available: boolean
}

interface PathEntryItem {
  id: string
  path: string
  scope: 'system' | 'user'
  selected: boolean
  available: boolean
}

export default function SetupEnvironmentPage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    setSetupSelections,
  } = useBundleStore()
  const [variables, setVariables] = useState<EnvironmentVarItem[]>([])
  const [pathEntries, setPathEntries] = useState<PathEntryItem[]>([])
  const [activeTab, setActiveTab] = useState<'variables' | 'path'>('variables')

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Extract environment variables from manifest (items starting with ENV:)
    const envVars = manifestItems
      .filter(item => item.name.startsWith('ENV:'))
      .map((item, index) => ({
        id: `env-${index}`,
        name: item.name.replace('ENV:', ''),
        value: item.checksum || '', // Value stored in checksum field
        scope: (item.version as 'system' | 'user') || 'user',
        selected: setupSelections.environment,
        available: false, // TODO: Check if variable already exists
      }))

    // Extract PATH entries from manifest (items starting with PATH:)
    const paths = manifestItems
      .filter(item => item.name.startsWith('PATH:'))
      .map((item, index) => ({
        id: `path-${index}`,
        path: item.name.replace('PATH:', ''),
        scope: (item.version as 'system' | 'user') || 'user',
        selected: setupSelections.environment,
        available: false, // TODO: Check if path already exists in PATH
      }))

    setVariables(envVars)
    setPathEntries(paths)
  }, [importedBundle, manifestItems, setupSelections.environment, navigate])

  const handleToggleVariable = (id: string) => {
    setVariables(prev => 
      prev.map(v => v.id === id ? { ...v, selected: !v.selected } : v)
    )
  }

  const handleTogglePathEntry = (id: string) => {
    setPathEntries(prev => 
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    )
  }

  const handleSelectAllVars = () => {
    setVariables(prev => prev.map(v => ({ ...v, selected: true })))
  }

  const handleDeselectAllVars = () => {
    setVariables(prev => prev.map(v => ({ ...v, selected: false })))
  }

  const handleSelectAllPaths = () => {
    setPathEntries(prev => prev.map(p => ({ ...p, selected: true })))
  }

  const handleDeselectAllPaths = () => {
    setPathEntries(prev => prev.map(p => ({ ...p, selected: false })))
  }

  const handleContinue = () => {
    const selectedVarCount = variables.filter(v => v.selected).length
    const selectedPathCount = pathEntries.filter(p => p.selected).length
    const totalSelected = selectedVarCount + selectedPathCount
    
    if (totalSelected === 0) {
      // If nothing selected, disable environment in setup selections
      setSetupSelections({ ...setupSelections, environment: false })
    }

    // Navigate to next page based on setup selections
    if (setupSelections.packages && manifestItems.some(item => item.type === 'package')) {
      navigate('/setup-packages')
    } else {
      navigate('/setup-preview')
    }
  }

  if (!importedBundle) return null

  const selectedVarCount = variables.filter(v => v.selected).length
  const selectedPathCount = pathEntries.filter(p => p.selected).length
  const totalSelected = selectedVarCount + selectedPathCount

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
          <h1 className="text-4xl font-bold mb-2">Environment & PATH</h1>
          <p className="text-primary-200">
            Select environment variables and PATH entries to restore from bundle: <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <div className="card p-6 mb-6 border-2 border-blue-600/50 bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Settings className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Environment Restore Options</h3>
              <ul className="space-y-1 text-sm text-primary-200">
                <li>• System-scoped variables require administrative privileges</li>
                <li>• User-scoped variables will be set for current user only</li>
                <li>• PATH entries will be appended if they don't already exist</li>
                <li>• A system restart may be required for changes to take effect</li>
                <li>• Existing variables with same names will be overwritten</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('variables')}
            className={`
              flex-1 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2
              ${activeTab === 'variables' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <Settings className="w-5 h-5" />
            Environment Variables ({variables.length})
          </button>
          <button
            onClick={() => setActiveTab('path')}
            className={`
              flex-1 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2
              ${activeTab === 'path' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <FolderTree className="w-5 h-5" />
            PATH Entries ({pathEntries.length})
          </button>
        </div>

        {/* Stats and Actions */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">
                {activeTab === 'variables' ? `${variables.length} Variables` : `${pathEntries.length} PATH Entries`}
              </h3>
              <p className="text-primary-300 text-sm">
                {activeTab === 'variables' ? `${selectedVarCount} selected` : `${selectedPathCount} selected`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={activeTab === 'variables' ? handleSelectAllVars : handleSelectAllPaths}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
              >
                Select All
              </button>
              <button
                onClick={activeTab === 'variables' ? handleDeselectAllVars : handleDeselectAllPaths}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-sm"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Variables Tab */}
        {activeTab === 'variables' && (
          <div className="grid gap-4 mb-6">
            {variables.length === 0 ? (
              <div className="card p-12 text-center">
                <Settings className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-xl text-gray-400">No environment variables in this bundle</p>
              </div>
            ) : (
              variables.map((variable) => (
                <div
                  key={variable.id}
                  onClick={() => handleToggleVariable(variable.id)}
                  className={`
                    card p-6 cursor-pointer transition-all duration-200 border-2
                    ${variable.selected 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-transparent hover:border-white/20'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={variable.selected}
                      onChange={() => {}}
                      className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{variable.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          variable.scope === 'system' 
                            ? 'bg-purple-600/30 text-purple-300' 
                            : 'bg-green-600/30 text-green-300'
                        }`}>
                          {variable.scope}
                        </span>
                        {variable.available && (
                          <span className="px-2 py-1 bg-green-600/30 text-green-300 rounded text-xs flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Exists
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 break-all">{variable.value}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PATH Tab */}
        {activeTab === 'path' && (
          <div className="grid gap-4 mb-6">
            {pathEntries.length === 0 ? (
              <div className="card p-12 text-center">
                <FolderTree className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-xl text-gray-400">No PATH entries in this bundle</p>
              </div>
            ) : (
              pathEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleTogglePathEntry(entry.id)}
                  className={`
                    card p-6 cursor-pointer transition-all duration-200 border-2
                    ${entry.selected 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-transparent hover:border-white/20'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={entry.selected}
                      onChange={() => {}}
                      className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-sm text-gray-300 break-all font-mono">{entry.path}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          entry.scope === 'system' 
                            ? 'bg-purple-600/30 text-purple-300' 
                            : 'bg-green-600/30 text-green-300'
                        }`}>
                          {entry.scope}
                        </span>
                        {entry.available && (
                          <span className="px-2 py-1 bg-green-600/30 text-green-300 rounded text-xs flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            In PATH
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleContinue}
            className="btn-accent flex-1"
            disabled={totalSelected === 0 && setupSelections.environment}
          >
            {totalSelected === 0 ? 'Skip Environment' : `Continue with ${totalSelected} Items`}
          </button>
          <button
            onClick={() => navigate('/setup-config')}
            className="btn-secondary"
          >
            Back
          </button>
        </div>

        {/* Skip Option */}
        {totalSelected === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={handleContinue}
              className="text-primary-400 hover:text-white transition-colors text-sm"
            >
              Skip environment setup and continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
