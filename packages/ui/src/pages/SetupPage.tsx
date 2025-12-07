import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Play, Package, Code, Database, HardDrive } from 'lucide-react'

export default function SetupPage() {
  const navigate = useNavigate()
  const [bundlePath, setBundlePath] = useState('')
  const [selectedItems, setSelectedItems] = useState({
    vscode: true,
    docker: true,
    databases: true,
    devtools: true,
    environment: true,
    packages: true,
  })

  const toggleItem = (key: string) => {
    setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-primary-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold mb-2">Setup Environment</h1>
          <p className="text-primary-200">
            Import a bundle and configure your development environment
          </p>
        </div>

        {/* Import Bundle Section */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Import Bundle</h2>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold">Bundle File</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bundlePath}
                  onChange={(e) => setBundlePath(e.target.value)}
                  placeholder="Select a bundle file (.zip)"
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors text-white placeholder:text-gray-400"
                />
                <button className="btn-secondary px-6 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Browse
                </button>
              </div>
              <p className="text-sm text-primary-300 mt-2">
                Select a BuildSmith bundle file to import
              </p>
            </div>
          </div>
        </div>

        {/* Bundle Contents - Only show if bundle is selected */}
        {bundlePath && (
          <>
            {/* Bundle Summary */}
            <div className="card p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Bundle Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-lg">
                  <div className="text-sm text-primary-300 mb-1">Created</div>
                  <div className="font-semibold">Dec 7, 2025</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <div className="text-sm text-primary-300 mb-1">Source</div>
                  <div className="font-semibold">DESKTOP-PC</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <div className="text-sm text-primary-300 mb-1">Size</div>
                  <div className="font-semibold">1.08 GB</div>
                </div>
              </div>
            </div>

            {/* What to Install */}
            <div className="card p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Select Components to Install</h2>
              
              <div className="space-y-4">
                {/* VS Code */}
                <div className="bg-white/5 rounded-lg">
                  <label className="flex items-start p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.vscode}
                      onChange={() => toggleItem('vscode')}
                      className="mt-1 mr-4 w-5 h-5 accent-accent-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Code className="w-5 h-5 text-accent-400" />
                        <div className="font-semibold text-lg">VS Code Configuration</div>
                      </div>
                      <div className="text-sm text-primary-300 mb-2">
                        48 extensions, profiles, and settings
                      </div>
                      {selectedItems.vscode && (
                        <div className="bg-black/20 p-3 rounded mt-2 space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-accent-600" />
                            <span>Extensions (48 items)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-accent-600" />
                            <span>User Settings</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-accent-600" />
                            <span>Keybindings</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Docker */}
                <div className="bg-white/5 rounded-lg">
                  <label className="flex items-start p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.docker}
                      onChange={() => toggleItem('docker')}
                      className="mt-1 mr-4 w-5 h-5 accent-accent-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-5 h-5 text-accent-400" />
                        <div className="font-semibold text-lg">Docker Images</div>
                      </div>
                      <div className="text-sm text-primary-300 mb-2">
                        2 images (470 MB total)
                      </div>
                      {selectedItems.docker && (
                        <div className="bg-black/20 p-3 rounded mt-2 space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-accent-600" />
                            <span>nginx:1.25.4 (142 MB)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked className="accent-accent-600" />
                            <span>postgres:15 (328 MB)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* Databases */}
                <div className="bg-white/5 rounded-lg">
                  <label className="flex items-start p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.databases}
                      onChange={() => toggleItem('databases')}
                      className="mt-1 mr-4 w-5 h-5 accent-accent-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-5 h-5 text-accent-400" />
                        <div className="font-semibold text-lg">Database Connections</div>
                      </div>
                      <div className="text-sm text-primary-300">
                        3 saved connections (encrypted)
                      </div>
                    </div>
                  </label>
                </div>

                {/* DevOps Tools */}
                <div className="bg-white/5 rounded-lg">
                  <label className="flex items-start p-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.devtools}
                      onChange={() => toggleItem('devtools')}
                      className="mt-1 mr-4 w-5 h-5 accent-accent-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <HardDrive className="w-5 h-5 text-accent-400" />
                        <div className="font-semibold text-lg">DevOps Tools</div>
                      </div>
                      <div className="text-sm text-primary-300">
                        Terraform, kubectl, and other CLI tools
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Setup Options */}
            <div className="card p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Setup Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-accent-600" />
                  <span>Prefer offline installers when available</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-accent-600" />
                  <span>Create system restore point before installation</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-accent-600" />
                  <span>Automatically restart if required</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/installer')}
                className="btn-accent flex-1 flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Setup
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Empty State */}
        {!bundlePath && (
          <div className="card p-12 text-center">
            <Upload className="w-16 h-16 mx-auto mb-4 text-primary-400" />
            <h3 className="text-xl font-semibold mb-2">No Bundle Selected</h3>
            <p className="text-primary-300">
              Select a bundle file to view its contents and start the setup process
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
