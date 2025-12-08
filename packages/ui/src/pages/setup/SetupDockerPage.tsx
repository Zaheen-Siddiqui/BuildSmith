import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'
import DockerImageSelector, { DockerImageData } from '../../components/DockerImageSelector'

export default function SetupDockerPage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    setSetupSelections,
    selectedSetupDockerImages,
    setSelectedSetupDockerImages,
  } = useBundleStore()
  const [images, setImages] = useState<DockerImageData[]>([])

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Extract Docker images from manifest
    const dockerImages = manifestItems
      .filter(item => item.type === 'image')
      .map((item, index) => {
        const [name, tag] = item.name.split(':')
        const imageId = `docker-${index}`
        return {
          id: imageId,
          name: name || item.name,
          tag: tag || 'latest',
          size: 'Unknown', // Size not stored in manifest
          selected: selectedSetupDockerImages.includes(imageId) || setupSelections.docker,
          digest: item.checksum,
          offlineTar: item.source?.startsWith('images/') ? item.source : undefined,
          available: false, // TODO: Check if image already exists locally
        }
      })

    setImages(dockerImages)
  }, [importedBundle, manifestItems, setupSelections.docker, selectedSetupDockerImages, navigate])

  const handleToggleImage = (id: string) => {
    setImages(prev => 
      prev.map(img => 
        img.id === id ? { ...img, selected: !img.selected } : img
      )
    )
  }

  const handleContinue = () => {
    // Save selected image IDs to store
    const selectedImageIds = images.filter(img => img.selected).map(img => img.id)
    setSelectedSetupDockerImages(selectedImageIds)
    
    const selectedCount = selectedImageIds.length
    
    if (selectedCount === 0) {
      // If no images selected, disable docker in setup selections
      setSetupSelections({ ...setupSelections, docker: false })
    }

    // Navigate to preview
    navigate('/setup-preview')
  }

  if (!importedBundle) return null

  const selectedCount = images.filter(img => img.selected).length
  const hasOfflineImages = images.some(img => img.offlineTar)

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
          <h1 className="text-4xl font-bold mb-2">Docker Images</h1>
          <p className="text-primary-200">
            Select which Docker images to restore from bundle: <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <div className="card p-6 mb-6 border-2 border-blue-600/50 bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Package className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Image Restore Options</h3>
              <ul className="space-y-1 text-sm text-primary-200">
                {hasOfflineImages && (
                  <li>• Offline images will be loaded from bundle (faster, no internet required)</li>
                )}
                <li>• Online images will be pulled from Docker Hub (requires internet)</li>
                <li>• Images already available locally will be skipped</li>
                <li>• Docker Desktop must be running for image operations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Docker Image Selector Component */}
        <DockerImageSelector
          mode="setup"
          images={images}
          onToggle={handleToggleImage}
          readonly={false}
          showAddCustom={false}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleContinue}
            className="btn-accent flex-1"
            disabled={selectedCount === 0}
          >
            {selectedCount === 0 ? 'No Images Selected' : `Continue with ${selectedCount} Images`}
          </button>
          <button
            onClick={() => navigate('/setup-config')}
            className="btn-secondary"
          >
            Back
          </button>
        </div>

        {/* Skip Option */}
        {selectedCount === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={handleContinue}
              className="text-primary-400 hover:text-white transition-colors text-sm"
            >
              Skip Docker setup and continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
