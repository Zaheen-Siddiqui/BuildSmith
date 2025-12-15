import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, CheckCircle } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface PackageItem {
  id: string
  name: string
  version: string
  manager: 'npm' | 'pip' | 'winget' | 'chocolatey'
  selected: boolean
  available: boolean
}

export default function SetupPackagesPage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    setSetupSelections,
  } = useBundleStore()
  const [packages, setPackages] = useState<PackageItem[]>([])
  const [activeManager, setActiveManager] = useState<'all' | 'npm' | 'pip' | 'winget' | 'chocolatey'>('all')

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Extract packages from manifest
    const pkgs = manifestItems
      .filter(item => item.type === 'package')
      .map((item, index) => {
        // Package name format: "manager:packagename"
        const [manager, ...nameParts] = item.name.split(':')
        const packageName = nameParts.join(':') || manager
        
        return {
          id: `package-${index}`,
          name: packageName,
          version: item.version || 'latest',
          manager: (item.source as 'npm' | 'pip' | 'winget' | 'chocolatey') || 'npm',
          selected: setupSelections.packages,
          available: false, // TODO: Check if package already installed
        }
      })

    setPackages(pkgs)
  }, [importedBundle, manifestItems, setupSelections.packages, navigate])

  const handleTogglePackage = (id: string) => {
    setPackages(prev => 
      prev.map(pkg => pkg.id === id ? { ...pkg, selected: !pkg.selected } : pkg)
    )
  }

  const handleSelectAllForManager = (manager: typeof activeManager) => {
    setPackages(prev => prev.map(pkg => 
      manager === 'all' || pkg.manager === manager 
        ? { ...pkg, selected: true } 
        : pkg
    ))
  }

  const handleDeselectAllForManager = (manager: typeof activeManager) => {
    setPackages(prev => prev.map(pkg => 
      manager === 'all' || pkg.manager === manager 
        ? { ...pkg, selected: false } 
        : pkg
    ))
  }

  const handleContinue = () => {
    const selectedCount = packages.filter(pkg => pkg.selected).length
    
    if (selectedCount === 0) {
      // If no packages selected, disable packages in setup selections
      setSetupSelections({ ...setupSelections, packages: false })
    }

    // Packages is always last, go to preview
    navigate('/setup-preview')
  }

  if (!importedBundle) return null

  const filteredPackages = activeManager === 'all' 
    ? packages 
    : packages.filter(pkg => pkg.manager === activeManager)

  const packagesByManager = {
    npm: packages.filter(p => p.manager === 'npm'),
    pip: packages.filter(p => p.manager === 'pip'),
    winget: packages.filter(p => p.manager === 'winget'),
    chocolatey: packages.filter(p => p.manager === 'chocolatey'),
  }

  const selectedCount = filteredPackages.filter(p => p.selected).length
  const totalSelected = packages.filter(p => p.selected).length

  const getManagerColor = (manager: string) => {
    switch (manager) {
      case 'npm': return 'bg-red-600/30 text-red-300'
      case 'pip': return 'bg-blue-600/30 text-blue-300'
      case 'winget': return 'bg-green-600/30 text-green-300'
      case 'chocolatey': return 'bg-yellow-600/30 text-yellow-300'
      default: return 'bg-gray-600/30 text-gray-300'
    }
  }

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
          <h1 className="text-4xl font-bold mb-2">Package Dependencies</h1>
          <p className="text-primary-200">
            Select packages to install from bundle: <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <div className="card p-6 mb-6 border-2 border-blue-600/50 bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Package className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Package Installation Options</h3>
              <ul className="space-y-1 text-sm text-primary-200">
                <li>• npm packages will be installed globally (requires Node.js)</li>
                <li>• pip packages will be installed for current user (requires Python)</li>
                <li>• winget packages require Windows Package Manager</li>
                <li>• chocolatey packages require Chocolatey (may need admin)</li>
                <li>• Packages already installed will be skipped or upgraded</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Manager Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveManager('all')}
            className={`
              px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap
              ${activeManager === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }
            `}
          >
            All ({packages.length})
          </button>
          {Object.entries(packagesByManager).map(([manager, pkgs]) => (
            pkgs.length > 0 && (
              <button
                key={manager}
                onClick={() => setActiveManager(manager as 'npm' | 'pip' | 'winget' | 'chocolatey')}
                className={`
                  px-6 py-3 rounded-lg transition font-semibold whitespace-nowrap
                  ${activeManager === manager 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                {manager} ({pkgs.length})
              </button>
            )
          ))}
        </div>

        {/* Stats and Actions */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-1">{filteredPackages.length} Packages</h3>
              <p className="text-primary-300 text-sm">
                {selectedCount} selected in this view • {totalSelected} total selected
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleSelectAllForManager(activeManager)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
              >
                Select All
              </button>
              <button
                onClick={() => handleDeselectAllForManager(activeManager)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-sm"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Packages List */}
        {filteredPackages.length === 0 ? (
          <div className="card p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <p className="text-xl text-gray-400">
              {activeManager === 'all' 
                ? 'No packages in this bundle' 
                : `No ${activeManager} packages in this bundle`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4 mb-6">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => handleTogglePackage(pkg.id)}
                className={`
                  card p-6 cursor-pointer transition-all duration-200 border-2
                  ${pkg.selected 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-transparent hover:border-white/20'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={pkg.selected}
                    onChange={() => {}}
                    className="mt-1 w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-semibold">{pkg.name}</h3>
                      <span className="px-3 py-1 bg-blue-600/30 text-blue-300 rounded-full text-sm">
                        v{pkg.version}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm ${getManagerColor(pkg.manager)}`}>
                        {pkg.manager}
                      </span>
                      {pkg.available && (
                        <span className="px-2 py-1 bg-green-600/30 text-green-300 rounded text-xs flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Installed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleContinue}
            className="btn-accent flex-1"
            disabled={totalSelected === 0 && setupSelections.packages}
          >
            {totalSelected === 0 ? 'Skip Packages' : `Continue with ${totalSelected} Packages`}
          </button>
          <button
            onClick={() => navigate('/setup-config')}
            className="btn-secondary"
          >
            Back
          </button>
        </div>

        {/* Skip Option */}
        {totalSelected === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={handleContinue}
              className="text-primary-400 hover:text-white transition-colors text-sm"
            >
              Skip package installation and continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
