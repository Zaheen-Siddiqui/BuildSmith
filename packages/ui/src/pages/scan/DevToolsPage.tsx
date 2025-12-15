import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Terminal, Package } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'
import { ipc } from '../../services'
import { DevToolsScanResult } from '../../types/ipc'
import ScanTerminal from '../../components/ScanTerminal'

interface LogEntry {
  stepId: string
  level: string
  text: string
  timestamp: string
}

export default function DevToolsPage() {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)

  const { 
    selectedDevTools, 
    setSelectedDevTools,
    scanSettings,
    setScanProgress,
    toggleDevTool,
    selectedDockerImages,
    selectedVSCodeProfiles,
    selectedDatabases,
    selectedEnvironmentVars,
    selectedPathEntries,
    selectedPackages,
    setManifestItems,
    setCurrentBundle,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    if (!scanComplete && selectedDevTools.length === 0) {
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
          
          if (event.type === 'result' && event.stepId === 'scan-devtools' && event.state === 'success') {
            const data = event.data as DevToolsScanResult
            
            // Convert scan results to store format
            const tools = data.tools.map(tool => ({
              id: tool.id,
              name: tool.name,
              command: tool.command,
              version: tool.version,
              path: tool.path,
              selected: false,
            }))
            
            setSelectedDevTools(tools)
            setIsScanning(false)
            setScanComplete(true)
          }
        })
        
        // Start the scan
        await ipc.scanDevTools()
      }

      performScan()
    }
  }, [scanComplete, selectedDevTools.length, setSelectedDevTools])

  const handleSelectAll = () => {
    setSelectedDevTools(selectedDevTools.map(tool => ({ ...tool, selected: true })))
  }

  const handleDeselectAll = () => {
    setSelectedDevTools(selectedDevTools.map(tool => ({ ...tool, selected: false })))
  }

  const handleSaveAndContinue = () => {
    // Mark devtools as complete
    setScanProgress({ devtools: true })
    
    // Navigate to next step based on scan settings
    if (scanSettings.environment) {
      navigate('/environment')
    } else if (scanSettings.packages) {
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

  const selectedCount = selectedDevTools.filter(t => t.selected).length

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
            <h1 className="text-3xl font-bold">DevOps Tools</h1>
            <p className="text-gray-400 mt-1">
              Select which DevOps CLI tools to include in your bundle
            </p>
          </div>
        </div>

        {/* Scanning State */}
        {isScanning && (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-xl">Scanning for DevOps tools...</p>
            <p className="text-gray-400 mt-2">Checking PATH for installed CLI tools</p>
          </div>
        )}

        {/* Results */}
        {!isScanning && scanComplete && (
          <div className="space-y-6">
            {/* Stats and Actions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Terminal className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold">{selectedDevTools.length} Tools Found</p>
                    <p className="text-gray-400">
                      {selectedCount} selected
                    </p>
                  </div>
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
                    onClick={handleSelectAll}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>

            {/* Tools List */}
            {selectedDevTools.length === 0 ? (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <p className="text-xl text-gray-400">No DevOps tools found</p>
                <p className="text-gray-500 mt-2">Install tools like terraform, kubectl, or docker-compose to scan them</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {selectedDevTools.map((tool, index) => (
                  <div
                    key={tool.id || `devtool-${index}`}
                    onClick={() => toggleDevTool(tool.id)}
                    className={`
                      bg-white/5 backdrop-blur-sm rounded-xl p-6 cursor-pointer
                      transition-all duration-200 border-2
                      ${tool.selected 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-transparent hover:border-white/20'
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={tool.selected}
                        onChange={() => {}}
                        className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Terminal className="w-5 h-5 text-blue-400" />
                          <h3 className="text-xl font-semibold">{tool.name}</h3>
                          <span className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm">
                            v{tool.version}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p><span className="text-gray-500">Command:</span> {tool.command}</p>
                          <p className="truncate"><span className="text-gray-500">Path:</span> {tool.path}</p>
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
        title="DevOps Tools Scan Output"
      />
    </div>
  )
}
