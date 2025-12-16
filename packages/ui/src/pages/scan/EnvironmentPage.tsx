import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Settings, FolderTree, Search, Terminal } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'
import { ipc } from '../../services'
import { EnvironmentScanResult } from '../../types/ipc'
import ScanTerminal from '../../components/ScanTerminal'

interface LogEntry {
  stepId: string
  level: string
  text: string
  timestamp: string
}

export default function EnvironmentPage() {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'variables' | 'path'>('variables')
  const [activeCategory, setActiveCategory] = useState<'all' | 'developer' | 'system' | 'user'>('all')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)
  const scanInitiatedRef = useRef(false)

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
    scanCompleted,
    setScanCompleted,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    // If scan already completed and we have data, skip scanning and show results
    if (scanCompleted.environment && (selectedEnvironmentVars.length > 0 || selectedPathEntries.length > 0)) {
      setScanComplete(true)
      return
    }
    
    if (!scanInitiatedRef.current && !scanComplete && selectedEnvironmentVars.length === 0 && selectedPathEntries.length === 0) {
      scanInitiatedRef.current = true
      const performScan = async () => {
        setIsScanning(true)
        setShowTerminal(true) // Auto-open terminal during scan
        
        // Subscribe to IPC events
        const handleEvent = (event: any) => {
          // Capture logs
          if (event.type === 'log') {
            setLogs(prev => [...prev, {
              stepId: event.stepId,
              level: event.level,
              text: event.text,
              timestamp: event.timestamp || new Date().toISOString()
            }])
          }
          
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
            setScanCompleted({ environment: true })
            setIsScanning(false)
            setScanComplete(true)
          }
        }
        
        ipc.onEvent(handleEvent)
        
        // Start the scan
        await ipc.scanEnvironment()
      }

      performScan()
    }
    
    // Cleanup event listener on unmount
    return () => {
      ipc.removeEventListener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanCompleted.environment, selectedEnvironmentVars.length, selectedPathEntries.length]) // Only run once on mount - intentionally ignoring dependencies to prevent infinite loop

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

  // Developer tool keywords for filtering
  const isDeveloperVariable = (name: string, value: string) => {
    const lowerName = name.toLowerCase()
    const lowerValue = value.toLowerCase()
    const devKeywords = [
      'path', 'java', 'python', 'node', 'npm', 'git', 'maven', 'gradle',
      'docker', 'aws', 'azure', 'gcp', 'golang', 'cargo', 'rustup',
      'android', 'sdk', 'jdk', 'compiler', 'visual studio', 'vs',
      'cmake', 'mingw', 'gcc', 'clang', 'llvm', 'dotnet', 'nuget',
      'composer', 'php', 'ruby', 'perl', 'terraform', 'kubectl',
      'postgres', 'mysql', 'mongodb', 'redis', 'postgresql'
    ]
    return devKeywords.some(keyword => 
      lowerName.includes(keyword) || lowerValue.includes(keyword)
    )
  }

  const isDeveloperPath = (path: string) => {
    const lowerPath = path.toLowerCase()
    const devKeywords = [
      'java', 'python', 'node', 'npm', 'git', 'maven', 'gradle',
      'docker', 'aws', 'azure', 'gcp', 'golang', 'cargo', 'rust',
      'android', 'sdk', 'jdk', 'compiler', 'visual studio', 'mingw',
      'cmake', 'gcc', 'clang', 'llvm', 'dotnet', 'nuget',
      'composer', 'php', 'ruby', 'perl', 'terraform', 'kubectl',
      'postgres', 'mysql', 'mongodb', 'redis', 'postgresql', 'bin'
    ]
    return devKeywords.some(keyword => lowerPath.includes(keyword))
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

const filteredVars = selectedEnvironmentVars.filter(v => {
    const matchesSearch = v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.value?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeCategory === 'all') return matchesSearch
    if (activeCategory === 'developer') return matchesSearch && isDeveloperVariable(v.name, v.value)
    if (activeCategory === 'system') return matchesSearch && v.scope === 'system'
    if (activeCategory === 'user') return matchesSearch && v.scope === 'user'
    return matchesSearch
  })

  const filteredPaths = selectedPathEntries.filter(p => {
    const matchesSearch = p.path?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeCategory === 'all') return matchesSearch
    if (activeCategory === 'developer') return matchesSearch && isDeveloperPath(p.path)
    if (activeCategory === 'system') return matchesSearch && p.scope === 'system'
    if (activeCategory === 'user') return matchesSearch && p.scope === 'user'
    return matchesSearch
  })

  const selectedVarsCount = selectedEnvironmentVars.filter(v => v.selected).length
  const selectedPathsCount = selectedPathEntries.filter(p => p.selected).length

  // Calculate progress
  const totalSteps = [
    scanSettings.vscode,
    scanSettings.docker,
    scanSettings.databases,
    scanSettings.devtools,
    scanSettings.environment,
    scanSettings.packages
  ].filter(Boolean).length
  
  const currentStep = [
    scanSettings.vscode,
    scanSettings.docker,
    scanSettings.databases,
    scanSettings.devtools
  ].filter(Boolean).length + 1

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar */}
        {totalSteps > 1 && (
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Configuration Progress</span>
              <span className="text-sm text-primary-300">Step {currentStep} of {totalSteps}</span>
            </div>
            <div className="w-full bg-primary-800 rounded-full h-2">
              <div 
                className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Scanning State */}
        {isScanning && (
          <div className="card p-8 text-center">
            <Loader2 className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Scanning Environment</h2>
            <p className="text-primary-300">Reading system and user environment variables...</p>
          </div>
        )}

        {/* Results - Only show after scanning */}
        {!isScanning && scanComplete && (
          <>
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => navigate('/scan')}
                className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Scan
              </button>
              <h1 className="text-4xl font-bold mb-2">Environment & PATH</h1>
              <p className="text-primary-200">
                Select environment variables and PATH entries to include in your bundle
              </p>
            </div>

            {/* Tabs */}
            <div className="card p-2 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('variables')}
                  className={`flex-1 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2 ${
                    activeTab === 'variables' 
                      ? 'bg-accent-600 text-white' 
                      : 'text-primary-300 hover:text-white hover:bg-primary-700'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Environment Variables ({selectedEnvironmentVars.length})
                </button>
                <button
                  onClick={() => setActiveTab('path')}
                  className={`flex-1 px-6 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2 ${
                    activeTab === 'path' 
                      ? 'bg-accent-600 text-white' 
                      : 'text-primary-300 hover:text-white hover:bg-primary-700'
                  }`}
                >
                  <FolderTree className="w-5 h-5" />
                  PATH Entries ({selectedPathEntries.length})
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="card p-2 mb-6 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap ${
                  activeCategory === 'all'
                    ? 'bg-accent-600 text-white'
                    : 'text-primary-300 hover:text-white hover:bg-primary-700'
                }`}
              >
                All ({activeTab === 'variables' ? selectedEnvironmentVars.length : selectedPathEntries.length})
              </button>
              <button
                onClick={() => setActiveCategory('developer')}
                className={`px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap ${
                  activeCategory === 'developer'
                    ? 'bg-accent-600 text-white'
                    : 'text-primary-300 hover:text-white hover:bg-primary-700'
                }`}
              >
                Developer Tools ({activeTab === 'variables' 
                  ? selectedEnvironmentVars.filter(v => isDeveloperVariable(v.name, v.value)).length
                  : selectedPathEntries.filter(p => isDeveloperPath(p.path)).length
                })
              </button>
              <button
                onClick={() => setActiveCategory('system')}
                className={`px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap ${
                  activeCategory === 'system'
                    ? 'bg-accent-600 text-white'
                    : 'text-primary-300 hover:text-white hover:bg-primary-700'
                }`}
              >
                System ({activeTab === 'variables'
                  ? selectedEnvironmentVars.filter(v => v.scope === 'system').length
                  : selectedPathEntries.filter(p => p.scope === 'system').length
                })
              </button>
              <button
                onClick={() => setActiveCategory('user')}
                className={`px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap ${
                  activeCategory === 'user'
                    ? 'bg-accent-600 text-white'
                    : 'text-primary-300 hover:text-white hover:bg-primary-700'
                }`}
              >
                User ({activeTab === 'variables'
                  ? selectedEnvironmentVars.filter(v => v.scope === 'user').length
                  : selectedPathEntries.filter(p => p.scope === 'user').length
                })
              </button>
            </div>

            {/* Search and Actions */}
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
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
                    onClick={() => setShowTerminal(true)}
                    className="btn-secondary flex items-center gap-2"
                    title="View scan logs"
                  >
                    <Terminal className="w-4 h-4" />
                    View Logs ({logs.length})
                  </button>
                  <button
                    onClick={() => {
                      if (activeTab === 'variables') {
                        setSelectedEnvironmentVars(selectedEnvironmentVars.map(v => {
                          if (activeCategory === 'all') return { ...v, selected: true }
                          if (activeCategory === 'developer' && isDeveloperVariable(v.name, v.value)) return { ...v, selected: true }
                          if (activeCategory === 'system' && v.scope === 'system') return { ...v, selected: true }
                          if (activeCategory === 'user' && v.scope === 'user') return { ...v, selected: true }
                          return v
                        }))
                      } else {
                        setSelectedPathEntries(selectedPathEntries.map(p => {
                          if (activeCategory === 'all') return { ...p, selected: true }
                          if (activeCategory === 'developer' && isDeveloperPath(p.path)) return { ...p, selected: true }
                          if (activeCategory === 'system' && p.scope === 'system') return { ...p, selected: true }
                          if (activeCategory === 'user' && p.scope === 'user') return { ...p, selected: true }
                          return p
                        }))
                      }
                    }}
                    className="btn-accent"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => {
                      if (activeTab === 'variables') {
                        setSelectedEnvironmentVars(selectedEnvironmentVars.map(v => {
                          if (activeCategory === 'all') return { ...v, selected: false }
                          if (activeCategory === 'developer' && isDeveloperVariable(v.name, v.value)) return { ...v, selected: false }
                          if (activeCategory === 'system' && v.scope === 'system') return { ...v, selected: false }
                          if (activeCategory === 'user' && v.scope === 'user') return { ...v, selected: false }
                          return v
                        }))
                      } else {
                        setSelectedPathEntries(selectedPathEntries.map(p => {
                          if (activeCategory === 'all') return { ...p, selected: false }
                          if (activeCategory === 'developer' && isDeveloperPath(p.path)) return { ...p, selected: false }
                          if (activeCategory === 'system' && p.scope === 'system') return { ...p, selected: false }
                          if (activeCategory === 'user' && p.scope === 'user') return { ...p, selected: false }
                          return p
                        }))
                      }
                    }}
                    className="btn-secondary"
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
                  filteredVars.map((variable, index) => (
                    <div
                      key={variable.id || `envvar-${index}`}
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
                  filteredPaths.map((entry, index) => (
                    <div
                      key={entry.id || `pathentry-${index}`}
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
          </>
        )}
      </div>

      {/* Terminal Modal */}
      <ScanTerminal
        logs={logs}
        isOpen={showTerminal}
        isMaximized={isTerminalMaximized}
        onClose={() => setShowTerminal(false)}
        onToggleMaximize={() => setIsTerminalMaximized(!isTerminalMaximized)}
        title="Environment & PATH Scan Output"
      />
    </div>
  )
}
