import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Edit2, ChevronRight, ChevronDown, File, Folder } from 'lucide-react'

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

  // Mock bundle structure
  const bundleStructure: BundleItem[] = [
    { name: 'manifests.json', type: 'file', size: '4.2 KB' },
    {
      name: 'profiles',
      type: 'folder',
      children: [
        { name: 'vscode_profiles.json', type: 'file', size: '12.8 KB' }
      ]
    },
    {
      name: 'installers',
      type: 'folder',
      children: [
        { name: 'DockerDesktop.exe', type: 'file', size: '512 MB' },
        { name: 'VSCode-Setup.exe', type: 'file', size: '85 MB' }
      ]
    },
    {
      name: 'images',
      type: 'folder',
      children: [
        { name: 'nginx_1.25.4.tar', type: 'file', size: '142 MB' },
        { name: 'postgres_15.tar', type: 'file', size: '328 MB' }
      ]
    },
    {
      name: 'secrets',
      type: 'folder',
      children: [
        { name: 'db_connections.json.gpg', type: 'file', size: '2.1 KB' },
        { name: 'env_vars.gpg', type: 'file', size: '1.8 KB' }
      ]
    }
  ]

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
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
                <ChevronDown className="w-4 h-4 text-accent-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-accent-400" />
              )}
              <Folder className="w-4 h-4 text-primary-400" />
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="w-4 h-4 text-primary-300" />
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
            Review and customize your export bundle before saving
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bundle Contents Tree */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Bundle Contents</h2>
              <span className="text-sm text-primary-300">Total: 1.08 GB</span>
            </div>
            <div className="bg-black/20 rounded-lg p-4 max-h-96 overflow-y-auto">
              {bundleStructure.map(item => renderItem(item))}
            </div>
          </div>

          {/* Manifest Editor */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Manifest</h2>
              <button
                onClick={() => setEditingManifest(!editingManifest)}
                className="flex items-center gap-2 text-accent-400 hover:text-accent-300 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                {editingManifest ? 'View' : 'Edit'}
              </button>
            </div>
            <div className="bg-black/20 rounded-lg p-4 max-h-96 overflow-y-auto">
              {editingManifest ? (
                <textarea
                  className="w-full h-80 bg-transparent text-sm font-mono text-white focus:outline-none resize-none"
                  defaultValue={JSON.stringify({
                    meta: {
                      createdAt: new Date().toISOString(),
                      sourceHost: "DESKTOP-PC",
                      os: "Windows 11"
                    },
                    apps: [
                      {
                        id: "docker",
                        install: true,
                        installer: {
                          type: "exe",
                          source: "installers/DockerDesktop.exe"
                        }
                      },
                      {
                        id: "vscode",
                        install: true,
                        installer: {
                          type: "exe",
                          source: "installers/VSCode-Setup.exe"
                        }
                      }
                    ],
                    dockerImages: [
                      "nginx:1.25.4",
                      "postgres:15"
                    ]
                  }, null, 2)}
                />
              ) : (
                <pre className="text-sm font-mono text-primary-200 whitespace-pre-wrap">
                  {JSON.stringify({
                    meta: {
                      createdAt: new Date().toISOString(),
                      sourceHost: "DESKTOP-PC",
                      os: "Windows 11"
                    },
                    apps: [
                      {
                        id: "docker",
                        install: true
                      },
                      {
                        id: "vscode",
                        install: true
                      }
                    ],
                    dockerImages: [
                      "nginx:1.25.4",
                      "postgres:15"
                    ]
                  }, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* Bundle Info */}
        <div className="card p-6 mt-6">
          <h3 className="text-xl font-bold mb-4">Bundle Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-primary-300 mb-1">Created</div>
              <div className="font-semibold">{new Date().toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-sm text-primary-300 mb-1">Source</div>
              <div className="font-semibold">DESKTOP-PC (Windows 11)</div>
            </div>
            <div>
              <div className="text-sm text-primary-300 mb-1">Encryption</div>
              <div className="font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-accent-500 rounded-full"></span>
                GPG Encrypted
              </div>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="card p-6 mt-6">
          <h3 className="text-xl font-bold mb-4">Export Options</h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold">Export Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="C:\\Users\\Documents\\BuildSmith\\Bundles\\bundle_2025-12-07.zip"
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors text-white"
                  readOnly
                />
                <button className="btn-secondary px-4">Browse</button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button 
            onClick={() => navigate('/')}
            className="btn-accent flex-1 flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Export Bundle
          </button>
          <button
            onClick={() => navigate('/scan')}
            className="btn-secondary"
          >
            Back to Scan
          </button>
        </div>
      </div>
    </div>
  )
}
