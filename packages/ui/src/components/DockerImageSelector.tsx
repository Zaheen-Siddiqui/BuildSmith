import { useState } from 'react'
import { Search, Plus, Package, Download, HardDrive, CheckCircle } from 'lucide-react'

export interface DockerImageData {
  id: string
  name: string
  tag: string
  size?: string
  selected: boolean
  digest?: string
  offlineTar?: string // Path to local tar file
  available?: boolean // For setup mode: is it already pulled?
}

interface DockerImageSelectorProps {
  mode: 'scan' | 'setup'
  images: DockerImageData[]
  onToggle: (id: string) => void
  onAdd?: (image: Omit<DockerImageData, 'id'>) => void
  readonly?: boolean
  showAddCustom?: boolean
}

export default function DockerImageSelector({
  mode,
  images,
  onToggle,
  onAdd,
  readonly = false,
  showAddCustom = true,
}: DockerImageSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [customImageName, setCustomImageName] = useState('')
  const [customImageTag, setCustomImageTag] = useState('latest')

  const addCustomImage = () => {
    if (customImageName && onAdd) {
      onAdd({
        name: customImageName,
        tag: customImageTag,
        size: 'Unknown',
        selected: true,
      })
      setCustomImageName('')
      setCustomImageTag('latest')
      setShowAddForm(false)
    }
  }

  const filteredImages = images.filter(img => {
    // Filter out invalid images
    if (!img || !img.id || !img.name) return false
    
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         img.tag.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const selectedCount = images.filter(img => img.selected).length
  const totalSize = images
    .filter(img => img.selected && img.size)
    .reduce((acc, img) => {
      const sizeStr = img.size || '0 MB'
      const size = Number.parseFloat(sizeStr)
      const unit = sizeStr.includes('GB') ? 1024 : 1
      return acc + (size * unit)
    }, 0)

  return (
    <div>
      {/* Summary Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">
              {mode === 'scan' ? 'Selected Images' : 'Available Images'}
            </h3>
            <p className="text-primary-300">
              {selectedCount} images selected • ~{totalSize.toFixed(0)} MB total
            </p>
          </div>
          {mode === 'setup' && (
            <div className="text-sm text-primary-400">
              {images.filter(img => img.available).length} already available locally
            </div>
          )}
        </div>
      </div>

      {/* Search and Actions */}
      <div className="card p-6 mb-6">
        <div className="flex gap-4">
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
          {showAddCustom && mode === 'scan' && !readonly && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-accent flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </button>
          )}
        </div>
      </div>

      {/* Add Custom Image Form */}
      {showAddForm && (
        <div className="card p-6 mb-6 border-2 border-accent-600/50">
          <h3 className="text-xl font-bold mb-4">Add Custom Image</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="image-name" className="block mb-2 text-sm font-medium">
                Image Name
              </label>
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
              <label htmlFor="image-tag" className="block mb-2 text-sm font-medium">
                Tag
              </label>
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
            <button onClick={() => setShowAddForm(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onChange={() => !readonly && onToggle(image.id)}
                disabled={readonly}
                className="mt-1 w-5 h-5 accent-accent-600 disabled:opacity-50"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between w-full">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-5 h-5 text-accent-400" />
                      <h3 className="font-semibold text-lg">{image.name}</h3>
                    </div>
                    <div className="text-sm text-primary-300 mb-1">Tag: {image.tag}</div>
                    <div className="text-sm text-primary-400">
                      {image.size || 'Size unknown'}
                    </div>

                    {/* Setup mode specific info */}
                    {mode === 'setup' && (
                      <div className="mt-2 space-y-1">
                        {image.offlineTar && (
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <HardDrive className="w-3 h-3" />
                            Offline available
                          </div>
                        )}
                        {image.available && (
                          <div className="flex items-center gap-1 text-xs text-blue-400">
                            <CheckCircle className="w-3 h-3" />
                            Already pulled
                          </div>
                        )}
                        {!image.offlineTar && !image.available && (
                          <div className="flex items-center gap-1 text-xs text-yellow-400">
                            <Download className="w-3 h-3" />
                            Will download from registry
                          </div>
                        )}
                      </div>
                    )}

                    {/* Scan mode specific info */}
                    {mode === 'scan' && image.digest && (
                      <div className="text-xs text-primary-500 mt-2 font-mono truncate" title={image.digest}>
                        {image.digest}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredImages.length === 0 && (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <p className="text-primary-400">No images found matching your search</p>
        </div>
      )}
    </div>
  )
}
