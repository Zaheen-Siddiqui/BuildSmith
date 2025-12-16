import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Code, ChevronDown, ChevronRight } from 'lucide-react'
import { useBundleStore } from '../../store/bundleStore'

interface VSCodeExtensionData {
  id: string
  name: string
  publisher?: string
  version?: string
  selected: boolean
}

interface VSCodeProfileData {
  name: string
  extensions: VSCodeExtensionData[]
  selected: boolean
  expanded: boolean
}

export default function SetupVSCodePage() {
  const navigate = useNavigate()
  const { 
    importedBundle, 
    manifestItems, 
    setupSelections, 
    setSetupSelections,
    selectedSetupVSCodeProfiles,
    setSelectedSetupVSCodeProfiles,
  } = useBundleStore()
  const [profiles, setProfiles] = useState<VSCodeProfileData[]>([])

  useEffect(() => {
    if (!importedBundle) {
      navigate('/import')
      return
    }

    // Extract VS Code extensions from manifest (grouped by profile)
    const vscodeItems = manifestItems.filter(item => item.type === 'extension')
    
    // Group extensions by profile (stored in 'source' field from profile name)
    const profileMap = new Map<string, VSCodeExtensionData[]>()
    
    vscodeItems.forEach((item, index) => {
      const profileName = item.source || 'Default Profile'
      const extensionId = `${profileName}-${item.name}-${index}`
      const extension: VSCodeExtensionData = {
        id: extensionId,
        name: item.name,
        publisher: item.source,
        version: item.version,
        selected: selectedSetupVSCodeProfiles.includes(item.name) || setupSelections.vscode,
      }
      
      if (!profileMap.has(profileName)) {
        profileMap.set(profileName, [])
      }
      profileMap.get(profileName)!.push(extension)
    })
    
    // Convert to profile array
    const profilesData: VSCodeProfileData[] = Array.from(profileMap.entries()).map(([name, extensions]) => ({
      name,
      extensions,
      selected: extensions.some(ext => ext.selected),
      expanded: false,
    }))
    
    setProfiles(profilesData)
  }, [importedBundle, manifestItems, setupSelections.vscode, selectedSetupVSCodeProfiles, navigate])

  const handleToggleProfile = (profileName: string) => {
    setProfiles(prev => 
      prev.map(profile => 
        profile.name === profileName 
          ? { ...profile, expanded: !profile.expanded } 
          : profile
      )
    )
  }

  const handleSelectProfile = (profileName: string, selected: boolean) => {
    setProfiles(prev => 
      prev.map(profile => 
        profile.name === profileName 
          ? { 
              ...profile, 
              selected,
              extensions: profile.extensions.map(ext => ({ ...ext, selected }))
            } 
          : profile
      )
    )
  }

  const handleToggleExtension = (profileName: string, extensionId: string) => {
    setProfiles(prev => 
      prev.map(profile => {
        if (profile.name === profileName) {
          const updatedExtensions = profile.extensions.map(ext => 
            ext.id === extensionId ? { ...ext, selected: !ext.selected } : ext
          )
          return {
            ...profile,
            extensions: updatedExtensions,
            selected: updatedExtensions.some(ext => ext.selected)
          }
        }
        return profile
      })
    )
  }

  const handleSelectAllInProfile = (profileName: string) => {
    setProfiles(prev => 
      prev.map(profile => 
        profile.name === profileName 
          ? { 
              ...profile, 
              selected: true,
              extensions: profile.extensions.map(ext => ({ ...ext, selected: true }))
            } 
          : profile
      )
    )
  }

  const handleDeselectAllInProfile = (profileName: string) => {
    setProfiles(prev => 
      prev.map(profile => 
        profile.name === profileName 
          ? { 
              ...profile, 
              selected: false,
              extensions: profile.extensions.map(ext => ({ ...ext, selected: false }))
            } 
          : profile
      )
    )
  }

  const handleSelectAll = () => {
    setProfiles(prev => 
      prev.map(profile => ({
        ...profile,
        selected: true,
        extensions: profile.extensions.map(ext => ({ ...ext, selected: true }))
      }))
    )
  }

  const handleDeselectAll = () => {
    setProfiles(prev => 
      prev.map(profile => ({
        ...profile,
        selected: false,
        extensions: profile.extensions.map(ext => ({ ...ext, selected: false }))
      }))
    )
  }

  const handleContinue = () => {
    // Save selected extension names to store
    const selectedExtensionNames = profiles
      .flatMap(profile => profile.extensions)
      .filter(ext => ext.selected)
      .map(ext => ext.name)
    
    setSelectedSetupVSCodeProfiles(selectedExtensionNames)
    
    const selectedCount = selectedExtensionNames.length
    
    if (selectedCount === 0) {
      // If no extensions selected, disable vscode in setup selections
      setSetupSelections({ ...setupSelections, vscode: false })
    }

    // Navigate to next page based on setup selections
    // Order: vscode -> docker -> databases -> devtools -> environment -> packages -> preview
    if (setupSelections.docker && manifestItems.some(item => item.type === 'image')) {
      navigate('/setup-docker')
    } else if (setupSelections.databases && manifestItems.some(item => item.type === 'secret')) {
      navigate('/setup-databases')
    } else if (setupSelections.devtools && manifestItems.some(item => item.type === 'installer')) {
      navigate('/setup-devtools')
    } else if (setupSelections.environment && manifestItems.some(item => item.name.startsWith('ENV:') || item.name.startsWith('PATH:'))) {
      navigate('/setup-environment')
    } else if (setupSelections.packages && manifestItems.some(item => item.type === 'package')) {
      navigate('/setup-packages')
    } else {
      navigate('/setup-preview')
    }
  }

  if (!importedBundle) return null

  const totalExtensions = profiles.reduce((sum, profile) => sum + profile.extensions.length, 0)
  const selectedCount = profiles.reduce((sum, profile) => 
    sum + profile.extensions.filter(ext => ext.selected).length, 0
  )
  const allSelected = totalExtensions > 0 && profiles.every(profile => 
    profile.extensions.every(ext => ext.selected)
  )

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
          <h1 className="text-4xl font-bold mb-2">VS Code Extensions & Profiles</h1>
          <p className="text-primary-200">
            Select which VS Code profiles and extensions to install from bundle: <span className="text-accent-400">{importedBundle.name}</span>
          </p>
        </div>

        {/* Info Banner */}
        <div className="card p-6 mb-6 border-2 border-blue-600/50 bg-blue-900/10">
          <div className="flex items-start gap-3">
            <Code className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-400 mb-2">Extension Installation</h3>
              <ul className="space-y-1 text-sm text-primary-200">
                <li>• Extensions will be installed automatically via VS Code CLI</li>
                <li>• Some extensions may require VS Code restart to activate</li>
                <li>• Extension settings and configurations will be applied</li>
                <li>• VS Code must be installed on this system</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">Selected Extensions</h3>
              <p className="text-primary-300">
                {selectedCount} extension{selectedCount !== 1 ? 's' : ''} from {profiles.filter(p => p.selected).length} profile{profiles.filter(p => p.selected).length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="btn-secondary text-sm"
                disabled={allSelected || totalExtensions === 0}
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn-secondary text-sm"
                disabled={selectedCount === 0}
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Profiles List */}
        <div className="space-y-4 mb-6">
          {profiles.length === 0 ? (
            <div className="card p-12 text-center text-primary-300">
              <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No VS Code profiles found in this bundle</p>
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.name}
                className={`card transition-all ${
                  profile.selected ? 'border-2 border-accent-600' : 'border-2 border-transparent'
                }`}
              >
                {/* Profile Header */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={profile.selected}
                      onChange={(e) => handleSelectProfile(profile.name, e.target.checked)}
                      className="mt-1 w-5 h-5 accent-accent-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleProfile(profile.name)}
                            className="text-white hover:text-accent-400 transition-colors"
                          >
                            {profile.expanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                          <h3 className="text-lg font-bold">{profile.name}</h3>
                          <span className="text-sm text-primary-400">
                            ({profile.extensions.length} extension{profile.extensions.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {profile.expanded && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSelectAllInProfile(profile.name)}
                              className="btn-secondary text-xs px-3 py-1"
                            >
                              Select All
                            </button>
                            <button
                              onClick={() => handleDeselectAllInProfile(profile.name)}
                              className="btn-secondary text-xs px-3 py-1"
                            >
                              Deselect All
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extensions List (Collapsible) */}
                {profile.expanded && (
                  <div className="border-t border-primary-700 p-4 pt-4 space-y-2 bg-black/20">
                    {profile.extensions.map((ext) => (
                      <div
                        key={ext.id}
                        onClick={() => handleToggleExtension(profile.name, ext.id)}
                        className={`
                          p-3 rounded-lg border transition-all cursor-pointer
                          ${ext.selected 
                            ? 'bg-accent-900/20 border-accent-600/50' 
                            : 'bg-white/5 border-transparent hover:border-primary-600'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={ext.selected}
                            onChange={() => handleToggleExtension(profile.name, ext.id)}
                            className="w-4 h-4 rounded border-primary-600 bg-primary-800 text-accent-600 focus:ring-2 focus:ring-accent-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 flex items-center gap-2">
                            <Code className="w-4 h-4 text-accent-400" />
                            <span className="font-medium text-sm">{ext.name}</span>
                            {ext.version && (
                              <span className="text-xs text-primary-400">v{ext.version}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleContinue}
            className="btn-accent flex-1"
            disabled={selectedCount === 0}
          >
            {selectedCount === 0 ? 'No Extensions Selected' : `Continue with ${selectedCount} Extension${selectedCount !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={() => navigate('/setup-config')}
            className="btn-secondary"
          >
            Back
          </button>
        </div>

        {/* Skip Option */}
        {selectedCount === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={handleContinue}
              className="text-primary-400 hover:text-white transition-colors text-sm"
            >
              Skip VS Code setup and continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
