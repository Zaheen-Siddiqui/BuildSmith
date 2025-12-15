import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Lock, Eye, EyeOff } from 'lucide-react'
import { useBundleStore, ManifestItem } from '../../store/bundleStore'

export default function ScanPage() {
  const navigate = useNavigate()
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false)
  
  // Get state from store
  const { 
    scanSettings, 
    setScanSettings, 
    setManifestItems, 
    setCurrentBundle,
  } = useBundleStore()
  
  const toggleItem = (key: keyof typeof scanSettings) => {
    if (key === 'includeSecrets' || key === 'encryptionPassphrase' || key === 'confirmPassphrase') return
    setScanSettings({ [key]: !scanSettings[key] })
  }
  
  const handleStartScan = () => {
    // Validate passphrases match if encryption is enabled
    if (scanSettings.includeSecrets) {
      if (scanSettings.encryptionPassphrase !== scanSettings.confirmPassphrase) {
        alert('Passphrases do not match!')
        return
      }
      if (!scanSettings.encryptionPassphrase) {
        alert('Please enter an encryption passphrase')
        return
      }
    }
    
    // Determine the flow order: VS Code → Docker → Database → DevTools → Environment → Packages
    const configPages = []
    if (scanSettings.vscode) configPages.push('/vscode-profiles')
    if (scanSettings.docker) configPages.push('/docker-images')
    if (scanSettings.databases) configPages.push('/database-connections')
    if (scanSettings.devtools) configPages.push('/devtools')
    if (scanSettings.environment) configPages.push('/environment')
    if (scanSettings.packages) configPages.push('/packages')
    
    // If no config pages needed, go directly to bundle preview with mock data
    if (configPages.length === 0) {
      generateMockManifest()
      navigate('/bundle-preview')
    } else {
      // Navigate to first config page
      navigate(configPages[0])
    }
  }
  
  const generateMockManifest = () => {
    const mockItems: ManifestItem[] = []
    
    if (scanSettings.devtools) {
      mockItems.push(
        { name: 'Git', version: '2.42.0', type: 'installer', source: 'https://git-scm.com', checksum: 'abc123', included: true },
        { name: 'Node.js', version: '18.17.0', type: 'installer', source: 'https://nodejs.org', checksum: 'def456', included: true },
      )
    }
    
    if (scanSettings.packages) {
      mockItems.push(
        { name: 'npm:react', version: '18.2.0', type: 'package', source: 'npm', included: true },
        { name: 'npm:typescript', version: '5.2.2', type: 'package', source: 'npm', included: true },
        { name: 'pip:requests', version: '2.31.0', type: 'package', source: 'pip', included: true },
      )
    }
    
    // Set manifest items in store
    setManifestItems(mockItems)
    
    // Create bundle metadata
    setCurrentBundle({
      id: Date.now().toString(),
      name: `Bundle_${new Date().toISOString().split('T')[0]}`,
      createdAt: new Date().toISOString(),
      description: 'Auto-generated development environment bundle',
      encrypted: scanSettings.includeSecrets,
    })
    
    // Navigate to bundle preview
    navigate('/bundle-preview')
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
          <h1 className="text-4xl font-bold mb-2">Scan Environment</h1>
          <p className="text-primary-200">
            Select what you want to include in your export bundle
          </p>
        </div>

        {/* Scan Configuration */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">What to Scan</h2>
          
          <div className="space-y-4">
            {/* VS Code */}
            <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={scanSettings.vscode}
                onChange={() => toggleItem('vscode')}
                className="mt-1 mr-4 w-5 h-5 accent-accent-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">VS Code Configuration</div>
                <div className="text-sm text-primary-300">
                  Extensions, settings, profiles, and keybindings
                </div>
              </div>
            </label>

            {/* Docker */}
            <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={scanSettings.docker}
                onChange={() => toggleItem('docker')}
                className="mt-1 mr-4 w-5 h-5 accent-accent-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Docker Images</div>
                <div className="text-sm text-primary-300">
                  Installed Docker images and containers
                </div>
              </div>
            </label>

            {/* Databases */}
            <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={scanSettings.databases}
                onChange={() => toggleItem('databases')}
                className="mt-1 mr-4 w-5 h-5 accent-accent-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Database Connections</div>
                <div className="text-sm text-primary-300">
                  MongoDB Compass, MySQL Workbench, and other database connections
                </div>
              </div>
            </label>

            {/* MongoDB Data Backup - sub-option */}
            {scanSettings.databases && (
              <div className="ml-12 -mt-2">
                <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border-l-2 border-accent-500/30">
                  <input
                    type="checkbox"
                    checked={scanSettings.includeMongoData}
                    onChange={() => toggleItem('includeMongoData')}
                    className="mt-1 mr-4 w-5 h-5 accent-accent-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold">Include MongoDB Data</div>
                    <div className="text-sm text-primary-300">
                      Backup actual database data using mongodump (requires MongoDB Tools)
                    </div>
                    <div className="text-xs text-yellow-400 mt-1">
                      ⚠️ May significantly increase bundle size
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* DevOps Tools */}
            <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={scanSettings.devtools}
                onChange={() => toggleItem('devtools')}
                className="mt-1 mr-4 w-5 h-5 accent-accent-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">DevOps Tools</div>
                <div className="text-sm text-primary-300">
                  Terraform, kubectl, Jenkins CLI, SonarQube, and other tools
                </div>
              </div>
            </label>

            {/* Environment Variables */}
            <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={scanSettings.environment}
                onChange={() => toggleItem('environment')}
                className="mt-1 mr-4 w-5 h-5 accent-accent-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Environment & PATH</div>
                <div className="text-sm text-primary-300">
                  Environment variables and system PATH entries
                </div>
              </div>
            </label>

            {/* Package Managers */}
            <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={scanSettings.packages}
                onChange={() => toggleItem('packages')}
                className="mt-1 mr-4 w-5 h-5 accent-accent-600"
              />
              <div className="flex-1">
                <div className="font-semibold text-lg">Package Dependencies</div>
                <div className="text-sm text-primary-300">
                  pip, npm, winget, chocolatey packages
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Security Options */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Lock className="w-6 h-6 mr-2 text-accent-400" />
            Security Options
          </h2>
          
          <label className="flex items-start p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-accent-600/30">
            <input
              type="checkbox"
              checked={scanSettings.includeSecrets}
              onChange={(e) => setScanSettings({ includeSecrets: e.target.checked })}
              className="mt-1 mr-4 w-5 h-5 accent-accent-600"
            />
            <div className="flex-1">
              <div className="font-semibold text-lg">Include Secrets (Encrypted)</div>
              <div className="text-sm text-primary-300 mb-3">
                Export sensitive credentials, API keys, and connection strings with encryption
              </div>
              {scanSettings.includeSecrets && (
                <div 
                  className="bg-accent-900/30 p-4 rounded border border-accent-600/30 space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <label className="block mb-2 text-sm font-medium">Encryption Passphrase</label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? "text" : "password"}
                        value={scanSettings.encryptionPassphrase}
                        onChange={(e) => setScanSettings({ encryptionPassphrase: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Enter a strong passphrase"
                        className="w-full px-4 py-2 pr-12 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowPassphrase(!showPassphrase)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-300 hover:text-white transition-colors"
                      >
                        {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">Confirm Encryption Passphrase</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassphrase ? "text" : "password"}
                        value={scanSettings.confirmPassphrase}
                        onChange={(e) => setScanSettings({ confirmPassphrase: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Re-enter passphrase"
                        className="w-full px-4 py-2 pr-12 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowConfirmPassphrase(!showConfirmPassphrase)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-300 hover:text-white transition-colors"
                      >
                        {showConfirmPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {scanSettings.confirmPassphrase && scanSettings.encryptionPassphrase !== scanSettings.confirmPassphrase && (
                      <p className="text-xs text-red-400 mt-1">
                        Passphrases do not match
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-primary-400">
                    This passphrase will be required to decrypt secrets on the target device
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={handleStartScan}
            className="btn-accent flex-1 flex items-center justify-center"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Scan
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
