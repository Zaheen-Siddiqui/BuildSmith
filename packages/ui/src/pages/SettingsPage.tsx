import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    updateChannel: 'stable',
    encryption: 'gpg',
    installersFolder: 'C:\\BuildSmith\\installers',
    loggingLevel: 'info',
    theme: 'dark',
  })

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
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
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-primary-200">
            Configure BuildSmith preferences
          </p>
        </div>

        {/* General Settings */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">General</h2>
          
          <div className="space-y-6">
            {/* Update Channel */}
            <div>
              <label className="block mb-2 font-semibold">Update Channel</label>
              <select
                value={settings.updateChannel}
                onChange={(e) => updateSetting('updateChannel', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors text-white"
              >
                <option value="stable" className="bg-primary-800 text-white">Stable</option>
                <option value="beta" className="bg-primary-800 text-white">Beta</option>
              </select>
              <p className="text-sm text-primary-300 mt-1">
                Choose which update channel to receive updates from
              </p>
            </div>

            {/* Theme */}
            <div>
              <label className="block mb-2 font-semibold">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors text-white"
              >
                <option value="dark" className="bg-primary-800 text-white">Dark</option>
                <option value="light" className="bg-primary-800 text-white">Light</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Security</h2>
          
          <div className="space-y-6">
            {/* Encryption Method */}
            <div>
              <label className="block mb-2 font-semibold">Default Encryption</label>
              <select
                value={settings.encryption}
                onChange={(e) => updateSetting('encryption', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors text-white"
              >
                <option value="gpg" className="bg-primary-800 text-white">GPG (GnuPG)</option>
                <option value="age" className="bg-primary-800 text-white">age (modern)</option>
              </select>
              <p className="text-sm text-primary-300 mt-1">
                Choose the encryption method for securing sensitive data
              </p>
            </div>
          </div>
        </div>

        {/* Paths Settings */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Paths</h2>
          
          <div className="space-y-6">
            {/* Installers Folder */}
            <div>
              <label className="block mb-2 font-semibold">Default Installers Folder</label>
              <input
                type="text"
                value={settings.installersFolder}
                onChange={(e) => updateSetting('installersFolder', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-sm text-primary-300 mt-1">
                Location where offline installers will be stored
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="card p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Advanced</h2>
          
          <div className="space-y-6">
            {/* Logging Level */}
            <div>
              <label className="block mb-2 font-semibold">Logging Level</label>
              <select
                value={settings.loggingLevel}
                onChange={(e) => updateSetting('loggingLevel', e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded focus:outline-none focus:border-primary-500 transition-colors text-white"
              >
                <option value="error" className="bg-primary-800 text-white">Error</option>
                <option value="warn" className="bg-primary-800 text-white">Warning</option>
                <option value="info" className="bg-primary-800 text-white">Info</option>
                <option value="debug" className="bg-primary-800 text-white">Debug</option>
              </select>
              <p className="text-sm text-primary-300 mt-1">
                Control the verbosity of application logs
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button className="btn-accent flex items-center">
            <Save className="w-5 h-5 mr-2" />
            Save Settings
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
