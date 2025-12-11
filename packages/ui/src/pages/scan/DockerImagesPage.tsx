import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useBundleStore, DockerImage, ManifestItem } from '../../store/bundleStore'
import DockerImageSelector, { DockerImageData } from '../../components/DockerImageSelector'
import { mockIPC } from '../../services/mockIPC'
import { DockerScanResult } from '../../types/ipc'

export default function DockerImagesPage() {
  const navigate = useNavigate()
  const [images, setImages] = useState<DockerImageData[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanComplete, setScanComplete] = useState(false)

  // Get from store
  const { 
    selectedDockerImages, 
    setSelectedDockerImages,
    scanSettings,
    setScanProgress,
    selectedVSCodeProfiles,
    selectedDatabases,
    setManifestItems,
    setCurrentBundle,
  } = useBundleStore()

  // Trigger scan on mount
  useEffect(() => {
    if (!scanComplete && selectedDockerImages.length === 0) {
      const performScan = async () => {
        setIsScanning(true)
        
        // Subscribe to IPC events
        mockIPC.onEvent((event) => {
          if (event.type === 'result' && event.stepId === 'scan-docker' && event.state === 'success') {
            const data = event.data as DockerScanResult
            
            // Convert scan results to store format
            const images = data.images.map(img => ({
              id: img.id,
              name: img.repository,
              tag: img.tag,
              size: img.size,
              selected: false
            }))
            
            setSelectedDockerImages(images)
            setIsScanning(false)
            setScanComplete(true)
          }
        })
        
        // Start the scan
        await mockIPC.scanDocker()
      }

      performScan()
    }
  }, [scanComplete, selectedDockerImages.length, setSelectedDockerImages])

  const handleToggleImage = (id: string) => {
    setImages(prev =>
      prev.map(img =>
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    )
    // Update store
    setSelectedDockerImages(
      images.map(img => ({
        ...img,
        size: img.size || 'Unknown',
        selected: img.id === id ? !img.selected : img.selected
      }))
    )
  }

  const handleAddImage = (newImage: Omit<DockerImageData, 'id'>) => {
    const imageWithId: DockerImage = {
      id: Date.now().toString(),
      name: newImage.name,
      tag: newImage.tag,
      size: newImage.size || 'Unknown',
      selected: newImage.selected,
    }
    const updatedImages = [...images, imageWithId]
    setImages(updatedImages)
    setSelectedDockerImages(updatedImages.map(img => ({ ...img, size: img.size || 'Unknown' })))
  }

  const handleSaveAndContinue = () => {
    // Save current images to store
    setSelectedDockerImages(images.map(img => ({ ...img, size: img.size || 'Unknown' })))
    
    // Mark docker config as complete
    setScanProgress({ docker: true })
    
    // Navigate to next page based on scan settings
    if (scanSettings.databases) {
      navigate('/database-connections')
    } else {
      // Database page is last, so if not selected, we need to generate manifest here
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
    
    // Add database connections (if any selected)
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
  const totalSteps = [scanSettings.vscode, scanSettings.docker, scanSettings.databases].filter(Boolean).length
  const currentStep = [scanSettings.vscode].filter(Boolean).length + 1

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
            <h2 className="text-2xl font-bold mb-2">Scanning Docker Images</h2>
            <p className="text-primary-300">Connecting to Docker daemon and fetching images...</p>
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
          <h1 className="text-4xl font-bold mb-2">Docker Images</h1>
          <p className="text-primary-200">
            Select Docker images to include in your bundle
          </p>
        </div>

        {/* Docker Image Selector Component */}
        <DockerImageSelector
          mode="scan"
          images={images}
          onToggle={handleToggleImage}
          onAdd={handleAddImage}
          showAddCustom={true}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
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
