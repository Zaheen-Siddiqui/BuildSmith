import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Settings, FolderTree, Search } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'
import { ipc } from '../../services'
import { EnvironmentScanResult } from '../../types/ipc'

export default function EnvironmentPage() {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'variables' | 'path'>('variables')

  const { 
    selectedEnvironmentVars,
    selectedPathEntries,
    setSelectedEnvironmentVars,
    setSelectedPathEntries,
    scanSettings,
    setScanProgress,
    toggleEnvironmentVar,
    togglePathEntry,
    selectedDockerImages,
    selectedVSCodeProfiles,
    selectedDatabases,
    selectedDevTools,
    selectedPackages,
    setManifestItems,
    setCurrentBundle,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    if (!scanComplete && selectedEnvironmentVars.length === 0 && selectedPathEntries.length === 0) {
      const performScan = async () => {
        setIsScanning(true)
        
        // Subscribe to IPC events
        ipc.onEvent((event) => {
          if (event.type === 'result' && event.stepId === 'scan-environment' && event.state === 'success') {
            const data = event.data as EnvironmentScanResult
            
            // Convert scan results to store format
            const vars = data.variables.map(v => ({
              id: v.id,
              name: v.name,
              value: v.value,
              scope: v.scope,
              selected: false,
            }))
            
            const paths = data.pathEntries.map(p => ({
              id: p.id,
              path: p.path,
              scope: p.scope,
              exists: p.exists,
              selected: false,
            }))
            
            setSelectedEnvironmentVars(vars)
            setSelectedPathEntries(paths)
            setIsScanning(false)
            setScanComplete(true)
          }
        })
        
        // Start the scan
        await ipc.scanEnvironment()
      }

      performScan()
    }
  }, [scanComplete, selectedEnvironmentVars.length, selectedPathEntries.length, setSelectedEnvironmentVars, setSelectedPathEntries])

  const handleSelectAllVars = () => {
    setSelectedEnvironmentVars(selectedEnvironmentVars.map(v => ({ ...v, selected: true })))
  }

  const handleDeselectAllVars = () => {
    setSelectedEnvironmentVars(selectedEnvironmentVars.map(v => ({ ...v, selected: false })))
  }

  const handleSelectAllPaths = () => {
    setSelectedPathEntries(selectedPathEntries.map(p => ({ ...p, selected: true })))
  }

  const handleDeselectAllPaths = () => {
    setSelectedPathEntries(selectedPathEntries.map(p => ({ ...p, selected: false })))
  }

  const handleSaveAndContinue = () => {
    // Mark environment as complete
    setScanProgress({ environment: true })
    
    // Navigate to next step based on scan settings
    if (scanSettings.packages) {
      navigate('/packages')
    } else {
      // Generate complete manifest from all selected items
      generateManifest()
      navigate('/bundle-preview')
    }
  }

  const generateManifest = () => {
    const manifestItems: ManifestItem[] = []
    
    // Add Docker images
    selectedDockerImages.filter(img => img.selected).forEach(img => {
      manifestItems.push({
        name: `${img.name}:${img.tag}`,
        version: img.tag,
        type: 'image',
        source: 'docker',
        included: true,
      })
    })
    
    // Add VS Code profiles/extensions
    selectedVSCodeProfiles.filter(profile => profile.selected).forEach(profile => {
      profile.extensions.forEach(ext => {
        manifestItems.push({
          name: ext,
          version: '1.0.0',
          type: 'extension',
          source: 'vscode',
          included: true,
        })
      })
    })
    
    // Add database connections
    selectedDatabases.filter(db => db.selected).forEach(db => {
      manifestItems.push({
        name: db.name,
        version: '1.0.0',
        type: 'secret',
        source: db.type,
        included: true,
      })
    })
    
    // Add DevOps tools
    selectedDevTools.filter(tool => tool.selected).forEach(tool => {
      manifestItems.push({
        name: tool.name,
        version: tool.version,
        type: 'installer',
        source: tool.command,
        included: true,
      })
    })
    
    // Add environment variables
    selectedEnvironmentVars.filter(v => v.selected).forEach(v => {
      manifestItems.push({
        name: `ENV:${v.name}`,
        version: v.scope,
        type: 'secret',
        source: 'environment',
        included: true,
      })
    })
    
    // Add PATH entries
    selectedPathEntries.filter(p => p.selected).forEach(p => {
      manifestItems.push({
        name: `PATH:${p.path}`,
        version: p.scope,
        type: 'secret',
        source: 'path',
        included: true,
      })
    })
    
    // Add packages
    selectedPackages.filter(pkg => pkg.selected).forEach(pkg => {
      manifestItems.push({
        name: `${pkg.manager}:${pkg.name}`,
        version: pkg.version,
        type: 'package',
        source: pkg.manager,
        included: true,
      })
    })
    
    setManifestItems(manifestItems)
    setCurrentBundle({
      id: Date.now().toString(),
      name: `Bundle_${new Date().toISOString().split('T')[0]}`,
      createdAt: new Date().toISOString(),
      description: 'Auto-generated development environment bundle',
      encrypted: scanSettings.includeSecrets,
    })
  }

  const filteredVars = selectedEnvironmentVars.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.value.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPaths = selectedPathEntries.filter(p =>
    p.path.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedVarsCount = selectedEnvironmentVars.filter(v => v.selected).length
  const selectedPathsCount = selectedPathEntries.filter(p => p.selected).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/scan')}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Environment & PATH</h1>
            <p className="text-gray-400 mt-1">
              Select environment variables and PATH entries to include in your bundle
            </p>
          </div>
        </div>

        {/* Scanning State */}
        {isScanning && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-xl">Scanning environment...</p>
            <p className="text-gray-400 mt-2">Reading system and user environment variables</p>
          </div>
        )}

        {/* Results */}
        {!isScanning && scanComplete && (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 bg-white/5 backdrop-blur-sm rounded-xl p-2">
              <button
                onClick={() => setActiveTab('variables')}
                className={`
                  flex-1 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2
                  ${activeTab === 'variables' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Settings className="w-5 h-5" />
                Environment Variables ({selectedEnvironmentVars.length})
              </button>
              <button
                onClick={() => setActiveTab('path')}
                className={`
                  flex-1 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2
                  ${activeTab === 'path' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <FolderTree className="w-5 h-5" />
                PATH Entries ({selectedPathEntries.length})
              </button>
            </div>

            {/* Search and Actions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={activeTab === 'variables' ? 'Search variables...' : 'Search paths...'}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={activeTab === 'variables' ? handleSelectAllVars : handleSelectAllPaths}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={activeTab === 'variables' ? handleDeselectAllVars : handleDeselectAllPaths}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <p className="text-gray-400 mt-4">
                {activeTab === 'variables' 
                  ? `${selectedVarsCount} of ${selectedEnvironmentVars.length} variables selected`
                  : `${selectedPathsCount} of ${selectedPathEntries.length} paths selected`
                }
              </p>
            </div>

            {/* Variables List */}
            {activeTab === 'variables' && (
              <div className="grid gap-4">
                {filteredVars.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center">
                    <Settings className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-xl text-gray-400">No environment variables found</p>
                  </div>
                ) : (
                  filteredVars.map((variable) => (
                    <div
                      key={variable.id}
                      onClick={() => toggleEnvironmentVar(variable.id)}
                      className={`
                        bg-white/5 backdrop-blur-sm rounded-xl p-6 cursor-pointer
                        transition-all duration-200 border-2
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
                          </div>
                          <p className="text-sm text-gray-400 break-all">{variable.value}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PATH List */}
            {activeTab === 'path' && (
              <div className="grid gap-4">
                {filteredPaths.length === 0 ? (
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center">
                    <FolderTree className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-xl text-gray-400">No PATH entries found</p>
                  </div>
                ) : (
                  filteredPaths.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => togglePathEntry(entry.id)}
                      className={`
                        bg-white/5 backdrop-blur-sm rounded-xl p-6 cursor-pointer
                        transition-all duration-200 border-2
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
                            <span className={`px-2 py-1 rounded text-xs ${
                              entry.exists 
                                ? 'bg-green-600/30 text-green-300' 
                                : 'bg-red-600/30 text-red-300'
                            }`}>
                              {entry.exists ? 'exists' : 'missing'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Continue Button */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => navigate('/scan')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleSaveAndContinue}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-semibold"
              >
                Continue →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
