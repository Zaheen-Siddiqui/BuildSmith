import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Code, Download, Upload, CheckCircle, Package } from 'lucide-react'

interface VSCodeProfile {
  id: string
  name: string
  extensionsCount: number
  lastModified: string
}

export default function VSCodeProfilesPage() {
  const navigate = useNavigate()
  const [selectedProfile, setSelectedProfile] = useState<string | null>('default')

  const profiles: VSCodeProfile[] = [
    { id: 'default', name: 'Default Profile', extensionsCount: 48, lastModified: '2025-12-07' },
    { id: 'web-dev', name: 'Web Development', extensionsCount: 35, lastModified: '2025-11-28' },
    { id: 'python', name: 'Python Development', extensionsCount: 22, lastModified: '2025-11-15' },
  ]

  const extensions = [
    'ESLint',
    'Prettier',
    'GitLens',
    'Python',
    'Docker',
    'Remote - SSH',
    'Live Server',
    'Auto Rename Tag',
    'Path Intellisense',
    'Bracket Pair Colorizer',
    'Material Icon Theme',
    'GitHub Copilot',
    'Thunder Client',
    'TODO Highlight',
    'Better Comments',
  ]

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
          <h1 className="text-4xl font-bold mb-2">VS Code Profiles</h1>
          <p className="text-primary-200">
            Import and export VS Code profiles, extensions, and settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Profiles */}
          <div className="card p-6">
            <h2 className="text-2xl font-bold mb-4">Available Profiles</h2>
            <div className="space-y-3 mb-6">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  onClick={() => setSelectedProfile(profile.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedProfile === profile.id
                      ? 'border-accent-600 bg-accent-900/20'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Code className="w-5 h-5 text-accent-400" />
                        <h3 className="font-semibold text-lg">{profile.name}</h3>
                      </div>
                      <div className="text-sm text-primary-300">
                        {profile.extensionsCount} extensions
                      </div>
                      <div className="text-xs text-primary-400 mt-1">
                        Last modified: {profile.lastModified}
                      </div>
                    </div>
                    {selectedProfile === profile.id && (
                      <CheckCircle className="w-6 h-6 text-accent-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <button className="w-full btn-secondary flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Import Profile from File
              </button>
              <button className="w-full btn-secondary flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export Current Profile
              </button>
            </div>
          </div>

          {/* Profile Details */}
          <div className="card p-6">
            <h2 className="text-2xl font-bold mb-4">Profile Details</h2>
            
            {selectedProfile && (
              <>
                <div className="bg-white/5 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold mb-2">Profile Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-primary-300">Name:</span>
                      <span>{profiles.find(p => p.id === selectedProfile)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-300">Extensions:</span>
                      <span>{profiles.find(p => p.id === selectedProfile)?.extensionsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-300">Settings:</span>
                      <span>Included</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-primary-300">Keybindings:</span>
                      <span>Included</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-accent-400" />
                    Extensions Preview
                  </h3>
                  <div className="bg-black/20 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {extensions.map((ext, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-accent-500" />
                          <span>{ext}</span>
                        </div>
                      ))}
                      <div className="text-xs text-primary-400 mt-2">
                        ... and {(profiles.find(p => p.id === selectedProfile)?.extensionsCount || 0) - extensions.length} more
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button className="w-full btn-accent flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Install Profile
                  </button>
                  <button className="w-full btn-secondary">
                    Install Extensions Only
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Auto-detect Section */}
        <div className="card p-6 mt-6">
          <h3 className="text-xl font-bold mb-4">Auto-Detect VS Code Settings</h3>
          <p className="text-primary-300 mb-4">
            Automatically detect and import VS Code settings from your local installation
          </p>
          <button className="btn-accent">
            Scan Local VS Code Installation
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => navigate('/scan')}
            className="btn-accent flex-1"
          >
            Save and Continue
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
