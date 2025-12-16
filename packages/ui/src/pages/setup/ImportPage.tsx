import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileCheck, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'
import JSZip from 'jszip'

export default function ImportPage() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<{ name: string; path: string; size: number; lastModified: number } | null>(null)
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState('')
  
  const { setImportedBundle, setManifestItems, setScanSettings } = useBundleStore()

  const handleFileSelect = async () => {
    console.log('[ImportPage] 📂 File selection initiated')
    setError('')
    
    // Use Electron's native file dialog
    if (window.electronAPI?.selectBundle) {
      console.log('[ImportPage] ✅ Electron API available')
      const result = await window.electronAPI.selectBundle()
      console.log('[ImportPage] 📄 File selection result:', result)
      
      if (result.success && result.filePath) {
        // Validate file type
        if (!result.fileName?.endsWith('.buildsmith') && !result.fileName?.endsWith('.zip')) {
          console.error('[ImportPage] ❌ Invalid file type:', result.fileName)
          setError('Invalid file type. Please select a .buildsmith or .zip file')
          return
        }
        
        // Create a file-like object with the info we need
        const fileInfo = {
          name: result.fileName || '',
          path: result.filePath,
          size: 0, // We could get this via fs if needed
          lastModified: Date.now()
        }
        console.log('[ImportPage] ✅ File selected:', fileInfo)
        setSelectedFile(fileInfo)
      } else {
        console.warn('[ImportPage] ⚠️ File selection cancelled or failed')
      }
    } else {
      console.error('[ImportPage] ❌ Electron API not available')
      setError('File selection not available. Please ensure you are running in Electron.')
    }
  }

  const handleImportBundle = async () => {
    if (!selectedFile) {
      console.warn('[ImportPage] ⚠️ No file selected')
      return
    }
    
    console.log('[ImportPage] 🚀 Starting bundle import...')
    console.log('[ImportPage] 📦 File path:', selectedFile.path)
    
    setDecrypting(true)
    setError('')
    
    try {
      // Read the bundle file using Electron API
      console.log('[ImportPage] 📂 Reading bundle file...')
      const result = await window.electronAPI.readBundle(selectedFile.path)
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to read bundle file')
      }
      
      const zip = await JSZip.loadAsync(result.data)
      
      // Parse bundle.json
      const bundleJsonFile = zip.file('bundle.json')
      if (!bundleJsonFile) {
        throw new Error('Invalid bundle: missing bundle.json')
      }
      const bundleJsonContent = await bundleJsonFile.async('string')
      const bundleJson = JSON.parse(bundleJsonContent)
      
      console.log('[ImportPage] 📋 Bundle metadata:', bundleJson)
      
      // Parse manifests.json
      const manifestsJsonFile = zip.file('manifests.json')
      if (!manifestsJsonFile) {
        throw new Error('Invalid bundle: missing manifests.json')
      }
      const manifestsContent = await manifestsJsonFile.async('string')
      const manifestsJson = JSON.parse(manifestsContent)
      
      console.log('[ImportPage] 📦 Manifest items count:', manifestsJson.items.length)
      console.log('[ImportPage] 📊 Manifest breakdown:')
      console.log('  - VS Code extensions:', manifestsJson.items.filter((i: any) => i.type === 'extension').length)
      console.log('  - Docker images:', manifestsJson.items.filter((i: any) => i.type === 'image').length)
      console.log('  - Databases:', manifestsJson.items.filter((i: any) => i.type === 'database').length)
      console.log('  - DevTools:', manifestsJson.items.filter((i: any) => i.type === 'installer').length)
      console.log('  - Packages:', manifestsJson.items.filter((i: any) => i.type === 'package').length)
      console.log('  - Environment vars:', manifestsJson.items.filter((i: any) => i.type === 'env').length)
      console.log('  - PATH entries:', manifestsJson.items.filter((i: any) => i.type === 'path').length)
      
      // Create bundle metadata
      const bundleMetadata = {
        id: bundleJson.id || Date.now().toString(),
        name: bundleJson.name || selectedFile.name.replace(/\.(buildsmith|zip)$/, ''),
        path: selectedFile.path,
        createdAt: bundleJson.createdAt || new Date().toISOString(),
        description: bundleJson.description || 'Imported development environment bundle',
        encrypted: bundleJson.encrypted || false,
      }
      
      // Set imported data in store
      console.log('[ImportPage] 💾 Saving bundle metadata to store')
      setImportedBundle(bundleMetadata)
      console.log('[ImportPage] 💾 Saving manifest items to store')
      setManifestItems(manifestsJson.items)
      
      // Auto-detect what was in the bundle and set scan settings
      const hasVSCode = manifestsJson.items.some((item: any) => item.type === 'extension')
      const hasDocker = manifestsJson.items.some((item: any) => item.type === 'image')
      const hasDatabase = manifestsJson.items.some((item: any) => item.type === 'database')
      const hasDevtools = manifestsJson.items.some((item: any) => item.type === 'installer')
      const hasPackages = manifestsJson.items.some((item: any) => item.type === 'package')
      const hasEnvironment = manifestsJson.items.some((item: any) => item.type === 'env' || item.type === 'path')
      
      console.log('[ImportPage] 🔍 Auto-detected categories:')
      console.log('  - VS Code:', hasVSCode)
      console.log('  - Docker:', hasDocker)
      console.log('  - Databases:', hasDatabase)
      console.log('  - DevTools:', hasDevtools)
      console.log('  - Packages:', hasPackages)
      console.log('  - Environment:', hasEnvironment)
      
      setScanSettings({
        vscode: hasVSCode,
        docker: hasDocker,
        databases: hasDatabase,
        devtools: hasDevtools,
        packages: hasPackages,
        environment: hasEnvironment,
        includeSecrets: bundleMetadata.encrypted,
      })
      
      // Navigate to setup configuration
      console.log('[ImportPage] 🧭 Navigating to setup configuration...')
      navigate('/setup-config')
      
    } catch (err) {
      console.error('[ImportPage] ❌ Import failed:', err)
      setError('Failed to import bundle. Please check the file and passphrase.')
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
