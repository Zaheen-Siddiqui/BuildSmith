import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Edit2, ChevronRight, ChevronDown, File, Folder, Save } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'
import { createBundle, downloadBlob } from '../../utils/bundleUtils'

interface BundleItem {
  name: string
  type: 'file' | 'folder'
  size?: string
  children?: BundleItem[]
}

export default function BundlePreviewPage() {
  const navigate = useNavigate()
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [editingManifest, setEditingManifest] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const { 
    currentBundle, 
    manifestItems, 
    scanSettings,
    selectedVSCodeProfiles,
    updateManifestItem, 
    setExportPath, 
    resetScan, 
    resetBundle
  } = useBundleStore()

  // Don't run bundle creation on mount - the bundle preview just shows what will be created
  // Actual bundle creation happens on export
  
  // Generate bundle structure from manifest items
  const generateBundleStructure = (): BundleItem[] => {
    const structure: BundleItem[] = [
      { name: 'bundle.json', type: 'file', size: '1.2 KB' },
      { name: 'manifests.json', type: 'file', size: '4.2 KB' },
    ]
    
    // Add profiles folder with individual profile files
    if (scanSettings.vscode && selectedVSCodeProfiles && selectedVSCodeProfiles.length > 0) {
      const selectedProfiles = selectedVSCodeProfiles.filter(p => p.selected)
      if (selectedProfiles.length > 0) {
        structure.push({
          name: 'profiles',
          type: 'folder',
          children: selectedProfiles.map(profile => {
            const safeName = profile.name.replace(/[^\w\-]/g, '_')
            return {
              name: `${safeName}-profile.json`,
              type: 'file' as const,
              size: `${Math.round(profile.extensions.length * 0.5)}KB`
            }
          })
        })
      }
    }
    
    // Add installers folder
    const installers = manifestItems.filter(item => item.type === 'installer')
    if (installers.length > 0) {
      structure.push({
        name: 'installers',
        type: 'folder',
        children: installers.map(item => ({
          name: `${item.name}_metadata.json`,
          type: 'file' as const,
          size: '2 KB'
        }))
      })
    }
    
    // Add images folder
    const images = manifestItems.filter(item => item.type === 'image')
    if (images.length > 0) {
      structure.push({
        name: 'images',
        type: 'folder',
        children: images.map(item => ({
          name: `${item.name.replace('/', '_')}.tar`,
          type: 'file' as const,
          size: '~200 MB'
        }))
      })
    }
    
    // Add secrets folder if encrypted
    const secrets = manifestItems.filter(item => item.type === 'secret')
    if (secrets.length > 0 && scanSettings.includeSecrets) {
      structure.push({
        name: 'secrets',
        type: 'folder',
        children: secrets.map(item => ({
          name: `${item.name}.gpg`,
          type: 'file' as const,
          size: '~4 KB'
        }))
      })
    }
    
    // Add environment file
    if (scanSettings.environment) {
      structure.push({ name: 'environment.json', type: 'file', size: '1.5 KB' })
    }
    
    // Add packages file
    const packages = manifestItems.filter(item => item.type === 'package')
    if (packages.length > 0) {
      structure.push({ name: 'packages.json', type: 'file', size: '3.2 KB' })
    }
    
    // Add databases folder
    if (scanSettings.databases) {
      structure.push({
        name: 'databases',
        type: 'folder',
        children: [
          { name: 'connections.json', type: 'file', size: '2.4 KB' }
        ]
      })
    }
    
    // Sort: folders first, then files, both alphabetically
    return structure.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name)
      }
      return a.type === 'folder' ? -1 : 1
    })
  }

  const bundleStructure = generateBundleStructure()

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const handleExportBundle = async () => {
    if (!currentBundle) {
      alert('No bundle metadata found. Please go back to scan.')
      return
    }
    
    setIsExporting(true)
    
    try {
      // Create the bundle ZIP file
      const bundleBlob = await createBundle({
        metadata: currentBundle,
        manifestItems,
        scanSettings,
        selectedVSCodeProfiles,  // Pass selected profiles
      })
      
      // Generate filename
      const filename = `${currentBundle.name}.zip`
      
      // Download the bundle
      downloadBlob(bundleBlob, filename)
      
      // Store the export path (mock - in real app this would be actual file path)
      setExportPath(`C:\\BuildSmith\\bundles\\${filename}`)
      
      alert(`Bundle exported successfully as ${filename}!`)
      
      // Clear scan and bundle state
      resetScan()
      resetBundle()
      
      // Navigate back to dashboard
      setTimeout(() => {
        navigate('/')
      }, 1000)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export bundle: ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  const renderItem = (item: BundleItem, depth: number = 0, parentPath: string = '') => {
    const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name
    const isExpanded = expandedFolders.has(fullPath)

    return (
      <div key={fullPath}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-white/5 cursor-pointer transition-colors`}
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
          onClick={() => item.type === 'folder' && toggleFolder(fullPath)}
        >
          {item.type === 'folder' ? (
            <>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-primary-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-primary-400" />
              )}
              <Folder className="w-4 h-4 text-accent-500" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="w-4 h-4 text-primary-400" />
            </>
          )}
          <span className="flex-1">{item.name}</span>
          {item.size && <span className="text-xs text-primary-400">{item.size}</span>}
        </div>
        {item.type === 'folder' && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, depth + 1, fullPath))}
          </div>
        )}
      </div>
    )
  }

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
          <h1 className="text-4xl font-bold mb-2">Bundle Preview</h1>
          <p className="text-primary-200">
            Review your bundle contents before exporting
          </p>
        </div>

        {/* Bundle Info */}
        <div className="card p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Bundle Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-primary-300">Name</div>
                  <div className="font-semibold">{currentBundle?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-primary-300">Created</div>
                  <div className="font-semibold">{currentBundle ? new Date(currentBundle.createdAt).toLocaleString() : ''}</div>
                </div>
                <div>
                  <div className="text-sm text-primary-300">Total Items</div>
                  <div className="font-semibold">{manifestItems.filter(i => i.included).length} items</div>
                </div>
                <div>
                  <div className="text-sm text-primary-300">Encryption</div>
                  <div className="font-semibold">{currentBundle?.encrypted ? '🔒 Enabled' : '🔓 Disabled'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bundle Structure */}
              <div className="card p-6">
                <h3 className="text-xl font-bold mb-4">Bundle Structure</h3>
                <div className="bg-black/20 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                  {bundleStructure.map(item => renderItem(item))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="text-sm text-primary-300">
                    Estimated size: ~{manifestItems.filter(i => i.type === 'image' && i.included).length * 200 + 100} MB
                  </div>
                </div>
              </div>

              {/* Manifest Editor */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Manifest Items</h3>
                  <button
                    onClick={() => setEditingManifest(!editingManifest)}
                    className="text-sm text-accent-400 hover:text-accent-300 flex items-center gap-1"
                  >
                    {editingManifest ? (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </>
                    )}
                  </button>
                </div>
            
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {manifestItems.map((item, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded border transition-colors ${
                        item.included 
                          ? 'border-accent-600/30 bg-accent-900/10' 
                          : 'border-primary-700/30 bg-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {editingManifest && (
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={(e) => updateManifestItem(index, { included: e.target.checked })}
                            className="mt-1 w-4 h-4 accent-accent-600"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold truncate">{item.name}</span>
                            <span className="px-2 py-0.5 text-xs rounded bg-primary-800 text-primary-200">
                              {item.type}
                            </span>
                          </div>
                          <div className="text-sm text-primary-400">v{item.version}</div>
                          {item.source && (
                            <div className="text-xs text-primary-500 truncate">{item.source}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="card p-6 mt-6">
              <h3 className="text-xl font-bold mb-4">Export Bundle</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block mb-2 font-semibold">Bundle will be downloaded as:</label>
                  <div className="bg-black/20 p-3 rounded font-mono text-sm">
                    {currentBundle?.name || 'bundle'}.zip
                  </div>
                </div>
                <button
                  onClick={handleExportBundle}
                  disabled={isExporting}
                  className="btn-accent flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {isExporting ? 'Exporting...' : 'Export Bundle'}
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => navigate('/scan')}
                className="text-primary-300 hover:text-white transition-colors"
              >
                ← Back to Scan
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
      </div>
    </div>
  )
}
