import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Plus, Package, HardDrive, Trash2, Download } from 'lucide-react'

interface DockerImage {
  id: string
  name: string
  tag: string
  platform?: string
  digest?: string
  size?: string
  category: string
  selected: boolean
  hasOffline?: boolean
}

export default function DockerImagesPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customImageName, setCustomImageName] = useState('')
  const [customImageTag, setCustomImageTag] = useState('latest')
  const [useOffline, setUseOffline] = useState(false)

  const [images, setImages] = useState<DockerImage[]>([
    { id: '1', name: 'nginx', tag: '1.25.4', size: '142 MB', category: 'web', selected: true, hasOffline: true },
    { id: '2', name: 'postgres', tag: '15', size: '328 MB', category: 'database', selected: true, hasOffline: true },
    { id: '3', name: 'redis', tag: '7.2', size: '116 MB', category: 'database', selected: false },
    { id: '4', name: 'node', tag: '20-alpine', size: '175 MB', category: 'runtime', selected: false },
    { id: '5', name: 'python', tag: '3.11-slim', size: '125 MB', category: 'runtime', selected: false },
    { id: '6', name: 'mongodb', tag: '7.0', size: '685 MB', category: 'database', selected: false },
    { id: '7', name: 'mysql', tag: '8.0', size: '542 MB', category: 'database', selected: false },
    { id: '8', name: 'jenkins/jenkins', tag: 'lts', size: '468 MB', category: 'devops', selected: false },
    { id: '9', name: 'sonarqube', tag: 'latest', size: '578 MB', category: 'devops', selected: false },
    { id: '10', name: 'rabbitmq', tag: '3.12', size: '221 MB', category: 'messaging', selected: false },
  ])

  const categories = [
    { id: 'all', name: 'All Images' },
    { id: 'web', name: 'Web Servers' },
    { id: 'database', name: 'Databases' },
    { id: 'runtime', name: 'Runtimes' },
    { id: 'devops', name: 'DevOps' },
    { id: 'messaging', name: 'Messaging' },
  ]

  const toggleImage = (id: string) => {
    setImages(images.map(img => 
      img.id === id ? { ...img, selected: !img.selected } : img
    ))
  }

  const removeImage = (id: string) => {
    setImages(images.filter(img => img.id !== id))
  }

  const addCustomImage = () => {
    if (customImageName) {
      const newImage: DockerImage = {
        id: Date.now().toString(),
        name: customImageName,
        tag: customImageTag,
        category: 'custom',
        selected: true,
      }
      setImages([...images, newImage])
      setCustomImageName('')
      setCustomImageTag('latest')
      setShowAddCustom(false)
    }
  }

  const filteredImages = images.filter(img => {
    const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         img.tag.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const selectedCount = images.filter(img => img.selected).length
  const totalSize = images
    .filter(img => img.selected && img.size)
    .reduce((acc, img) => {
      const size = parseFloat(img.size!)
      const unit = img.size!.includes('GB') ? 1024 : 1
      return acc + (size * unit)
    }, 0)

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
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
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useOffline}
                  onChange={(e) => setUseOffline(e.target.checked)}
                  className="w-5 h-5 accent-accent-600"
                />
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-accent-400" />
                  Use offline exports
                </span>
              </label>
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

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white/10 text-primary-300 hover:bg-white/20'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Add Custom Image Modal */}
        {showAddCustom && (
          <div className="card p-6 mb-6 border-2 border-accent-600/50">
            <h3 className="text-xl font-bold mb-4">Add Custom Image</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-sm font-medium">Image Name</label>
                <input
                  type="text"
                  value={customImageName}
                  onChange={(e) => setCustomImageName(e.target.value)}
                  placeholder="e.g., alpine, ubuntu, custom-app"
                  className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium">Tag</label>
                <input
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
                  onChange={() => toggleImage(image.id)}
                  className="mt-1 w-5 h-5 accent-accent-600"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-accent-400" />
                        <h3 className="font-semibold text-lg">{image.name}</h3>
                      </div>
                      <div className="text-sm text-primary-300">Tag: {image.tag}</div>
                    </div>
                    {image.category !== 'custom' && (
                      <span className="text-xs px-2 py-1 bg-primary-700 rounded">
                        {image.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-primary-400">
                      {image.size || 'Size unknown'}
                    </div>
                    <div className="flex items-center gap-2">
                      {image.hasOffline && (
                        <span className="flex items-center gap-1 text-xs text-accent-400">
                          <Download className="w-3 h-3" />
                          Offline
                        </span>
                      )}
                      {image.category === 'custom' && (
                        <button
                          onClick={() => removeImage(image.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
            onClick={() => navigate('/scan')}
            className="btn-accent flex-1"
          >
            Save Selection
          </button>
          <button
            onClick={() => navigate('/scan')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
