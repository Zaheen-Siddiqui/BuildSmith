import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'
import { ipc } from '../../services'
import { DatabaseScanResult } from '../../types/ipc'

export default function DatabaseConnectionsPage() {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)

  // Get from store
  const { 
    selectedDatabases, 
    setSelectedDatabases,
    scanSettings,
    setScanProgress,
    toggleDatabase,
    selectedDockerImages,
    selectedVSCodeProfiles,
    setManifestItems,
    setCurrentBundle,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    if (!scanComplete && selectedDatabases.length === 0) {
      const performScan = async () => {
        setIsScanning(true)
        
        // Subscribe to IPC events
        ipc.onEvent((event) => {
          if (event.type === 'result' && event.stepId === 'scan-database' && event.state === 'success') {
            const data = event.data as DatabaseScanResult
            
            // Convert scan results to store format
            const connections = data.connections.map(conn => ({
              id: conn.id,
              name: conn.name,
              type: conn.type as 'mongodb' | 'mysql' | 'postgresql',
              host: conn.host,
              port: conn.port,
              database: conn.database || '',
              selected: false
            }))
            
            setSelectedDatabases(connections)
            setIsScanning(false)
            setScanComplete(true)
          }
        })
        
        // Start the scan
        await ipc.scanDatabase()
      }

      performScan()
    }
  }, [scanComplete, selectedDatabases.length, setSelectedDatabases])

  const handleSaveAndContinue = () => {
    // Mark database config as complete
    setScanProgress({ database: true })
    
    // Generate complete manifest from all selected items
    const manifestItems: ManifestItem[] = []
    
    // Add Docker images
    selectedDockerImages
      .filter(img => img.selected)
      .forEach(img => {
        manifestItems.push({
          name: `${img.name}:${img.tag}`,
          version: img.tag,
          type: 'image',
          source: 'docker',
          included: true,
        })
      })
    
    // Add VS Code profiles/extensions
    selectedVSCodeProfiles
      .filter(profile => profile.selected)
      .forEach(profile => {
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
    selectedDatabases
      .filter(db => db.selected)
      .forEach(db => {
        manifestItems.push({
          name: db.name,
          version: '1.0.0',
          type: 'secret',
          source: db.type,
          included: true,
        })
      })
    
    // Add devtools if selected
    if (scanSettings.devtools) {
      manifestItems.push(
        { name: 'Git', version: '2.42.0', type: 'installer', source: 'https://git-scm.com', checksum: 'abc123', included: true },
        { name: 'Node.js', version: '18.17.0', type: 'installer', source: 'https://nodejs.org', checksum: 'def456', included: true },
      )
    }
    
    // Add packages if selected
    if (scanSettings.packages) {
      manifestItems.push(
        { name: 'npm:react', version: '18.2.0', type: 'package', source: 'npm', included: true },
        { name: 'npm:typescript', version: '5.2.2', type: 'package', source: 'npm', included: true },
      )
    }
    
    // Set manifest items in store
    setManifestItems(manifestItems)
    
    // Create bundle metadata
    setCurrentBundle({
      id: Date.now().toString(),
      name: `Bundle_${new Date().toISOString().split('T')[0]}`,
      createdAt: new Date().toISOString(),
      description: 'Auto-generated development environment bundle',
      encrypted: scanSettings.includeSecrets,
    })
    
    // Database is always last, so go to bundle preview
    navigate('/bundle-preview')
  }

  // Calculate progress
  const totalSteps = [scanSettings.vscode, scanSettings.docker, scanSettings.databases].filter(Boolean).length
  const currentStep = totalSteps // Database is always last

  const selectedCount = selectedDatabases.filter(db => db.selected).length

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'mongodb': return 'bg-green-900/30 text-green-400'
      case 'postgresql': return 'bg-blue-900/30 text-blue-400'
      case 'mysql': return 'bg-orange-900/30 text-orange-400'
      case 'redis': return 'bg-red-900/30 text-red-400'
      case 'sqlserver': return 'bg-purple-900/30 text-purple-400'
      default: return 'bg-primary-900/30 text-primary-400'
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

        {/* Scanning State */}
        {isScanning && (
          <div className="card p-8 text-center">
            <Loader2 className="w-16 h-16 text-accent-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Scanning Database Connections</h2>
            <p className="text-primary-300">Checking MongoDB Compass, MySQL Workbench, and other database tools...</p>
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
          <h1 className="text-4xl font-bold mb-2">Database Connections</h1>
          <p className="text-primary-200">
            Select database connections to include in your bundle
          </p>
        </div>

        {/* Summary Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Selected Connections</h3>
              <p className="text-primary-300">
                {selectedCount} connections selected
              </p>
            </div>
          </div>
        </div>

        {/* Connections List */}
        <div className="space-y-4 mb-6">
          {selectedDatabases.map(conn => (
            <div
              key={conn.id}
              className={`card p-4 transition-all ${
                conn.selected ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={conn.selected}
                  onChange={() => toggleDatabase(conn.id)}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{conn.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded mt-1 inline-block ${getTypeColor(conn.type)}`}>
                        {conn.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {conn.selected && (
                    <div className="bg-black/20 p-3 rounded mt-3 space-y-1 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-primary-400">Host:</span>
                        <span>{conn.host}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">Port:</span>
                        <span>{conn.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-400">Database:</span>
                        <span>{conn.database}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

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
    </div>
  )
}
