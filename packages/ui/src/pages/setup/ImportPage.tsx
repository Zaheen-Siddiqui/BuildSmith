import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileCheck, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

export default function ImportPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<{ name: string; path: string; size: number; lastModified: number } | null>(null)
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState('')
  
  const { setImportedBundle, setManifestItems, setScanSettings } = useBundleStore()

  const handleFileSelect = async () => {
    setError('')
    
    // Use Electron's native file dialog
    if (window.electronAPI?.selectBundle) {
      const result = await window.electronAPI.selectBundle()
      
      if (result.success && result.filePath) {
        // Validate file type
        if (!result.fileName?.endsWith('.buildsmith') && !result.fileName?.endsWith('.zip')) {
          setError('Invalid file type. Please select a .buildsmith or .zip file')
          return
        }
        
        // Create a file-like object with the info we need
        setSelectedFile({
          name: result.fileName || '',
          path: result.filePath,
          size: 0, // We could get this via fs if needed
          lastModified: Date.now()
        })
      }
    } else {
      setError('File selection not available. Please ensure you are running in Electron.')
    }
  }

  const handleImportBundle = async () => {
    if (!selectedFile) return
    
    setDecrypting(true)
    setError('')
    
    try {
      // Simulate bundle parsing and decryption
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock bundle metadata from file
      const bundleMetadata = {
        id: Date.now().toString(),
        name: selectedFile.name.replace(/\.(buildsmith|zip)$/, ''),
        path: selectedFile.path, // Store full path from Electron dialog
        createdAt: new Date(selectedFile.lastModified).toISOString(),
        description: 'Imported development environment bundle',
        encrypted: selectedFile.name.includes('encrypted') || passphrase.length > 0,
      }
      
      // Mock manifest items (in reality, would parse from bundle)
      const mockManifest = [
        { name: 'ESLint', version: '2.4.0', type: 'extension' as const, source: 'vscode', included: true },
        { name: 'Prettier', version: '9.10.4', type: 'extension' as const, source: 'vscode', included: true },
        { name: 'nginx', version: '1.25.4', type: 'image' as const, source: 'docker', included: true },
        { name: 'postgres', version: '15', type: 'image' as const, source: 'docker', included: true },
        { name: 'Production MongoDB', version: '1.0.0', type: 'secret' as const, source: 'mongodb', included: true },
        { name: 'Git', version: '2.42.0', type: 'installer' as const, source: 'https://git-scm.com', checksum: 'abc123', included: true },
        { name: 'Node.js', version: '18.17.0', type: 'installer' as const, source: 'https://nodejs.org', checksum: 'def456', included: true },
      ]
      
      // Set imported data in store
      setImportedBundle(bundleMetadata)
      setManifestItems(mockManifest)
      
      // Auto-detect what was in the bundle and set scan settings
      const hasVSCode = mockManifest.some(item => item.type === 'extension')
      const hasDocker = mockManifest.some(item => item.type === 'image')
      const hasDatabase = mockManifest.some(item => item.type === 'secret')
      const hasDevtools = mockManifest.some(item => item.type === 'installer')
      
      setScanSettings({
        vscode: hasVSCode,
        docker: hasDocker,
        databases: hasDatabase,
        devtools: hasDevtools,
        includeSecrets: bundleMetadata.encrypted,
      })
      
      // Navigate to setup configuration
      navigate('/setup-config')
      
    } catch (err) {
      setError('Failed to import bundle. Please check the file and passphrase.')
      console.error(err)
    } finally {
      setDecrypting(false)
    }
  }

  const isEncrypted = selectedFile?.name.includes('encrypted') || false

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
          <h1 className="text-4xl font-bold mb-2">Import Bundle</h1>
          <p className="text-primary-200">
            Import a previously exported bundle to restore your development environment
          </p>
        </div>

        {/* File Selection */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6 text-accent-400" />
            Select Bundle File
          </h2>
          
          <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-accent-500 transition-colors cursor-pointer" onClick={handleFileSelect}>
            <div className="w-full">
              <div className="flex flex-col items-center">
                {selectedFile ? (
                  <>
                    <FileCheck className="w-16 h-16 text-accent-400 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{selectedFile.name}</h3>
                    <p className="text-primary-300 text-sm">
                      Path: {selectedFile.path}
                    </p>
                    <p className="text-primary-400 text-xs mt-1">
                      Last modified: {new Date(selectedFile.lastModified).toLocaleDateString()}
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedFile(null)
                        setPassphrase('')
                        setError('')
                      }}
                      className="btn-secondary mt-4"
                    >
                      Choose Different File
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-primary-400 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Click to select bundle file</h3>
                    <p className="text-primary-300 text-sm">
                      (.buildsmith or .zip)
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-600/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Decryption Section */}
        {selectedFile && isEncrypted && (
          <div className="card p-6 mb-6 border-2 border-accent-600/50">
            <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-accent-400" />
              Encrypted Bundle
            </h3>
            <p className="text-primary-300 mb-4 text-sm">
              This bundle is encrypted. Enter the passphrase to decrypt it.
            </p>
            <div className="relative max-w-md">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter decryption passphrase"
                className="w-full px-4 py-2 pr-12 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-accent-500 transition-colors text-white placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-300 hover:text-white transition-colors"
              >
                {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Bundle Info Preview */}
        {selectedFile && (
          <div className="card p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Bundle Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-primary-300">File Name:</span>
                <span>{selectedFile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-300">File Size:</span>
                <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-300">Created:</span>
                <span>{new Date(selectedFile.lastModified).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-primary-300">Encrypted:</span>
                <span className={isEncrypted ? 'text-accent-400' : 'text-primary-400'}>
                  {isEncrypted ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleImportBundle}
            disabled={!selectedFile || (isEncrypted && !passphrase) || decrypting}
            className="btn-accent flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {decrypting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Decrypting Bundle...
              </>
            ) : (
              'Import Bundle'
            )}
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
            disabled={decrypting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
