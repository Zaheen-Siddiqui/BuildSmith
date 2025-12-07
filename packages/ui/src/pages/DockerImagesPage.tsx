import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Package } from 'lucide-react'
import { useBundleStore, DockerImage, ManifestItem } from '../store/bundleStore'

export default function DockerImagesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customImageName, setCustomImageName] = useState('')
  const [customImageTag, setCustomImageTag] = useState('latest')

  // Get from store
  const { 
    selectedDockerImages, 
    setSelectedDockerImages,
    scanSettings,
    setScanProgress,
    toggleDockerImage,
    selectedVSCodeProfiles,
    selectedDatabases,
    setManifestItems,
    setCurrentBundle,
  } = useBundleStore()

  // Initialize images from store or use mock data
  useEffect(() => {
    if (selectedDockerImages.length === 0) {
      // Initialize with mock data
      setSelectedDockerImages([
        { id: '1', name: 'nginx', tag: '1.25.4', size: '142 MB', selected: false },
        { id: '2', name: 'postgres', tag: '15', size: '328 MB', selected: false },
        { id: '3', name: 'redis', tag: '7.2', size: '116 MB', selected: false },
        { id: '4', name: 'node', tag: '20-alpine', size: '175 MB', selected: false },
        { id: '5', name: 'python', tag: '3.11-slim', size: '125 MB', selected: false },
        { id: '6', name: 'mongodb', tag: '7.0', size: '685 MB', selected: false },
        { id: '7', name: 'mysql', tag: '8.0', size: '542 MB', selected: false },
      ])
    }
  }, [selectedDockerImages.length, setSelectedDockerImages])

  const addCustomImage = () => {
    if (customImageName) {
      const newImage: DockerImage = {
        id: Date.now().toString(),
        name: customImageName,
        tag: customImageTag,
        size: 'Unknown',
        selected: true,
      }
      setSelectedDockerImages([...selectedDockerImages, newImage])
      setCustomImageName('')
      setCustomImageTag('latest')
      setShowAddCustom(false)
    }
  }

  const handleSaveAndContinue = () => {
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

  const filteredImages = selectedDockerImages.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         img.tag.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const selectedCount = selectedDockerImages.filter(img => img.selected).length
  const totalSize = selectedDockerImages
    .filter(img => img.selected && img.size)
    .reduce((acc, img) => {
      const sizeStr = img.size || '0 MB'
      const size = Number.parseFloat(sizeStr)
      const unit = sizeStr.includes('GB') ? 1024 : 1
      return acc + (size * unit)
    }, 0)

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

        {/* Summary Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Selected Images</h3>
              <p className="text-primary-300">
                {selectedCount} images selected • ~{totalSize.toFixed(0)} MB total
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="card p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images..."
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors text-white placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => setShowAddCustom(!showAddCustom)}
              className="btn-accent flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </button>
          </div>
        </div>

        {/* Add Custom Image Modal */}
        {showAddCustom && (
          <div className="card p-6 mb-6 border-2 border-accent-600/50">
            <h3 className="text-xl font-bold mb-4">Add Custom Image</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="image-name" className="block mb-2 text-sm font-medium">Image Name</label>
                <input
                  id="image-name"
                  type="text"
                  value={customImageName}
                  onChange={(e) => setCustomImageName(e.target.value)}
                  placeholder="e.g., alpine, ubuntu, custom-app"
                  className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="image-tag" className="block mb-2 text-sm font-medium">Tag</label>
                <input
                  id="image-tag"
                  type="text"
                  value={customImageTag}
                  onChange={(e) => setCustomImageTag(e.target.value)}
                  placeholder="latest"
                  className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={addCustomImage} className="btn-accent">
                Add Image
              </button>
              <button onClick={() => setShowAddCustom(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Images Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {filteredImages.map(image => (
            <div
              key={image.id}
              className={`card p-4 transition-all ${
                image.selected ? 'border-2 border-accent-600' : 'border-2 border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={image.selected}
                  onChange={() => toggleDockerImage(image.id)}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between w-full">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-accent-400" />
                        <h3 className="font-semibold text-lg">{image.name}</h3>
                      </div>
                      <div className="text-sm text-primary-300">Tag: {image.tag}</div>
                      <div className="text-sm text-primary-400 mt-1">
                        {image.size || 'Size unknown'}
                      </div>
                    </div>
                  </div>
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
      </div>
    </div>
  )
}
