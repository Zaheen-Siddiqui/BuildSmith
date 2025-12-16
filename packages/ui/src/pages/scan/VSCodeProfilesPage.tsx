import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, Code, Package, CheckCircle } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'
import { ipc } from '../../services'
import { VSCodeScanResult, IPCEvent } from '../../types/ipc'

export default function VSCodeProfilesPage() {
  const navigate = useNavigate()
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)
  const scanInitiatedRef = useRef(false)

  // Get from store
  const { 
    selectedVSCodeProfiles, 
    setSelectedVSCodeProfiles,
    scanSettings,
    setScanProgress,
    toggleVSCodeProfile,
    selectedDockerImages,
    selectedDatabases,
    setManifestItems,
    setCurrentBundle,
    scanCompleted,
    setScanCompleted,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    // If scan already completed and we have data, skip scanning and show results
    if (scanCompleted.vscode && selectedVSCodeProfiles.length > 0) {
      setScanComplete(true)
      return
    }
    
    if (!scanInitiatedRef.current && !scanComplete && selectedVSCodeProfiles.length === 0) {
      scanInitiatedRef.current = true
      const performScan = async () => {
        setIsScanning(true)
        
        // Subscribe to IPC events
        const handleEvent = (event: IPCEvent) => {
          if (event.type === 'result' && event.stepId === 'scan-vscode' && event.state === 'success') {
            const data = event.data as VSCodeScanResult
            
            console.log('🔍 VS Code scan result received:', data)
            console.log(`📊 Found ${data.profiles.length} profiles:`)
            data.profiles.forEach(p => {
              console.log(`  - ${p.name}: ${p.extensions.length} extensions`)
            })
            
            // Convert scan results to store format
            const profiles = data.profiles.map(profile => ({
              id: profile.id,
              name: profile.name,
              extensions: profile.extensions.map(ext => ext.id),
              settings: {},
              selected: false
            }))
            
            console.log('✅ Profiles stored in state:', profiles)
            
            setSelectedVSCodeProfiles(profiles)
            setScanCompleted({ vscode: true })
            setIsScanning(false)
            setScanComplete(true)
          }
        }
        
        ipc.onEvent(handleEvent)
        
        // Start the scan
        await ipc.scanVSCode()
      }

      performScan()
    }
    
    // Cleanup event listener on unmount
    return () => {
      ipc.removeEventListener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanCompleted.vscode, selectedVSCodeProfiles.length])


  const handleSaveAndContinue = () => {
    // Mark vscode config as complete
    setScanProgress({ vscode: true })
    
    // Navigate to next page based on scan settings
    if (scanSettings.docker) {
      navigate('/docker-images')
    } else if (scanSettings.databases) {
      navigate('/database-connections')
    } else if (scanSettings.devtools) {
      navigate('/devtools')
    } else if (scanSettings.environment) {
      navigate('/environment')
    } else if (scanSettings.packages) {
      navigate('/packages')
    } else {
      // No more config pages, generate manifest and go to preview
      generateManifest()
      navigate('/bundle-preview')
    }
  }

  const generateManifest = () => {
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
    
    // Add VS Code profiles/extensions (deduplicated)
    const extensionIds = new Set<string>()
    selectedVSCodeProfiles
      .filter(profile => profile.selected)
      .forEach(profile => {
        profile.extensions.forEach(ext => {
          // Only add if not already added
          if (!extensionIds.has(ext)) {
            extensionIds.add(ext)
            manifestItems.push({
              name: ext,
              version: '1.0.0',
              type: 'extension',
              source: 'vscode',
              included: true,
            })
          }
        })
      })
    
    console.log(`📦 Generated manifest with ${extensionIds.size} unique extensions from ${selectedVSCodeProfiles.filter(p => p.selected).length} profile(s)`)
    
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
  }

  // Calculate progress
  const totalSteps = [
    scanSettings.vscode,
    scanSettings.docker,
    scanSettings.databases,
    scanSettings.devtools,
    scanSettings.environment,
    scanSettings.packages
  ].filter(Boolean).length
  const currentStep = 1 // VS Code is always first

  const selectedCount = selectedVSCodeProfiles.filter(p => p.selected).length

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
            <h2 className="text-2xl font-bold mb-2">Scanning VS Code</h2>
            <p className="text-primary-300">Detecting installed extensions and profiles...</p>
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
              <h1 className="text-4xl font-bold mb-2">VS Code Profiles</h1>
              <p className="text-primary-200">
                Select VS Code profiles and extensions to include in your bundle
              </p>
            </div>

        {/* Summary Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Selected Profiles</h3>
              <p className="text-primary-300">
                {selectedCount} profiles selected
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedVSCodeProfiles(
                    selectedVSCodeProfiles.map(p => ({ ...p, selected: true }))
                  )
                }}
                className="btn-secondary text-sm"
              >
                Select All
              </button>
              <button
                onClick={() => {
                  setSelectedVSCodeProfiles(
                    selectedVSCodeProfiles.map(p => ({ ...p, selected: false }))
                  )
                }}
                className="btn-secondary text-sm"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Profiles List */}
        <div className="space-y-4 mb-6">
          {selectedVSCodeProfiles.map(profile => (
            <div
              key={profile.id}
              className={`card p-4 transition-all ${
                profile.selected ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={profile.selected}
                  onChange={() => toggleVSCodeProfile(profile.id)}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Code className="w-5 h-5 text-accent-400" />
                    <h3 className="font-semibold text-lg">{profile.name}</h3>
                  </div>
                  <div className="text-sm text-primary-300 mb-2">
                    {profile.extensions.length} extensions included
                  </div>
                  {profile.selected && profile.extensions.length > 0 && (
                    <div className="bg-black/20 rounded p-3 mt-3">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4 text-accent-400" />
                        Extensions
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {profile.extensions.slice(0, 6).map((ext) => (
                          <div key={ext} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-accent-500" />
                            <span className="text-primary-300">{ext}</span>
                          </div>
                        ))}
                      </div>
                      {profile.extensions.length > 6 && (
                        <div className="text-xs text-primary-400 mt-2">
                          ... and {profile.extensions.length - 6} more
                        </div>
                      )}
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
