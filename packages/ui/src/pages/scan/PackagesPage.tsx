import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Package, Search, Terminal } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'
import { ipc } from '../../services'
import { PackagesScanResult } from '../../types/ipc'
import ScanTerminal from '../../components/ScanTerminal'

interface LogEntry {
  stepId: string
  level: string
  text: string
  timestamp: string
}

export default function PackagesPage() {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeManager, setActiveManager] = useState<'all' | 'npm' | 'pip' | 'winget' | 'chocolatey'>('all')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)

  const { 
    selectedPackages, 
    setSelectedPackages,
    setScanProgress,
    togglePackage,
    scanSettings,
    selectedDockerImages,
    selectedVSCodeProfiles,
    selectedDatabases,
    selectedDevTools,
    selectedEnvironmentVars,
    selectedPathEntries,
    setManifestItems,
    setCurrentBundle,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    if (!scanComplete && selectedPackages.length === 0) {
      const performScan = async () => {
        setIsScanning(true)
        setShowTerminal(true) // Auto-open terminal during scan
        
        // Subscribe to IPC events
        ipc.onEvent((event) => {
          // Capture logs
          if (event.type === 'log') {
            setLogs(prev => [...prev, {
              stepId: event.stepId,
              level: event.level,
              text: event.text,
              timestamp: event.timestamp || new Date().toISOString()
            }])
          }
          
          if (event.type === 'result' && event.stepId === 'scan-packages' && event.state === 'success') {
            const data = event.data as PackagesScanResult
            
            // Convert scan results to store format
            const packages = data.packages.map(pkg => ({
              id: pkg.id,
              name: pkg.name,
              version: pkg.version,
              manager: pkg.manager,
              selected: false,
            }))
            
            setSelectedPackages(packages)
            setIsScanning(false)
            setScanComplete(true)
          }
        })
        
        // Start the scan
        await ipc.scanPackages()
      }

      performScan()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - intentionally ignoring dependencies to prevent infinite loop

  const handleSelectAllForManager = (manager: typeof activeManager) => {
    setSelectedPackages(selectedPackages.map(pkg => 
      manager === 'all' || pkg.manager === manager 
        ? { ...pkg, selected: true } 
        : pkg
    ))
  }

  const handleDeselectAllForManager = (manager: typeof activeManager) => {
    setSelectedPackages(selectedPackages.map(pkg => 
      manager === 'all' || pkg.manager === manager 
        ? { ...pkg, selected: false } 
        : pkg
    ))
  }

  const handleSaveAndContinue = () => {
    // Mark packages as complete
    setScanProgress({ packages: true })
    
    // Generate complete manifest from all selected items
    generateManifest()
    
    // Packages is always last, go to bundle preview
    navigate('/bundle-preview')
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

  const filteredPackages = selectedPackages.filter(pkg => {
    const matchesSearch = pkg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false
    const matchesManager = activeManager === 'all' || pkg.manager === activeManager
    return matchesSearch && matchesManager
  })

  const packagesByManager = {
    npm: selectedPackages.filter(p => p.manager === 'npm'),
    pip: selectedPackages.filter(p => p.manager === 'pip'),
    winget: selectedPackages.filter(p => p.manager === 'winget'),
    chocolatey: selectedPackages.filter(p => p.manager === 'chocolatey'),
  }

  const selectedCount = filteredPackages.filter(p => p.selected).length

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
    scanSettings.devtools,
    scanSettings.environment
  ].filter(Boolean).length + 1

  const getManagerColor = (manager: string) => {
    switch (manager) {
      case 'npm': return 'bg-red-600/30 text-red-300'
      case 'pip': return 'bg-blue-600/30 text-blue-300'
      case 'winget': return 'bg-green-600/30 text-green-300'
      case 'chocolatey': return 'bg-yellow-600/30 text-yellow-300'
      default: return 'bg-gray-600/30 text-gray-300'
    }
  }

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

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/scan')}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Package Dependencies</h1>
            <p className="text-gray-400 mt-1">
              Select which packages to include in your bundle
            </p>
          </div>
        </div>

        {/* Scanning State */}
        {isScanning && (
          <div className="card p-8 text-center">
            <Loader2 className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Scanning Packages</h2>
            <p className="text-primary-300">Checking npm, pip, winget, and chocolatey...</p>
          </div>
        )}

        {/* Results */}
        {!isScanning && scanComplete && (
          <div className="space-y-6">
            {/* Manager Filter Tabs */}
            <div className="card p-2 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveManager('all')}
                className={`
                  px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap
                  ${activeManager === 'all' 
                    ? 'bg-accent-600 text-white' 
                    : 'text-primary-300 hover:text-white hover:bg-primary-700'
                  }
                `}
              >
                All ({selectedPackages.length})
              </button>
              {Object.entries(packagesByManager).map(([manager, packages]) => (
                packages.length > 0 && (
                  <button
                    key={manager}
                    onClick={() => setActiveManager(manager as 'npm' | 'pip' | 'winget' | 'chocolatey')}
                    className={`
                      px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap
                      ${activeManager === manager 
                        ? 'bg-accent-600 text-white' 
                        : 'text-primary-300 hover:text-white hover:bg-primary-700'
                      }
                    `}
                  >
                    {manager} ({packages.length})
                  </button>
                )
              ))}
            </div>

            {/* Search and Actions */}
            <div className="card p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search packages..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-accent-500"
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
                    onClick={() => handleSelectAllForManager(activeManager)}
                    className="btn-accent"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => handleDeselectAllForManager(activeManager)}
                    className="btn-secondary"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <p className="text-primary-400 mt-4">
                {selectedCount} of {filteredPackages.length} packages selected
              </p>
            </div>

            {/* Packages List */}
            {filteredPackages.length === 0 ? (
              <div className="card p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-primary-500" />
                <p className="text-xl text-primary-400">
                  {searchQuery 
                    ? 'No packages match your search' 
                    : activeManager === 'all' 
                      ? 'No packages found'
                      : `No ${activeManager} packages found`
                  }
                </p>
                <p className="text-primary-500 mt-2">
                  Install packages using npm, pip, winget, or chocolatey
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredPackages.map((pkg, index) => (
                  <div
                    key={pkg.id || `package-${pkg.manager}-${index}`}
                    onClick={() => togglePackage(pkg.id)}
                    className={`
                      card p-6 cursor-pointer
                      transition-all duration-200 border-2
                      ${pkg.selected 
                        ? 'border-accent-600 bg-accent-600/10' 
                        : 'border-transparent hover:border-primary-600'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={pkg.selected}
                        onChange={() => {}}
                        className="mt-1 w-5 h-5 accent-accent-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="w-5 h-5 text-accent-400" />
                          <h3 className="text-lg font-semibold">{pkg.name}</h3>
                          <span className="px-3 py-1 bg-accent-600/30 text-accent-300 rounded-full text-sm">
                            v{pkg.version}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm ${getManagerColor(pkg.manager)}`}>
                            {pkg.manager}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Continue Button */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => navigate('/scan')}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                onClick={handleSaveAndContinue}
                className="btn-accent"
              >
                Continue →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Modal */}
      <ScanTerminal
        logs={logs}
        isOpen={showTerminal}
        isMaximized={isTerminalMaximized}
        onClose={() => setShowTerminal(false)}
        onToggleMaximize={() => setIsTerminalMaximized(!isTerminalMaximized)}
        title="Package Scan Output"
      />
    </div>
  )
}
