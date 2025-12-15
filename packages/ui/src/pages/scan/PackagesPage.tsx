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
  }, []) // Only run once on mount

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
            <h1 className="text-3xl font-bold">Package Dependencies</h1>
            <p className="text-gray-400 mt-1">
              Select which packages to include in your bundle
            </p>
          </div>
        </div>

        {/* Scanning State */}
        {isScanning && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-xl">Scanning packages...</p>
            <p className="text-gray-400 mt-2">Checking npm, pip, winget, and chocolatey</p>
          </div>
        )}

        {/* Results */}
        {!isScanning && scanComplete && (
          <div className="space-y-6">
            {/* Manager Filter Tabs */}
            <div className="flex gap-2 bg-white/5 backdrop-blur-sm rounded-xl p-2 overflow-x-auto">
              <button
                onClick={() => setActiveManager('all')}
                className={`
                  px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap
                  ${activeManager === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    {manager} ({packages.length})
                  </button>
                )
              ))}
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
                    placeholder="Search packages..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTerminal(true)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center gap-2"
                    title="View scan logs"
                  >
                    <Terminal className="w-4 h-4" />
                    View Logs ({logs.length})
                  </button>
                  <button
                    onClick={() => handleSelectAllForManager(activeManager)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => handleDeselectAllForManager(activeManager)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <p className="text-gray-400 mt-4">
                {selectedCount} of {filteredPackages.length} packages selected
              </p>
            </div>

            {/* Packages List */}
            {filteredPackages.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-xl text-gray-400">
                  {searchQuery 
                    ? 'No packages match your search' 
                    : activeManager === 'all' 
                      ? 'No packages found'
                      : `No ${activeManager} packages found`
                  }
                </p>
                <p className="text-gray-500 mt-2">
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
                      bg-white/5 backdrop-blur-sm rounded-xl p-6 cursor-pointer
                      transition-all duration-200 border-2
                      ${pkg.selected 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-transparent hover:border-white/20'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={pkg.selected}
                        onChange={() => {}}
                        className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Package className="w-5 h-5 text-blue-400" />
                          <h3 className="text-lg font-semibold">{pkg.name}</h3>
                          <span className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm">
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
