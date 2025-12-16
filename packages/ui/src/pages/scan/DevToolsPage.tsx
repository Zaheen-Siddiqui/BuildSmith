import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Terminal, Package } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'
import { ipc } from '../../services'
import { DevToolsScanResult, IPCEvent } from '../../types/ipc'
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
  const scanInitiatedRef = useRef(false)

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
    scanCompleted,
    setScanCompleted,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    // If scan already completed and we have data, skip scanning and show results
    if (scanCompleted.devtools && selectedDevTools.length > 0) {
      setScanComplete(true)
      return
    }
    
    if (!scanInitiatedRef.current && !scanComplete && selectedDevTools.length === 0) {
      scanInitiatedRef.current = true
      const performScan = async () => {
        setIsScanning(true)
        setShowTerminal(true) // Auto-open terminal during scan
        
        // Subscribe to IPC events
        const handleEvent = (event: IPCEvent) => {
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
            setScanCompleted({ devtools: true })
            setIsScanning(false)
            setScanComplete(true)
          }
        }
        
        ipc.onEvent(handleEvent)
        
        // Start the scan
        await ipc.scanDevTools()
      }

      performScan()
    }
    
    // Cleanup event listener on unmount
    return () => {
      ipc.removeEventListener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanCompleted.devtools, selectedDevTools.length]) // Only run once on mount - intentionally ignoring dependencies to prevent infinite loop

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
    scanSettings.databases
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
            <h2 className="text-2xl font-bold mb-2">Scanning DevOps Tools</h2>
            <p className="text-primary-300">Checking PATH for installed CLI tools...</p>
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
              <h1 className="text-4xl font-bold mb-2">DevOps Tools</h1>
              <p className="text-primary-200">
                Select which DevOps CLI tools to include in your bundle
              </p>
            </div>

            {/* Summary Card */}
            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-1">Selected Tools</h3>
                  <p className="text-primary-300">
                    {selectedCount} tools selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTerminal(true)}
                    className="btn-secondary text-sm flex items-center gap-2"
                    title="View scan logs"
                  >
                    <Terminal className="w-4 h-4" />
                    View Logs ({logs.length})
                  </button>
                  <button
                    onClick={handleSelectAll}
                    className="btn-secondary text-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="btn-secondary text-sm"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            </div>

            {/* Tools List */}
            {selectedDevTools.length === 0 ? (
              <div className="card p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-primary-500" />
                <p className="text-xl text-primary-300">No DevOps tools found</p>
                <p className="text-primary-400 mt-2">Install tools like terraform, kubectl, or docker-compose to scan them</p>
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {selectedDevTools.map((tool, index) => (
                  <div
                    key={tool.id || `devtool-${index}`}
                    className={`card p-4 transition-all ${
                      tool.selected ? 'border-2 border-accent-600' : 'border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={tool.selected}
                        onChange={() => toggleDevTool(tool.id)}
                        className="mt-1 w-5 h-5 accent-accent-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Terminal className="w-5 h-5 text-accent-400" />
                          <h3 className="font-semibold text-lg">{tool.name}</h3>
                          <span className="px-2 py-1 bg-accent-500/20 text-accent-400 rounded text-xs">
                            v{tool.version}
                          </span>
                        </div>
                        <div className="text-sm text-primary-300 space-y-1">
                          <p><span className="text-primary-400">Command:</span> {tool.command}</p>
                          <p className="truncate"><span className="text-primary-400">Path:</span> {tool.path}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveAndContinue}
                className="btn-accent flex-1"
              >
                Save & Continue
              </button>
              <button
                onClick={() => navigate('/scan')}
                className="btn-secondary"
              >
                Back
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
        title="DevOps Tools Scan Output"
      />
    </div>
  )
}
